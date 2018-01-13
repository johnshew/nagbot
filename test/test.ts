'use strict';

import 'mocha';
import * as chai from 'chai';
import * as restify from 'restify';
import * as uuid from 'uuid';

const expect = chai.expect;
chai.use(require('chai-http'));

import * as reminders from '../reminders';
var remindersStore = reminders.remindersStore;

import * as app from '../app'; // Our app
var server = app.server;

describe('API endpoint /api/v1.0/reminders', function () {
  this.timeout(5000); // How long to wait for a response (ms)

  before(function () { });
  after(function () { });

  
  it ('should be ready to talk to the database', () => {
    return remindersStore.initialized.then(() => {
      expect(remindersStore.ready).to.be.true;
    });
  });

  it ('should clear the database', () => {
    return remindersStore.deleteAll().then(()=>{
      expect(remindersStore.ready).to.be.true;  // 1 means command executed properly.
    })
  });

  // /api/v1.0/rem9inders GET 
  it('should return 0 reminders', () => {
    return chai.request(server)
      .get('/api/v1.0/reminders')
      .then( (res) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.an('array').and.length(0);
      });
  });

  // /api/v1.0/reminders POST 
  it('should add new reminder', () => {
    return chai.request(server)
      .post('/api/v1.0/reminders')
      .send({
        id: uuid.v4() as string,
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
        id: uuid.v4() as string,
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

  var remindersTracker : string[] = [];

  // /api/v1.0/reminders GET 
  it('should return an array of reminders', () => {
    return chai.request(server)
      .get('/api/v1.0/reminders')
      .then(function (res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.an('array');
        (res.body as reminders.Reminder[]).forEach((item) => remindersTracker.push(item.id));
      });
  });

  // /api/v1.0/reminders/x
  it('should return one of the existing reminders', () => {
    return chai.request(server)
      .get(`/api/v1.0/reminders/${remindersTracker[0]}`)
      .then(function (res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
      });
  });

  // /api/v1.0/reminders/x
  it('should update one of the existing reminders', () => {
    return chai.request(server)
      .patch(`/api/v1.0/reminders/${remindersTracker[0]}`)
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
      .get(`/api/v1.0/reminders/${remindersTracker[0]}`)
      .then(function (res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.haveOwnProperty('active').equal(false);
      });
  });

  // /api/v1.0/reminders/x
  it('should delete the updated reminder', () => {
    return chai.request(server)
      .del(`/api/v1.0/reminders/${remindersTracker[0]}`)
      .then(function (res) {
        expect(res).to.have.status(200);
      });
  });

  // /api/v1.0/reminders/x
  it('should not find the updated reminder', () => {
    return chai.request(server)
      .get(`/api/v1.0/reminders/${remindersTracker[0]}`)
      .then(function (res) {
        throw new Error('Object exists!');
      })
      .catch(function (err) {
        expect(err).to.have.status(404);
      });
  });

});
