#!/bin/bash

# Generate the certificate and key
openssl req -new -x509 -nodes -verbose \
-out cert.pem \
-keyout key.pem \
-newkey ec \
-pkeyopt ec_paramgen_curve:prime256v1 \
-subj "//CN=127.0.0.1" \
-days 14
