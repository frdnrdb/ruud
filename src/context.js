import { DEV, log } from './util.js';

import { cookie, session } from './session.js';
import { url, body } from './parsers.js';
import { end, redirect, error } from './responses.js';
import { fetch, stream } from './fetch.js';

import router from './router.js';
import cache from './cache.js';

import resolveStatic from './static.js';

const relative = ({ referer, host }, session, url) => {
    if (!referer || !referer.includes(host)) return;

    const relative = session.static.get();

    return relative && {
        relative,
        relativeUrl: `/${relative}${url}`
    }; 
};

export default async (handler, settings, req, res) => {
    DEV && req.connection.ref();
    
    log('<cyan>request</cyan>', req.url);

    const { fallback, fileSizeLimit } = settings;

    if (fileSizeLimit) req._uploadSizeLimit = fileSizeLimit;

    const route = url(req.url);
    const cookies = cookie(req, res);
    const state = session(cookies);

    const ctx = {
        req,
        res,
        ...route, // url, query, params, file

        method: req.method,
        body: await body(req), 
        headers: req.headers,
        cookies,     

        redirect: redirect.bind(null, res),
        status: (code, payload) => end(req, res, payload, code),
        error: error.bind(null, req, res),
        end: end.bind(null, req, res),

        serve: path => resolveStatic(ctx, url(path)),
        cache: (ttl, path) => cache(ctx, ttl, path),

        fetch,
        stream: stream.bind(null, res),

        routes: router.update,
        navigate: url => router.navigate(url, ctx),

        log,
        DEV,

        // internal
        session: state,    
        ...relative(req.headers, state, route.url),
    };

    if (/HEAD|OPTIONS/.test(req.method)) {
        return ctx.end(true, 200);
    }

    const done = async before => {
        const func = router(ctx) || (ctx.relative && resolveStatic) || fallback;
        const payload = cache.get(ctx) || cache.set(ctx, await func(ctx)) || before;

        // if route returns an error
        if (payload instanceof Error) {
            throw(payload);
        };

        !res.finished && (
            payload
                ? ctx.end(payload)
                : ctx.error('no content', 204)
        );
    
        // add to context for after-function
        ctx.payload = payload;

        // avoid keepalive at server restart
        DEV && req.connection.unref();
    }

    return handler(ctx, done, settings);
};