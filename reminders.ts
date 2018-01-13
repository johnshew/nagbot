import * as uuid from 'uuid';

import * as mongo from 'mongodb';
import { MongoClient } from 'mongodb';
var mongoClient = mongo.MongoClient
var mongoPassword = process.env["mongopassword"];
if (!mongoPassword) throw new Error('Need mongopassword env variable');


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

    public update(json: any): Reminder {
        Reminder.LoadReminder(this, json);
        return this;
    }
}

interface RemindersStore {
    ready: boolean;
    initialized: Promise<void>;
    get(id: string): Promise<Reminder | undefined>;
    find(user: string): Promise<Reminder[]>;
    update(reminder: Reminder): Promise<void>;
    delete(reminder: Reminder): Promise<void>;
    deleteAll(): Promise<void>
    forEach(per: (reminder: Reminder) => void): Promise<void>;
    close(): Promise<void>;
}

class RemindersMongo implements RemindersStore {
    initialized: Promise<void>;
    public ready = false;
    private client?: mongo.MongoClient;
    private db?: mongo.Db;

    constructor(mongoUrl: string, dbName: string) {
        this.ready = false;

        this.initialized = this.asyncInitialize(mongoUrl, dbName);
    }

    private async asyncInitialize(mongoUrl: string, dbName: string): Promise<void> {
        this.client = await MongoClient.connect(mongoUrl);
        this.db = this.client.db(dbName);
        this.ready = true;
        return;
    }

    public async get(id: string): Promise<Reminder | undefined> {
        if (!this.ready) await this.initialized;
        let result = await this.db!.collection('reminders').findOne({ 'id': id });
        let reminder = (result) ? new Reminder(result) : undefined;
        return reminder;
    }

    public async find(user: string): Promise<Reminder[]> {
        if (!this.ready) await this.initialized;
        let result = await this.db!.collection('reminders').find({ 'user': user }).toArray();
        let reminders: Reminder[] = [];
        result.forEach((reminder) => reminders.push(new Reminder(reminder)));
        return reminders;
    }

    public async update(reminder: Reminder) {
        if (!this.ready) await this.initialized;
        let operation = await this.db!.collection('reminders').updateOne({ 'id': reminder.id }, { $set: reminder }, { upsert: true });
        if (operation.result.ok === 1) return;
        throw new Error('update failed');
    }

    public async delete(reminder: Reminder) {
        if (!this.ready) await this.initialized;
        let operation = await this.db!.collection('reminders').deleteOne({ 'id': reminder.id });
        if (operation.result.ok === 1) return;
        throw new Error('update failed');
    }

    public async forEach(per: (reminder: Reminder) => void) {
        if (!this.ready) await this.initialized;
        return new Promise<void>((resolve, reject) => {
            this.db!.collection('reminders').find().forEach((reminder) => {
                per(new Reminder(reminder));
            }, () => {
                resolve();
            })
        });
    }

    public async deleteAll() {
        if (!this.ready) await this.initialized;
        let operation = await this.db!.collection('reminders').deleteMany({});
        if (operation.result.ok === 1) return;
        throw new Error('delete all failed.');
    }

    public async close() {
        if (!this.ready) await this.initialized;
        let result = new Promise<void>(async (resolve, reject) => {
            let client = await this.client;
            client!.close(true, () => {
                resolve();
            });
        });
        return result;
    }
}

class RemindersInMem implements RemindersStore {
    public initialized = Promise.resolve();
    public ready = true;
    private store: {
        [userId: string]: { [id: string]: Reminder }
    } = {};

    constructor() { }

    public async get(id: string): Promise<Reminder | undefined> {
        for (const user in this.store) {
            if (typeof this.store[user][id] !== 'undefined') {
                return (this.store[user][id]);
            }
        }
        return undefined;
    }

    public async find(user: string): Promise<Reminder[]> {
        if (typeof this.store[user] === 'undefined') { this.store[user] = {}; }
        let reminderArray = Object.keys(this.store[user]).reduce((prev, key) => { prev.push(this.store[user][key]); return prev }, [] as Reminder[]);
        return reminderArray;
    }

    public async update(reminder: Reminder): Promise<void> {
        if (typeof this.store[reminder.user] === undefined) { this.store[reminder.user] = {} };
        this.store[reminder.user][reminder.id] = reminder;
        return;
    }

    public async delete(reminder: Reminder): Promise<void> {
        if (this.store[reminder.user] && this.store[reminder.user][reminder.id]) {
            delete this.store[reminder.user][reminder.id];
        }
        return;
    }

    public async deleteAll(): Promise<void> {
        Object.keys(this.store).forEach((user) => delete this.store[user]);
        return;
    }

    public async forEach(per: (reminder: Reminder) => void): Promise<void> {
        Object.keys(this.store).forEach((user) => {
            Object.keys(this.store[user]).forEach((id) => {
                per(this.store[user][id]);
            });
        });
        return;
    }

    public async close() {
        return;
    }
}

export var remindersInMem = new RemindersInMem();
export var remindersMongo = new RemindersMongo(`mongodb://shew-mongo:${encodeURIComponent(mongoPassword)}@shew-mongo.documents.azure.com:10255/?ssl=true&replicaSet=globaldb`, 'Test');
export var remindersStore = remindersMongo;

export function close(callback?: () => void) {
    let remindersInMemClose = remindersInMem.close().then(() => console.log('remindersInMem closed'));
    let remindersMongoClose = remindersMongo.close().then(() => console.log('remindersMongo closed'));
    let allDone = Promise.all([remindersInMemClose, remindersMongoClose]).then(() => {
        if (callback) callback();
    });
}

function pick<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
    if (typeof obj !== 'object') { console.log("not an object"); throw new Error("Pick error"); }
    var result = keys.reduce((p, c) => {
        if (obj.hasOwnProperty(c)) {
            if (typeof obj[c] != "undefined") {
                p[c] = obj[c];
            } else throw new Error('What?');
        };
        return p;
    }, {} as Pick<T, K>);
    return result;
}
