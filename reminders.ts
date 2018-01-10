import * as uuid from 'uuid';

import * as mongo from 'mongodb';
var MongoClient = mongo.MongoClient;
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
    client: Promise<mongo.Db>;
    testDb: Promise<mongo.Db>;
    ready: Promise<boolean>;
    constructor() {
        this.client = new Promise<mongo.Db>(async (resolve, reject) => {
            new MongoClient().connect(`mongodb://shew-mongo:${encodeURIComponent(mongoPassword)}@shew-mongo.documents.azure.com:10255/?ssl=true&replicaSet=globaldb`,
                (err, client) => {
                    if (err) {
                        console.log('Unable to connect to mongo');
                        reject(err);
                    };
                    console.log('mongo connected');
                    resolve(client);
                });
        });
        this.testDb = new Promise<mongo.Db>(async (resolve, reject) => {
            let client = await this.client
            let db = client.db('Test');
            resolve(db);
        });
        this.ready = new Promise<boolean>(async (resolve, reject) => {
            let db = await this.testDb;
            db.createCollection('reminders', (collection) => {
                resolve(true);
            });
        });
    }
    public async get(id: string): Promise<Reminder> {
        let db = await this.testDb;
        let result = await db.collection('reminders').findOne({ 'id': id });
        let reminder = (result) ? new Reminder(result) : null;
        return reminder;
    }

    public async find(user: string): Promise<Reminder[]> {
        let db = await this.testDb;
        let result = await db.collection('reminders').find({ 'user': user }).toArray();
        let reminders: Reminder[] = [];
        result.forEach((reminder) => reminders.push(new Reminder(reminder)));
        return reminders;
    }

    public async update(reminder: Reminder) {
        let db = await this.testDb;
        return db.collection('reminders').updateOne({ 'id': reminder.id }, { $set: reminder }, { upsert: true });
    }

    public async delete(reminder: Reminder) {
        let db = await this.testDb;
        return db.collection('reminders').deleteOne({ 'id': reminder.id });
    }

    public async forEach(per: (reminder: Reminder) => void) {
        let db = await this.testDb;
        db.collection('reminders').find().forEach((reminder) => {
            per(new Reminder(reminder));
        }, () => {
            console.log("DB findAll complete");
        });
    }

    public async close() {
        let client = await this.client;
        client.close(true, () => {
            console.log('closing client');
        });
        let testDb = await this.testDb;
        testDb.close(true, () => {
            console.log('closing Test');
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
export var RemindersDB = new ReminderDB();

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
