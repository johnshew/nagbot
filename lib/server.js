"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const restify = require("restify");
var usersWithReminders = {};
var localBotNoAuth = false;
// Setup restify server
var server = restify.createServer();
function GetServer() { return server; }
exports.GetServer = GetServer;
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());
// Make it a web server
server.get('/', (req, res, next) => {
    res.redirect('./public/test.html', next);
});
server.get(/\/public\/?.*/, restify.plugins.serveStatic({
    directory: __dirname
}));
server.get('/api', (req, res, next) => {
    res.send("Working");
    return next();
});
server.post('/api/create', (req, res, next) => {
    var item = req.body;
    item["id"] = 1;
    res.send(201, item);
    next();
});
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', server.name, server.url);
});
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
            }
        });
    });
}
setInterval(() => {
    console.log('tick');
    Nag();
}, 5000);
//# sourceMappingURL=server.js.map