import * as Debug from 'debug';
let debug = Debug("reminders");

import * as uuid from 'uuid';
import * as mongo from 'mongodb';
var mongoClient = mongo.MongoClient;
// var Logger = mongo.Logger;
// Logger.setLevel('debug');
// Logger.filter('class', [ 'Cursor']);

var mongoPassword = process.env["MongoPassword"];
if (!mongoPassword) throw new Error('Need mongopassword env variable');

export class Conversation {
    user: string;
    conversationReference: any;
}

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
        Object.assign(reminder, pick(json, 'id', 'active', 'description', 'nextNotification', 'lastNotificationSent', 'notificationPlan', 'user'));
        if (cleanup) {
            if (typeof reminder.id != 'string') reminder.id = uuid.v4() as string;
            if (typeof reminder.active === 'undefined') reminder.active = true;
            if (typeof reminder.lastNotificationSent === 'number') reminder.lastNotificationSent = new Date(reminder.lastNotificationSent);
            if (typeof reminder.lastNotificationSent === 'string') reminder.lastNotificationSent = new Date(reminder.lastNotificationSent);
            if (typeof reminder.lastNotificationSent === 'undefined') reminder.lastNotificationSent = new Date(0);
            if (typeof reminder.nextNotification === 'string') reminder.nextNotification = new Date(reminder.nextNotification);
            if (typeof reminder.nextNotification === 'number') reminder.nextNotification = new Date(reminder.nextNotification);
            if (typeof reminder.nextNotification === 'undefined') reminder.nextNotification = new Date(Date.now() + 5 * 60 * 1000);
            if (typeof reminder.notificationPlan === 'undefined') reminder.notificationPlan = 'daily';
        }
        if (typeof reminder.id !== "string"
            || typeof reminder.active !== 'boolean'
            || typeof reminder.nextNotification !== 'object'
            || typeof reminder.lastNotificationSent !== 'object'
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

interface Store<T> {
    ready: boolean;
    initialized: Promise<void>;
    find(match: { [name: string]: any }): Promise<T[]>;
    update(match: { [name: string]: any }, item: T): Promise<void>;
    delete(match: { [name: string]: any }): Promise<void>;
    deleteAll(): Promise<void>
    forEach(match: { [name: string]: any }, per: (item: T) => void): Promise<void>;
    close(): Promise<void>;
}

interface ConversationsStore extends Store<Conversation> {
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
        this.client = await mongoClient.connect(mongoUrl, {useNewUrlParser: true});
        this.db = this.client.db(dbName);
        this.ready = true;
        return;
    }

    public async get(id: string): Promise<Reminder | undefined> {
        if (!this.ready) await this.initialized;
        let result = await this.db!.collection('reminders').findOne({ '_id': id });
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
        let operation = await this.db!.collection('reminders').updateOne({ '_id': reminder.id }, { $set: reminder }, { upsert: true });
        if (operation.result.ok === 1) return;
        throw new Error('update failed');
    }

    public async delete(reminder: Reminder) {
        if (!this.ready) await this.initialized;
        let operation = await this.db!.collection('reminders').deleteOne({ '_id': reminder.id });
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
                debug('closed RemindersMongo')
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
        debug('closed RemindersImMem');
        return;
    }
}


class InMemStore<T> implements Store<T> {
    public initialized = Promise.resolve();
    public ready = true;
    private store: T[];

    constructor() { }

    private static matchExactly<T>(x: T, y: Partial<T>): boolean {
        let result = Object.getOwnPropertyNames(y).reduce((prev, cur) => { return (prev) ? (y[cur] == x[cur]) : false; }, true);
        return result;
    }

    public async find(match: Partial<T>): Promise<T[]> {
        let result = this.store.filter((item) => InMemStore.matchExactly(item, match))
        return result;
    }

    public async update(match: Partial<T>, item: T): Promise<void> {
        let index = this.store.findIndex((item) => InMemStore.matchExactly(item, match))
        if (index < 0) throw 'could not update item';
        this.store[index] = item;
        return;
    }

    public async delete(match: Partial<T>): Promise<void> {
        for (var i = 0; i < this.store.length; i++) {
            if (InMemStore.matchExactly(this.store[i], match)) {
                this.store.splice(i, 1);  // remove the item. 
                i--;
            }
        }
        return;
    }

    public async deleteAll(): Promise<void> {
        delete this.store;
        this.store = [];
        return;
    }

    public async forEach(per: (item: T) => void): Promise<void> {
        this.store.forEach(item => per(item));
        return;
    }

    public async close() {
        debug('closed RemindersImMem');
        return;
    }
}

class MongoStore<T> implements Store<T> {
    initialized: Promise<void>;
    public ready = false;
    private client?: mongo.MongoClient;
    private db?: mongo.Db;
    private collectionName;

    constructor(mongoUrl: string, dbName: string, collectionName: string) {
        this.ready = false;
        this.collectionName = collectionName;
        this.initialized = this.asyncInitialize(mongoUrl, dbName);
    }

    private async asyncInitialize(mongoUrl: string, dbName: string): Promise<void> {
        this.client = await mongoClient.connect(mongoUrl);
        this.db = this.client.db(dbName);
        this.ready = true;
        return;
    }



    public async find(match: { [name: string]: any }): Promise<T[]> {
        if (!this.ready) await this.initialized;
        let result = await this.db!.collection(this.collectionName).find(match).toArray();
        let items: T[] = [];
        result.forEach((item) => {
            items.push(<T>(<any>item));
        });
        return items;
    }

    public async update(match: { [name: string]: any }, item: T) {
        if (!this.ready) await this.initialized;
        let operation = await this.db!.collection(this.collectionName).updateOne(match, { $set: item }, { upsert: true });
        if (operation.result.ok === 1) return;
        throw new Error('update failed');
    }

    public async delete(match: { [name: string]: any }) {
        if (!this.ready) await this.initialized;
        let operation = await this.db!.collection(this.collectionName).deleteMany(match);
        if (operation.result.ok === 1) return;
        throw new Error('update failed');
    }

    public async forEach(per: (item: T) => void) {
        if (!this.ready) await this.initialized;
        return new Promise<void>((resolve, reject) => {
            this.db!.collection(this.collectionName).find().forEach((item) => {
                per(<T>(<any>item));
            }, () => {
                resolve();
            })
        });
    }

    public async deleteAll() {
        if (!this.ready) await this.initialized;
        let operation = await this.db!.collection(this.collectionName).deleteMany({});
        if (operation.result.ok === 1) return;
        throw new Error('delete all failed.');
    }

    public async close() {
        if (!this.ready) await this.initialized;
        let result = new Promise<void>(async (resolve, reject) => {
            let client = await this.client;
            client!.close(true, () => {
                debug('closed')
                resolve();
            });
        });
        return result;
    }
}

class ConversationsMongo extends MongoStore<Conversation> implements ConversationsStore {
    constructor(mongoUrl: string, dbName: string) {
        super(mongoUrl, dbName, 'conversations');
    }
}

class ConversationsInMem extends InMemStore<Conversation> implements ConversationsStore {
}

export var remindersInMem = new RemindersInMem();
export var remindersMongo = new RemindersMongo(`mongodb://shew-mongo:${encodeURIComponent(mongoPassword)}@shew-mongo.documents.azure.com:10255/?ssl=true&replicaSet=globaldb`, 'Test');
export var remindersStore = remindersMongo;

export var conversationsInMem = new ConversationsInMem();
export var conversationsMongo = new ConversationsMongo(`mongodb://shew-mongo:${encodeURIComponent(mongoPassword)}@shew-mongo.documents.azure.com:10255/?ssl=true&replicaSet=globaldb`, 'Test');
export var conversationsStore = conversationsMongo;

export function close(callback?: () => void) {
    let remindersInMemClose = remindersInMem.close().then(() => { });
    let remindersMongoClose = remindersMongo.close().then(() => { });
    let conversationsInMem = remindersInMem.close().then(() => { });
    let conversationsStore = remindersMongo.close().then(() => { });
    let allDone = Promise.all([remindersInMemClose, remindersMongoClose, conversationsInMem, conversationsStore]).then(() => {
        debug('closed reminders');
        if (callback) callback();
    });
}

function pick<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
    if (typeof obj !== 'object') { debug("not an object"); throw new Error("Pick error"); }
    var result = keys.reduce((p, c) => {
        if (obj.hasOwnProperty(c)) {
            if (typeof obj[c] != "undefined") {
                p[c] = obj[c];
            } else throw new debug('pick should not get here');
        };
        return p;
    }, {} as Pick<T, K>);
    return result;
}
