import { readFile } from "node:fs/promises";
import { createServer } from "node:https";
import { Server } from "socket.io";
import { Http3Server } from "@fails-components/webtransport";
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const key = await readFile("./key.pem");
const cert = await readFile("./cert.pem");

const httpsServer = createServer({
  key,
  cert
}, async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
        try {
            const html = await readFile("../Client/index.html", "utf8");
            const modifiedHtml = html.replace( // add variable not retrievable by the client
                "</head>",
                `<script>const SERVER_IP = "${IP_ADDRESS}";</script></head>`
            );
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(modifiedHtml);
        } catch (error) {
            console.error("Error loading index.html:", error.message);
            res.writeHead(500).end("Internal Server Error");
        }
    } else if (req.method === "GET" && req.url === "/client.js") {
        try {
            const content = await readFile("../Client/client.js");
            res.writeHead(200, { "Content-Type": "application/javascript" });
            res.end(content);
        } catch (error) {
            console.error("Error loading client.js:", error.message);
            res.writeHead(500).end("Internal Server Error");
        }
    } else if (req.method === "GET" && req.url === "/favicon.ico") {
        const favicon = await readFile("./assets/favicon.ico");
        res.writeHead(200, {
        "content-type": "image/x-icon"
        });
        res.end(favicon);
    } else {
        console.log(`server sends 404 error for ${req.url}`);
        res.writeHead(404).end();
    }
  } catch (error) {
      console.error("Error serving file:", error.message);
      res.writeHead(500).end("Internal Server Error");
  }
});

const port = process.env.PORT || 3000;
const IP_ADDRESS = process.env.LOCAL_IP;

httpsServer.listen(port, () => {
  console.log(`server listening at https://${IP_ADDRESS}:${port}`);
});

const io = new Server(httpsServer, {
  transports: ["polling", "websocket", "webtransport"]
});

io.on("connection", (socket) => {
  //console.log(`connected with transport ${socket.conn.transport.name}`);

  socket.conn.on("upgrade", (transport) => {
    console.log(`transport upgraded to ${transport.name}`);
  });

  socket.on('message', (message) => {
    socket.broadcast.emit('message', message);
  });

  socket.on("disconnect", (reason) => {
    console.log(`disconnected due to ${reason}`);
  });
});

io.engine.on("connection_error", (err) => {
  console.log(err.req);
  console.log(err.code);
  console.log(err.message);
  console.log(err.context);
});

const h3Server = new Http3Server({
  port,
  host: IP_ADDRESS,
  secret: 'mysecret',
  cert,
  privKey: key,
});

h3Server.startServer();

(async () => {
  const stream = await h3Server.sessionStream("/socket.io/");
  const sessionReader = stream.getReader();

try{
  while (true) {
    const { done, value } = await sessionReader.read();
    if (done) {
      break;
    }
    io.engine.onWebTransportSession(value);
  }
} catch (error) {
  console.error("Error in stream handling", error);
} finally {
  stream.releaseLock();
}
})();