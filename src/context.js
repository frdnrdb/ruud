import { DEV, log } from './util.js';

import { cookie, session } from './session.js';
import { url, body } from './parsers.js';
import { options, end, redirect, error } from './responses.js';
import { stream } from './fetch.js';

import router from './router.js';
import cache from './cache.js';

import { setRelative, resolveStatic } from './static.js';

export default async (handler, settings, req, res) => {
  DEV && req.connection.ref();

  log('<cyan>request</cyan>', req.url);

  if (req.method === 'HEAD') {
    return end(req, res, true, 200);
  }

  if (req.method === 'OPTIONS') {
    return options(req, res);
  }

  const route = url(req.url);
  const cookies = cookie(req, res);
  const state = session(cookies);

  const bodyParser = () => body(req, settings);

  const ctx = {
    req,
    res,
    ...route, // url, query, params, file

    method: req.method,
    body: settings.bodyParser && await bodyParser(),
    bodyParser,
    headers: req.headers,
    cookies,

    redirect: redirect.bind(null, res),
    status: (code, payload) => end(req, res, payload, code),
    throw: (message) => error(req, res, { error: message, throw: true }),
    error: error.bind(null, req, res),
    end: end.bind(null, req, res),

    serve: (path, props) => resolveStatic(ctx, url(path), props),
    cache: (ttl, path) => cache(ctx, ttl, path),

    stream: stream.bind(null, res),

    routes: router.update,
    navigate: url => router.navigate(url, ctx),

    log,
    DEV,

    // internal
    settings,
    session: state,
    ...setRelative(req.headers, state, route.url)
  };

  const done = async before => {
    const func = (ctx.relative && resolveStatic) || router(ctx) || settings.fallback;
    
    // removed async check for code simplicity over perf (diff neglible)
    // removed: func.constructor.name === 'AsyncFunction' ? await func(ctx) : func(ctx)
    // add some day: res = func(), res instanceof Promise ? await res : res;
    
    const payload = cache.get(ctx) || cache.set(ctx, await func(ctx)) || before;
    if (payload instanceof Error) {
      throw (payload);
    };

    if (payload instanceof Error) {
      throw (payload);
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
