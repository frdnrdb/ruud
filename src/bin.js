#!/usr/bin/env node

import { fork } from 'child_process';
import { watch } from 'fs';
import { join }  from 'path';

import { messages } from './restart.js';

const [ fileName, argvs ] = process.argv.slice(2).reduce((arr, str) => { 
  str.startsWith('-') ? arr[1].push(str) : arr[0] = str;
  return arr;
}, [ '', [] ]);

const file = `./${fileName}`;

let runner = fork(file, argvs);

const restart = changed => {
  runner.kill(1);
  runner = fork(file, [ 'did-restart', changed, ...argvs ]);
};

// ---> prevent reacting to consecutive change events from fs

const timer = (() => {
  const threshold = 1000;
  let time;

  return {
    start: () => time = Date.now(),
    sustain: async () => {
      return new Promise(resolve => setTimeout(
        resolve, 
        Math.max(0, threshold - (Date.now() - time))
      ))
    }
  }
})();

// ---> watcher

let restarting;

const folderToWatch = join(
  process.cwd(),
  file.substring(2).split('/').at(-2) || ''
);

// TODO! instead of testing for node_modules directly, use .gitignore to build tree

watch(folderToWatch, { recursive: true }, async (type, changed) => {
  if (restarting || type !== 'change' || /node_modules/.test(changed)) return;
  restarting = true;

  runner.on('message', async m => {
    if (m === messages.DO) {
      await timer.sustain();
      restart(changed);
      restarting = false;
    }
  });

  runner.send(messages.PRE);
  timer.start();
});