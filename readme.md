# ruud

the player who serves

---

- **lightweight**: _no dependencies_
- **opinionated**: _easy to use, fast_
- **with**: _router, static files server, optional route cache_
- **dev**: _dotenv parser, restart on file change_
- **see**: [context object](#ctx) _for more details_
- **convenient** [utilities](#util): _folder-to-routes generator, fetch replacement, exit handler, dev logger_

#### install
```sh
npm i -S ruud
```

#### dev auto restart
```json
package.json

"scripts": {
    "dev": "ruud index.js",
    "prod": "node index.js"
}
```

#### initiate 
```js
import app from 'ruud'

// ---> ready 

app().routes({
    '/serve': async ctx => 'the servants',
})

// ---> when one route does it

app(async ctx => 'serve the servants')

// ---> input func is fallback

app(func).routes({
    '/serve': async ctx => 'the servants',
    '/receive': async ({ method, body }) => {
        if (body) {
            // parsed body
            // aka. /POST|PUT|PATCH|DELETE/.test(method)
        }
    }
})

// ---> initiate with options

app({
    port: 80, 
    host: '0.0.0.0',
    protocol: 'http',
    
    fallback: undefined, // fallback for non existing routes
    before: undefined, // before each route
    after: undefined, // after each route
    maxFileSize: undefined, // POST|PUT|PATCH max size
    
    routes: {}, 

    options: {} // https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener
})

// ---> alternatively

import { server, routes } from 'ruud';
const { instance, ...etc } = server()
routes({})

```
- Routes can be modified at any time calling the _routes_ method  (merge)
- Returning _json_, _html_, _string_ etc. will automatically resolve proper content-type headers

#### router
```js
{
    '/user/:name/:preference?': ({ props }) => {
        const { name, preference } = props;
    },
    '/api/v1/cats': () => {},
    '/api': {
        'v2': {
            '/cats': () => {}
            '/dogs': () => {}
        }
    },

    // method control /<METHOD>/rest/of/route
    GET: {
        '/cats': () => {}
    },
    POST: {
        '/cats': ({ body }) => {}
    }
    '/PUT/dogs': () => {} 
}
```

#### default routes
```js
'/' // serve the servants!
'/favicon.ico' // 204 no content
'/err' // array of registered errors
```

#### route cache (memory)
```js
'/api/latest': async ({ cache, fetch }) => {
    cache(minutes); // 0 will invalidate
    return await fetch(latest);
}
```

#### static files
```js
'/public': ({ serve }) => serve() // serves index.html in public folder
'/cats': ({ serve }) => serve('/dist/section/cats') // index.html
'/cat.jpg': ({ serve, file }) => serve(`/dist/assets/img/${file}`)
```

### <a name="ctx">the context object</a>
```js
req, // server request
res, // server response

// ---> request

url, // String
params, // Array
query, // Object
props, // Object
file,  // String

method, // String
headers, // Object

body, // resolved POST|PUT|PATCH|DELETE payload

// ---> convenient return methods

end, // end(payload, code?),
status, // status(code, payload?)
error, // error({ message, code }, code?),
redirect, // redirect(url)

// ---> misc

serve, // static files server, serve(folder)

navigate, // navigate('/some/other/route');
routes, // update/ manipulate: routes({})

cache, // cache(ttl, path?[optional, default current])
cookies, // cookies.set(name, value, { expires, domain }?), cookies.get(name), cookies.del(name)     

fetch, // fetch(url, options?), default GET => JSON, options: { method, headers, body }
stream, // return stream(imageUrl)

log, // dev logger, log(...args)
DEV, // process.env.NODE_ENV !== 'production'
```

### <a name="util">utilities</a>

#### convenient routes generator
```js
/*
    /folder
        /cats.js: export default ctx => {}
        /dogs.js: export default ctx => {}

    routes: { 
        '/cats': func,
        '/dogs': func
    }
*/
import { resolveFolder } from 'ruud';
const routes = await resolveFolder('./folder');
```

#### graceful disconnect
```js
/*
    at server restart/ shut down, you could
    make sure all connections are ended properly 
    by adding them to the async pre-shut-down queue
*/
import { exit } from 'ruud';
exit.add('mongodb users', () => mongoose.connection.close())

```

#### fetch method
```js
// also included in the context object

import { fetch } from 'ruud';

const json = await fetch('https://some.api.com');

const res = await fetch('https://some.api.com', {
    method: 'POST',
    headers: {},
    body: JSON.stringify(json)
})
```

#### dev logger
```js
// also included in the context object

import { log } from 'ruud';
log('development only')
```