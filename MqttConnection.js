/* @flow */

import EventEmitter from 'events';
import { Socket } from './Socket';

import generate from './encode';
import Parser from './Parser';
import type { MqttPacket } from './Packet';

type AckOptions = {
  cmd: 'connack' | 'suback' | 'unsuback' | 'puback',
  timeoutMs: number
}

export class MqttWire extends EventEmitter {
  _socket: Socket;
  _parser: Parser;

  constructor({ socket }: { socket: Socket }) {
    super();
    this._socket = socket;
    this._parser = new Parser();

    this._parser.on('packet', (packet) => {
      this.emit(packet.cmd, packet);
    });

    socket.on('message', (message: any) => {
      this._parser.parse(message);
    });

    socket.on('error', (message: any) => {
      this.emit('error', message);
    });

    socket.on('close', (message: any) => {
      this.emit('close', message);
    });
  }

  connect() {
    return this._socket.connect();
  }

  send(opts: MqttPacket, ackOpts: ?AckOptions): Promise<any> {
    if (!ackOpts) {
      try {
        return this._socket.send(generate(opts));
      } catch (e) {
        return Promise.reject(e);
      }
    }
    const { cmd, timeoutMs } = ackOpts;

    return new Promise((resolve, reject) => {

      const timeoutTimer = timeoutMs && setTimeout(() => completePromise(new Error('wire_' + cmd + '_timeout')), timeoutMs);

      const listeners = {
        error: (e) => completePromise(e),
        close: (e) => completePromise(e),
        [cmd]: (ackPacket) => {
          if (opts.messageId && opts.messageId !== ackPacket.messageId) {
            return; //Ack is for some other listener - ignore
          }
          completePromise(null, ackPacket);
        }
      };

      const completePromise = (err, result) => {
        Object.keys(listeners).forEach((eventName) => this.removeListener(eventName, listeners[eventName]));
        timeoutTimer && clearTimeout(timeoutTimer);
        return err ? reject(err) : resolve(result);
      };

      Object.keys(listeners).forEach((eventName) => this.on(eventName, listeners[eventName]));

      return this._socket.send(generate(opts));
    });
  }

  close() {
    return this._socket.close();
  }
}
