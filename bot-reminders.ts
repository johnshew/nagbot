'use strict';
import * as _debug from 'debug';
let debug = _debug('tests');

import * as reminders from './reminders';
var remindersStore = reminders.remindersStore;
var conversationsStore = reminders.conversationsStore;

// import * as nag from './nag';
import * as reminderService from './app'; // Our app
var reminderServer = reminderService.server;

import { LuisRecognizer } from 'botbuilder-ai';


import { ConversationReference, TurnContext, Activity, BotAdapter } from 'botbuilder';

function engageOnReminder(context : TurnContext, current : reminders.Reminder, entities : any) : reminders.Reminder
{
    return current;
}