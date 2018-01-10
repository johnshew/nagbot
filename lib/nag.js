"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reminders_1 = require("./reminders");
function Nag() {
    var done = true;
    reminders_1.RemindersDB.forEach((reminder) => {
        console.log(`  ${reminder.active ? "Active" : "Inactive"} reminder for ${reminder.user} to ${reminder.description} at ${reminder.nextNotification.toLocaleString('en-US')} with last notification at ${reminder.lastNotificationSent.toLocaleString('en-US')}`);
        if (!reminder.active)
            return;
        done = false;
        var notify = CheckForNotification(reminder.nextNotification, reminder.lastNotificationSent, reminder.notificationPlan);
        if (notify) {
            console.log(`  ==> sending notification to ${reminder.user}: ${reminder.description}`);
            reminder.lastNotificationSent = new Date(Date.now());
            // !TODO update database
        }
    });
    return done;
}
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
var naggerTickTock = null;
var closeDown = null;
function Start(callback) {
    if (naggerTickTock)
        return;
    naggerTickTock = setInterval(() => {
        var done = Nag();
        console.log(`TickTock completed.  All done: ${done}`);
    }, 6000);
}
exports.Start = Start;
function AutoStop(time, callback) {
    closeDown = setInterval(() => {
        console.log('Auto stopping');
        Stop(callback);
    }, time);
}
exports.AutoStop = AutoStop;
function Stop(callback) {
    console.log("Closing timers.");
    clearInterval(naggerTickTock);
    clearInterval(closeDown);
    callback();
}
exports.Stop = Stop;
const msecInMinute = 1000 * 60;
const msecInHour = msecInMinute * 60;
const msecInDay = msecInHour * 24;
// Utilities
function DaysHoursMinutes(ms) {
    var days = ms / msecInDay | 0;
    ms = ms - days * msecInDay;
    var hours = ms / msecInHour | 0;
    ms = ms - hours * msecInHour;
    var minutes = ms / msecInMinute | 0;
    return { days: days, hours: hours, minutes: minutes };
}
//# sourceMappingURL=nag.js.map