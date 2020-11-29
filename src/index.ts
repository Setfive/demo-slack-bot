import {AckFn, GlobalShortcut, MessageShortcut} from '@slack/bolt/dist/types';
import {WebClient} from '@slack/web-api'
import axios from 'axios';
import {App, SlackShortcutMiddlewareArgs} from '@slack/bolt';
const parse = require('csv-parse/lib/sync');

require('dotenv').config();


interface IFileMessage {
    id: string;
    url_private: string;
    name: string;
}

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
});

const handleShortcut = async (shortcut: GlobalShortcut | MessageShortcut,
                              ack: AckFn<void>, client: WebClient) => {
    let files: IFileMessage[] = [];
    let ts = '';
    let channel = '';

    if ('message' in shortcut) {
        files = shortcut.message.files ?? [] as IFileMessage[];
        ts = shortcut.message_ts ?? '';
        channel = shortcut.channel.id;
    }

    if(files.length === 0) {
        const params = {channel: channel, thread_ts: ts, text: 'Sorry! You must include a file.'};
        await client.chat.postMessage(params);
        return;
    }else if(files.length > 1) {
        const params = {channel: channel, thread_ts: ts, text: 'Sorry! I\'m new here and can only work on 1 file at a time.'};
        await client.chat.postMessage(params);
        return;
    }

    try {
        const file = files[0];
        const headers = {headers: {Authorization: 'Bearer ' + process.env.SLACK_BOT_TOKEN}};
        const fileResponse = await axios.get(file.url_private, headers);
        const fileData = fileResponse.data;
        let reply = '';
        let fileContents = '';
        let fileName = '';

        if(shortcut.callback_id === 'remove_duplicates') {
            const lines = fileData.split(/[\r\n]+/);
            const noDuplicates: string[] = [];
            let numDuplicates = 0;

            for (const l of lines) {
                const trimmed = l.trim();
                if (noDuplicates.indexOf(trimmed) === -1) {
                    noDuplicates.push(trimmed);
                } else {
                    numDuplicates += 1;
                }
            }

            reply = `Here you go! I removed ${numDuplicates} duplicates.`;
            fileContents = noDuplicates.join('\n');
            fileName = 'no_duplicates_' + file.name;
        }else if(shortcut.callback_id === 'csv_to_json') {
            const csvData = parse(fileData, {columns: true, skip_empty_lines: true});

            const fileParts = file.name.split('.');

            if(fileParts.length > 1) {
                fileName = fileParts.slice(0, fileParts.length - 1).join('.');
                fileName += '.json';
            }

            fileContents = JSON.stringify(csvData);
            reply = `Here you go!`;
        }

        const params = {channels: channel, thread_ts: ts,
                        initial_comment: reply,
                        filename: fileName,
                        content: fileContents};
        const uploadResult = await client.files.upload(params);

        console.log(reply);
    }catch(e) {
        console.error(e);
    }

    await ack();
};

app.shortcut('csv_to_json', async ({ shortcut, ack, client, say}) => {
    await handleShortcut(shortcut, ack, client);
});

app.shortcut('remove_duplicates', async ({ shortcut, ack, client, say}) => {
    await handleShortcut(shortcut, ack, client);
});

(async () => {
    // Start the app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();