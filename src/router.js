import context from './context.js';
import { normalize, flatten } from './util.js';

const setProps = (ctx, route, params) => {
  if (!route) {
    return;
  }

  if (params) {
      ctx.props = Object.fromEntries(
        params
          .map((param, i) => route.props[i] && [route.props[i], param])
          .filter(Boolean)
      );
  }

  return route.func;
};

const router = ctx => {
  const { url, params } = ctx;
  const path = params.length ? '/' + params.join('/') : url.split('?')[0];

  let selected;
  
  for (const r of router.handlers) {
    if (r.method !== ctx.method) continue;
    if (!r.match.test(path)) continue;
    selected = r;
    break;
  }

  const routeHandler = setProps(ctx, selected, params);

  const middleware = router.middleware.filter(m => !m.route || m.match.test(path));
  const middlewareHandler = middleware.length && (async () => {
    let idx = 0;
    let result;
    const next = async () => {
      if (idx < middleware.length) {
        const m = middleware[idx++];
        const handler = setProps(ctx, m, m.match && params);
        return await handler(ctx, next);
      } 
      if (selected) {
        result = await routeHandler(ctx);
      }
    };    
    await next();
    return result;
  });

  return middlewareHandler || routeHandler;
};

const sortValue = o => !isNaN(o.idx)
  ? 99 - o.idx
  : o.isGreedy
    ? 99
    : o.isProp 
      ? o.props.length 
      : 0;

const sorter = (a, b) => sortValue(a) - sortValue(b);
const parseRoute = (route, func) => {
  const o = {
    match: '',
    props: [],
    method: 'GET',
    func
  };

  if (typeof func !== 'function') {
    o.func = () => func;
  }
  
  const methodRegex = /(GET|POST|PUT|DELETE|(MIDDLEWARE)(\[\d+\]))\/?/;
  route = route.replace(methodRegex, (_, method, middleware, id) => {
    middleware 
      ? (o.middleware = true, o.idx = Number(id.slice(1, -1)))
      : o.method = method;
    return '';
  });

  o.route = normalize(route);

  let isAny;
  const match = o.route.replace(/\/(:)?([^/?]+)(\?)?/g, (_, isProp, param, optional) => {
    o.props.push(isProp && param);
    o.isProp = o.isProp || !!isProp;
    isAny = /^\*{1,}$/.test(param);
    o.isGreedy = o.isGreedy || (isAny && param.length !== 1);
    const regex = `\/${isProp || (isAny && !o.isGreedy) ? '[^\/]{0,}' : param}`;
    return optional ? `(${regex})?` : regex;
  });

  o.match = new RegExp(`^${o.isGreedy ? match.replace(/\/\*{2,}.*/, '.*') : match}$`);

  return o;
}

router.routes = {};
router.handlers = [];
router.middleware = [];

const handleUpdate = (path, func) => {
  router.routes[path] = func;
  const o = parseRoute(path, func);
  const ref = router[o.middleware ? 'middleware' : 'handlers'];
  const idx = ref.findIndex(r => r.route === o.route && r.method === o.method); 
  idx === -1 ? ref.push(o) : ref[idx] = o;
  ref.sort(sorter); 
}

router.update = payload => {
  for (const [path, func] of Object.entries(flatten(payload, '/'))) {
    router.updateOne(path, func);
  }
};

router.updateOne = (path, func) => {
  handleUpdate(normalize(path), func);
};

router.navigate = async (url, { req, res }) => {
  req.url = url;
  return new Promise(resolve => context(async (_, done) => {
    resolve(await done());
  }, {}, req, res));
};

export default router;
