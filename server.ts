
import restify = require('restify');
import { ConsoleConnector, ChatConnector, UniversalBot, IAddress, Message, LuisRecognizer, IntentDialog, DialogAction, EntityRecognizer, Prompts } from 'botbuilder';

var reminders = {};


//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var cloudConnector = new ChatConnector({
    appId: process.env.BOT_APP_ID,
    appPassword: process.env.BOT_APP_PASSWORD

});


server.get(/\/public\/?.*/, restify.serveStatic({
    directory: __dirname
}));

server.post('/api/messages', cloudConnector.listen());


//=========================================================
// Bots Dialogs
//=========================================================

var bot = new UniversalBot(cloudConnector);

// Bot global actions
bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });
bot.beginDialogAction('help', '/help', { matches: /^help/i });

bot.dialog('/', [
    function (session) {
        // Send a greeting and show help.
        session.send("Hi... I will nag you until you do something.");
        session.beginDialog('/help');
    },
    function (session, results) {
        // Display menu
        session.beginDialog('/menu');
    },
    function (session, results) {
        // Always say goodbye
        session.send("Ok... See you later!");
    }
]);

bot.dialog('/menu', [
    function (session) {
        Prompts.choice(session, "What would like to do?", "entry|list|(quit)");
    },
    function (session, results) {
        if (results.response && results.response.entity != '(quit)') {
            // Launch a dialog
            session.beginDialog('/' + results.response.entity);
        } else {
            // Exit the menu
            session.endDialog();
        }
    },
    function (session, results) {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menu');
    }
]).reloadAction('reloadMenu', null, { matches: /^menu|show menu/i });

bot.dialog('/help', [
    function (session) {
        session.endDialog("You can give me the following commands:\n\n* menu - returns to the menu.\n* goodbye - Eed this conversation.\n* help - Displays these commands.");
    }
]);

bot.dialog('/list', [
     (session) => {
        session.send("Here are your current reminders.");
        Object.keys(reminders).forEach((key)=>{ 
            session.send(`${ key } at ${ reminders[key].timestamp} `); 
        });
        session.endDialog("Done listing.");
    }
]);

bot.dialog('/entry', [
    (session) => {
        session.send("Please enter a command using natural language.");
        session.beginDialog('/freeform');
    },
    (session) => {
        session.endDialog("Done with freeform entry.")
    }
]);


var model = process.env.BOT_APP_LUIS_CORTANA_RECOGNIZER;
var recognizer = new LuisRecognizer(model);
var intentDialog = new IntentDialog({ recognizers: [recognizer] });

bot.dialog('/freeform', intentDialog);

intentDialog.matches('builtin.intent.reminder.create_single_reminder', [
    (session, args, next) => {
        var title = EntityRecognizer.findEntity(args.entities, 'builtin.reminder.title');
        var time = EntityRecognizer.resolveTime(args.entities);
        var reminder = session.dialogData.reminder = {
            title: title ? title.entity : null,
            timestamp: time ? time.getTime() : null
        };

        // Prompt for title
        if (!reminder.title) {
            Prompts.text(session, 'What would you like to call your reminder?');
        } else {
            next();
        }
    },
    (session, results, next) => {
        var reminder = session.dialogData.reminder;
        if (results.response) {
            reminder.title = results.response;
        }

        // Prompt for time (title will be blank if the user said cancel)
        if (reminder.title && !reminder.timestamp) {
            Prompts.time(session, 'What time would you like to set the reminder for?');
        } else {
            next();
        }
    },
    (session, results) => {
        var reminder = session.dialogData.reminder;
        if (results.response) {
            var time = EntityRecognizer.resolveTime([results.response]);
            reminder.timestamp = time ? time.getTime() : null;
        }

        // Set the reminder (if title or timestamp is blank the user said cancel)
        if (reminder.title && reminder.timestamp) {
            // Save address of who to notify and write to scheduler.
            reminder.address = session.message.address;
            reminders[reminder.title] = reminder;

            // Send confirmation to user
            var date = new Date(reminder.timestamp);
            var isAM = date.getHours() < 12;
            session.send('Creating reminder named "%s" for %d/%d/%d %d:%02d%s',
                reminder.title,
                date.getMonth() + 1, date.getDate(), date.getFullYear(),
                isAM ? date.getHours() : date.getHours() - 12, date.getMinutes(), isAM ? 'am' : 'pm');
        } else {
            session.send('Ok... no problem.');
        }
    }
]);

intentDialog.onDefault(DialogAction.send("I can only create reminders.   For example: create a reminder for tomorrow at noon named test")


setInterval(() => {
    /*
    var msg = new Message()
        .address(session.userData.notificationAddresses[0])
        .text("tick-tock");
    bot.send(msg);
    */
}, 5000);
