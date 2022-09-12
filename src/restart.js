// ---> dev server restart

export const messages = {
  PRE: 'prepare-restart',
  DO: 'do-restart',
  DONE: 'did-restart',
};

const [,, m, file] = process.argv;

export const restarted = () => m === messages.DONE && file;

export const restartHandler = exit => {
  process.on('message', async m => {
    if (m === messages.PRE) {
      await exit.stop();
      process.send(messages.DO);
    }
  });
};