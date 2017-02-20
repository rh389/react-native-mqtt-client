/* @flow */

import { encodeMultiByteInteger, lengthOfUTF8, toBytes, writeString, writeUint16 } from '../util';
import { bytes, MqttProtoIdentifierv3, MqttProtoIdentifierv4 } from '../constants';
import type { ConnectPacket } from '../Packet';

export default function (options: ConnectPacket): ArrayBuffer {
  const first = bytes.CONNECT_HEADER;

  const { will } = options;

  /*
   * Now calculate the length of the variable header + payload by adding up the lengths
   * of all the component parts
   */

  let remLength = 0;
  let willPayloadBytes;


  switch (options.protocolVersion) {
    case 3:
      remLength += MqttProtoIdentifierv3.length + 3;
      break;
    case 4:
      remLength += MqttProtoIdentifierv4.length + 3;
      break;
  }

  remLength += lengthOfUTF8(options.clientId) + 2;
  if (will) {
    willPayloadBytes = toBytes(will.payload);
    // Will message is always a string, sent as UTF-8 characters with a preceding length.
    remLength += lengthOfUTF8(will.topic) + 2;
    if (!(willPayloadBytes instanceof Uint8Array)) {
      willPayloadBytes = new Uint8Array(willPayloadBytes);
    }
    remLength += willPayloadBytes.byteLength + 2;
  }
  if (options.username) {
    remLength += lengthOfUTF8(options.username) + 2;
    if (options.password) {
      remLength += lengthOfUTF8(options.password) + 2;
    }
  }

  // Now we can allocate a buffer for the message

  const mbi = encodeMultiByteInteger(remLength);  // Convert the length to MQTT MBI format
  let pos = mbi.length + 1;        // Offset of start of variable header
  const buffer = new ArrayBuffer(remLength + pos);
  const byteStream = new Uint8Array(buffer);    // view it as a sequence of bytes

  //Write the fixed header into the buffer
  byteStream.set(first, 0);
  byteStream.set(mbi, 1);

  switch (options.protocolVersion) {
    case 3:
      byteStream.set(MqttProtoIdentifierv3, pos);
      pos += MqttProtoIdentifierv3.length;
      break;
    case 4:
      byteStream.set(MqttProtoIdentifierv4, pos);
      pos += MqttProtoIdentifierv4.length;
      break;
  }
  let connectFlags = 0;
  if (options.clean) {
    connectFlags = 0x02;
  }
  if (will) {
    connectFlags |= 0x04;
    connectFlags |= ((will.qos || 0) << 3);
    if (will.retain) {
      connectFlags |= 0x20;
    }
  }
  if (options.username) {
    connectFlags |= 0x80;
  }
  if (options.password) {
    connectFlags |= 0x40;
  }
  byteStream[pos++] = connectFlags;
  pos = writeUint16(options.keepalive, byteStream, pos);

  pos = writeString(options.clientId, lengthOfUTF8(options.clientId), byteStream, pos);
  if (will) {
    willPayloadBytes = toBytes(will.payload);
    pos = writeString(will.topic, lengthOfUTF8(will.topic), byteStream, pos);
    pos = writeUint16(willPayloadBytes.byteLength, byteStream, pos);
    byteStream.set(new Uint8Array(willPayloadBytes), pos);
    pos += willPayloadBytes.byteLength;

  }
  if (options.username) {
    pos = writeString(options.username, lengthOfUTF8(options.username), byteStream, pos);
    if (options.password) {
      writeString(options.password, lengthOfUTF8(options.password), byteStream, pos);
    }
  }
  return buffer;
}
