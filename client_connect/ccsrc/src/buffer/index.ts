import * as b64 from 'base64-js';

export class Buffer {
  public constructor(base64String?: string) {
    if (base64String !== undefined) {
      this.bytes = b64.toByteArray(base64String);
    } else {
      this.bytes = new Uint8Array(0);
    }
  }

  public bytes: Uint8Array;

  public toBase64String(): string {
    return b64.fromByteArray(this.bytes);
  }
}