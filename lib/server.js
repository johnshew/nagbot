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
// Setup restify server
function create(config, callback) {
    let server = restify.createServer();
    server.use(restify.plugins.bodyParser());
    server.use(restify.plugins.queryParser());
    // Make it a web server
    server.get('/', (req, res, next) => {
        res.redirect('./public/test.html', next);
    });
    server.get(/\/public\/?.*/, restify.plugins.serveStatic({
        directory: __dirname
    }));
    server.get('/api/v1.0/reminders', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let reminders = yield remindersStore.find("j@s.c");
        res.send(reminders);
        return next();
    }));
    server.post('/api/v1.0/reminders', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let user = "j@s.c";
        req.body['user'] = user;
        let reminder = new reminders.Reminder(req.body);
        let update = yield remindersStore.update(reminder);
        res.header("Location", `/api/v1.0/reminders/${reminder.id}`);
        res.send(201, reminder);
        next();
    }));
    server.get('/api/v1.0/reminders/:id', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let user = "j@s.c";
        if (!req.params.hasOwnProperty('id') || typeof req.params.id != "string") {
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
    server.patch('/api/v1.0/reminders/:id', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
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
            reminder = new reminders.Reminder(req.body, true);
        }
        else {
            reminder.update(req.body);
        }
        let update = yield remindersStore.update(reminder);
        res.send(created ? 201 : 200, reminder);
        next();
    }));
    server.del('/api/v1.0/reminders/:id', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
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
    server.listen(config, () => {
        console.log(`Server listening on ${server.url}`);
    });
    return server;
}
exports.create = create;
//# sourceMappingURL=server.js.map