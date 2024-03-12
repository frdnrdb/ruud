import ruud from './src/index.js';

const app = ruud({ port: 5555 });

app.routes({
  '/': () => 'hello world!',
  '/settings': ctx => ctx.settings
});

app.route('/:name', ctx => `hello ${ctx.props.name}!`);