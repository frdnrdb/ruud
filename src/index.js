import { APP_NAME, APP_VERSION, CLIENT_NAME, CLIENT_VERSION, protocols, log, merge, exit } from './util.js';

import context from './context.js';
import router from './router.js';
import resolveFolder from './folder.js';
import errors from './errors.js';
import { fetch } from './fetch.js';

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

    /*
        default routes unless specified otherwise
    */
    routes: {
        '/': () => 'serve the servants!',
        '/favicon.ico': ({ status }) => status(204),
        '/err': () => errors.get()
    },

    fallback: ({ error }) => error('404')
};

// ---> route handler

const handler = async (ctx, done, { before, after }) => {
    try {
        await done(before && await before(ctx));
        after && await after(ctx);
    }
    catch(err) {
        ctx.end(errors.add(err, ctx), 500);
        after && after(errors.get(0))
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

const updateRouter = router.update;

const ruud = input => {

    const config = typeof input === 'object' 
        ? input 
        : typeof input === 'function'
            ? { fallback: input }
            : {};

    const settings = merge({}, preset, config);
    const { port, host, routes } = settings;

    updateRouter(routes);

    log.call(
        { type: 'box', color: 'magenta' },
        `${APP_NAME} @ ${APP_VERSION}`,
        '---',
        `${CLIENT_NAME} @ ${CLIENT_VERSION}`,
        '---',
        `http://${host}:${port}`,
    );

    const instance = srvr(settings);
    const sockets = new Set();

    instance.on('connection', socket => sockets.add(socket));

    /*
        graceful shut-down
    */
    exit.add(async function() {
        for (const socket of sockets) {
            socket.destroy();
            sockets.delete(socket);
        }
        return new Promise(r => instance.close(() => r(APP_NAME)));
    });
    
    return { 
        instance,
        routes: updateRouter
    };
};

export const server = input => ruud(input);
export { updateRouter as routes };
export { fetch as fetch };
export { resolveFolder as resolveFolder };

export default ruud;