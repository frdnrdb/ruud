import mimeType from './types.js';

const url = (url = '') => {
  const o = {
    url,
    params: [],
    query: {},
    file: undefined
  };

  try {
    const parsed = new URL(url, 'http://placeholder');

    o.params = parsed.pathname
      .split('/')
      .map(p => p.replace(/\.{2,}/g, '.'))
      .filter(Boolean);

    o.file = /\w+\.\w+/.test(o.params.at(-1)) && o.params.pop();
    o.query = Object.fromEntries(parsed.searchParams.entries().map(([k,v]) => [k, v === '' ? true : v])); // ?hello => query.hello 
  } catch {}

  return o;
};

const buffer = (req, resolve, chunks = []) => {
  req
    .on('error', resolve)
    .on('data', chunk => chunks.push(chunk))
    .on('end', () => resolve(Buffer.concat(chunks)));
};

const parser = (req, resolve, payload = '') => {
  req
    .on('error', resolve)
    .on('data', chunk => payload += chunk)
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
      catch (_) {
        resolve(payload);
      }
    });
};

const body = (req, settings) => new Promise(resolve => {
  const { bodyParserBuffer, fileSizeLimit } = settings;

  if (!/POST|PUT|PATCH|DELETE/.test(req.method)) {
    return resolve();
  }

  if (fileSizeLimit) {
    const mb = Number(req.headers['content-length']) / 1024 / 1024;
    if (mb > fileSizeLimit) return resolve({
      error: `Max content size is ${fileSizeLimit} MB (${mb.toFixed(1)})`
    });
  }

  bodyParserBuffer ? buffer(req, resolve) : parser(req, resolve);
});

const isMarkup = str => str && str.indexOf('<') !== -1 && /<[^>]+>[^<]+<\//.test(str);

const type = (payload = '') => {
  if (!payload) {
    return ['text/plain', ''];
  }
  
  if (typeof payload !== 'string') {
    payload = JSON.stringify(payload);
  }  

  if (/export/.test(payload)) {
    return ['application/javascript', payload];
  }
  
  if (isMarkup(payload)) {
    return ['text/html', payload];
  }
  
  return ['text/plain', payload];
};

const queryValueTypes = (str = '') => isNaN(str)
  ? /^(true)|(false)$/.test(str)
    ? !!Number(str.replace(/^(true)|(false)$/, (_, t) => t ? 1 : 0))
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
    const [, value] = str.split('=');
    return value.substring(1, value.length - 1);
  };

  return body
    .split(boundary)
    .map(str => str.trim().split(/\r\n\r\n/))
    .reduce((res, arr) => {
      if (arr.length !== 2) return res;
      const [meta, data] = arr;
      const [, nameString, fileString] = meta.split(';');

      if (fileString) {
        const [filenameString, contentTypeString] = fileString.split(/[\r\n]+/);
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
  isMarkup,
  type,
  mimeType
};
