"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const bolt_1 = require("@slack/bolt");
const parse = require('csv-parse/lib/sync');
require('dotenv').config();
const app = new bolt_1.App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
});
const handleShortcut = (shortcut, ack, client) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let files = [];
    let ts = '';
    let channel = '';
    if ('message' in shortcut) {
        files = (_a = shortcut.message.files) !== null && _a !== void 0 ? _a : [];
        ts = (_b = shortcut.message_ts) !== null && _b !== void 0 ? _b : '';
        channel = shortcut.channel.id;
    }
    if (files.length === 0) {
        const params = { channel: channel, thread_ts: ts, text: 'Sorry! You must include a file.' };
        yield client.chat.postMessage(params);
        return;
    }
    else if (files.length > 1) {
        const params = { channel: channel, thread_ts: ts, text: 'Sorry! I\'m new here and can only work on 1 file at a time.' };
        yield client.chat.postMessage(params);
        return;
    }
    try {
        const file = files[0];
        const headers = { headers: { Authorization: 'Bearer ' + process.env.SLACK_BOT_TOKEN } };
        const fileResponse = yield axios_1.default.get(file.url_private, headers);
        const fileData = fileResponse.data;
        let reply = '';
        let fileContents = '';
        let fileName = '';
        if (shortcut.callback_id === 'remove_duplicates') {
            const lines = fileData.split(/[\r\n]+/);
            const noDuplicates = [];
            let numDuplicates = 0;
            for (const l of lines) {
                const trimmed = l.trim();
                if (noDuplicates.indexOf(trimmed) === -1) {
                    noDuplicates.push(trimmed);
                }
                else {
                    numDuplicates += 1;
                }
            }
            reply = `Here you go! I removed ${numDuplicates} duplicates.`;
            fileContents = noDuplicates.join('\n');
            fileName = 'no_duplicates_' + file.name;
        }
        else if (shortcut.callback_id === 'csv_to_json') {
            const csvData = parse(fileData, { columns: true, skip_empty_lines: true });
            const fileParts = file.name.split('.');
            if (fileParts.length > 1) {
                fileName = fileParts.slice(0, fileParts.length - 1).join('.');
                fileName += '.json';
            }
            fileContents = JSON.stringify(csvData);
            reply = `Here you go!`;
        }
        const params = { channels: channel, thread_ts: ts,
            initial_comment: reply,
            filename: fileName,
            content: fileContents };
        const uploadResult = yield client.files.upload(params);
        console.log(reply);
    }
    catch (e) {
        console.error(e);
    }
    yield ack();
});
app.shortcut('csv_to_json', ({ shortcut, ack, client, say }) => __awaiter(void 0, void 0, void 0, function* () {
    yield handleShortcut(shortcut, ack, client);
}));
app.shortcut('remove_duplicates', ({ shortcut, ack, client, say }) => __awaiter(void 0, void 0, void 0, function* () {
    yield handleShortcut(shortcut, ack, client);
}));
(() => __awaiter(void 0, void 0, void 0, function* () {
    // Start the app
    yield app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
}))();
//# sourceMappingURL=index.js.map