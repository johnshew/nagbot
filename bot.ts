'use strict';
import * as _debug from 'debug';
let debug = _debug('tests');


import * as reminders from './reminders';
var remindersStore = reminders.remindersStore;
// import * as nag from './nag';
import * as reminderService from './app'; // Our app
var reminderServer = reminderService.server;

import { ConsoleAdapter, BotFrameworkAdapter, MemoryStorage, ConversationReference, StoreItems, TurnContext, Activity } from 'botbuilder';
import { LuisRecognizer, LuisRecognizerResult } from 'botbuilder-ai';

const appId = '6f2bf26c-dad4-4b18-a1da-b6936008a601 ';
const subscriptionKey = '9886d9b8725a4cbeb19c3cf0708b5c83';
const model = new LuisRecognizer({ appId: appId, subscriptionKey: subscriptionKey });

/* import * as restify from 'restify';

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
 */

const consoleAdapter = new ConsoleAdapter();
const storage = new MemoryStorage();


consoleAdapter.listen(async (context) => {
    // console.log(`Got activity ${ JSON.stringify(context)}`);
    switch (context.activity.text.trim().toLowerCase()) {
        case 'help':
            replyWithHelp(context);
            return;
        case 'subscribe':
            subscribeUser(context);
            context.sendActivity('You have subscribed');
            return;
    }
    let recognized = await model.recognize(context);
    let intentName = topIntent(recognized);
    switch (intentName) {
        case 'Reminder.Find':
            return replyWithReminders(context);
        case 'Reminder.Create':
            return createReminders(context, recognized);
        default:
            return replyWithHelp(context);
    }
});

function subscribeUser(context: TurnContext) {
    const activity = context.activity;
    const conversationReference = TurnContext.getConversationReference(activity);
    const user = (conversationReference.user) ? conversationReference.user.id : undefined;
    if (!user) {
        throw new Error('No user in subscribe');
    }

    let changes = {};
    changes[user] = conversationReference;
    storage.write(changes);

    setTimeout(() => {
        messageUser(user, "You've been notified");
    }, 4000);
}

async function messageUser(user, message) {
    const data = await storage.read([user]);
    const conversationReference = data[user] as ConversationReference;
    consoleAdapter.continueConversation(conversationReference, (context) => {
        context.sendActivity("Notification");
    });
}


function createReminders(context: TurnContext, recognized: LuisRecognizerResult) {
    context.sendActivity('Create reminder ', JSON.stringify(context.activity));
    let intent = topIntent(recognized);

    if (intent) {
        context.sendActivity(`Found ${intent} with ${JSON.stringify(recognized.entities)}`)
    };
}

function replyWithReminders(context: TurnContext) {
    context.sendActivity('Reminders...');
}

function replyWithHelp(context: TurnContext) {
    context.sendActivity('Help topic');
}

function topIntent(recognized: LuisRecognizerResult): string | undefined {
    let intentScoreMap = recognized.intents;
    let topScore = 0;
    var result: string | undefined = undefined;
    for (let intentName in intentScoreMap) {
        let score = intentScoreMap[intentName];
        if (score > topScore) { topScore = score; result = intentName }
    }
    return result;
}
