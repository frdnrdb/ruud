import httpProtocol from 'http';
import httpsProtocol from 'https';

import exitHandler from './exit.js';
import logger from './log.js';
import prepareDev from './dev.js';
import env from './env.js';

// --->

const DEV =  process.env.NODE_ENV !== 'production';

// dev logger 
const log = logger(DEV);

// exit handler 
const exit = exitHandler(log);

// dev dotenv parser + restart handler
const startupMessage = prepareDev(DEV, log, env());

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
    protocols,

    exit,
    log,
    startupMessage,

    merge,
    flatten
};