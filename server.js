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
    appId: process.env.BOT_APP_ID,
    appPassword: process.env.BOT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());
//=========================================================
// Bots Dialogs
//=========================================================
var bot = new botbuilder_1.UniversalBot(connector);
bot.dialog('/', [
        (session, args, next) => {
        session.send("Hi There! What can I do for you?");
        if (!session.userData.notificationAddresses) {
            session.userData.notificationAddresses = [session.message.address];
        }
        next();
    },
        (session, args, next) => {
        session.beginDialog('/intent');
    }
]);
bot.dialog('/foo', [
        (session, args, next) => {
        session.send("Hi");
        session.endDialog();
    }]);
var model = process.env.BOT_APP_LUIS_CORTANA_RECOGNIZER;
var recognizer = new botbuilder_1.LuisRecognizer(model);
var intentDialog = new botbuilder_1.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/intent', intentDialog);
intentDialog.matches('builtin.intent.reminder.create_single_reminder', [
        (session, args, next) => {
        var title = botbuilder_1.EntityRecognizer.findEntity(args.entities, 'builtin.reminder.title');
        var time = botbuilder_1.EntityRecognizer.resolveTime(args.entities);
        var reminder = session.dialogData.reminder = {
            title: title ? title.entity : null,
            timestamp: time ? time.getTime() : null
        };
        // Prompt for title
        if (!reminder.title) {
            botbuilder_1.Prompts.text(session, 'What would you like to call your alarm?');
        }
        else {
            next();
        }
        session.send("Got alarm");
    }
]);
intentDialog.onDefault(botbuilder_1.DialogAction.send("Sorry I didn't understand you. I can only create & delete alarms."));
setInterval(() => {
    /*
    var msg = new Message()
        .address(session.userData.notificationAddresses[0])
        .text("tick-tock");
    bot.send(msg);
    */
}, 5000);
