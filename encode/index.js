/* @flow */

import publish from './publish';
import connect from './connect';
import base from './base';
import { subscribe, unsubscribe } from './subunsub';
import type { MqttPacket } from '../Packet';

const puback = (id: number) => base('puback', id);
const pubcomp = (id: number) => base('pubcomp', id);
const pubrel = (id: number) => base('pubrel', id);
const pubrec = (id: number) => base('pubrec', id);
const unsuback = (id: number) => base('unsuback', id);
const disconnect = () => base('disconnect');
const pingreq = () => base('pingreq');
const pingresp = () => base('pingresp');

export {
  publish,
  connect,
  base,
  puback,
  pubcomp,
  pubrec,
  pubrel,
  unsuback,
  disconnect,
  pingreq,
  pingresp,
  subscribe,
  unsubscribe
};

export default function encode(opts: MqttPacket) {
  switch (opts.cmd) {
    case 'publish':
      return publish(opts);
    case 'connect':
      return connect(opts);
    case 'puback':
      return puback(opts.messageId);
    case 'pubcomp':
      return pubcomp(opts.messageId);
    case 'pubrec':
      return pubrec(opts.messageId);
    case 'pubrel':
      return pubrel(opts.messageId);
    case 'unsuback':
      return unsuback(opts.messageId);
    case 'disconnect':
      return disconnect();
    case 'pingreq':
      return pingreq();
    case 'pingresp':
      return pingresp();
    case 'subscribe':
      return subscribe(opts);
    case 'unsubscribe':
      return unsubscribe(opts);
  }
}
