/* @flow */

export default function Packet() {
  this.cmd = null;
  this.retain = false;
  this.qos = 0;
  this.dup = false;
  this.length = -1;
  this.topic = null;
  this.payload = null;
}


export type ConnectPacket = {
  cmd: 'connect',
  protocolId?: 'MQTT' | 'MQIsdp',
  protocolVersion?: 3 | 4,
  clean?: boolean,
  clientId: string,
  keepalive: number,
  username?: string,
  password?: string,
  will?: {
    topic: string,
    payload: string | ArrayBuffer,
    qos?: 0 | 1 | 2,
    retain?: boolean
  }
};

export type ConnackPacket = {
  cmd: 'connack',
  returnCode: number, // Or whatever else you see fit
  sessionPresent: boolean // Can also be true.
};

export type SubscribePacket = {
  cmd: 'subscribe',
  messageId: number,
  subscriptions: {
    topic: string,
    qos: 0 | 1 | 2
  }[]
};

export type SubackPacket = {
  cmd: 'suback',
  messageId: number,
  granted: number[]
};

export type UnsubscribePacket = {
  cmd: 'unsubscribe',
  messageId: number,
  unsubscriptions: string[]
};

export type UnsubackPacket = { cmd: 'unsuback', messageId: number };

export type PubackPacket = { cmd: 'puback', messageId: number };
export type PubrelPacket = { cmd: 'pubrel', messageId: number };
export type PubcompPacket = { cmd: 'pubcomp', messageId: number };
export type PubrecPacket = { cmd: 'pubrec', messageId: number };

export type PingrespPacket = { cmd: 'pingesp', messageId: number };
export type PingreqPacket = { cmd: 'pingreq', messageId: number };
export type DisconnectPacket = { cmd: 'disconnect', messageId: number };

export type PublishOptions = {
  messageId?: number,
  qos: 0 | 1 | 2,
  dup?: boolean,
  topic: string,
  payload: string | ArrayBuffer,
  retain?: boolean
}

export type PublishPacket = PublishOptions & { cmd: 'publish' };

export type MqttPacket = ConnectPacket | ConnackPacket | SubscribePacket | SubackPacket | UnsubscribePacket |
  UnsubackPacket | PubackPacket | PubrelPacket | PubcompPacket | PubrecPacket | PingrespPacket | PingreqPacket |
  DisconnectPacket | PublishPacket;
