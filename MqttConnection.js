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
      console.warn('socket error', message);
    });

    socket.on('close', (message: any) => {
      console.warn('socket closed', message);
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
      const timeoutTimer = timeoutMs && setTimeout(() => {
          this.removeListener(cmd, ackListener);
          reject(new Error('wire_' + cmd + '_timeout'));
        }, timeoutMs);

      const errorListener = () => {
        this.removeListener(cmd, errorListener);
        reject(new Error('wire_no_ack'));
      };

      const ackListener = (ackPacket) => {
        if (opts.messageId && opts.messageId !== ackPacket.messageId) {
          return; //Ack is for some other listener
        }
        this.removeListener(cmd, ackListener);
        timeoutTimer && clearTimeout(timeoutTimer);
        resolve(ackPacket);
      };

      this.on(cmd, ackListener);
      return this._socket.send(generate(opts));
    });
  }

  close() {
    return this._socket.close();
  }
}
