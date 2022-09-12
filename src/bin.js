#!/usr/bin/env node

import { fork } from 'child_process';
import { watch } from 'fs';

import { messages } from './restart.js';

const [,, fileName] = process.argv;
const file = `./${fileName}`;

let runner = fork(file);

const restart = changed => {
  runner.kill(1);
  runner = fork(file, [ 'did-restart', changed ]);
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

let restarting;

watch(process.cwd(), { recursive: true }, async (type, changed) => {
  if (restarting || type !== 'change') return;
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