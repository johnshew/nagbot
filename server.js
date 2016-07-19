"use strict";
const restify = require('restify');
const botbuilder_1 = require('botbuilder');
//=========================================================
// Bot Setup
//=========================================================
// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', server.name, server.url);
});
// Create chat bot
var connector = new botbuilder_1.ChatConnector({
    appId: "0abb19bd-c099-4f45-a96d-ab8f9dde69c4" || process.env.MICROSOFT_APP_ID,
    appPassword: "GrFNjgGr6pUapgC67k8c5VX" || process.env.MICROSOFT_APP_PASSWORD
});
var bot = new botbuilder_1.UniversalBot(connector);
server.post('/api/messages', connector.listen());
//=========================================================
// Bots Dialogs
//=========================================================
let address;
bot.dialog('/', (session) => {
    if (!address)
        address = session.message.address;
    session.send("Hello World");
});
setInterval(() => {
    var msg = new botbuilder_1.Message()
        .address(address)
        .text("Yo Yo");
    bot.send(msg);
}, 5000);
