/* @flow */
import EventEmitter from 'events';

type ConnectionOptions = {
  WebSocket: Class<WebSocket>,
  uri: string
}

export class Socket extends EventEmitter {
  _WebSocket: Class<WebSocket>;
  _socket: ?WebSocket;
  _uri: string;

  constructor({ WebSocket, uri }: ConnectionOptions) {
    super();
    this._uri = uri;
    this._WebSocket = WebSocket;
  }

  _onopen() {
    const socket = this._socket;
    if (!socket) {
      throw new Error('websocket_internal_error');
    }
    socket.onclose = (message: Event) => {
      this.emit('close', message);
    };
    socket.onerror = (message: any) => {
      this.emit('error', message);
    };
    socket.onmessage = (message: { data: any }) => {
      this.emit('message', message.data);
    };
  }

  _reset() {
    if (!this._socket) {
      return;
    }
    this._socket.onerror = () => null;
    this._socket.onclose = () => null;
    this._socket.onopen = () => null;
    this._socket.onmessage = () => null;
    this._socket = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this._socket = new this._WebSocket(this._uri, ['mqtt']);
      this._socket.onopen = () => {
        this._onopen();
        resolve();
      };
      this._socket.onerror = (err) => {
        this._reset();
        reject(err);
      };
    });
  }

  send(data: any) {
    return new Promise((resolve, reject) => {
      if (!this._socket || this._socket.readyState !== 1) {
        throw new Error('websocket_not_ready');
      }
      this._socket.send(data);
      resolve();
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      const socket = this._socket;
      if (!socket || socket.readyState !== 1) {
        return reject(new Error('websocket_not_open'));
      }
      socket.onclose = () => {
        this._reset();
        resolve();
      };
      socket.onerror = (err) => {
        this._reset();
        reject(err);
      };
      socket.close();
    });
  }
}
