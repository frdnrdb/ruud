import mimeType from './types.js';

const url = url => {
    if (!url) return;
    const [ path, search = '' ] = url.split('?');
    const params = path.replace(/^https?:\/\//, '').split('/').filter(Boolean);
    const file = /\w+\.\w+/.test(params[params.length - 1]) && params.pop().toLowerCase();
    const query = queryString(search);    
    return { url, params, file, query };
};

const body = (req, payload = '') => new Promise((resolve, reject) => {
    if (!/POST|PUT|PATCH|DELETE/.test(req.method)) {
        return resolve();
    }

    if (req._uploadSizeLimit) {
        const mb = Number(req.headers['content-length'])/1024/1024;
        if (mb > req._uploadSizeLimit) return resolve({ 
            error: `Max content size is ${req._uploadSizeLimit} MB (${mb.toFixed(1)})` 
        });    
    }
      
    req
      .on('data', chunk => payload += chunk)
      .on('error', resolve)
      .on('end', () => {
            const reqType = req.headers['content-type'];

            try {
                if (/form-url/.test(reqType)) {
                    return resolve(queryString(payload))
                }    
                if (/form-data/.test(reqType)) {
                    return resolve(multipart(payload, reqType));
                }            
                if (/image|video|audio/.test(reqType)) {
                    return resolve(payload);
                }

                resolve(JSON.parse(payload));
            }
            catch(error) {
                resolve(payload);
            }
      });
});

const type = (payload = '') => /object|number|boolean/.test(typeof payload)
    ? [ 'application/json', JSON.stringify(payload) ]
    : [ `text/${/<[^>]+>[^<]+<\//.test(payload) ? 'html' : 'plain'}`, payload ];

const queryValueTypes = (str = '') => isNaN(str) 
    ? /^(true)|(false)$/.test(str) 
        ? !!Number(str.replace(/^(true)|(false)$/, (_ ,t) => t ? 1 : 0)) 
        : str 
    : Number(str);

const queryFallbackValue = str => str.includes('=') ? str : `${str}=true`;

const queryString = str => Object.fromEntries(
    str.split('&')
        .filter(Boolean)
        .map(pair => queryFallbackValue(pair).split('=').map(queryValueTypes))
);

const multipart = (body, contentType) => {
    const boundary = '--' + contentType.split('boundary=')[1];

    const getProp = str => {
        const [, value ] = str.split('=');
        return value.substring(1, value.length - 1);        
    };

    return body
        .split(boundary)
        .map(str => str.trim().split(/\r\n\r\n/))
        .reduce((res, arr) => {
            if (arr.length !== 2) return res;
            const [ meta, data ] = arr;
            const [, nameString, fileString ] = meta.split(';');

            if (fileString) {
                const [ filenameString, contentTypeString ] = fileString.split(/[\r\n]+/);
                res.files = res.files || [];
                res.files.push({
                    filename: getProp(filenameString),
                    type: contentTypeString.split('Content-Type: ')[1],
                    data
                });
                return res;
            }

            res[getProp(nameString)] = data;
            return res;
        }, {});
};

export {
    url,
    body,
    type,
    mimeType
};