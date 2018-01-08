import { Reminders } from './reminders';

function Nag(): boolean {
    var done = true;
    Reminders.forEach((reminder) => {

            console.log(`  ${reminder.active ? "Active" : "Inactive"}  reminder for ${reminder.user} to ${reminder.description} at ${reminder.nextNotification.toLocaleString('en-US')} with last notification at ${reminder.lastNotificationSent.toLocaleString('en-US')}`);

            if (!reminder.active) return;

            done = false;
            var notify = CheckForNotification(reminder.nextNotification, reminder.lastNotificationSent, reminder.notificationPlan);
            if (notify) {
                console.log(`  ==> sending notification to ${reminder.user}: ${reminder.description}`);
                reminder.lastNotificationSent = new Date(Date.now());
            }
        });
        
    return done;
}

function CheckForNotification(completeBy: Date, lastNotification: Date, frequency: string): boolean {
    var now = Date.now();
    var msToComplete = completeBy.getTime() - now;
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
        console.log('Should not get here.')
        return false;
    }
}

var naggerTickTock = null;
var closeDown = null;

export function Start(callback: () => void) {
    if (naggerTickTock) return;
    naggerTickTock = setInterval(() => {
        var done = Nag();
        console.log(`TickTock completed.  All done: ${done}`)
        if (done) { Stop(callback); }
    }, 5000);
}

export function AutoStop(time : number, callback: () => void) {
    closeDown = setInterval(() => {
        console.log('Auto stopping');
        Stop(callback);
    }, time);
}

export function Stop(callback: () => void) {
    console.log("Closing.");
    clearInterval(naggerTickTock);
    clearInterval(closeDown);
    callback();
}

const msecInMinute = 1000 * 60;
const msecInHour = msecInMinute * 60;
const msecInDay = msecInHour * 24;


// Utilities
function DaysHoursMinutes(ms: number): { days: number, hours: number, minutes: number } {
    var days = ms / msecInDay | 0;
    ms = ms - days * msecInDay;
    var hours = ms / msecInHour | 0;
    ms = ms - hours * msecInHour;
    var minutes = ms / msecInMinute | 0;
    return { days: days, hours: hours, minutes: minutes };
}
