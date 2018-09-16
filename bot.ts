'use strict';
import * as _debug from 'debug';
let debug = _debug('bots');

import * as reminders from './reminders';
var remindersStore = reminders.remindersStore;
var conversationsStore = reminders.conversationsStore;

// import * as nag from './nag';
import * as reminderService from './app'; // Our app
var reminderServer = reminderService.server;

import { LuisRecognizer } from 'botbuilder-ai';

const appId = '6f2bf26c-dad4-4b18-a1da-b6936008a601 ';
const subscriptionKey = '9886d9b8725a4cbeb19c3cf0708b5c83';
const model = new LuisRecognizer({ appId: appId, subscriptionKey: subscriptionKey });

// Create Cloud Bot Adapter

import { ConsoleAdapter, BotFrameworkAdapter, MemoryStorage, ConversationReference, StoreItems, TurnContext, Activity, BotAdapter, RecognizerResult } from 'botbuilder';
import * as restify from 'restify';

const cloudAdapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`bot listening to ${server.url}`);
});

server.post('/api/messages', (request, response, next) => {
    cloudAdapter.processActivity(request, response, async (context) => {
        await handleActivity(context);
        next();
    });
});



// Create Console Bot Adapter

const consoleAdapter = new ConsoleAdapter();
const storage = new MemoryStorage();
consoleAdapter.listen(async (context) => {
    await handleActivity(context);
});

let adapters: { [channelId: string]: BotAdapter; } = {};

function updateChannelIdToAdapterMap(context: TurnContext) {
    // Not need here since we do the hack below to record the adapter.  Also this won't work with multiple BotFrameworkAdapters.
    let channelId = (context.activity && context.adapter) ? TurnContext.getConversationReference(context.activity).channelId : undefined;
    if (channelId) adapters[channelId] = context.adapter;
}



async function handleActivity(context: TurnContext) {

    updateChannelIdToAdapterMap(context);

    switch (context.activity.text.trim().toLowerCase()) {
        case 'help':
            return replyWithHelp(context);
        case 'subscribe':
            subscribeUser(context);
            return context.sendActivity('You have subscribed');
        default:
            context.sendActivity(`You said ${context.activity.text}`);

            let recognized = await model.recognize(context);
            let intentName = topIntent(recognized);
            switch (intentName) {
                case 'Reminder.Find':
                    return await replyWithReminders(context);
                case 'Reminder.Create':
                    return await createReminders(context, recognized);
                default:
                    return await replyWithHelp(context);
            }
    }
}

function replyWithHelp(context: TurnContext) {
    return context.sendActivity('You can subscribe, create, or find reminders.');
}

async function saveToMemoryStorage(user: string, conversationReference: ConversationReference) {
    let changes = {};
    changes[user] = conversationReference;
    storage.write(changes);
}

async function saveToConversationsStore(user: string, conversationReference: Partial<ConversationReference>) {
    await conversationsStore.update({ user: user }, { user: user, conversationReference: conversationReference });
}

async function lookupInMemoryStore(user: string): Promise<Partial<ConversationReference> | undefined> {
    const data = await storage.read([user]);
    const conversationReference = data[user] as ConversationReference;
    return conversationReference;
}

async function lookupInConversationsStore(user: string): Promise<Partial<ConversationReference> | undefined> {
    let result = await conversationsStore.find({ user: user });
    if (result.length == 0) { return undefined; }
    else { return result[0].conversationReference; }
}

async function subscribeUser(context: TurnContext) {
    const activity = context.activity;
    const conversationReference = TurnContext.getConversationReference(activity);
    const user = (conversationReference.user) ? conversationReference.user.id : undefined;
    if (!user) {
        throw new Error('No user in subscribe');
    }

    let adapter = context.adapter;
    await saveToConversationsStore(user, conversationReference);

    setTimeout(() => {
        messageUser(adapter, user, "You've been notified");
    }, 4000);
}

async function messageUser(adapter: BotAdapter, user, message) {
    try {
        let conversationReference = await lookupInConversationsStore(user);
        if (!conversationReference) return;
        adapter.continueConversation(conversationReference, async (context) => {
            await context.sendActivity(message).catch(e => { console.error(e); throw e })
        });
    } catch (err) {
        console.log(`messageUser error ${err}`);
    }
    return;
}

async function createReminders(context: TurnContext, recognized: RecognizerResult) {
    context.sendActivity('Create reminder ');
    let intent = topIntent(recognized);
    let score = intent ? recognized.intents[intent] : 0;
    if (intent) {
        await context.sendActivity(`Score: ${score}, Intents: ${JSON.stringify(recognized.entities)}`).catch(e => { console.error(e); throw e })
    };
}

async function replyWithReminders(context: TurnContext) {
    await context.sendActivity('Reminders...').catch(e => { console.error(e); throw e })
}


function topIntent(recognized: RecognizerResult): string | undefined {
    let intentScoreMap = recognized.intents;
    let topScore = 0;
    var result: string | undefined = undefined;
    for (let intentName in intentScoreMap) {
        let score = intentScoreMap[intentName].score;
        if (score > topScore) { topScore = score; result = intentName }
    }
    return result;
}


