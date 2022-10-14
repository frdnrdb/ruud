import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

import env from './env.js';
import { restarted, restartHandler } from './restart.js';

export default (DEV, log, exit) => {
  if (!DEV) return () => {};

  const parsedEnvVars = env();

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const { name, version } = (DEV && JSON.parse(readFileSync(`${__dirname}/../package.json`))) || {};
  const APP_NAME = name;
  const APP_VERSION = version;
  const CLIENT_NAME = process.env.npm_package_name;
  const CLIENT_VERSION = process.env.npm_package_version;

  const changedFile = restarted();

  const startupMessage = (host, port) => {
    !changedFile && log(`
      <box yellow>
        ${CLIENT_NAME} @ ${CLIENT_VERSION}
        <hr>
        ${parsedEnvVars.length ? ['process.env', ...parsedEnvVars.map(n => `<magenta>${n}</magenta>`), '<hr>'].join('\n') : []}
        <cyan>${APP_NAME} @ ${APP_VERSION}</cyan> 🎾 <cyan>http://${host}:${port}</cyan>
      </box>
    `);
  };

  changedFile 
    ? log('<cyan>server restarted</cyan>', '<yellow>changed</yellow>', changedFile)
    : log.call(null); 

  env(!changedFile && log);
  restartHandler(exit);

  return startupMessage;
};