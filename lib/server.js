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
const restify = require("restify");
const reminders = require("./reminders");
var remindersStore = reminders.remindersStore;
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
exports.server.get('/api/v1.0/reminders', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    let reminders = yield remindersStore.find("j@s.c");
    res.send(reminders);
    return next();
}));
exports.server.post('/api/v1.0/reminders', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    let user = "j@s.c";
    req.body['user'] = user;
    let reminder = new reminders.Reminder(req.body);
    let update = yield remindersStore.update(reminder);
    res.header("Location", `/api/v1.0/reminders/${reminder.id}`);
    res.send(201, reminder);
    next();
}));
exports.server.get('/api/v1.0/reminders/:id', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let result = yield remindersStore.get(req.params.id);
    if (!result) {
        res.send(404, "Not found.");
    }
    else {
        res.send(result);
    }
    next();
}));
exports.server.patch('/api/v1.0/reminders/:id', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let reminder = yield remindersStore.get(req.params.id);
    let created = false;
    if (!reminder) {
        created = true;
        let result = null;
        try {
            reminder = new reminders.Reminder(req.body, true);
        }
        catch (_a) { }
    }
    else {
        reminder.update(req.body);
    }
    let update = yield remindersStore.update(reminder);
    res.send(created ? 201 : 200, reminder);
    next();
}));
exports.server.del('/api/v1.0/reminders/:id', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    let user = "j@s.c";
    if (!req.params.hasOwnProperty('id') && typeof req.params.id != "string") {
        res.send(400, "id not found");
        next();
        return;
    }
    let reminder = yield remindersStore.get(req.params.id);
    if (!reminder) {
        res.send(401, "Not found");
    }
    else {
        yield remindersStore.delete(reminder);
        res.send(200);
    }
    next();
}));
exports.server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', exports.server.name, exports.server.url);
});
nagger.Start(() => { });
nagger.AutoStop(25000, () => {
    exports.server.close();
    reminders.closeAll();
});
//# sourceMappingURL=server.js.map