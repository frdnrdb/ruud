export default async (path, options = {}) => {
  const url = /^wss?:\/\//.test(path)
    ? path
    : `ws${location.protocol.substring(4)}//${location.host}${path.startsWith('/') ? path : '/' + path}`;

  const config = {
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnects: 5,
    ...options
  };

  let ws, reconnects = 0, to;
  const handlers = { open: [], message: [], close: [], error: [] };

  const call = (type, arg) => handlers[type].forEach(fn => fn(arg));
  const tryJson = data => {
    try {
      return JSON.parse(data);
    } catch {
      return data; 
    }
  };

  const socket = {
    send(data) {
      if (typeof data !== 'string') {
        data = JSON.stringify(data || '');
      }
      if (ws.readyState !== WebSocket.OPEN) {
        this.on('open', () => this.send(data));
        return this;
      }
      
      ws.send(data);
      return this;
    },
    on(type, fn) {
      handlers[type]?.push(fn);
      return this;
    },
    close() {
      clearTimeout(to);
      config.autoReconnect = false;
      ws.close();
      return this;
    },
    get raw() {
      return ws;
    }
  };

  return new Promise((resolve) => {
    const connect = () => {
      ws = new WebSocket(url, options.protocols || []);    
      if (options.headers) {
        Object.assign(ws, { headers: options.headers });
      }

      ws.onopen = e => {
        reconnects = 0;
        call('open', e);
        resolve(socket);
      };

      ws.onmessage = e => {
        call('message', tryJson(e.data));
      };

      ws.onclose = e => {
        call('close', e);
        if (config.autoReconnect && reconnects++ < config.maxReconnects) {
          to = setTimeout(connect, config.reconnectInterval);
        }
      };

      ws.onerror = e => call('error', e);
    };

    connect();
  });
};