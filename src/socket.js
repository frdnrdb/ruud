import { createHash } from 'crypto';
import { tryJson, normalize } from './util.js';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OPCODES = { TEXT: 0x1, BINARY: 0x2, CLOSE: 0x8, PING: 0x9, PONG: 0xA };
const PING_PAYLOAD = Buffer.from('ping');
const EMPTY_BUFFER = Buffer.allocUnsafe(0);

class Socket {
  constructor(socket, req, handler) {
    this.socket = socket;
    this.req = req;
    this.isAlive = true;
    this.listeners = { message: [], close: [], open: [], error: [] };
    this.handler = handler;
    this.buffer = EMPTY_BUFFER;

    try {
      const url = new URL(req.url, 'http://localhost');
      this.path = url.pathname;
      this.props = Object.fromEntries(url.searchParams);
    } catch {
      this.path = req.url.split('?')[0];
      this.props = {};
    }    

    socket.setKeepAlive(true, 30000);    
    socket.on('data', this._onData);
    socket.on('close', this._onClose);

    this._pingInterval = setInterval(this._pingTick, 30000);

    setTimeout(() => this.listeners.open.forEach(fn => fn()), 0);
  }

  get(key) {
    return this.props[key];
  }
  
  set(key, value) {
    this.props[key] = value;
    return this;
  }  

  _onData = data => {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, data]) : data;
    this.buffer = this._parseFrames(this.buffer);
  };

  _onClose = () => {
    this.isAlive = false;
    clearInterval(this._pingInterval);
    this.listeners.close.forEach(fn => fn());
      const sockets = this.handler.pathSockets[this.path];
      if (sockets) {
        const idx = sockets.indexOf(this);
        if (idx !== -1) sockets.splice(idx, 1);
      }
      this.handler.connections.delete(this.socket);    
  };

  _pingTick = () => {
    if (!this.isAlive) return this.close();
    this._send(OPCODES.PING, PING_PAYLOAD);
    this.isAlive = false;
    setTimeout(() => !this.isAlive && this.close(), 5000);
  };

  _parseFrames(buffer) {
    let offset = 0;

    while (offset + 2 <= buffer.length) {
      const byte1 = buffer[offset];
      const byte2 = buffer[offset + 1];
      const opcode = byte1 & 0xF;
      const isMasked = byte2 & 0x80;
      let len = byte2 & 0x7F;
      let headerSize = 2;

      if (len === 126) {
        if (offset + 4 > buffer.length) break;
        len = buffer.readUInt16BE(offset + 2);
        headerSize = 4;
      } else if (len === 127) {
        if (offset + 10 > buffer.length) break;
        const high = buffer.readUInt32BE(offset + 2);
        const low = buffer.readUInt32BE(offset + 6);
        if (high !== 0) return EMPTY_BUFFER;
        len = low;
        headerSize = 10;
      }

      const maskSize = isMasked ? 4 : 0;
      const totalFrameSize = headerSize + maskSize + len;
      
      if (offset + totalFrameSize > buffer.length) break;

      const maskStart = offset + headerSize;
      const payloadStart = maskStart + maskSize;
      const payload = buffer.subarray(payloadStart, payloadStart + len);

      if (isMasked) {
        const mask = buffer.subarray(maskStart, maskStart + 4);
        for (let i = 0; i < len; i++) {
          payload[i] ^= mask[i & 3];
        }
      }

      this._handleFrame(opcode, payload);
      offset += totalFrameSize;
    }

    return offset < buffer.length ? buffer.subarray(offset) : EMPTY_BUFFER;
  }

  _handleFrame(opcode, payload) {
    switch (opcode) {
      case OPCODES.TEXT:
        const message = tryJson(payload.toString());
        this.listeners.message.forEach(fn => fn(message));
        break;
      case OPCODES.BINARY:
        this.listeners.message.forEach(fn => fn(payload));
        break;
      case OPCODES.PING:
        this._send(OPCODES.PONG, payload);
        break;
      case OPCODES.PONG:
        this.isAlive = true;
        break;
      case OPCODES.CLOSE:
        this.close();
        break;
    }
  }

  _send(opcode, buffer) {
    const len = buffer.length;
    const headerSize = len < 126 ? 2 : len <= 65535 ? 4 : 10;
    const frame = Buffer.allocUnsafe(headerSize + len);

    frame[0] = 0x80 | opcode;
    if (len < 126) frame[1] = len;
    else if (len <= 65535) frame[1] = 126, frame.writeUInt16BE(len, 2);
    else frame[1] = 127, frame.writeUInt32BE(0, 2), frame.writeUInt32BE(len, 6);    
    buffer.copy(frame, headerSize);

    try {
      this.socket.write(frame);
    } catch {
      this.close();
    }
  }

  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
    return this;
  }

  send(data) {
    const isBuffer = Buffer.isBuffer(data);
    const opcode = isBuffer ? OPCODES.BINARY : OPCODES.TEXT;
    this._send(opcode, typeof data === 'string' ? Buffer.from(data) : isBuffer ? data : Buffer.from(JSON.stringify(data)));
    return this;
  }

  broadcast(data) {
    const sockets = this.handler.pathSockets[this.path] || [];
    
    sockets.forEach(socket => {
      if (socket !== this) socket.send(data);
    });
    
    return sockets.length - 1;
  }  

  close() {
    if (this.socket.destroyed) return;
    this._send(OPCODES.CLOSE, EMPTY_BUFFER);
    this.socket.end();
    clearInterval(this._pingInterval);
    this.isAlive = false;
  }

  get clients() {
    return (this.handler.pathSockets[this.path] || []).length;
  }  
}

export default {
  connections: new Map(),
  handlers: {},
  pathSockets: {},
  connectHandlers: {}, 

  isSocketRequest: req =>
    req.headers.upgrade?.toLowerCase() === 'websocket' &&
    req.headers.connection?.toLowerCase()?.includes('upgrade') &&
    Object.hasOwn(req.headers, 'sec-websocket-key'),

  handleUpgrade(req, socket) {
    const key = req.headers['sec-websocket-key'];
    const acceptKey = createHash('sha1').update(key + GUID).digest('base64');

    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket', 
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ].join('\r\n'));

    const ws = new Socket(socket, req, this);

    this.connections.set(socket, ws);
    (this.pathSockets[ws.path] ||= []).push(ws);
    this.connectHandlers[ws.path]?.forEach(handler => handler(ws, req));
    (this.handlers[ws.path] || this.handlers['*'])?.(ws, req);
  },

  register(_path, handler) {
    const path = normalize(_path).split('?')[0];
    
    if (typeof handler === 'function') {
      this.handlers[path] = handler;
    }
    
    return {
      broadcast: (data) => {
        const sockets = this.pathSockets[path] || [];
        sockets.forEach(socket => socket.send(data));
        return sockets.length;
      },
      
      on: (event, fn) => {
        if (event === 'connect') {
          const handlers = this.connectHandlers[path] ||= [];
          if (!handlers.includes(fn)) {
            handlers.push(fn);
          }
          const existing = this.pathSockets[path] || [];
          existing.forEach(socket => fn(socket, socket.req));
        }
        return this;
      },
      
      get clients() {
        return (this.pathSockets[path] || []).length;
      }
    };
  }
};