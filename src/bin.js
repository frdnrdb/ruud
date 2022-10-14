#!/usr/bin/env node

import { fork } from 'child_process';
import { watch } from 'fs';
import { join }  from 'path';
import fs from 'fs';

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

// ---> watcher

(async restarting => {
  // ---> very simple gitignore parser NOT considering match patterns

  const parseIgnore = (str = '', set = new Set()) => {
    str.replace(/^(?:[^*#\n\r]+)$/gm, key => set.add(key.trim()));
    return [...set].filter(Boolean);
  };
  
  // ---> use gitignore as hint for watcher

  const defaultIgnore = [ 'node_modules/', '.DS_Store' ];

  const resolvedIgnore = await new Promise(resolve => {
    const { promises: { access, readFile } } = fs;
    const gitignore = join(process.cwd(), '.gitignore');
    access(gitignore)
      .then(() => readFile(gitignore, 'utf8')).then(resolve)
      .catch(() => resolve(defaultIgnore.join('\n')))
  });

  // ---> assume main file directory is top level for watcher

  const filesToIgnore = new RegExp(parseIgnore(resolvedIgnore).join('|'));
  const currentFolder = file.substring(2).split('/').at(-2) || '';
  const folderToWatch = join(process.cwd(), currentFolder);

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

  // --->

  watch(folderToWatch, { recursive: true }, async (type, changed) => {
    if (restarting || type !== 'change' || filesToIgnore.test(changed)) return;
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
})();