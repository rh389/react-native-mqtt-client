/* @flow */

import { encodeMultiByteInteger, lengthOfUTF8, toBytes, writeString, writeUint16 } from '../util';
import { bytes } from '../constants';
import type { PublishPacket } from '../Packet';

export default function (options: PublishPacket): ArrayBuffer {
  const { messageId, qos = 0, dup = false, topic, payload, retain = false } = options;

  const firstByte = bytes.PUBLISH_HEADER[qos][dup ? 1 : 0][retain ? 1 : 0];

  /*
   * Now calculate the length of the variable header + payload by adding up the lengths
   * of all the component parts
   */

  let remLength = 0;
  let payloadBytes: ?Uint8Array;

  // if the message contains a messageId then we need two bytes for that
  if (messageId) {
    remLength += 2;
  }


  payloadBytes = new Uint8Array(toBytes(payload));
  const topicLength = lengthOfUTF8(topic);
  remLength += topicLength + 2;
  remLength += payloadBytes.byteLength;
  //End publish

  // Now we can allocate a buffer for the message

  const mbi = encodeMultiByteInteger(remLength);  // Convert the length to MQTT MBI format
  let pos = mbi.length + 1;        // Offset of start of variable header
  const buffer = new ArrayBuffer(remLength + pos);
  const byteStream = new Uint8Array(buffer);    // view it as a sequence of bytes

  //Write the fixed header into the buffer
  byteStream.set(firstByte, 0);
  byteStream.set(mbi, 1);

  pos = writeString(topic, topicLength, byteStream, pos);

  // Output the messageId - if there is one
  if (messageId) {
    pos = writeUint16(messageId, byteStream, pos);
  }

  // PUBLISH has a text or binary payload, if text do not add a 2 byte length field, just the UTF characters.
  payloadBytes && byteStream.set(payloadBytes, pos);

  return buffer;
}
