import { Client, Socket } from '../';
import { startBroker, stopBroker, uri, webSocket } from './.support';
import { parseUTF8 } from '../util';

let client;

describe('Integration tests', () => {
  beforeEach(() => {
    client = new Client({
      clientId: 'teststest',
      socket: new Socket({ WebSocket: webSocket, uri })
    });
    return startBroker();
  });

  test('should send and receive a message', (done) => {
    client.on('messageReceived', (message, topic, packet) => {
      expect(topic).toEqual('World');
      expect(parseUTF8(message)).toEqual('Hello');
      client.disconnect().then(done).catch(done.fail);
    });
    client.connect()
      .then(() => client.subscribe('World', 1))
      .then(() => client.publish({ topic: 'World', payload: 'Hello', qos: 1 }))
      .catch(done.fail);
  });

  test('should disconnect and reconnect cleanly', () =>
    client.connect()
      .then(() => client.disconnect())
      .then(() => client.connect())
      .then(() => client.disconnect())
  );

  test('should emit connectionLost when the broker goes away', (done) => {
    client.once('connectionLost', done);
    client.connect().then(() => stopBroker()).catch(done.fail);
  });

  afterEach(() => stopBroker());
});
