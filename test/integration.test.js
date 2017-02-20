import { Client, Socket } from '../';
import { startBroker, stopBroker, uri, webSocket } from './.support';
import { parseUTF8 } from '../util';

const client = new Client({
  clientId: 'teststest',
  socket: new Socket({ WebSocket: webSocket, uri })
});

describe('Integration tests', () => {
  beforeAll(() => startBroker());

  test('should send and receive a message', (done) => {
    client.on('messageReceived', (message, topic, packet) => {
      expect(topic).toEqual('World');
      expect(parseUTF8(message)).toEqual('Hello');
      client.disconnect().then(() => done());
    });
    client.connect()
      .then(() => client.subscribe('World', 1))
      .then(() => client.publish({ topic: 'World', payload: 'Hello', qos: 1}));
  });

  test('should disconnect and reconnect cleanly', () =>
    client.connect()
      .then(() => client.disconnect())
      .then(() => client.connect())
      .then(() => client.disconnect())
  );

  afterAll(() => stopBroker());
});
