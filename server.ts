import * as _debug from 'debug';
let debug = _debug('server');

import * as restify from 'restify';
import * as uuid from 'uuid';

import * as reminders from './reminders';
var remindersStore = reminders.remindersStore;

// Setup restify server
export function create(config: any, callback?: () => void) {

    let server = restify.createServer();

    server.use(restify.plugins.bodyParser());
    server.use(restify.plugins.queryParser())

    // Make it a web server
    server.get('/', (req, res, next) => {
        res.redirect('./public/test.html', next);
    });

    server.get(/\/public\/?.*/, restify.plugins.serveStatic({
        directory: __dirname
    }));

    server.get('/api/v1.0/reminders', async (req, res, next) => {
        let reminders = await remindersStore.find("j@s.c");
        res.send(reminders);
        return next();
    });

    server.post('/api/v1.0/reminders', async (req, res, next) => {
        let user = "j@s.c";
        req.body['user'] = user;
        let reminder = new reminders.Reminder(req.body);
        let update = await remindersStore.update(reminder);
        res.header("Location", `/api/v1.0/reminders/${reminder.id}`);
        res.send(201, reminder);
        next();
    });

    server.get('/api/v1.0/reminders/:id', async (req, res, next) => {
        let user = "j@s.c";
        if (!req.params.hasOwnProperty('id') || typeof req.params.id != "string") {
            res.send(400, "id not found");
            next();
            return;
        }
        let result = await remindersStore.get(req.params.id);
        if (!result) {
            res.send(404, "Not found.");
        } else {
            res.send(result);
        }
        next();
    });

    server.put('/api/v1.0/reminders/:id', async (req, res, next) => {
        let user = "j@s.c";
        req.body.user = user;
        if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
            res.send(400, "id not found");
            next();
            return;
        }
        let reminder = new reminders.Reminder(req.body,true);        
        let exists = await remindersStore.get(req.params.id);
        let update = await remindersStore.update(reminder);
        res.header("Location", `/api/v1.0/reminders/${reminder.id}`);
        res.send(exists ? 200 : 201, reminder);
        next();
    });

    server.patch('/api/v1.0/reminders/:id', async (req, res, next) => {
        let user = "j@s.c";
        if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
            res.send(400, "id not found");
            next();
            return;
        }
        let reminder = await remindersStore.get(req.params.id);
        let created = false;
        if (!reminder) {
            created = true;
            let result = null;
            reminder = new reminders.Reminder(req.body, true);
        } else {
            reminder.update(req.body);
        }
        let update = await remindersStore.update(reminder);
        res.send(created ? 201 : 200, reminder);
        next();
    });

    server.del('/api/v1.0/reminders/:id', async (req, res, next) => {
        let user = "j@s.c";
        if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
            res.send(400, "id not found");
            next();
            return;
        }
        let reminder = await remindersStore.get(req.params.id);
        if (!reminder) {
            res.send(401, "Not found")
        } else {
            await remindersStore.delete(reminder);
            res.send(200);
        }
        next();
    });


    server.listen(config, () => {
        debug(`Server listening on ${server.url}`);
        if (callback) callback();
    });

    return server;
}

