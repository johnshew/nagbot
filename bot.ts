'use strict';
import * as _debug from 'debug';
let debug = _debug('tests');


import * as reminders from './reminders';
var remindersStore = reminders.remindersStore;
// import * as nag from './nag';
import * as reminderService from './app'; // Our app
var reminderServer = reminderService.server;

import { Bot, MemoryStorage, ConversationReference } from 'botbuilder';
import { BotFrameworkAdapter } from 'botbuilder-services';
import { ConsoleAdapter } from 'botbuilder-node';
import { LuisRecognizer } from 'botbuilder-ai';

const appId = '6f2bf26c-dad4-4b18-a1da-b6936008a601 ';
const subscriptionKey = '9886d9b8725a4cbeb19c3cf0708b5c83';
const model = new LuisRecognizer({ appId: appId, subscriptionKey: subscriptionKey });


import * as restify from 'restify';

// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

const cloudAdapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

server.post('/api/messages', cloudAdapter.listen() as any);

const consoleAdapter = new ConsoleAdapter().listen();
const storage = new MemoryStorage();

const bot = new Bot(consoleAdapter)
    .use(model)
    .onReceive((context) => {
        const intentName = context.topIntent ? context.topIntent.name : 'None';
        const intentScore = (context.topIntent) ? context.topIntent.score : 0;
        console.log('intent: ', intentName, ' with score of ', intentScore);
        const utterance = (context.request.text || '').trim().toLowerCase();
        if (utterance === 'subscribe') {
            const reference = context.conversationReference;
            const userId = reference && reference.user && reference.user.id;
            const changes = {};
            changes['reference/' + userId] = reference;
            return storage.write(changes)
                .then(() => subscribeUser(userId))
                .then(() => {
                    context.reply(`Thank You! We will message you shortly.`);
                });
        }
        if (intentScore > 0.4) switch (intentName) {
            case 'Reminder.Find':
                return replyWithReminders(context);
            case 'Reminder.Create':
                return createReminders(context);
            default:
                context.reply(`Thank You! We will message you shortly.`);
        }

        return replyWithHelp(context);

    });

function createReminders(context: BotContext) {
    context.reply('Create reminder ', context.request);
    if (context.topIntent && context.topIntent.entities) context.topIntent.entities.forEach(element => {
        context.reply(JSON.stringify(element));
    });
}

function replyWithReminders(context: BotContext) {
    context.reply('Reminders...');
}

function replyWithHelp(context: BotContext) {
    context.reply('Help topic');
}


function subscribeUser(userId) {
    setTimeout(() => {
        createContextForUser(userId, (context) => {
            context.reply(`You've been notified!`);
        });
    }, 2000);
}

function createContextForUser(userId, onReady) {
    const referenceKey = 'reference/' + userId;
    return storage.read([referenceKey])
        .then((rows) => {
            const reference = rows[referenceKey] as ConversationReference;
            bot.createContext(reference, onReady);
        });
}