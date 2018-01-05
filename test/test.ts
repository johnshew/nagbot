'use strict';

import * as chai from 'chai';
import * as restify from 'restify';
import * as uuid from 'uuid';

const expect = chai.expect;
chai.use(require('chai-http'));

import * as app from '../server'; // Our app

var server = app.GetServer();

describe('API endpoint /api/v1.0/reminders', function () {
  this.timeout(5000); // How long to wait for a response (ms)

  before(function () {
  });

  after(function () {
  });

  // /api/v1.0/rem9inders GET 
  it('should return Working', () => {
    return chai.request(server)
      .get('/api/v1.0/reminders')
      .then(function (res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.an('string');
      });
  });

  // /api/v1.0/reminders POST 
  it('should add new task', () => {
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
        expect(res).to.have.header('Location');
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('id');
      });
  });

});

