import ruud from './src/index.js';

const app = ruud({ port: 5555 });

app.routes({
  '/': () => 'hello world!',
  'internal/settings': ctx => ctx.settings,
  'async': () => new Promise(r => setTimeout(r('result'), 3000)),
  async cached({ cache }) {
    cache(5);
    await new Promise(r => setTimeout(r, 3000));
    return 'first visit takes 3 seconds, consecutive visits are instant for the next 5 minutes';
  }
});

app.route('/:name', ctx => `hello ${ctx.props.name}!`);
app.use('route', () => `known api pattern`);
