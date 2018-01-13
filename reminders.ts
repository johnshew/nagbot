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


class ReminderDB {
    initialized : Promise<void>;
    ready = false;
    client: mongo.MongoClient;
    db: mongo.Db;

    constructor(mongoUrl: string, dbName: string)
    {
        this.ready = false;
        this.client = null;
        this.db = null;
        this.initialized = this.asyncInitialize(mongoUrl, dbName);
    }

    public async asyncInitialize(mongoUrl: string, dbName: string) : Promise<void>
    {
        this.client = await MongoClient.connect(mongoUrl);
        this.db = this.client.db(dbName);
        this.ready = true;
        return;
    }

    public async get(id: string): Promise<Reminder> {
        if (!this.ready) await this.initialized;
        let result = await this.db.collection('reminders').findOne({ 'id': id });
        let reminder = (result) ? new Reminder(result) : null;
        return reminder;
    }

    public async find(user: string): Promise<Reminder[]> {
        if (!this.ready) await this.initialized;
        let result = await this.db.collection('reminders').find({ 'user': user }).toArray();
        let reminders: Reminder[] = [];
        result.forEach((reminder) => reminders.push(new Reminder(reminder)));
        return reminders;
    }

    public async update(reminder: Reminder) {
        if (!this.ready) await this.initialized;
        return this.db.collection('reminders').updateOne({ 'id': reminder.id }, { $set: reminder }, { upsert: true });
    }

    public async delete(reminder: Reminder) {
        if (!this.ready) await this.initialized;
        return this.db.collection('reminders').deleteOne({ 'id': reminder.id });
    }

    public async forEach(per: (reminder: Reminder) => void) {
        if (!this.ready) await this.initialized;
        this.db.collection('reminders').find().forEach((reminder) => {
            per(new Reminder(reminder));
        }, () => {
            console.log("DB findAll complete");
        });
        return;
    }

    public async deleteAll() {
        if (!this.ready) await this.initialized;
        return this.db.collection('reminders').deleteMany({});
    }


    public async close() {
        if (!this.ready) await this.initialized;
        let client = await this.client;
        client.close(true, () => {
            console.log('closing client');
        });
    }
}

class ReminderStore {
    store: {
        [userId: string]: { [id: string]: Reminder }
    } = {};
    db = null;

    constructor() { }

    public get(id: string): Reminder | undefined {
        for (const user in this.store) {
            if (typeof this.store[user][id] !== 'undefined') {
                return (this.store[user][id]);
            }
        }
        return undefined;
    }
    public find(user: string): Reminder[] {
        if (typeof this.store[user] === 'undefined') { this.store[user] = {}; }
        let reminderArray = Object.keys(this.store[user]).reduce((prev, key) => { prev.push(this.store[user][key]); return prev }, []);
        return reminderArray;
    }
    public update(reminder: Reminder) {
        if (typeof this.store[reminder.user] === undefined) { this.store[reminder.user] = {} };
        this.store[reminder.user][reminder.id] = reminder;
    }
    public delete(reminder: Reminder) {
        if (this.store[reminder.user] && this.store[reminder.user][reminder.id]) {
            delete this.store[reminder.user][reminder.id];
        }
    }
    public forEach(per: (reminder: Reminder) => void) {
        Object.keys(this.store).forEach((user) => {
            Object.keys(this.store[user]).forEach((id) => {
                per(this.store[user][id]);
            });
        });
    }
}

export var RemindersStoreX = new ReminderStore();
export var RemindersDB = new ReminderDB(`mongodb://shew-mongo:${encodeURIComponent(mongoPassword)}@shew-mongo.documents.azure.com:10255/?ssl=true&replicaSet=globaldb`,'Test');

function pick<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
    if (typeof obj !== 'object') { console.log("not an object"); throw new Error("Pick error"); }
    var result = keys.reduce((p, c) => {
        try {
            if (obj.hasOwnProperty(c)) {
                p[c] = obj[c]
            }; return p;
        } catch (x) {
            console.log("something is off");
        }
    }, {} as Pick<T, K>);
    return result;
}
