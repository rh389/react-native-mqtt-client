/* @flow */

import { encodeMultiByteInteger, lengthOfUTF8, writeString, writeUint16 } from '../util';
import { bytes } from '../constants';
import type { SubscribePacket, UnsubscribePacket } from '../Packet';

function subunsub(options: SubscribePacket | UnsubscribePacket): ArrayBuffer {
  const { cmd, messageId } = options;

  // Compute the first byte of the fixed header. Always qos = 1
  const first = (cmd === 'subscribe' ? bytes.SUBSCRIBE_HEADER : bytes.UNSUBSCRIBE_HEADER);

  /*
   * Now calculate the length of the variable header + payload by adding up the lengths
   * of all the component parts
   */

  let remLength = messageId ? 2 : 0;
  let topicStrLength = [];

  switch (options.cmd) {
    // Subscribe, Unsubscribe can both contain topic strings
    case 'subscribe':

      topicStrLength = options.subscriptions.map(sub => {
        const length = lengthOfUTF8(sub.topic);
        remLength += length + 3; //One extra byte for a qos with each topic
        return length;
      });
      break;

    case 'unsubscribe':
      topicStrLength = options.unsubscriptions.map(sub => {
        const length = lengthOfUTF8(sub);
        remLength += length + 2;
        return length;
      });
      break;
  }

  // Now we can allocate a buffer for the message

  const mbi = encodeMultiByteInteger(remLength);  // Convert the length to MQTT MBI format
  let pos = mbi.length + 1;        // Offset of start of variable header
  const buffer = new ArrayBuffer(remLength + pos);
  const byteStream = new Uint8Array(buffer);    // view it as a sequence of bytes

  //Write the fixed header into the buffer
  byteStream.set(first, 0);
  byteStream.set(mbi, 1);

  if (messageId) {
    pos = writeUint16(messageId, byteStream, pos);
  }

  switch (options.cmd) {
    case 'subscribe':
      // SUBSCRIBE has a list of topic strings and request QoS
      options.subscriptions.forEach((sub, i) => {
        pos = writeString(sub.topic, topicStrLength[i], byteStream, pos);
        byteStream[pos++] = sub.qos;
      });
      break;
    case 'unsubscribe':
      // UNSUBSCRIBE has a list of topic strings
      options.unsubscriptions.forEach((topic, i) => {
        pos = writeString(topic, topicStrLength[i], byteStream, pos);
      });
      break;
  }

  return buffer;
}

export const subscribe = (opts: SubscribePacket) => subunsub({ ...opts, cmd: 'subscribe' });
export const unsubscribe = (opts: UnsubscribePacket) => subunsub({ ...opts, cmd: 'unsubscribe' });
