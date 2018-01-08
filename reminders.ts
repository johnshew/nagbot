import * as uuid from 'uuid';

export class Reminder {
    id: string; // UUID
    active: boolean;
    description: string;
    nextNotification: Date;
    lastNotificationSent: Date;
    notificationPlan: string
    user: string;

    constructor(json: any, cleanup: boolean = true) {
        Reminder.LoadReminder(this, json, cleanup);
    }

    static LoadReminder(reminder: Reminder, json: any, cleanup: boolean = true): Reminder {
        Object.assign(reminder, { ...reminder, ...pick(json, 'id', 'active', 'description', 'nextNotification', 'lastNotificationSent', 'notificationPlan', 'user') });
        if (cleanup) {
            if (typeof reminder.id != 'string') reminder.id = uuid.v4() as string;
            if (typeof reminder.active === 'undefined') reminder.active = true;
            if (typeof reminder.lastNotificationSent === 'number') reminder.lastNotificationSent = new Date(reminder.lastNotificationSent);
            if (typeof reminder.lastNotificationSent === 'undefined') reminder.lastNotificationSent = new Date(0);
            if (typeof reminder.nextNotification === 'number') reminder.nextNotification = new Date(reminder.nextNotification);
            if (typeof reminder.notificationPlan === 'undefined') reminder.notificationPlan = 'daily';
        }
        if (typeof reminder.id !== "string"
            || typeof reminder.active !== 'boolean'
            || typeof reminder.nextNotification !== 'object'
            || typeof reminder.nextNotification !== 'object'
            || typeof reminder.notificationPlan !== 'string'
            || typeof reminder.user !== 'string') {
            throw new Error("Reminder not valid");
        }
        return reminder;
    }

    public update(json : any) : Reminder {
        Reminder.LoadReminder(this,json);
        return this;
    }
}

export var reminderStore: {
    [userId: string]: { [id: string]: Reminder }
} = {};


export class ReminderStore {
    public find(user: string, id: string = null): Reminder[] {
        if (id) {
            let result = reminderStore[user][id];
            return (result ? [result] : []);
        }
        if (typeof reminderStore[user] === 'undefined') { reminderStore[user] = {}; }
        let reminderArray = Object.keys(reminderStore[user]).reduce((prev, key) => { prev.push(reminderStore[user][key]); return prev }, []);
        return reminderArray;
    }
    public update(reminder: Reminder) {
        if (typeof reminderStore[reminder.user] === undefined) { reminderStore[reminder.user] = {} };
        reminderStore[reminder.user][reminder.id] = reminder;
    }
    public delete(reminder: Reminder) {
        if (reminderStore[reminder.user] && reminderStore[reminder.user][reminder.id]) {
            delete reminderStore[reminder.user][reminder.id];
        }
    }
    public forEach(i : (reminder : Reminder) => void) {
        Object.keys(reminderStore).forEach((user) => {
            Object.keys(reminderStore[user]).forEach((id) => {
                i(reminderStore[user][id]);
            });
        });
    }
}

export var Reminders = new ReminderStore();

function pick<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
    var result = keys.reduce((p, c) => {
        if (obj.hasOwnProperty(c)) {
            p[c] = obj[c]
        }; return p;
    }, {} as Pick<T, K>);
    return result;
}
