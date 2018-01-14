import * as _debug from 'debug';
let debug = _debug('nag');

import { remindersStore } from './reminders';

function Nag(): boolean {
    var done = true;
    remindersStore.forEach(async (reminder) => {
            debug(`  ${reminder.active ? "Active" : "Inactive"} reminder for ${reminder.user} to ${reminder.description} at ${reminder.nextNotification.toLocaleString('en-US')} with last notification at ${reminder.lastNotificationSent.toLocaleString('en-US')}`);
            if (!reminder.active) return;
            done = false;
            var notify = CheckForNotification(reminder.nextNotification, reminder.lastNotificationSent, reminder.notificationPlan);
            if (notify) {
                debug(`  ==> sending notification to ${reminder.user}: ${reminder.description}`);
                reminder.lastNotificationSent = new Date(Date.now());
                await remindersStore.update(reminder);
            }
        });
    return done;
}

function CheckForNotification(completeBy: Date, lastNotification: Date, frequency: string): boolean {
    var now = Date.now();
    var msToComplete = completeBy.getTime() - now;
    let [ days, hours, minutes ] = DaysHoursMinutes(msToComplete);
    debug(`Completes in ${days} days, ${hours} hours, ${minutes} minutes`)
    if (msToComplete < 0) return true;

    let msSince = now - lastNotification.getTime();

    if (frequency === 'ramped') {
        if (msSince > msecInDay) { frequency = "daily"; }
        else if (msSince > msecInHour) { frequency = "hourly" }
        else { frequency = "close" }
    }

    if (frequency === "daily") {
        return (msSince > msecInDay);
    } else if (frequency === "hourly") {
        return (msSince > msecInHour);
    } else if (frequency === "close") {
        return (msSince > 5 * msecInMinute);
    } else {
        debug('Should not get here.')
        return false;
    }
}

var naggerTickTock;
var closeDown;;

export function Start(msec : number = 5000) {
    if (naggerTickTock) return;
    naggerTickTock = setInterval(async () => {
        var done = Nag();
        debug(`TickTock completed.  All done: ${done}`)
    }, msec);
}

export function AutoStop(msec : number, callback: () => void)  {
    closeDown = setInterval(() => {
        debug('auto stopping');
        Stop(callback);
    }, msec);
}

export function Stop(callback: () => void) {
    clearInterval(naggerTickTock);
    clearInterval(closeDown);
    debug("closed nag timers");
    callback();
}

const msecInMinute = 1000 * 60;
const msecInHour = msecInMinute * 60;
const msecInDay = msecInHour * 24;


// Utilities
function DaysHoursMinutes(ms: number): [ number, number, number] {
    var days = ms / msecInDay | 0;
    ms = ms - days * msecInDay;
    var hours = ms / msecInHour | 0;
    ms = ms - hours * msecInHour;
    var minutes = ms / msecInMinute | 0;
    return [ days,  hours, minutes];
}
