import * as _debug from 'debug';
let debug = _debug('app');
import * as nag from './nag';
import * as httpServer from './server';
import * as reminders from './reminders';

export let server = httpServer.create(process.env.port || process.env.PORT || 3978);

nag.Start();
nag.AutoStop(25000, () => {
    reminders.close(()=>{});
    server.close(()=>debug('server closed'));
})
