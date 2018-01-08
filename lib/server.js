"use strict";
// import * as restify from 'restify';
// import * as uuid from 'uuid';
Object.defineProperty(exports, "__esModule", { value: true });
const restify = require("restify");
const reminders_1 = require("./reminders");
const nagger = require("./nag");
// Setup restify server
exports.server = restify.createServer();
exports.server.use(restify.plugins.bodyParser());
exports.server.use(restify.plugins.queryParser());
// Make it a web server
exports.server.get('/', (req, res, next) => {
    res.redirect('./public/test.html', next);
});
exports.server.get(/\/public\/?.*/, restify.plugins.serveStatic({
    directory: __dirname
}));
exports.server.get('/api/v1.0/reminders', (req, res, next) => {
    let reminders = reminders_1.Reminders.find("j@s.c");
    res.send(reminders);
    return next();
});
exports.server.post('/api/v1.0/reminders', (req, res, next) => {
    let user = "j@s.c";
    req.body['user'] = user;
    let reminder = new reminders_1.Reminder(req.body);
    reminders_1.Reminders.update(reminder);
    res.header("Location", `/api/v1.0/reminders/${reminder.id}`);
    res.send(201, reminder);
    next();
});
exports.server.get('/api/v1.0/reminders/:id', (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let result = reminders_1.Reminders.find(user, req.params.id);
    if (result.length === 0) {
        res.send(404, "Not found.");
        next();
        return;
    }
    res.send(result[0]);
    next();
});
exports.server.patch('/api/v1.0/reminders/:id', (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let reminder = reminders_1.Reminders.find(user, req.params.id);
    let created = false;
    if (reminder.length === 0) {
        created = true;
        let result = new reminders_1.Reminder(req.body, true);
        reminders_1.Reminders.update(result);
        res.send(201, result);
    }
    reminder[0].update(req.body);
    reminders_1.Reminders.update(reminder[0]);
    res.send(200, reminder[0]);
    next();
});
exports.server.del('/api/v1.0/reminders/:id', (req, res, next) => {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let reminder = reminders_1.Reminders.find(user, req.params.id);
    if (reminder.length === 0) {
        res.send(401, "Not found");
    }
    else {
        reminders_1.Reminders.delete(reminder[0]);
        res.send(200);
    }
    next();
});
exports.server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', exports.server.name, exports.server.url);
});
nagger.Start(() => { });
nagger.AutoStop(30000, () => { });
//# sourceMappingURL=server.js.map