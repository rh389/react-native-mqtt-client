/* @flow */

import { encodeMultiByteInteger, writeUint16 } from '../util';
import { bytes } from '../constants';


export default function (cmd: string, messageId?: number): ArrayBuffer {
  const remLength = messageId ? 2 : 0; // Just the messageId
  const mbi = encodeMultiByteInteger(remLength);  // Convert the length to MQTT MBI format
  let pos = mbi.length + 1;        // Offset of start of variable header
  const byteStream = new Uint8Array(remLength + pos);

  //Write the fixed header into the buffer
  byteStream.set(bytes.HEADERS[cmd]);
  byteStream.set(mbi, 1);

  if (messageId) {
    writeUint16(messageId, byteStream, pos);
  }

  return byteStream.buffer;
}
