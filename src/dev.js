import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

export default (DEV, log, envVars) => {
  if (!DEV) return () => {};

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const { name, version } = (DEV && JSON.parse(readFileSync(`${__dirname}/../package.json`))) || {};
  
  const APP_NAME = name;
  const APP_VERSION = version;
  const CLIENT_NAME = process.env.npm_package_name;
  const CLIENT_VERSION = process.env.npm_package_version;

  const startupMessage = (host, port) => {
    log(`
      <box yellow>
        ${CLIENT_NAME} @ ${CLIENT_VERSION}
        <hr>
        ${envVars.length ? ['process.env', ...envVars.map(n => `<magenta>${n}</magenta>`), '<hr>'].join('\n') : []}
        <cyan>${APP_NAME} @ ${APP_VERSION}</cyan> 🎾 <cyan>http://${host}:${port}</cyan>
      </box>
    `);
  };

  log.call(null);

  return startupMessage;
};