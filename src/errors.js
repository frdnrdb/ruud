const log = [];

export default {
  add(err, { url }) {
    console.error(err);
    const { name, message, cause, stack, code } = err;
    log.push({
      url,
      name,
      message,
      cause,
      stack: stack && stack.split('\n').slice(1).map(str => str.trim()),
      code,
      time: new Date().toISOString()
    });
  },
  get(index) {
    return index ? log[index] : log;
  }
}
