import context from './context.js';
import { merge, flatten } from './util.js';

const parsed = {};

const parsedRoute = route => {
    return parsed[route] || (() => {
        const props = [];
        const match = new RegExp(`^${
            route
                .replace(/\/(:)?([^/?]+)(\?)?/g, (_, isProp, param, optional) => {
                    props.push(isProp && param);
                    if (!isProp) return `\/${param}`;
                    const regex = '[^\/]+';
                    return optional ? `(\/${regex})?` : `\/${regex}`;
                })
        }$`);
    
        return parsed[route] = {
            match,
            props
        };
    })();
};

const router = ctx => {
    if (router.inactive) return;

    const { routes } = router;
    const { url, params } = ctx;
    const path = params.length ? '/' + params.join('/') : url.split('?')[0];

    if (path in routes) {
        return routes[path];
    }

    for (const [ route, func ] of Object.entries(routes)) {
        const { match, props } = parsedRoute(route);    
        if (!match.test(path)) continue;

        ctx.props = Object.fromEntries(
            params
                .map((param, i) => props[i] && [ props[i], param ])
                .filter(Boolean)
        );

        return ctx.route = func;
    }
};

router.inactive = true;
router.routes = {};

router.update = payload => {
    merge(router.routes, flatten(payload, '/'));
    delete router.inactive;
};

router.navigate = async (url, { req, res }) => {
    req.url = url;
    return new Promise(resolve => context(async (_, done) => {
        resolve(await done());
    }, {}, req, res));
};

export default router;