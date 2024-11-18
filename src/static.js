import { createReadStream } from 'fs';
import { join } from 'path';
import { mimeType } from './parsers.js';

const assetFileRegex = /\.(js|mjs|css|png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff|woff|woff2|ttf|otf|eot|mp4|webm|ogv|mp3|wav|ogg|flac|aac|opus|pdf|json|xml|csv|txt)$/;
const assetHeaderRegex = /^(script|style|image|font|object|media|manifest|worker|sharedworker|serviceworker|audioworklet|paintworklet|report|xslt|embed|iframe|track|video|audio)$/;

export const setRelative = (headers, session, url) => {
  const header = headers['sec-fetch-dest'];
  const isRoot = header
    ? header === 'document' && headers['sec-fetch-mode'] === 'navigate'
    : /\.html$/.test(url);

  const isAsset = !isRoot && (header ? header.match(assetHeaderRegex) : url.match(assetFileRegex)); // NOT secFetchDest 'empty'
  const relative = isAsset && session.static.get();    
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

const applyTemplate = (data, props) => {
  if (typeof props !== 'object' || Array.isArray(props)) {
    return data;
  }
  return Object.entries(props).reduce((html, [key, value]) => {
    return html.replace(new RegExp(`\\{\\{\\s{0,}${key}\\s{0,}\\}\\}`, 'gm'), value);
  }, data);
};

export const resolveStatic = async (ctx, path, props) => {
    try {
        const params = path ? path.params : ctx.params;
        ctx.isRoot && setRoot(ctx, params);

        const { res, relative, file, error } = ctx;
        const fileName = (path && path.file) || file;

        res.statusCode = 200;
        res.setHeader('Content-Type', `${mimeType(fileName)}; charset=utf-8`);

        relative && params.unshift(...relative.split('/'));

        const location = join(process.cwd(), ...params, fileName || 'index.html');
        const useTemplate = location.endsWith('.html') && props;

        return new Promise(resolve => {
            let data = '';
            createReadStream(location) 
                .on('data', chunk => {
                  !useTemplate && res.write(chunk);
                  data += chunk.toString()
                })
                .on('end', () => {
                  useTemplate ? res.end(applyTemplate(data, props)) : res.end()
                })
                .on('close', () => resolve(data))
                .on('error', () => resolve(error(`${location} not found`)))
        });        
    }
    catch(err) {
        ctx.error(err.message);
    }
};