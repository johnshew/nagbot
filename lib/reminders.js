"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid");
class Reminder {
    constructor(json, cleanup = true) {
        Reminder.LoadReminder(this, json, cleanup);
    }
    static LoadReminder(reminder, json, cleanup = true) {
        Object.assign(reminder, Object.assign({}, reminder, pick(json, 'id', 'active', 'description', 'nextNotification', 'lastNotificationSent', 'notificationPlan', 'user')));
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
            || typeof reminder.notificationPlan !== 'string'
            || typeof reminder.user !== 'string') {
            throw new Error("Reminder not valid");
        }
        return reminder;
    }
    update(json) {
        Reminder.LoadReminder(this, json);
        return this;
    }
}
exports.Reminder = Reminder;
exports.reminderStore = {};
class ReminderStore {
    find(user, id = null) {
        if (id) {
            let result = exports.reminderStore[user][id];
            return (result ? [result] : []);
        }
        if (typeof exports.reminderStore[user] === 'undefined') {
            exports.reminderStore[user] = {};
        }
        let reminderArray = Object.keys(exports.reminderStore[user]).reduce((prev, key) => { prev.push(exports.reminderStore[user][key]); return prev; }, []);
        return reminderArray;
    }
    update(reminder) {
        if (typeof exports.reminderStore[reminder.user] === undefined) {
            exports.reminderStore[reminder.user] = {};
        }
        ;
        exports.reminderStore[reminder.user][reminder.id] = reminder;
    }
    delete(reminder) {
        if (exports.reminderStore[reminder.user] && exports.reminderStore[reminder.user][reminder.id]) {
            delete exports.reminderStore[reminder.user][reminder.id];
        }
    }
    forEach(i) {
        Object.keys(exports.reminderStore).forEach((user) => {
            Object.keys(exports.reminderStore[user]).forEach((id) => {
                i(exports.reminderStore[user][id]);
            });
        });
    }
}
exports.ReminderStore = ReminderStore;
exports.Reminders = new ReminderStore();
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
//# sourceMappingURL=reminders.js.map