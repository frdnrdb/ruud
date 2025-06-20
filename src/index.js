import { protocols, normalize, merge, exit, startupMessage, log } from './util.js';

import context from './context.js';
import router from './router.js';
import resolveFolder from './folder.js';
import errors from './errors.js';
import socketHandler from './socket.js';

const preset = {
  /*
      optional options for createServer
      https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener
      https://stackoverflow.com/a/5998795
  */
  options: {},

  /*
      aws/ heroku elastic load balancer uses http
  */
  protocol: 'http',
  port: process.env.PORT || 80,
  host: process.env.HOST || '0.0.0.0',

  socket: false,

  /*
      default routes unless specified otherwise
  */
  routes: {
    '/err': () => errors.get()
  },

  bodyParser: true,
  bodyParserBuffer: false,
  fileSizeLimit: false,

  middleware: [],

  fallback: ({ status }) => status(404, '404')
};

// ---> route handler

const handler = async (ctx, done, { before, after, socket }) => {
  if (ctx.url === '/favicon.ico') {
    ctx.res.setHeader('Cache-Control', 'max-age=86400, public');
    ctx.res.statusCode = 204;
    return;
  }

  if (socket && socketHandler.isSocketRequest(ctx.req)) {
    ctx.res.statusCode = 101;
    ctx.res.setHeader('Connection', 'Upgrade');
    ctx.res.setHeader('Upgrade', 'socket');    
    socketHandler.handleUpgrade(ctx.req, ctx.res.socket);
    return;
  }

  try {
    await done(before && await before(ctx));
    after && await after(ctx);
  }
  catch (err) {
    ctx.end(errors.add(err, ctx), err.code || 500);
    after && await after(errors.get(0))
  }
};

// ---> create server

const srvr = settings => {
  const { port, host, protocol, options } = settings;
  return protocols[protocol]
    .createServer(options, context.bind(null, handler, settings))
    .listen(port, host);
};

// ---> init server

const expose = {
  resolveFolder,
  exit,
  socket: socketHandler.register.bind(socketHandler),
  log,
};

expose.routes = function(routes) {
  router.update(routes);
  return this;
};

expose.route = function(path, fn) {
  router.updateOne(path, fn);
  return this;
};

let middlewareCounter = 0;
expose.use = function(str, fn) {
  router.updateOne(`MIDDLEWARE[${middlewareCounter++}]${fn ? str : ''}`, fn || str);
  return this;
};

['get', 'post', 'put', 'delete'].forEach(method => {
  expose[method] = function(path, fn) {
    router.updateOne(method.toUpperCase() + normalize(path), fn);
    return this;
  };
});

// ---> init server

const ruud = input => {
  const config = typeof input === 'object'
    ? input
    : typeof input === 'function'
      ? { fallback: input }
      : {};

  const settings = merge({}, preset, config);
  const { port, host, routes, socket } = settings;

  if (!config.routes) {
    router.updateOne('/', () => 'serve the servants!');
  }

  if (socket) {
    /*
      add route for client-side socket handler
        /socket.js => global variable
        /socket => export
    */
    routes['/socket.*'] = async ({ res, file }) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      const module = await import('./client.js');
      const _fn = module.default.toString();
      const _name = 'createSocket';

      res.end(file
        ? `window.${_name} = ${_fn};` 
        : `const _fn = ${_fn}; export const ${_name} = _fn; export default _fn;`
      );
    };
  }

  router.update(routes);
  startupMessage(host, port);

  const instance = srvr(settings);
  const connections = new Set();

  instance.on('connection', connection => connections.add(connection));

  /*
      graceful shut-down
  */
  exit.add('server', async function() {
    for (const [connection, socket] of socketHandler.connections) {
      socket.close();
      socketHandler.connections.delete(connection);
    }

    for (const connection of connections) {
      connection.destroy();
      connections.delete(connection);
      connection.unref();
    }
    return new Promise(r => instance.close(r));
  });

  Object.assign(expose, { instance });

  return expose;
};

Object.assign(ruud, expose);

export const server = input => ruud(input);
export const socket = ruud.socket;
export const routes = ruud.routes;
export { resolveFolder as resolveFolder };
export { exit as exit };
export { log as log };

export default ruud;
