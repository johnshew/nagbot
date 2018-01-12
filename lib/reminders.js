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
class ReminderDB {
    constructor() {
        this.client = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            mongodb_1.MongoClient.connect(`mongodb://shew-mongo:${encodeURIComponent(mongoPassword)}@shew-mongo.documents.azure.com:10255/?ssl=true&replicaSet=globaldb`)
                .then((client) => {
                console.log('mongo connected');
                resolve(client);
            })
                .catch((reason) => {
                console.log('Unable to connect to mongo');
                reject(reason);
            });
            yield this.client;
            this.testDb = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let client = yield this.client;
                let db = client.db('Test');
                resolve(db);
            }));
            this.ready = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let db = yield this.testDb;
                db.createCollection('reminders', (collection) => {
                    resolve(true);
                });
            }));
        }));
    }
    get(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let db = yield this.testDb;
            let result = yield db.collection('reminders').findOne({ 'id': id });
            let reminder = (result) ? new Reminder(result) : null;
            return reminder;
        });
    }
    find(user) {
        return __awaiter(this, void 0, void 0, function* () {
            let db = yield this.testDb;
            let result = yield db.collection('reminders').find({ 'user': user }).toArray();
            let reminders = [];
            result.forEach((reminder) => reminders.push(new Reminder(reminder)));
            return reminders;
        });
    }
    update(reminder) {
        return __awaiter(this, void 0, void 0, function* () {
            let db = yield this.testDb;
            return db.collection('reminders').updateOne({ 'id': reminder.id }, { $set: reminder }, { upsert: true });
        });
    }
    delete(reminder) {
        return __awaiter(this, void 0, void 0, function* () {
            let db = yield this.testDb;
            return db.collection('reminders').deleteOne({ 'id': reminder.id });
        });
    }
    forEach(per) {
        return __awaiter(this, void 0, void 0, function* () {
            let db = yield this.testDb;
            db.collection('reminders').find().forEach((reminder) => {
                per(new Reminder(reminder));
            }, () => {
                console.log("DB findAll complete");
            });
            return;
        });
    }
    deleteAll() {
        return __awaiter(this, void 0, void 0, function* () {
            let db = yield this.testDb;
            return db.collection('reminders').deleteMany({});
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            let client = yield this.client;
            client.close(true, () => {
                console.log('closing client');
            });
        });
    }
}
class ReminderStore {
    constructor() {
        this.store = {};
        this.db = null;
    }
    get(id) {
        for (const user in this.store) {
            if (typeof this.store[user][id] !== 'undefined') {
                return (this.store[user][id]);
            }
        }
        return undefined;
    }
    find(user) {
        if (typeof this.store[user] === 'undefined') {
            this.store[user] = {};
        }
        let reminderArray = Object.keys(this.store[user]).reduce((prev, key) => { prev.push(this.store[user][key]); return prev; }, []);
        return reminderArray;
    }
    update(reminder) {
        if (typeof this.store[reminder.user] === undefined) {
            this.store[reminder.user] = {};
        }
        ;
        this.store[reminder.user][reminder.id] = reminder;
    }
    delete(reminder) {
        if (this.store[reminder.user] && this.store[reminder.user][reminder.id]) {
            delete this.store[reminder.user][reminder.id];
        }
    }
    forEach(per) {
        Object.keys(this.store).forEach((user) => {
            Object.keys(this.store[user]).forEach((id) => {
                per(this.store[user][id]);
            });
        });
    }
}
exports.RemindersStoreX = new ReminderStore();
exports.RemindersDB = new ReminderDB();
function pick(obj, ...keys) {
    if (typeof obj !== 'object') {
        console.log("not an object");
        throw new Error("Pick error");
    }
    var result = keys.reduce((p, c) => {
        try {
            if (obj.hasOwnProperty(c)) {
                p[c] = obj[c];
            }
            ;
            return p;
        }
        catch (x) {
            console.log("something is off");
        }
    }, {});
    return result;
}
//# sourceMappingURL=reminders.js.map