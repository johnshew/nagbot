import * as nag from './nag';
import * as httpServer from './server';
import * as reminders from './reminders';

export let server = httpServer.create(process.env.port || process.env.PORT || 3978, () => { });

nag.Start();
nag.AutoStop(25000, () => {
    reminders.close(()=>console.log('reminders closed'));
    server.close(()=>console.log('server closed'));
})
