/*

// ---> cookies

// client
const socket = await createSocket('/chat');

// server
app.socket('/chat', (socket, req) => {
  const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
  const user = validateSession(sessionId);
  if (!user) {
    return socket.close();
  }
  
  socket.user = user;
  socket.send(`welcome back, ${user.name}!`);
});

// ---> headers

// client
const socket = await createSocket('/chat', {
  headers: {
    'X-Client-ID': '123',
    'Authorization': 'Bearer token123'
  }
});

// server
app.socket('/chat', (socket, req) => {
  const clientId = req.headers['x-client-id'];
  const authHeader = req.headers['authorization'];
  if (!clientId || !validateAuth(authHeader)) {
    return socket.close();
  }
  
  socket.clientId = clientId; 
});

// ---> query params

// client
const socket = await createSocket('/chat?username=bob&role=admin');

// server
app.socket('/chat', (socket, req) => {
  socket.send(`Welcome, ${socket.get('username')}!`);
});

*/


/*
npm install -g dts-gen
dts-gen -m ruud -f ruud.d.ts
*/

import ruud from './src/index.js';

const app = ruud({ 
  port: 5555,
  socket: true,
  routes: {
    '/': () => 'hello world!',
    async cached({ cache }) {
      cache(5);
      await new Promise(r => setTimeout(r, 3000));
      return 'first visit takes 3 seconds, consecutive visits are instant for the next 5 minutes';
    }
  }
});

app.get('ui', ({ serve }) => serve('temp/ui/dist'));

// ---> different methods to add more routes

app.route('hello/:name', ctx => `hello ${ctx.props.name}!`);
app.get('hei', () => 'hadet!');

app.get('template', ({ serve }) => {
  return serve(`
    <h3>velkommen, kjære {{user.name}} ({{user.age}})! {{arr[3]}}</h3>  
  `, {
    arr: [0,1,2,3],
    user: {
      name: 'ruud',
      age: 42
    }
  });
})

app.get('static', () => `
  socket example, see console(s)
  
  <!-- v1 global createSocket -->

  <script src="/socket.js"></script>
  <script>
    (async () => {
      const socket = await createSocket('/chat?user=global user');
      socket.send('global script!');
      socket.on('message', console.log.bind(console, 'global script:'));
    })();
  </script>

  <!-- v2 import createSocket -->

  <script type="module">
    import { createSocket } from '/socket?user=module'; 
    const socket = await createSocket('/chat?user=module user');
    socket.send('module script!');
    socket.on('message', console.log.bind(console, 'module script:'));

    const s = await createSocket('/whatever');
    s.send({ key: 'username', data: 'ruud' });
    s.send('baluba');
    s.on('message', console.log);
    s.on('close', () => console.log('backend socket closed'));
  </script>  
`)

const chat = app.socket('/chat', (socket, req) => {
  socket.on('message', (message) => {
    socket.send(`socket message from server to ${socket.user}`);
    setTimeout(() => {
      socket.broadcast(`broadcast from server via ${socket.get('user')} to ${req.url}: ${message}`);
    }, 2000);
  });  

  socket.on('close', () => {
    console.log(`socket ${req.url} closed, maybe client window closed/ reloaded`);
  });
});

setTimeout(() => {
  chat.broadcast('broadcast from server after 3 seconds');
}, 5000);

app.socket('*', (socket, req) => {
  socket.send(`server response to ${req.url} connection`);
  socket.on('message', (message) => {
    console.log('message', message);
    if (message.key === 'username') {
      return socket.send(`welcome ${message.data}`);
    }
    socket.send({ message: `socket reply to ${req.url}` });
  });
});