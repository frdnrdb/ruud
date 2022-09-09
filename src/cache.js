import { SESSION_DURATION } from './session.js';

const values = {};
const expirations = {}
const timeouts = {};
const statics = {};

const queue = [];

// ---> cache method exposed in context

const cache = ({ url }, ttl, customPath) => queue.push([ url, ttl, customPath ]);


// ---> 

cache.get = ({ url, relativeUrl, session }) => {
    const path = relativeUrl || url;
    statics[path] && session.static.set(statics[path]);
    return values[path];
};

// ---> store expirations: set matching ttl in relation to main route

cache.update = (path, payload, minutes = SESSION_DURATION) => {
    const ttl = minutes * 1000 * 60;
    values[path] = payload;
    expirations[path] = +new Date + ttl;
    clearTimeout(timeouts[path]);
    timeouts[path] = setTimeout(() => {
        delete values[path];
        delete expirations[path];
        delete timeouts[path];
    }, ttl);

    return payload;
};

cache.set = ({ url, relative, relativeUrl, relativeRoot }, payload) => {

    // ---> if route is cached and file is a relative reference

    if (relative) {
        const cachedRoute = `/${relative}`;
        const expires = expirations[cachedRoute];
        if (!expires) return;
        const ttl = (expires - new Date)/1000/60;
        return cache.update(relativeUrl, payload, ttl);
    } 

    // ---> handle queue

    for (const item of queue) {
        const [ cachePath, ttl, customPath ] = item;
        if (url === cachePath) {
            queue.splice(queue.indexOf(item), 1);
            const path = customPath || cachePath;

            // store root path for files cached relative to parent folder
            statics[path] = relativeRoot;

            return cache.update(path, payload, ttl);
        }
    }

    return payload;
};

export default cache;