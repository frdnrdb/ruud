# ruud

the player who serves

---

- **lightweight**: _no dependencies_
- **intuitive/ opinionated**: _easy to use, fast_
- **with**: _dotenv parser, router, body parser, static files server, socket interface, optional route cache_
- **see**: [context object](#ctx) _for more details_
- **convenient** [utilities](#util): _folder-to-routes generator, exit handler, dev logger_

#### install
```sh
npm i -S ruud
```

#### initiate 
```js
import app from 'ruud'

// ---> personal preference 

app({
    routes: {
        '/': async ctx => {}
    }
})

// ---> alternative approach 

app().routes({
    '/': async ctx => {}
})

// ---> ultra minimal approach

app(async ctx => {})

// ---> initiate with options and routes (defaults listed)

app({
    port: 80, 
    host: '0.0.0.0',
    protocol: 'http',

    options: {}, // https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener

    bodyParser: true, // resolves ctx.body
    bodyParserBuffer: false, // resolves ctx.body as buffer if bodyParser is active
    fileSizeLimit: false, // POST|PUT|PATCH max size

    socket: false, // socket interface

    before: undefined, // before each route
    after: undefined, // after each route (ctx.payload will contain route result)
    fallback: undefined, // fallback for non existing routes

    routes: {}
})

// ---> methods to modify routes

import ruud from 'ruud'

const app = ruud({ 
  routes: {
    '/': async ctx => 'serve the servants!'
  } 
})

app.routes({
    '/serve': () => 'the servants' 
})
app.route('serve/the', () => 'servants!')
app.get('serve/the/servants', () => '!') // app.post, app.put, app.delete

// ---> middleware

app.use(async (ctx, next) => await next())
app.use('/cats/:name?', async (ctx, next) => await next())

// ---> alternatively

import { server, routes } from 'ruud';
const { instance, ...etc } = server()
routes({})

```
- Routes can be modified at any time calling the _routes_ method (merge)
- Returning _json_, _html_, _string_ etc. will automatically resolve proper content-type headers

#### router
```js
{
    '/user/:name/:preference?': ({ props }) => {
        const { name, preference = 'soft' } = props;
    },
    
    '/any/*/param', // any/inbetween/param
    '/any/param/**', // any/param/that/will/follow/after

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
'/favicon.ico' // 204 no content
'/err' // array of caught errors
```

#### route cache (memory)
```js
'/api/latest': async ({ cache }) => {
    cache(minutes); // 0 will invalidate
    return await fetch('something');
}
```

#### static files
```js
'/public': ({ serve }) => serve() // serves index.html in public folder
'/cats': ({ serve }) => serve('/dist/section/cats') // index.html
'/cat.jpg': ({ serve, file }) => serve(`/dist/assets/img/${file}`)

// rudimentary html template support, eg. <h1>hello {{ name }}</h1>
'/hello': ({ serve }) => serve('/public/hello.html', { name: 'you' })

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
bodyParser, // async function (manually resolve body)

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
cookies, // cookies.set(name, value, { expires[seconds, default 300], path[default '/'], SameSite[default 'none'], Secure[default true], domain, HttpOnly, ... }?), cookies.get(name), cookies.del(name)     

stream, // return stream(imageUrl)

settings, // returns current setup
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

#### dev logger
```js
// also included in the context object

import { log } from 'ruud';
log('<cyan>development only</cyan>')
log('<black><magenta>black text on magenta background</magenta></black>')
```

#### socket

- to be documented


#### tip
> ruud internal _"nodemon"_ implementation was removed (v1.1.0) in favour of native node watcher 
```json
"scripts": {
    "dev": "node --watch index.js", // node > v18.11.0
    "prod": "node index.js"
}
```