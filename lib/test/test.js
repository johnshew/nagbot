'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const chai = require("chai");
const uuid = require("uuid");
const expect = chai.expect;
chai.use(require('chai-http'));
const app = require("../server"); // Our app
var server = app.GetServer();
describe('API endpoint /api/v1.0/reminders', function () {
    this.timeout(5000); // How long to wait for a response (ms)
    before(function () { });
    after(function () { });
    // /api/v1.0/rem9inders GET 
    it('should return reminders', () => {
        return chai.request(server)
            .get('/api/v1.0/reminders')
            .then(function (res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.be.an('array');
        });
    });
    // /api/v1.0/reminders POST 
    it('should add new reminder', () => {
        return chai.request(server)
            .post('/api/v1.0/reminders')
            .send({
            id: uuid.v4(),
            description: 'excercise',
            nextNotification: Date.parse("Aug 28, 2018 23:30:00"),
            notificationPlan: "ramped"
        })
            .then(function (res) {
            expect(res).to.have.status(201);
            expect(res).to.be.json;
            expect(res).to.have.header('location');
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('id');
        });
    });
    // /api/v1.0/reminders POST 
    it('should add another reminder', () => {
        return chai.request(server)
            .post('/api/v1.0/reminders')
            .send({
            id: uuid.v4(),
            description: 'make bed',
            nextNotification: new Date(Date.now() + 24 * 60 * 60 * 1000).setHours(8),
            notificationPlan: "ramped"
        })
            .then(function (res) {
            expect(res).to.have.status(201);
            expect(res).to.be.json;
            expect(res).to.have.header('location');
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('id');
        });
    });
    var reminders = [];
    // /api/v1.0/reminders GET 
    it('should return the list of reminders', () => {
        return chai.request(server)
            .get('/api/v1.0/reminders')
            .then(function (res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.be.an('array');
            res.body.forEach((item) => reminders.push(item.id));
        });
    });
    // /api/v1.0/reminders/x
    it('should return the one of the existing reminders', () => {
        return chai.request(server)
            .get(`/api/v1.0/reminders/${reminders[0]}`)
            .then(function (res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
        });
    });
    // /api/v1.0/reminders/x
    it('should update one of the existing reminders', () => {
        return chai.request(server)
            .patch(`/api/v1.0/reminders/${reminders[0]}`)
            .send({ active: false })
            .then(function (res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.haveOwnProperty('active').equal(false);
        });
    });
    // /api/v1.0/reminders/x
    it('should return the updated reminder', () => {
        return chai.request(server)
            .get(`/api/v1.0/reminders/${reminders[0]}`)
            .then(function (res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.haveOwnProperty('active').equal(false);
        });
    });
    // /api/v1.0/reminders/x
    it('should delete the updated reminder', () => {
        return chai.request(server)
            .del(`/api/v1.0/reminders/${reminders[0]}`)
            .then(function (res) {
            expect(res).to.have.status(200);
        });
    });
    // /api/v1.0/reminders/x
    it('should not find the updated reminder', () => {
        return chai.request(server)
            .get(`/api/v1.0/reminders/${reminders[0]}`)
            .then(function (res) {
            throw new Error('Object exists!');
        })
            .catch(function (err) {
            expect(err).to.have.status(404);
        });
    });
});
const mongo = require("mongodb");
var mongoClient = mongo.MongoClient;
var mongoPassword = process.env["mongo-password"];
if (!mongoPassword)
    throw new Error('Need mongo-password env variable');
describe('Mongo', function () {
    it('Connect to mongo', (done) => {
        mongoClient.connect(`mongodb://shew-mongo:${encodeURIComponent(mongoPassword)}@shew-mongo.documents.azure.com:10255/?ssl=true&replicaSet=globaldb`, (err, client) => {
            if (err)
                throw err;
            console.log('mongo connected');
            var db = client.db("Test");
            var insertDocument = (db, callback) => {
                db.collection('families').insertOne({
                    "id": "AndersenFamily",
                    "lastName": "Andersen",
                    "parents": [
                        { "firstName": "Thomas" },
                        { "firstName": "Mary Kay" }
                    ],
                    "children": [
                        { "firstName": "John", "gender": "male", "grade": 7 }
                    ],
                    "pets": [
                        { "givenName": "Fluffy" }
                    ],
                    "address": { "country": "USA", "state": "WA", "city": "Seattle" }
                }, (err, result) => {
                    if (err)
                        throw err;
                    console.log("Inserted a document into the families collection.");
                    callback();
                });
            };
            try {
                insertDocument(db, () => {
                    console.log('mongo done');
                    done();
                });
            }
            catch (_a) {
                done();
            }
        });
    });
});
//# sourceMappingURL=test.js.map