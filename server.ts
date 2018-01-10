import * as restify from 'restify';
import * as uuid from 'uuid';
import { clearInterval } from 'timers';

import { Reminder, RemindersDB } from './reminders';
import * as nagger from './nag';

// Setup restify server
export var server = restify.createServer();

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
    let reminders = await RemindersDB.find("j@s.c");
    res.send(reminders);
    return next();
});

server.post('/api/v1.0/reminders', async (req, res, next) => {
    let user = "j@s.c";
    req.body['user'] = user;
    let reminder = new Reminder(req.body);
    let update = await RemindersDB.update(reminder);
    res.header("Location", `/api/v1.0/reminders/${reminder.id}`);
    res.send(201, reminder);
    next();
});

server.get('/api/v1.0/reminders/:id', async (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let result = await RemindersDB.get(req.params.id);
    if (!result) {
        res.send(404, "Not found.");
    } else {
        res.send(result);
    }
    next();
});

server.patch('/api/v1.0/reminders/:id', async (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let reminder = await RemindersDB.get(req.params.id) as Reminder;
    let created = false;
    if (!reminder) {
        created = true;
        let result = null;
        try {
            reminder = new Reminder(req.body, true);
        }
        catch { }
    } else {
        reminder.update(req.body);
    }
    let update = await RemindersDB.update(reminder);
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
    let reminder = await RemindersDB.get(req.params.id);
    if (!reminder) {
        res.send(401, "Not found")
    } else {
        await RemindersDB.delete(reminder);
        res.send(200);
    }
    next();
});


server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', server.name, server.url);
});

nagger.Start(() => { });
nagger.AutoStop(25000, () => { 
    console.log("closing server");
    server.close();
    RemindersDB.close();
});
