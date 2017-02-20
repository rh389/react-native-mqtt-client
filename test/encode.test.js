import { generate } from 'mqtt-packet';
import {
  connect,
  disconnect,
  pingreq,
  pingresp,
  puback,
  pubcomp,
  publish,
  pubrec,
  pubrel,
  subscribe,
  unsuback,
  unsubscribe
} from '../encode';
import { Buffer } from 'buffer';

describe('Connect message', () => {
  const opts = {
    clean: false,
    username: 'Rob',
    password: 'Password',
    protocolVersion: 4,
    will: {
      topic: 'willtopic',
      payload: 'willmessage',
      qos: 2
    },
    keepalive: 10,
    clientId: 'clientId'
  };

  test('kitchen sink', () => {
    expect((new Buffer(connect(opts)))).toEqual(generate({ ...opts, cmd: 'connect' }));
  });


  test('bytes 3', () => {
    const mod = { protocolVersion: 3, protocolId: 'MQIsdp' };
    expect((new Buffer(connect({ ...opts, ...mod })))).toEqual(generate({ ...opts, cmd: 'connect', ...mod }));
  });
});

describe('Publish message', () => {
  const opts = {
    messageId: 42,
    qos: 2,
    dup: false,
    topic: 'test',
    payload: new Buffer('test'),
    retain: false
  };

  test('kitchen sink', () => {
    expect((new Buffer(publish(opts)))).toEqual(generate({ ...opts, cmd: 'publish' }));
  });

  test('dup', () => {
    const mod = { dup: true };
    expect((new Buffer(publish({ ...opts, ...mod })))).toEqual(generate({ ...opts, cmd: 'publish', ...mod }));
  });

  test('retain', () => {
    const mod = { retain: true };
    expect((new Buffer(publish({ ...opts, ...mod })))).toEqual(generate({ ...opts, cmd: 'publish', ...mod }));
  });

  test('qos', () => {
    const mod = { qos: 1 };
    expect((new Buffer(publish({ ...opts, ...mod })))).toEqual(generate({ ...opts, cmd: 'publish', ...mod }));
  });
});

describe('Confirm', () => {
  test('unsuback', () => {
    expect((new Buffer(unsuback(42)))).toEqual(generate({ messageId: 42, cmd: 'unsuback' }));
  });

  test('pubrel', () => {
    expect((new Buffer(pubrel(42)))).toEqual(generate({ messageId: 42, cmd: 'pubrel' }));
  });

  test('pubrec', () => {
    expect((new Buffer(pubrec(42)))).toEqual(generate({ messageId: 42, cmd: 'pubrec' }));
  });

  test('puback', () => {
    expect((new Buffer(puback(42)))).toEqual(generate({ messageId: 42, cmd: 'puback' }));
  });

  test('pubcomp', () => {
    expect((new Buffer(pubcomp(42)))).toEqual(generate({ messageId: 42, cmd: 'pubcomp' }));
  });

  test('pingresp', () => {
    expect((new Buffer(pingresp()))).toEqual(generate({ cmd: 'pingresp' }));
  });

  test('pingreq', () => {
    expect((new Buffer(pingreq()))).toEqual(generate({ cmd: 'pingreq' }));
  });

  test('disconnect', () => {
    expect((new Buffer(disconnect()))).toEqual(generate({ cmd: 'disconnect' }));
  });
});

describe('Subscribe', () => {
  const opts = {
    messageId: 42,
    subscriptions: [
      { topic: 'Hello', qos: 0 },
      { topic: 'World', qos: 2 }
    ]
  };

  test('subscribe', () => {
    expect((new Buffer(subscribe(opts)))).toEqual(generate({ ...opts, cmd: 'subscribe' }));
  });
});

describe('Unsubscribe', () => {
  const opts = {
    messageId: 42,
    unsubscriptions: ['Hello', 'World']
  };

  test('unsubscribe', () => {
    expect((new Buffer(unsubscribe(opts)))).toEqual(generate({ ...opts, cmd: 'unsubscribe' }));
  });
});
