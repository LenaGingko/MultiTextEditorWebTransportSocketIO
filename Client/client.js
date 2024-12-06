var toolbarOptions = [
  ['bold', 'italic'],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  ['clean']                    // Remove formatting button
];

document.addEventListener('DOMContentLoaded', function() {
  var quill = new Quill('#editor-container', {
      modules: {
          toolbar: toolbarOptions
      },
      theme: 'snow'
  });

  const $status = document.getElementById("status");
  const $transport = document.getElementById("transport");
  
  const socket = io({
    transportOptions: {
      webtransport: {
        hostname: SERVER_IP
      }
    }
  });
  
  socket.on("connect", () => {
    console.log(`connected with transport ${socket.io.engine.transport.name}`);
  
    $status.innerText = "Connected";
    $transport.innerText = socket.io.engine.transport.name;
  
    socket.io.engine.on("upgrade", (transport) => {
      console.log(`transport upgraded to ${transport.name}`);
  
      $transport.innerText = transport.name;
    });
  });

  socket.on('message', function(data) {
    try {
        
        console.log(`${getFormattedTimestamp()} Delta received`, data);
        var delta = JSON.parse(data);
        quill.updateContents(delta);
        
    } catch (e) {
        console.error('Error parsing message', e);
    }
  });
  
  socket.on("connect_error", (err) => {
    console.log(err.message, err.description, err.context);
  });
  
  socket.on("disconnect", (reason) => {
    console.log(`disconnect due to ${reason}`);
  
    $status.innerText = "Disconnected";
    $transport.innerText = "N/A";
  });

  quill.on('text-change', function(delta, oldDelta, source) {
      if (source === 'user' && socket.connected) {
          console.log(`${getFormattedTimestamp()} sending...`);
          socket.send(JSON.stringify(delta));
          console.log(`${getFormattedTimestamp()} Delta sent:`, delta);
      }
  });
});

function getFormattedTimestamp() {
  const now = new Date();
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `[sek:${seconds}, millisek:${milliseconds}]`;
}