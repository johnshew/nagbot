

// import * as restify from 'restify';
// import * as uuid from 'uuid';

import * as restify from 'restify';
import * as uuid from 'uuid';
import { clearInterval } from 'timers';

class Reminder {
    id: string; // UUID
    active: boolean;
    description: string;
    nextNotification: Date;
    lastNotificationSent: Date;
    notificationPlan : string
}

var usersWithReminders: {
    [userId: string]: Reminder[];
} = {};

// Setup restify server
var server = restify.createServer();
export function GetServer(): restify.Server { return server; }

server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser())

// Make it a web server
server.get('/', (req, res, next) => {
    res.redirect('./public/test.html', next);
});

server.get(/\/public\/?.*/, restify.plugins.serveStatic({
    directory: __dirname
}));


server.get('/api/v1.0/reminders', (req, res, next) => {
    let user = "j@s.c";
    if (!usersWithReminders[user]) { usersWithReminders[user] = []; }
    res.send(usersWithReminders[user]);
    return next();
});

server.post('/api/v1.0/reminders', (req, res, next) => {
    let user = "j@s.c";
    let reminder = pick(req.body,'id','description','nextNotification','notificationPlan') as Reminder;
    if (!reminder.id) reminder.id = uuid.v4() as string;
    reminder.active = true;
    reminder.lastNotificationSent = new Date(0);
    reminder.nextNotification = new Date(req.body.nextNotification);
    let entry = usersWithReminders[user];
    if (!entry) { entry = usersWithReminders[user] = []; }
    entry.push(reminder);
    res.header("Location", `/api/v1.0/reminders/${reminder.id}`);
    res.send(201, reminder);
    next();
});

server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', server.name, server.url);
});

const msecInMinute = 1000 * 60;
const msecInHour = msecInMinute * 60;
const msecInDay = msecInHour * 24;

function DaysHoursMinutes(ms: number): { days: number, hours: number, minutes: number } {
    var days = ms / msecInDay | 0;
    ms = ms - days * msecInDay;
    var hours = ms / msecInHour | 0;
    ms = ms - hours * msecInHour;
    var minutes = ms / msecInMinute | 0;
    return { days: days, hours: hours, minutes: minutes };
}

function CheckForNotification(completeBy: Date, lastNotification: Date, frequency: string)
    : boolean {
    var now = Date.now();
    var sinceNotification = DaysHoursMinutes(now - lastNotification.getTime());
    var msToComplete = completeBy.getTime() - now;
    var expired = (msToComplete < 0);
    if (expired) { msToComplete = -msToComplete; }
    var toComplete = DaysHoursMinutes(msToComplete);

    if (frequency === 'ramped') {
        if (toComplete.days <= 1) { frequency = "daily"; }
        else { frequency = "hourly" }
        if (toComplete.minutes > 5) { frequency = "close" }
    }

    if (frequency === "daily") {
        return (sinceNotification.hours < 24);
    } else if (frequency === "hourly") {
        return (sinceNotification.minutes < 60);
    } else if (frequency === "close") {
        return (sinceNotification.minutes > 5);
    } else {
        console.log('Should not get here.')
        return false;
    }
}


function Nag(): boolean {
    var done = true;
    Object.keys(usersWithReminders).forEach(key => {
        console.log(`found user ${key} with reminders`);
        var reminders = usersWithReminders[key];
        reminders.forEach(reminder => {
            if (reminder.active) { done = false; }
            var description = reminder.description;
            var when = reminder.nextNotification;
            var lastNotification = reminder.lastNotificationSent;
            console.log(`Reminder to ${description} at ${when.toLocaleString('en-US')} with last notification at ${lastNotification.toLocaleString('en-US')}`);
            var notify = CheckForNotification(when, lastNotification, reminder.notificationPlan);
            if (notify) {
                console.log(reminder.description);
                reminder.lastNotificationSent = new Date(Date.now());
            }
        });
    });
    return done;
}

function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
    var result = keys.reduce((p,c) => { p[c] = obj[c]; return p; }, {} as Pick<T,K>);
    return result;
}


var tickTock = setInterval(() => {
    var done = Nag();
    console.log(`Nagging. Finished: ${ done }`)
    if (done) { appDone(); }
}, 5000);

var closeDown = setInterval(()=>{ 
    appDone(); 
},30000);

function appDone()
{
    clearInterval(tickTock);
    clearInterval(closeDown);
    server.close();
}
