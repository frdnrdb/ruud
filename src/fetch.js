import { URL } from 'url';
import { protocols } from './util.js';

const DEFAULT_TIMEOUT = 5000;

const postParameters = url => {
    // TODO! expand with { port, search, hash, username, password }
    const { protocol, hostname, pathname } = new URL(url);
    return {
        protocol, 
        hostname,
        path: pathname
    };
};

const getProtocol = url => {
    const urlObject = new URL(url);
    return urlObject.protocol.replace(/[^a-zA-Z]/g, '');
};

const statusOk = code => Math.floor(code / 100) === 2;

const parseResponse = (res, body, buffer) => {
    try {
        return buffer
            ? Buffer.concat(body)
            : /json/.test(res.headers['content-type']) 
                ? JSON.parse(body)
                : body;
    } 
    catch ({ message }) {
        return { error: message };
    };
};

const fetch = (url = '', options = {}, streamHandler) => new Promise((resolve, reject) => {
    if (!url) return reject({ error: 'url required' });

    const { 
        method = 'GET',
        headers: inputHeaders = {},
        body,

        silent,
        raw,
        buffer,
    } = options;

    const headers = Object.assign(
        { Accept: '*/*' },
        inputHeaders
    );

    const fetchHandler = res => {
        if (raw) {
            return resolve(res);
        }

        !buffer && res.setEncoding('utf8');

        let body = buffer ? [] : '';

        res.on('error', ({ message }) => reject({ error: message }));
        res.on('data', chunk => buffer ? body.push(chunk) : body += chunk);
        res.on('end', () => resolve(parseResponse(res, body, buffer)));
    };

    const handler = res => {
        if (/HEAD/i.test(method)) {
            return resolve(res);
        }

        if (!statusOk(res.statusCode)) return silent ? resolve() : reject({
            code: res.statusCode,
            error: res.statusMessage
        });

        streamHandler
            ? streamHandler(resolve, reject, res)
            : fetchHandler(res);
    };

    const httpModule = protocols[getProtocol(url)];
    
    const req = body 
        ? httpModule.request(Object.assign(postParameters(url), { method, headers }), handler)
        : httpModule.get(url, { method, headers }, handler);

    if (body) {
        req.write(body);
        req.end();
    }

    req.setTimeout(options.timeout || DEFAULT_TIMEOUT, reject);
    req.on('error', error => resolve({ error: error.message }));
});

const stream = (serverRes, url, buffer) => fetch(url, {}, (resolve, reject, res) => {
    if (buffer) return resolve(res);

    try {
        serverRes.setHeader('Content-Type', res.headers['content-type']);
        res.on('error', ({ message }) => reject({ error: message }));
        res.on('data', chunk => serverRes.write(chunk));
        res.on('end', () => resolve(serverRes.end()));
    }
    catch({ message }) {
        reject({ error: message });
    }
});

export {
    fetch,
    stream
};