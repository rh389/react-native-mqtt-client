/* @flow */
import { MqttWire } from './MqttConnection';
import { Socket } from './Socket';
import EventEmitter from 'events';
import type { ConnackPacket, ConnectPacket, PublishPacket } from './Packet';

export {
  Socket,
  MqttWire
};

export class Client extends EventEmitter {
  _conn: MqttWire;
  _connected: boolean = false;
  _clientId: string;

  constructor({ socket, clientId }: { socket: Socket, clientId: string }) {
    super();
    this._conn = new MqttWire({ socket });
    this._clientId = clientId;

    this._conn.on('publish', (packet) => {
      this.emit('messageReceived', packet.payload, packet.topic, packet);
      if (packet.qos === 1 && packet.messageId) {
        this._conn.send({ cmd: 'puback', messageId: packet.messageId })
          .catch(e => null);
      }
    });
  }

  subscribe(topics: string | (string | [string, 0 | 1 | 2])[], qos: 0 | 1 | 2 = 0): Promise<(0 | 1 | 2)[]> {
    if (typeof topics === 'string') {
      return this._subscribe([[topics, qos]]);
    }
    return this._subscribe(topics.map(topic => Array.isArray(topic) ? topic : [topic, qos]));
  }

  _subscribe(topics: [string, 0 | 1 | 2][]) {
    let messageId = 42;
    return this._conn.send({
      cmd: 'subscribe',
      messageId,
      subscriptions: topics.map(topicTuple => ({
        topic: topicTuple[0],
        qos: topicTuple[1]
      }))
    }, {
      cmd: 'suback',
      timeoutMs: 10000,
    }).then(suback => suback.granted);
  }

  connect({
    timeoutMs = 0,
    clean = false,
    keepalive = 0,
    will
  }: ConnectPacket & { timeoutMs: number } = {}) {

    const { _clientId: clientId } = this;

    return this._conn.connect()
      .then(() => this._conn.send({
        cmd: 'connect',
        protocolId: 'MQTT',
        protocolVersion: 4,
        clean,
        clientId,
        keepalive,
        will
      }, {
        cmd: 'connack',
        timeoutMs
      }))
      .then((connack: ConnackPacket) => {
        if (connack.returnCode !== 0) {
          throw new Error('mqtt_bad_connack: ' + connack.returnCode);
        }
        this._connected = true;
      });
  }

  publish({ topic, payload, qos = 0, dup = false, retain = false, cmd = 'publish' }: PublishPacket) {
    let ack;

    if (qos === 1) {
      ack = {
        cmd: 'puback',
        timeoutMs: 10000
      };
    }

    return this._conn.send({
      cmd: 'publish',
      messageId: 42,
      qos,
      dup,
      topic,
      payload,
      retain
    }, ack);
  }

  disconnect() {
    return this._conn.close();
  }
}

