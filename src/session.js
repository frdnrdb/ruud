import crypto from 'crypto';
import { DEV } from './util.js';

const STATIC = 'x-static';
const SESSION = 'x-session';
export const SESSION_DURATION = 5; // minutes

const parse = (cookie = '') => Object.fromEntries(cookie.split('; ').map(p => p.split('=')));

const stringify = (props = {}) => {
  return Object.entries(Object.assign({ path: '/', expires: SESSION_DURATION, SameSite: DEV ? 'Lax' : 'None', Secure: !DEV }, props)).map(([key, val]) => {
    if (typeof val === 'boolean') {
      return val && key;
    }
    if (key === 'expires') {
      val = new Date(+new Date + val * 1000 * 60).toGMTString();
    }
    return `${key}=${val}`;
  }).filter(Boolean).join(';');
};

const get = (req, name = '') => {
  const o = parse(req.headers.cookie);
  return name ? o[name] : o;
};

const set = (res, name = '', value = '', props) => {
  res.setHeader('Set-Cookie', `${name}=${value};${stringify(props)}`);
};

const del = (res, name = '', props = {}) => {
  set(res, name, '', Object.assign(props, { expires: -100 }));
};

const cookie = (req, res) => ({
  get: get.bind(null, req),
  set: set.bind(null, res),
  del: del.bind(null, res)
});

const sessionHash = () => crypto.randomBytes(32).toString('base64');

const session = cookies => {
  const get = () => cookies.get(SESSION)
  const set = () => cookies.set(SESSION, get() || sessionHash(), { expires: SESSION_DURATION });

  return {
    static: {
      get: () => cookies.get(STATIC),
      set: value => cookies.set(STATIC, value)
    },
    get,
    set
  };
};

export {
  cookie,
  session
};
