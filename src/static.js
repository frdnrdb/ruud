import { createReadStream } from 'fs';
import { join } from 'path';
import { mimeType } from './parsers.js';

const assetRegex = /^(script|style|image|font|object|media|manifest|worker|sharedworker|serviceworker|audioworklet|paintworklet|report|xslt|embed|iframe|track|video|audio)$/;

export const setRelative = (headers, session, url) => {
  const header = headers['sec-fetch-dest'] || '';
  const isRoot = header === 'document' && headers['sec-fetch-mode'] === 'navigate';
  const internal = !isRoot && header.match(assetRegex); // NOT secFetchDest 'empty'
  const relative = internal && session.static.get();    
  return { 
    relative,
    relativeUrl: relative && `/${relative}${url}`,
    isRoot
  };     
};

const setRoot = (ctx, params) => {
  const path = params.filter(p => /^\w/.test(p)).join('/'); // remove leading slashes or dots
  ctx.session.static.set(path);
  Object.assign(ctx, {
    relativeRoot: path,
    relative: '',
    relativeUrl: ''
  });
};

export const resolveStatic = async (ctx, path) => {
    try {
        const params = path ? path.params : ctx.params;
        ctx.isRoot && setRoot(ctx, params);

        const { res, relative, file, error } = ctx;
        const fileName = (path && path.file) || file;

        res.statusCode = 200;
        res.setHeader('Content-Type', `${mimeType(fileName)}; charset=utf-8`);

        relative && params.unshift(...relative.split('/'));

        const location = join(process.cwd(), ...params, fileName || 'index.html');

        return new Promise(resolve => {
            let data = '';
            createReadStream(location) 
                .on('data', chunk => (res.write(chunk), data += chunk.toString()))
                .on('end', () => res.end())
                .on('close', () => resolve(data))
                .on('error', () => resolve(error(`${location} not found`)))
        });        
    }
    catch(err) {
        ctx.error(err.message);
    }
};