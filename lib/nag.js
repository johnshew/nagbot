"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const reminders_1 = require("./reminders");
function Nag() {
    var done = true;
    reminders_1.remindersStore.forEach((reminder) => __awaiter(this, void 0, void 0, function* () {
        console.log(`  ${reminder.active ? "Active" : "Inactive"} reminder for ${reminder.user} to ${reminder.description} at ${reminder.nextNotification.toLocaleString('en-US')} with last notification at ${reminder.lastNotificationSent.toLocaleString('en-US')}`);
        if (!reminder.active)
            return;
        done = false;
        var notify = CheckForNotification(reminder.nextNotification, reminder.lastNotificationSent, reminder.notificationPlan);
        if (notify) {
            console.log(`  ==> sending notification to ${reminder.user}: ${reminder.description}`);
            reminder.lastNotificationSent = new Date(Date.now());
            yield reminders_1.remindersStore.update(reminder);
        }
    }));
    return done;
}
function CheckForNotification(completeBy, lastNotification, frequency) {
    var now = Date.now();
    var msToComplete = completeBy.getTime() - now;
    let [days, hours, minutes] = DaysHoursMinutes(msToComplete);
    console.log(`Completes in ${days} days, ${hours} hours, ${minutes} minutes`);
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
function Start(msec = 5000) {
    if (naggerTickTock)
        return;
    naggerTickTock = setInterval(() => __awaiter(this, void 0, void 0, function* () {
        var done = Nag();
        console.log(`TickTock completed.  All done: ${done}`);
    }), msec);
}
exports.Start = Start;
function AutoStop(msec, callback) {
    closeDown = setInterval(() => {
        console.log('Auto stopping');
        Stop(callback);
    }, msec);
}
exports.AutoStop = AutoStop;
function Stop(callback) {
    console.log("Closing timers");
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
    return [days, hours, minutes];
}
//# sourceMappingURL=nag.js.map