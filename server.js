"use strict";
const restify = require('restify');
const builder = require('botbuilder');
var usersWithReminders = {};
var localBotNoAuth = false;
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
    appId: localBotNoAuth ? "" : process.env.BOT_APP_ID,
    appPassword: localBotNoAuth ? "" : process.env.BOT_APP_PASSWORD
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
        }
        else {
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
        (session, args, next) => {
        if (session.userData.reminders) {
            session.send("Here are your current reminders.");
            Object.keys(session.userData.reminders).forEach(key => {
                session.send(`${key} at ${session.userData.reminders[key].timestamp} `);
            });
            session.endDialog();
        }
        else {
            session.send("You have no reminders set");
            next();
        }
    }
]);
bot.dialog('/entry', [
        (session) => {
        session.send("Please enter a command using natural language.");
        session.beginDialog('/freeform');
    },
        (session) => {
        session.endDialog("Done with freeform entry.");
    }
]);
var model = process.env.BOT_APP_LUIS_CORTANA_RECOGNIZER;
var recognizer = new builder.LuisRecognizer(model);
var intentDialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/freeform', intentDialog);
intentDialog.onBegin((session) => {
    session.send("Hi.  If you need help just type help. Version 0.1");
});
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
        }
        else {
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
        }
        else {
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
            if (!('reminders' in session.userData))
                session.userData.reminders = {};
            session.userData.reminders[reminder.title] = reminder;
            usersWithReminders[session.message.user.id] = session.userData.reminders;
            // Send confirmation to user
            var date = new Date(reminder.timestamp);
            var isAM = date.getHours() < 12;
            session.send(`Creating reminder to ${reminder.title} for ${date.toLocaleString('en-US')}`); //!TODO leverage session.message.textLocale
        }
        else {
            session.send('Ok... will not create a reminder.');
        }
    }
]);
intentDialog.onDefault(builder.DialogAction.send("I can only create reminders.   For example: create a reminder for tomorrow at noon named test"));
const msecInMinute = 1000 * 60;
const msecInHour = msecInMinute * 60;
const msecInDay = msecInHour * 24;
function DaysHoursMinutes(ms) {
    var days = ms / msecInDay | 0;
    ms = ms - days * msecInDay;
    var hours = ms / msecInHour | 0;
    ms = ms - hours * msecInHour;
    var minutes = ms / msecInMinute | 0;
    return { days: days, hours: hours, minutes: minutes };
}
function ShouldNotify(completeBy, lastNotification, frequency) {
    var now = Date.now();
    var sinceNotification = DaysHoursMinutes(now - lastNotification.getTime());
    var msToComplete = completeBy.getTime() - now;
    var expired = (msToComplete < 0);
    if (expired) {
        msToComplete = -msToComplete;
    }
    var toComplete = DaysHoursMinutes(msToComplete);
    if (frequency === 'ramped') {
        if (toComplete.days <= 1) {
            frequency = "daily";
        }
        else {
            frequency = "hourly";
        }
        if (toComplete.minutes > 5) {
            frequency = "close";
        }
    }
    if (frequency === "daily") {
        return (sinceNotification.hours < 24);
    }
    else if (frequency === "hourly") {
        return (sinceNotification.minutes < 60);
    }
    else if (frequency === "close") {
        return (sinceNotification.minutes > 5);
    }
    else {
        console.log('Should not get here.');
        return false;
    }
}
function Nag() {
    Object.keys(usersWithReminders).forEach(key => {
        console.log(`found user ${key} with reminders`);
        var reminders = usersWithReminders[key];
        Object.keys(reminders).forEach(reminderTitle => {
            var reminder = reminders[reminderTitle];
            var when = new Date(reminder.timestamp);
            var lastNotification = new Date((reminder.lastReminderSentTime) ? reminder.lastReminderSentTime : Date.now()); // Creating the reminder assumes you know about it.  :-)
            console.log(`Reminder to ${reminder.title} at ${when.toLocaleString('en-US')} with last notification at ${lastNotification.toLocaleString('en-US')}`);
            if (ShouldNotify(when, lastNotification, "ramped")) {
                reminder.lastReminderSentTime = Date.now();
                var msg = new builder.Message()
                    .address(reminder.address)
                    .text(reminder.title);
                bot.send(msg);
            }
        });
    });
}
setInterval(() => {
    console.log('tick');
    Nag();
}, 5000);
//# sourceMappingURL=server.js.map