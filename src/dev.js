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
    const header = `${CLIENT_NAME} @ ${CLIENT_VERSION}`;
    const footer = `<cyan>${APP_NAME} @ ${APP_VERSION}</cyan> 🎾 <cyan>http://${host}:${port}</cyan>`;
    
    if (process.argv.includes('--minimal')) {
      console.log();
      log(header);
      log(footer);
      console.log();
      return;
    }

    log(`
      <box yellow>
        ${header}
        <hr>
        ${envVars.length ? ['process.env', ...envVars.map(n => `<magenta>${n}</magenta>`), '<hr>'].join('\n') : []}
        ${footer}
      </box>
    `);
  };

  log.call(null);

  return startupMessage;
};
