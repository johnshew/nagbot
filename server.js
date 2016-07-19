'use strict'

// Load the http module to create an http server.
var http = require('http');

// Configure our HTTP server to respond with Hello World to all requests.
var server = http.createServer( (request, response) => {
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end("Hello World\n");
});

var port = process.env.port || 80;

server.listen(port);

console.log(`Server running on ${ port }`);