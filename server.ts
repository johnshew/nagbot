import * as restify from 'restify';
import * as uuid from 'uuid';
import { clearInterval } from 'timers';

import { Reminder, Reminders} from './reminders';
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

server.get('/api/v1.0/reminders', (req, res, next) => {
    let reminders = Reminders.find("j@s.c");
    res.send(reminders);
    return next();
});

server.post('/api/v1.0/reminders', (req, res, next) => {
    let user = "j@s.c";
    req.body['user'] = user;
    let reminder = new Reminder(req.body);
    Reminders.update(reminder);
    res.header("Location", `/api/v1.0/reminders/${reminder.id}`);
    res.send(201, reminder);
    next();
});

server.get('/api/v1.0/reminders/:id', (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let result = Reminders.find(user,req.params.id);
    if (result.length === 0) {
        res.send(404, "Not found.");
        next();
        return;
    }
    res.send(result[0]);
    next();
});

server.patch('/api/v1.0/reminders/:id', (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let reminder = Reminders.find(user, req.params.id);
    let created = false;
    if (reminder.length === 0) {
        created = true;
        let result = new Reminder(req.body, true);
        Reminders.update(result);
        res.send(201,result);
    }
    reminder[0].update(req.body);
    Reminders.update(reminder[0]);
    res.send(200,reminder[0]);
    next();
});

server.del('/api/v1.0/reminders/:id', (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let reminder = Reminders.find(user,req.params.id);
    if (reminder.length === 0) {
        res.send(401, "Not found");
    } else {
        Reminders.delete(reminder[0]);
        res.send(200);
    }
    next();
});


server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', server.name, server.url);
});

nagger.Start(()=>{});
nagger.AutoStop(30000,()=>{});
