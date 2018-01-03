'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const expect = chai.expect;
chai.use(require('chai-http'));
const app = require("../server"); // Our app
var server = app.GetServer();
describe('API endpoint /api', function () {
    this.timeout(5000); // How long to wait for a response (ms)
    before(function () {
    });
    after(function () {
    });
    // /api GET 
    it('should return Working', function () {
        return chai.request(server)
            .get('/api')
            .then(function (res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.be.an('string');
        });
    });
    // /api/new POST 
    it('should add new task', function () {
        return chai.request(server)
            .post('/api/create')
            .send({
            description: 'excercise',
            nextNotification: Date.parse("Aug 28, 2018 23:30:00"),
            notificationPlan: "ramped"
        })
            .then(function (res) {
            expect(res).to.have.status(201);
            expect(res).to.be.json;
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('id');
        });
    });
});
//# sourceMappingURL=test.js.map