import { log } from './util.js';
import { type } from './parsers.js';

const allowedMethods = 'GET,HEAD,OPTIONS,POST,PUT,PATCH,DELETE';

const options = (req, res) => {
  const origin = req.headers.origin;

  const headers = {
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600'
  };

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }

  res.writeHead(204, headers);
  res.end();
};

const end = (req, res, payload = '', status = 200) => {
  res.statusCode = status;

  // ---> short circuit certain responses

  if (status === 204) {
    return res.end();
  }

  // ---> resolve content type and set default headers

  const [ contentType, result ] = type(payload);
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', allowedMethods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
    res.setHeader('Access-Control-Max-Age', '600');
  }

  res.setHeader('Content-Type', `${contentType}; charset=utf-8`);  
  res.end(result);
}

const redirect = (res, Location, status = 301) => {
  res.writeHead(status, { Location });
  res.end();
}

const error = (req, res, object, status = 400) => {
  log('<red>error</red>', status, object, req.url);
  end(req, res, { error: object.error || object.message || object }, object.code || status);
}

export {
  options,
  end,
  redirect,
  error
};
