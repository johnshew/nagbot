"use strict";
// import * as restify from 'restify';
// import * as uuid from 'uuid';
Object.defineProperty(exports, "__esModule", { value: true });
const restify = require("restify");
const uuid = require("uuid");
const timers_1 = require("timers");
class Reminder {
}
var usersWithReminders = {};
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
function LoadReminder(reminder, json, cleanup = true) {
    reminder = Object.assign({}, reminder, pick(json, 'id', 'active', 'description', 'nextNotification', 'lastNotificationSent', 'notificationPlan'));
    if (cleanup) {
        if (typeof reminder.id != 'string')
            reminder.id = uuid.v4();
        if (typeof reminder.active === 'undefined')
            reminder.active = true;
        if (typeof reminder.lastNotificationSent === 'number')
            reminder.lastNotificationSent = new Date(reminder.lastNotificationSent);
        if (typeof reminder.lastNotificationSent === 'undefined')
            reminder.lastNotificationSent = new Date(0);
        if (typeof reminder.nextNotification === 'number')
            reminder.nextNotification = new Date(reminder.nextNotification);
        if (typeof reminder.notificationPlan === 'undefined')
            reminder.notificationPlan = 'daily';
    }
    if (typeof reminder.id !== "string"
        || typeof reminder.active !== 'boolean'
        || typeof reminder.nextNotification !== 'object'
        || typeof reminder.nextNotification !== 'object'
        || typeof reminder.notificationPlan !== 'string') {
        throw new Error("Reminder not valid");
    }
    return reminder;
}
server.get('/api/v1.0/reminders', (req, res, next) => {
    let user = "j@s.c";
    if (!usersWithReminders[user]) {
        usersWithReminders[user] = {};
    }
    let reminders = usersWithReminders[user];
    let reminderArray = Object.keys(usersWithReminders[user]).reduce((prev, key) => { prev.push(reminders[key]); return prev; }, []);
    res.send(reminderArray);
    return next();
});
server.post('/api/v1.0/reminders', (req, res, next) => {
    let user = "j@s.c";
    let reminder = LoadReminder({}, req.body);
    let entry = usersWithReminders[user];
    if (!entry) {
        entry = usersWithReminders[user] = {};
    }
    entry[reminder.id] = reminder;
    res.header("Location", `/api/v1.0/reminders/${reminder.id}`);
    res.send(201, reminder);
    next();
});
server.get('/api/v1.0/reminders/:id', (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    if (!usersWithReminders[user].hasOwnProperty(req.params.id)) {
        res.send(404, "Not found");
        next();
        return;
    }
    res.send(usersWithReminders[user][req.params.id]);
    next();
});
server.patch('/api/v1.0/reminders/:id', (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let reminder = usersWithReminders[user][req.params.id];
    let created = false;
    if (typeof reminder != "object") {
        created = true;
        reminder = usersWithReminders[user][req.params.id] = {};
    }
    usersWithReminders[user][req.params.id] = reminder = LoadReminder(reminder, req.body);
    res.send(created ? 201 : 200, reminder);
    next();
});
server.del('/api/v1.0/reminders/:id', (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let reminder = usersWithReminders[user][req.params.id];
    if (!reminder) {
        res.send(401, "Not found");
    }
    else {
        delete usersWithReminders[user][req.params.id];
        res.send(200);
    }
    next();
});
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', server.name, server.url);
});
const msecInMinute = 1000 * 60;
const msecInHour = msecInMinute * 60;
const msecInDay = msecInHour * 24;
function CheckForNotification(completeBy, lastNotification, frequency) {
    var now = Date.now();
    var msToComplete = completeBy.getTime() - now;
    if (msToComplete < 0)
        return true;
    let msSince = now - lastNotification.getTime();
    if (frequency === 'ramped') {
        if (msSince > msecInDay) {
            frequency = "daily";
        }
        else if (msSince > msecInHour) {
            frequency = "hourly";
        }
        else {
            frequency = "close";
        }
    }
    if (frequency === "daily") {
        return (msSince > msecInDay);
    }
    else if (frequency === "hourly") {
        return (msSince > msecInHour);
    }
    else if (frequency === "close") {
        return (msSince > 5 * msecInMinute);
    }
    else {
        console.log('Should not get here.');
        return false;
    }
}
function Nag() {
    var done = true;
    Object.keys(usersWithReminders).forEach(user => {
        console.log(`Reviewing reminders: found user ${user} with reminders`);
        var reminders = usersWithReminders[user];
        Object.keys(reminders).forEach(id => {
            let reminder = reminders[id];
            console.log(`  ${reminder.active ? "Active" : "Inactive"} reminder to ${reminder.description} at ${reminder.nextNotification.toLocaleString('en-US')} with last notification at ${reminder.lastNotificationSent.toLocaleString('en-US')}`);
            if (!reminder.active)
                return;
            done = false;
            var notify = CheckForNotification(reminder.nextNotification, reminder.lastNotificationSent, reminder.notificationPlan);
            if (notify) {
                console.log(`  ==> sending notification to ${user}: ${reminder.description}`);
                reminder.lastNotificationSent = new Date(Date.now());
            }
        });
    });
    return done;
}
var naggerTickTock = setInterval(() => {
    var done = Nag();
    console.log(`TickTock completed.  All done: ${done}`);
    if (done) {
        appDone();
    }
}, 5000);
var closeDown = setInterval(() => {
    appDone();
}, 30000);
function appDone() {
    console.log("Closing Done.");
    timers_1.clearInterval(naggerTickTock);
    timers_1.clearInterval(closeDown);
    server.close();
}
// Utilities
function DaysHoursMinutes(ms) {
    var days = ms / msecInDay | 0;
    ms = ms - days * msecInDay;
    var hours = ms / msecInHour | 0;
    ms = ms - hours * msecInHour;
    var minutes = ms / msecInMinute | 0;
    return { days: days, hours: hours, minutes: minutes };
}
function pick(obj, ...keys) {
    var result = keys.reduce((p, c) => {
        if (obj.hasOwnProperty(c)) {
            p[c] = obj[c];
        }
        ;
        return p;
    }, {});
    return result;
}
//# sourceMappingURL=server.js.map