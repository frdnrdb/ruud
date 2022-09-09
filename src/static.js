import { createReadStream } from 'fs';
import { join } from 'path';
import { mimeType } from './parsers.js';

const relativeRoot = (ctx, parameters) => {
    const path = parameters.join('/');
    ctx.session.static.set(path),
    ctx.relativeRoot = path;
};

export default async (ctx, path) => {
    try {
        const { res, relative, params, file, error } = ctx;
        const parameters = path ? path.params : params;
        const fileName = (path && path.file) || file;

        relative 
            ? parameters.unshift(...relative.split('/'))
            : relativeRoot(ctx, parameters);

        const location = join(process.cwd(), ...parameters, fileName || 'index.html');

        res.statusCode = 200;

        res.setHeader('Content-Type', `${mimeType(fileName)}; charset=utf-8`);

        return new Promise(resolve => {
            let data = '';
            createReadStream(location) 
                .on('data', chunk => (res.write(chunk), data += chunk.toString()))
                .on('end', () => res.end())
                .on('close', () => resolve(data))
                .on('error', () => resolve(error(`${!fileName ? 'index.html' : 'file'} not found`)))
        });        
    }
    catch(err) {
        error(err.message);
    }
};