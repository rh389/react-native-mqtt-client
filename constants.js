/* @flow */

/* Command code => mnemonic */
export const types = [
  'reserved',
  'connect',
  'connack',
  'publish',
  'puback',
  'pubrec',
  'pubrel',
  'pubcomp',
  'subscribe',
  'suback',
  'unsubscribe',
  'unsuback',
  'pingreq',
  'pingresp',
  'disconnect',
  'reserved'
];

/* Mnemonic => Command code */
export const codes = types.reduce((prev, current, i) => {
  prev[current] = i;
  return prev;
}, {});

export const bytes = {};

/* Header */
bytes.CMD_SHIFT = 4;
bytes.CMD_MASK = 0xF0;
bytes.DUP_MASK = 0x08;
bytes.QOS_MASK = 0x03;
bytes.QOS_SHIFT = 1;
bytes.RETAIN_MASK = 0x01;

/* Length */
bytes.LENGTH_MASK = 0x7F;
bytes.LENGTH_FIN_MASK = 0x80;

/* Connack */
bytes.SESSIONPRESENT_MASK = 0x01;
bytes.SESSIONPRESENT_HEADER = new Uint8Array([bytes.SESSIONPRESENT_MASK]);
bytes.CONNACK_HEADER = new Uint8Array([codes.connack << bytes.CMD_SHIFT]);

/* Connect */
bytes.USERNAME_MASK = 0x80;
bytes.PASSWORD_MASK = 0x40;
bytes.WILL_RETAIN_MASK = 0x20;
bytes.WILL_QOS_MASK = 0x18;
bytes.WILL_QOS_SHIFT = 3;
bytes.WILL_FLAG_MASK = 0x04;
bytes.CLEAN_SESSION_MASK = 0x02;
bytes.CONNECT_HEADER = new Uint8Array([codes.connect << bytes.CMD_SHIFT]);

function genHeader (type) {
  return [0, 1, 2].map(function (qos) {
    return [0, 1].map(function (dup) {
      return [0, 1].map(function (retain) {
        return new Uint8Array([
          codes[type] << bytes.CMD_SHIFT |
          (dup ? bytes.DUP_MASK : 0) |
          qos << bytes.QOS_SHIFT | retain
        ]);
      });
    });
  });
}

/* Publish */
bytes.PUBLISH_HEADER = genHeader('publish');

/* Subscribe */
bytes.SUBSCRIBE_HEADER = genHeader('subscribe')[1][0][0];

/* Unsubscribe */
bytes.UNSUBSCRIBE_HEADER = genHeader('unsubscribe')[1][0][0];

/* Confirmations */
bytes.HEADERS = {
  unsuback: genHeader('unsuback')[0][0][0],
  puback: genHeader('puback')[0][0][0],
  pubcomp: genHeader('pubcomp')[0][0][0],
  pubrel: genHeader('pubrel')[1][0][0],
  pubrec: genHeader('pubrec')[0][0][0],
  pingreq: new Uint8Array([codes.pingreq << 4, 0]),
  pingresp: new Uint8Array([codes.pingresp << 4, 0]),
  disconnect: new Uint8Array([codes.disconnect << 4, 0])
};

bytes.SUBACK_HEADER = new Uint8Array([codes.suback << bytes.CMD_SHIFT]);

/* Protocol versions */
bytes.VERSION3 = new Uint8Array([3]);
bytes.VERSION4 = new Uint8Array([4]);

/* QoS */
bytes.QOS = [0, 1, 2].map(function (qos) {
  return new Uint8Array([qos]);
});

export default bytes;


/**
 * Unique message type identifiers, with associated
 * associated integer values.
 * @private
 */
export const ERROR = {
  OK: { code: 0, text: 'AMQJSC0000I OK.' },
  CONNECT_TIMEOUT: { code: 1, text: 'AMQJSC0001E Connect timed out.' },
  SUBSCRIBE_TIMEOUT: { code: 2, text: 'AMQJS0002E Subscribe timed out.' },
  UNSUBSCRIBE_TIMEOUT: { code: 3, text: 'AMQJS0003E Unsubscribe timed out.' },
  PING_TIMEOUT: { code: 4, text: 'AMQJS0004E Ping timed out.' },
  INTERNAL_ERROR: { code: 5, text: 'AMQJS0005E Internal error. Error Message: {0}, Stack trace: {1}' },
  CONNACK_RETURNCODE: { code: 6, text: 'AMQJS0006E Bad Connack return code:{0} {1}.' },
  SOCKET_ERROR: { code: 7, text: 'AMQJS0007E Socket error:{0}.' },
  SOCKET_CLOSE: { code: 8, text: 'AMQJS0008I Socket closed.' },
  MALFORMED_UTF: { code: 9, text: 'AMQJS0009E Malformed UTF data:{0} {1} {2}.' },
  UNSUPPORTED: { code: 10, text: 'AMQJS0010E {0} is not supported by this browser.' },
  INVALID_STATE: { code: 11, text: 'AMQJS0011E Invalid state {0}.' },
  INVALID_TYPE: { code: 12, text: 'AMQJS0012E Invalid type {0} for {1}.' },
  INVALID_ARGUMENT: { code: 13, text: 'AMQJS0013E Invalid argument {0} for {1}.' },
  UNSUPPORTED_OPERATION: { code: 14, text: 'AMQJS0014E Unsupported operation.' },
  INVALID_STORED_DATA: { code: 15, text: 'AMQJS0015E Invalid data in local storage key={0} value={1}.' },
  INVALID_MQTT_MESSAGE_TYPE: { code: 16, text: 'AMQJS0016E Invalid MQTT message type {0}.' },
  MALFORMED_UNICODE: { code: 17, text: 'AMQJS0017E Malformed Unicode string:{0} {1}.' }
};



/** CONNACK RC Meaning. */
export const CONNACK_RC = [
  'Connection Accepted',
  'Connection Refused: unacceptable protocol version',
  'Connection Refused: identifier rejected',
  'Connection Refused: server unavailable',
  'Connection Refused: bad user name or password',
  'Connection Refused: not authorized'
];

//MQTTv3.1 protocol and version                6     M     Q     I     s     d     p     3
export const MqttProtoIdentifierv3 = [0x00, 0x06, 0x4d, 0x51, 0x49, 0x73, 0x64, 0x70, 0x03];
//MQTTv4 protocol and version                  4     M     Q     T     T     4
export const MqttProtoIdentifierv4 = [0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, 0x04];
