import { SESSION_DURATION } from './session.js';

const values = new Map();
const expirations = new Map();
const timeouts = new Map();
const statics = new Map();
const queue = new Map(); // url -> [ttl, customPath]

const MAX_CACHE_SIZE = 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ---> periodic cleanup of expired entries

setInterval(() => {
  const now = Date.now();
  for (const [path, expiration] of expirations) {
    if (expiration < now) {
      values.delete(path);
      expirations.delete(path);
      clearTimeout(timeouts.get(path));
      timeouts.delete(path);
    }
  }
}, CLEANUP_INTERVAL);

// ---> cache method exposed in context

const cache = ({ url }, ttl, customPath) => queue.set(url, [ttl, customPath]);

// --->

cache.get = ({ url, relativeUrl, session }) => {
  const path = relativeUrl || url;
  statics.has(path) && session.static.set(statics.get(path));
  return values.get(path);
};

// ---> enforce cache size limit

const enforceLimit = () => {
  if (values.size < MAX_CACHE_SIZE) return;
  
  const oldestPath = values.keys().next().value;
  values.delete(oldestPath);
  expirations.delete(oldestPath);
  clearTimeout(timeouts.get(oldestPath));
  timeouts.delete(oldestPath);
};

// ---> store expirations: set matching ttl in relation to main route

cache.update = (path, payload, minutes = SESSION_DURATION) => {
  enforceLimit();
  
  const ttl = minutes * 1000 * 60;
  values.set(path, payload);
  expirations.set(path, Date.now() + ttl);
  
  clearTimeout(timeouts.get(path));
  timeouts.set(path, setTimeout(() => {
    values.delete(path);
    expirations.delete(path);
    timeouts.delete(path);
  }, ttl));

  return payload;
};

cache.set = ({ url, relative, relativeUrl, relativeRoot }, payload) => {
  
  // ---> if route is cached and file is a relative reference
  
  if (relative) {
    const cachedRoute = `/${relative}`;
    const expires = expirations.get(cachedRoute);
    if (!expires) return;
    const ttl = (expires - Date.now()) / 1000 / 60;
    return cache.update(relativeUrl, payload, ttl);
  }

  // ---> handle queue

  if (queue.has(url)) {
    const [ttl, customPath] = queue.get(url);
    queue.delete(url);
    
    const path = customPath || url;
    statics.set(path, relativeRoot);
    return cache.update(path, payload, ttl);
  }

  return payload;
};

export default cache;
