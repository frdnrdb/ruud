import context from './context.js';
import { merge, flatten } from './util.js';

const router = ctx => {
    const { routes } = router;
    const { url, params } = ctx;
    const path = params.length ? '/' + params.join('/') : url.split('?')[0];

    if (path in routes) {
        return routes[path];
    }

    for (const { method, match, props, func } of router.parsed) {

        if (method && method !== ctx.method) continue;
        if (!match.test(path)) continue;

        ctx.props = Object.fromEntries(
            params
                .map((param, i) => props[i] && [ props[i], param ])
                .filter(Boolean)
        );

        return ctx.route = func;
    }
};

const parse = routes => router.parsed = Object.entries(routes)
    .reduce((parsed, [ route, func ]) => {
        const o = {
            match: '',
            props: [],
            method: 0,
            func
        };

        route = route.replace(/^\/(GET|POST|PUT)/, (_, m) => {
            o.method = m;
            return '';
        });

        o.route = route;

        let isAny, isGreedy;

        const match = route.replace(/\/(:)?([^/?]+)(\?)?/g, (_, isProp, param, optional) => {
            o.props.push(isProp && param);
            o.isProp = o.isProp || !!isProp;
            isAny = /^\*{1,}$/.test(param);
            isGreedy = isGreedy || (isAny && param.length !== 1);
            const regex = isProp || (isAny && !isGreedy) ? '[^\/]{0,}' : param;
            return optional ? `(\/${regex})?` : `\/${regex}`;
        });

        o.match = new RegExp(`^${isGreedy ? match.replace(/\/\*{2,}.*/, '.*') : match}$`);

        parsed.push(o);

        return parsed;
    }, [])
    .sort((a, b) => {
        return (a.isProp ? a.props.length : 0) - (b.isProp ? b.props.length : 0);
    });

router.routes = {};
router.parsed = {};

router.update = payload => {
    parse(merge(router.routes, flatten(payload, '/')));
};

router.navigate = async (url, { req, res }) => {
    req.url = url;
    return new Promise(resolve => context(async (_, done) => {
        resolve(await done());
    }, {}, req, res));
};

export default router;