# nagbot

This is preliminary work to get ready for integration with the Microsoft Bot Framework vnext.

The app provides a REST API for a set of tasks that should be completed. It implements a period check of the status of the tasks.  

## Technologies

The main part of the app is a REST CRUD API written in Typescript with node.js, mongo,and restify - all with ES2016 async/await patterns.

This project may be a useful starting template for getting these all working together.

The projects includes debug, mocha, and chai for testing and integration with Travis-CI.
