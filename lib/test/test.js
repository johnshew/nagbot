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
    var elements = [];
    // /api/v1.0/reminders GET 
    it('should return the list of reminders', () => {
        return chai.request(server)
            .get('/api/v1.0/reminders')
            .then(function (res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.be.an('array');
            res.body.forEach((item) => elements.push(item.id));
        });
    });
    // /api/v1.0/reminders/x
    it('should return the one of the existing reminders', () => {
        return chai.request(server)
            .get(`/api/v1.0/reminders/${elements[0]}`)
            .then(function (res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
        });
    });
    // /api/v1.0/reminders/x
    it('should update one of the existing reminders', () => {
        return chai.request(server)
            .patch(`/api/v1.0/reminders/${elements[0]}`)
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
            .get(`/api/v1.0/reminders/${elements[0]}`)
            .then(function (res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.haveOwnProperty('active').equal(false);
        });
    });
});
//# sourceMappingURL=test.js.map