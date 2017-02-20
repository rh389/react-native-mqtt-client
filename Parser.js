/* @flow */

import EventEmitter from 'events';
import Packet from './Packet';
import { bytes, types } from './constants';
import { parseUTF8 } from './util';

/**
 * A stub (everything we need here) of BufferList from the package 'bl' - 'bl' itself has too many Node dependencies,
 * not least 'Buffer'.
 *
 * TODO: A more memory-efficient implementation that doesn't involve a full copy on each append. This is brutally naive.
 * (OK as long as packets don't span many websocket frames)
 */
class BufferList {
  _buffer: ArrayBuffer = new ArrayBuffer(0);

  get length() {
    return this._buffer.byteLength;
  }

  consume(number) {
    const newBuffer = new Uint8Array(this._buffer.byteLength - number);
    newBuffer.set(new Uint8Array(this._buffer.slice(number)));
    this._buffer = newBuffer.buffer;
  }

  readUInt8(offset): number {
    return (new Uint8Array(this._buffer))[offset];
  }

  append(buffer: ArrayBuffer) {
    const newLength = buffer.byteLength + this._buffer.byteLength;
    const newBuffer = new Uint8Array(newLength);
    newBuffer.set(new Uint8Array(this._buffer));
    newBuffer.set(new Uint8Array(buffer), this._buffer.byteLength);
    this._buffer = newBuffer.buffer;
  }

  readUInt16BE(offset): number {
    const buf = new Uint8Array(this._buffer);
    const big = buf[offset];
    const little = buf[offset + 1];
    return ((big << 1) + little);
  }

  slice(start, end) {
    return this._buffer.slice(start, end);
  }

  toString(start: number = 0, length?: number) {
    return parseUTF8(new Uint8Array(this._buffer), start, length);
  }
}

/**
 * Originally from https://github.com/mqttjs/mqtt-packet/blob/master/parser.js
 * All credit to Matteo Collina and https://github.com/mqttjs/mqtt-packet#contributors
 */
class Parser extends EventEmitter {
  packet: any = new Packet();
  error: ?Error = null;

  _list: BufferList = new BufferList();
  _pos: number = 0;
  _stateCounter: 0 | 1 | 2 | 3 = 0;
  _states = [
    '_parseHeader',
    '_parseLength',
    '_parsePayload',
    '_newPacket'
  ];

  _resetState() {
    this.packet = new Packet();
    this.error = null;
    this._list = new BufferList();
    this._stateCounter = 0;
  }

  parse(buf: ArrayBuffer) {
    if (this.error) {
      this._resetState();
    }

    this._list.append(buf);

    while ((this.packet.length !== -1 || this._list.length > 0) &&
    (this: any)[this._states[this._stateCounter]]() &&
    !this.error) {
      this._stateCounter++;

      if (this._stateCounter >= this._states.length) {
        this._stateCounter = 0;
      }
    }

    return this._list.length;
  }

  _parseHeader() {
    // There is at least one byte in the buffer
    const zero = this._list.readUInt8(0);
    this.packet.cmd = types[zero >> bytes.CMD_SHIFT];
    this.packet.retain = (zero & bytes.RETAIN_MASK) !== 0;
    this.packet.qos = (zero >> bytes.QOS_SHIFT) & bytes.QOS_MASK;
    this.packet.dup = (zero & bytes.DUP_MASK) !== 0;

    this._list.consume(1);

    return true;
  }

  _parseLength() {
    // There is at least one byte in the list
    let numBytes = 0;
    let mul = 1;
    let length = 0;
    let result = true;
    let current;

    while (numBytes < 5) {
      current = this._list.readUInt8(numBytes++);
      length += mul * (current & bytes.LENGTH_MASK);
      mul *= 0x80;

      if ((current & bytes.LENGTH_FIN_MASK) === 0) {
        break;
      }
      if (this._list.length <= numBytes) {
        result = false;
        break;
      }
    }

    if (result) {
      this.packet.length = length;
      this._list.consume(numBytes);
    }

    return result;
  }

  _parsePayload() {
    let result = false;

    // Do we have a payload? Do we have enough data to complete the payload?
    // PINGs have no payload
    if (this.packet.length === 0 || this._list.length >= this.packet.length) {
      this._pos = 0;

      switch (this.packet.cmd) {
        case 'connect':
          this._parseConnect();
          break;
        case 'connack':
          this._parseConnack();
          break;
        case 'publish':
          this._parsePublish();
          break;
        case 'puback':
        case 'pubrec':
        case 'pubrel':
        case 'pubcomp':
          this._parseMessageId();
          break;
        case 'subscribe':
          this._parseSubscribe();
          break;
        case 'suback':
          this._parseSuback();
          break;
        case 'unsubscribe':
          this._parseUnsubscribe();
          break;
        case 'unsuback':
          this._parseUnsuback();
          break;
        case 'pingreq':
        case 'pingresp':
        case 'disconnect':
          // These are empty, nothing to do
          break;
        default:
          this._emitError(new Error('Not supported'));
      }

      result = true;
    }

    return result;
  }

  _parseConnect() {
    let protocolId; // bytes.id
    let clientId; // Client id
    let topic; // Will topic
    let payload; // Will payload
    let password; // Password
    let username; // Username
    const flags = {};
    const packet = this.packet;

    // Parse bytes.id
    protocolId = this._parseString();

    if (protocolId === null) {
      return this._emitError(new Error('Cannot parse bytes id'));
    }
    if (protocolId !== 'MQTT' && protocolId !== 'MQIsdp') {
      return this._emitError(new Error('Invalid bytes id'));
    }

    packet.protocolId = protocolId;

    // Parse bytes.version number
    if (this._pos >= this._list.length) {
      return this._emitError(new Error('Packet too short'));
    }

    packet.protocolVersion = this._list.readUInt8(this._pos);

    if (packet.protocolVersion !== 3 && packet.protocolVersion !== 4) {
      return this._emitError(new Error('Invalid bytes version'));
    }

    this._pos++;

    if (this._pos >= this._list.length) {
      return this._emitError(new Error('Packet too short'));
    }

    // Parse connect flags
    flags.username = (this._list.readUInt8(this._pos) & bytes.USERNAME_MASK);
    flags.password = (this._list.readUInt8(this._pos) & bytes.PASSWORD_MASK);
    flags.will = (this._list.readUInt8(this._pos) & bytes.WILL_FLAG_MASK);

    if (flags.will) {
      packet.will = {};
      packet.will.retain = (this._list.readUInt8(this._pos) & bytes.WILL_RETAIN_MASK) !== 0;
      packet.will.qos = (this._list.readUInt8(this._pos) &
        bytes.WILL_QOS_MASK) >> bytes.WILL_QOS_SHIFT;
    }

    packet.clean = (this._list.readUInt8(this._pos) & bytes.CLEAN_SESSION_MASK) !== 0;
    this._pos++;

    // Parse keepalive
    packet.keepalive = this._parseNum();
    if (packet.keepalive === -1) {
      return this._emitError(new Error('Packet too short'));
    }

    // Parse client ID
    clientId = this._parseString();
    if (clientId === null) {
      return this._emitError(new Error('Packet too short'));
    }
    packet.clientId = clientId;

    if (flags.will) {
      // Parse will topic
      topic = this._parseString();
      if (topic === null) {
        return this._emitError(new Error('Cannot parse will topic'));
      }
      packet.will.topic = topic;

      // Parse will payload
      payload = this._parseBuffer();
      if (payload === null) {
        return this._emitError(new Error('Cannot parse will payload'));
      }
      packet.will.payload = payload;
    }

    // Parse username
    if (flags.username) {
      username = this._parseString();
      if (username === null) {
        return this._emitError(new Error('Cannot parse username'));
      }
      packet.username = username;
    }

    // Parse password
    if (flags.password) {
      password = this._parseBuffer();
      if (password === null) {
        return this._emitError(new Error('Cannot parse password'));
      }
      packet.password = password;
    }

    return packet;
  }

  _parseConnack() {
    const packet = this.packet;

    if (this._list.length < 2) {
      return null;
    }

    packet.sessionPresent = !!(this._list.readUInt8(this._pos++) & bytes.SESSIONPRESENT_MASK);
    packet.returnCode = this._list.readUInt8(this._pos);

    if (packet.returnCode === -1) {
      return this._emitError(new Error('Cannot parse return code'));
    }
  }

  _parsePublish() {
    const packet = this.packet;
    packet.topic = this._parseString();

    if (packet.topic === null) {
      return this._emitError(new Error('Cannot parse topic'));
    }

    // Parse message ID
    if (packet.qos > 0) {
      if (!this._parseMessageId()) {
        return;
      }
    }

    packet.payload = this._list.slice(this._pos, packet.length);
  }

  _parseSubscribe() {
    const packet = this.packet;
    let topic;
    let qos;

    if (packet.qos !== 1) {
      return this._emitError(new Error('Wrong subscribe header'));
    }

    packet.subscriptions = [];

    if (!this._parseMessageId()) {
      return;
    }

    while (this._pos < packet.length) {
      // Parse topic
      topic = this._parseString();
      if (topic === null) {
        return this._emitError(new Error('Cannot parse topic'));
      }

      qos = this._list.readUInt8(this._pos++);

      // Push pair to subscriptions
      packet.subscriptions.push({ topic: topic, qos: qos });
    }
  }

  _parseSuback() {
    this.packet.granted = [];

    if (!this._parseMessageId()) {
      return;
    }

    // Parse granted QoSes
    while (this._pos < this.packet.length) {
      this.packet.granted.push(this._list.readUInt8(this._pos++));
    }
  }

  _parseUnsubscribe() {
    const packet = this.packet;

    packet.unsubscriptions = [];

    // Parse message ID
    if (!this._parseMessageId()) {
      return;
    }

    while (this._pos < packet.length) {
      let topic;

      // Parse topic
      topic = this._parseString();
      if (topic === null) {
        return this._emitError(new Error('Cannot parse topic'));
      }

      // Push topic to unsubscriptions
      packet.unsubscriptions.push(topic);
    }
  }

  _parseUnsuback() {
    if (!this._parseMessageId()) {
      return this._emitError(new Error('Cannot parse message id'));
    }
  }

  _parseMessageId() {
    const packet = this.packet;

    packet.messageId = this._parseNum();

    if (packet.messageId === null) {
      this._emitError(new Error('Cannot parse message id'));
      return false;
    }

    return true;
  }

  _parseString() {
    const length = this._parseNum();
    const end = length + this._pos;

    if (length === -1 || end > this._list.length || end > this.packet.length) {
      return null;
    }

    const result = this._list.toString(this._pos, length);
    this._pos += length;

    return result;
  }

  _parseBuffer() {
    const length = this._parseNum();
    const end = length + this._pos;

    if (length === -1 || end > this._list.length || end > this.packet.length) {
      return null;
    }

    const result = this._list.slice(this._pos, end);

    this._pos += length;

    return result;
  }

  _parseNum() {
    if (this._list.length - this._pos < 2) {
      return -1;
    }

    const result = this._list.readUInt16BE(this._pos);
    this._pos += 2;

    return result;
  }

  _newPacket() {
    if (this.packet) {
      this._list.consume(this.packet.length);
      this.emit('packet', this.packet);
    }

    this.packet = new Packet();

    return true;
  }

  _emitError(err: Error) {
    this.error = err;
    this.emit('error', err);
  }
}

export default Parser;
