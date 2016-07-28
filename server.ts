

import restify = require('restify');
import builder = require('botbuilder');

var usersWithReminders: { [userId: string]: any } = {};

// Setup restify server
var server = restify.createServer();

// Make it a web server
server.get('/', (req, res, next) => {
    res["redirect"]('./public/test.html', next); //!BUG restify .d.ts doesn't have redirect???
});

server.get(/\/public\/?.*/, restify.serveStatic({
    directory: __dirname
}));

//=========================================================
// Bot Setup
//=========================================================


server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var cloudConnector = new builder.ChatConnector({
    appId: process.env.BOT_APP_ID,
    appPassword: process.env.BOT_APP_PASSWORD

});


server.post('/api/messages', cloudConnector.listen());


//=========================================================
// Bots Dialogs
//=========================================================

var bot = new builder.UniversalBot(cloudConnector);

// Bot global actions
bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });

bot.beginDialogAction('help', '/help', { matches: /^help/i });
bot.beginDialogAction('menu', '/menu', { matches: /^menu/i });
bot.beginDialogAction('list', '/list', { matches: /^list/i });


bot.dialog('/', [
    (session) => {
        session.beginDialog('/freeform');
    }
]);

bot.dialog('/commands', [
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
        builder.Prompts.choice(session, "What would like to do?", ["entry", "list", "(quit)"]);
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
        session.endDialog("You can create reminders by typing something like 'create a reminder for tomorrow at 2PM to do excercises'\n\nOr can give me a command:\n\n* menu - Returns to the menu.\n* list - show current reminders\n* goodbye - End the conversation.\n* help - Displays this message.");
    }
]);

bot.dialog('/list', [
    (session) => {
        session.send("Here are your current reminders.");
        Object.keys(session.userData.reminders).forEach(key => {
            session.send(`${key} at ${session.userData.reminders[key].timestamp} `);
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
var recognizer = new builder.LuisRecognizer(model);
var intentDialog = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/freeform', intentDialog);

intentDialog.onBegin(
    (session) => {
        session.send("Hi.  If you need help just type help. Version 0.1");
    }
);

intentDialog.matches('builtin.intent.reminder.create_single_reminder', [
    (session, args, next) => {
        var title = builder.EntityRecognizer.findEntity(args.entities, 'builtin.reminder.reminder_text');
        var time = builder.EntityRecognizer.resolveTime(args.entities);
        var reminder = session.dialogData.reminder = {
            title: title ? title.entity : null,
            timestamp: time ? time.getTime() : null
        };

        // Prompt for title
        if (!reminder.title) {
            builder.Prompts.text(session, 'What would you like to call your reminder?');
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
            builder.Prompts.time(session, 'What time would you like to set the reminder for?');
        } else {
            next();
        }
    },
    (session, results) => {
        var reminder = session.dialogData.reminder;
        if (results.response) {
            var time = builder.EntityRecognizer.resolveTime([results.response]);
            reminder.timestamp = time ? time.getTime() : null;
        }

        // Set the reminder (if title or timestamp is blank the user said cancel)
        if (reminder.title && reminder.timestamp) {
            // Save address of who to notify and write to scheduler.
            reminder.address = session.message.address;
            if (!('reminders' in session.userData)) session.userData.reminders = {};
            session.userData.reminders[reminder.title] = reminder;
            usersWithReminders[session.message.user.toString()] = session.userData.reminders;

            // Send confirmation to user
            var date = new Date(reminder.timestamp);
            var isAM = date.getHours() < 12;
            session.send(`Creating reminder to ${reminder.title} for ${date.toLocaleString('en-US')}`); //!TODO leverage session.message.textLocale
        } else {
            session.send('Ok... will not create a reminder.');
        }
    }
]);

intentDialog.onDefault(builder.DialogAction.send("I can only create reminders.   For example: create a reminder for tomorrow at noon named test"));


setInterval(
    () => 
    {
        console.log('tick');
        Object.keys(usersWithReminders).forEach(key => {
            console.log(`found user ${ key } as ${ JSON.stringify(usersWithReminders[key])}`);
            var reminders = usersWithReminders[key];
            Object.keys(reminders).forEach(reminderTitle => {
                var reminder = reminders[reminderTitle];
                if (reminder.lastReminderSentTime && ((Date.now() - reminder.lastReminderSentTime.getTime()) > 5000)) {
                    reminder.lastReminderSentTime = Date.now();
                    var msg = new builder.Message()
                        .address(reminder.address)
                        .text(reminder.title);
                    bot.send(msg);
                }
            });
        })
    }, 5000);
