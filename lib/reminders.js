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
const Debug = require("debug");
let debug = Debug("reminders");
const uuid = require("uuid");
const mongo = require("mongodb");
const mongodb_1 = require("mongodb");
var mongoClient = mongo.MongoClient;
var mongoPassword = process.env["mongopassword"];
if (!mongoPassword)
    throw new Error('Need mongopassword env variable');
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
class RemindersMongo {
    constructor(mongoUrl, dbName) {
        this.ready = false;
        this.ready = false;
        this.initialized = this.asyncInitialize(mongoUrl, dbName);
    }
    asyncInitialize(mongoUrl, dbName) {
        return __awaiter(this, void 0, void 0, function* () {
            this.client = yield mongodb_1.MongoClient.connect(mongoUrl);
            this.db = this.client.db(dbName);
            this.ready = true;
            return;
        });
    }
    get(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ready)
                yield this.initialized;
            let result = yield this.db.collection('reminders').findOne({ '_id': id });
            let reminder = (result) ? new Reminder(result) : undefined;
            return reminder;
        });
    }
    find(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ready)
                yield this.initialized;
            let result = yield this.db.collection('reminders').find({ 'user': user }).toArray();
            let reminders = [];
            result.forEach((reminder) => reminders.push(new Reminder(reminder)));
            return reminders;
        });
    }
    update(reminder) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ready)
                yield this.initialized;
            let operation = yield this.db.collection('reminders').updateOne({ '_id': reminder.id }, { $set: reminder }, { upsert: true });
            if (operation.result.ok === 1)
                return;
            throw new Error('update failed');
        });
    }
    delete(reminder) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ready)
                yield this.initialized;
            let operation = yield this.db.collection('reminders').deleteOne({ '_id': reminder.id });
            if (operation.result.ok === 1)
                return;
            throw new Error('update failed');
        });
    }
    forEach(per) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ready)
                yield this.initialized;
            return new Promise((resolve, reject) => {
                this.db.collection('reminders').find().forEach((reminder) => {
                    per(new Reminder(reminder));
                }, () => {
                    resolve();
                });
            });
        });
    }
    deleteAll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ready)
                yield this.initialized;
            let operation = yield this.db.collection('reminders').deleteMany({});
            if (operation.result.ok === 1)
                return;
            throw new Error('delete all failed.');
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ready)
                yield this.initialized;
            let result = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let client = yield this.client;
                client.close(true, () => {
                    debug('closed RemindersMongo');
                    resolve();
                });
            }));
            return result;
        });
    }
}
class RemindersInMem {
    constructor() {
        this.initialized = Promise.resolve();
        this.ready = true;
        this.store = {};
    }
    get(id) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const user in this.store) {
                if (typeof this.store[user][id] !== 'undefined') {
                    return (this.store[user][id]);
                }
            }
            return undefined;
        });
    }
    find(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof this.store[user] === 'undefined') {
                this.store[user] = {};
            }
            let reminderArray = Object.keys(this.store[user]).reduce((prev, key) => { prev.push(this.store[user][key]); return prev; }, []);
            return reminderArray;
        });
    }
    update(reminder) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof this.store[reminder.user] === undefined) {
                this.store[reminder.user] = {};
            }
            ;
            this.store[reminder.user][reminder.id] = reminder;
            return;
        });
    }
    delete(reminder) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.store[reminder.user] && this.store[reminder.user][reminder.id]) {
                delete this.store[reminder.user][reminder.id];
            }
            return;
        });
    }
    deleteAll() {
        return __awaiter(this, void 0, void 0, function* () {
            Object.keys(this.store).forEach((user) => delete this.store[user]);
            return;
        });
    }
    forEach(per) {
        return __awaiter(this, void 0, void 0, function* () {
            Object.keys(this.store).forEach((user) => {
                Object.keys(this.store[user]).forEach((id) => {
                    per(this.store[user][id]);
                });
            });
            return;
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('closed RemindersImMem');
            return;
        });
    }
}
exports.remindersInMem = new RemindersInMem();
exports.remindersMongo = new RemindersMongo(`mongodb://shew-mongo:${encodeURIComponent(mongoPassword)}@shew-mongo.documents.azure.com:10255/?ssl=true&replicaSet=globaldb`, 'Test');
exports.remindersStore = exports.remindersMongo;
function close(callback) {
    let remindersInMemClose = exports.remindersInMem.close().then(() => { });
    let remindersMongoClose = exports.remindersMongo.close().then(() => { });
    let allDone = Promise.all([remindersInMemClose, remindersMongoClose]).then(() => {
        debug('closed reminders');
        if (callback)
            callback();
    });
}
exports.close = close;
function pick(obj, ...keys) {
    if (typeof obj !== 'object') {
        debug("not an object");
        throw new Error("Pick error");
    }
    var result = keys.reduce((p, c) => {
        if (obj.hasOwnProperty(c)) {
            if (typeof obj[c] != "undefined") {
                p[c] = obj[c];
            }
            else
                throw new debug('pick should not get here');
        }
        ;
        return p;
    }, {});
    return result;
}
//# sourceMappingURL=reminders.js.map