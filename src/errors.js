const log = [];
const maxEntries = 100;

export default {
  add(err, { url }) {
    console.error(err);

    const { name, message, cause, stack, code } = err;
    log.unshift({
      url,
      name,
      message,
      cause,
      stack: stack && stack.split('\n').slice(1).map(str => str.trim()),
      code,
      time: new Date().toISOString()
    });
    
    if (log.length > maxEntries) {
      log.pop();
    }

    return {
      error: message
    };
  },
  get(index) {
    return index ? log[index] : log;
  }
}
