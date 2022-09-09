import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import httpProtocol from 'http';
import httpsProtocol from 'https';

import logger from './log.js';
import env from './env.js';
import exitHandler from './exit.js';

// --->

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEV = process.env.NODE_ENV !== 'production';

const { name, version } = (DEV && JSON.parse(readFileSync(`${__dirname}/../package.json`))) || {};

const APP_NAME = name;
const APP_VERSION = version;

const CLIENT_NAME = process.env.npm_package_name;
const CLIENT_VERSION = process.env.npm_package_version;

// logger
const log = logger(DEV);

// dotenv parser
DEV && env(log.bind('blackbg'));

// exit handler 
const exit = exitHandler(log);

// -->

const protocols = {
    http: httpProtocol,
    https: httpsProtocol
};

// -->

const merge = (obj, ...objects) => {
    for (const o of objects) {
        for (const [ key, val ] of Object.entries(o)) {
            if (typeof obj[key] === 'object') {
                merge(obj[key], val);
                continue;
            }
            obj[key] = val;
        }
    }
    return obj;
}

/*
    flatten(o) => 'separated.with.dots'
    flatten(o, '/') => '/prefixed/and/separated
*/
const flatten = (obj, sep = '', pre = '', flat = {}, recursive, k = '') => {
	for (const [ key, value ] of Object.entries(obj)) {
        if (recursive && !sep) sep = '.';
        k = pre + (key.startsWith(sep) ? '' : sep) + key;
        typeof value === 'object' 
            ? flatten(value, sep, k, flat, true) 
            : flat[k] = value;
	}
  return flat;
};

export {
    DEV,

    APP_NAME,
    APP_VERSION,
    CLIENT_NAME,
    CLIENT_VERSION,

    __dirname,
    protocols,

    exit,

    log,
    merge,
    flatten
};