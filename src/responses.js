import { log } from './util.js';
import { type } from './parsers.js';

const options = (req, res) => {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': req.headers.origin,
    'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': true
  });
  return res.end();
};

const end = (req, res, payload = '', status = 200) => {
  res.statusCode = status;

  // ---> short circuit certain responses

  if (status === 204) return res.end();

  // ---> resolve content type and set default headers

  const [contentType, result] = type(payload);

  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type,Content-length');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,PUT,POST,DELETE,PATCH');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Max-Age', 600);
  res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
  res.end(result);
};

const redirect = (res, Location, status = 301) => {
  res.writeHead(status, { Location });
  res.end();
}

const error = (req, res, object, status = 404) => {
  log('<red>error</red>', status, object, req.url);
  end(req, res, object.error || object.message || object, object.code || status);
}

export {
  options,
  end,
  redirect,
  error
};
