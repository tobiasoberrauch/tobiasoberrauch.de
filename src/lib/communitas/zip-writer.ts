/**
 * Minimal ZIP archive writer — STORE method only (no compression).
 *
 * Used for the account-export flow (T091). We deliberately avoid bringing
 * in a third-party ZIP dep: most files in the archive are already random
 * ciphertext (incompressible), and the archive size is dominated by raw
 * AES-GCM ciphertext bytes. Store-only is fine.
 *
 * Format references:
 *   - PKWARE APPNOTE.TXT 6.3.x (Local File Header, Central Directory)
 *   - https://en.wikipedia.org/wiki/ZIP_(file_format)
 *
 * Tested against macOS Archive Utility, unzip(1), and 7-zip during
 * implementation. Filenames are UTF-8 (general purpose bit 11 set).
 */
import { Buffer } from 'node:buffer';
import { crc32 } from './zip-crc32.js';

interface ZipEntry {
  name: string;
  data: Buffer;
  crc32: number;
  // Offset of local file header in the resulting buffer.
  localHeaderOffset: number;
}

export class ZipWriter {
  private entries: ZipEntry[] = [];
  private chunks: Buffer[] = [];
  private cursor = 0;

  addFile(name: string, data: Buffer | Uint8Array | string): void {
    const buf =
      typeof data === 'string'
        ? Buffer.from(data, 'utf8')
        : data instanceof Buffer
          ? data
          : Buffer.from(data);
    const crc = crc32(buf);
    const nameBuf = Buffer.from(name, 'utf8');

    const localHeaderOffset = this.cursor;

    // Local file header
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); // signature
    header.writeUInt16LE(20, 4);          // version needed
    header.writeUInt16LE(0x0800, 6);      // general purpose bit flag — UTF-8 filename
    header.writeUInt16LE(0, 8);           // method 0 = STORE
    header.writeUInt16LE(0, 10);          // mod time (none)
    header.writeUInt16LE(0, 12);          // mod date (none)
    header.writeUInt32LE(crc, 14);        // CRC-32
    header.writeUInt32LE(buf.length, 18); // compressed size
    header.writeUInt32LE(buf.length, 22); // uncompressed size
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);          // extra field length

    this.chunks.push(header, nameBuf, buf);
    this.cursor += header.length + nameBuf.length + buf.length;

    this.entries.push({
      name,
      data: buf,
      crc32: crc,
      localHeaderOffset,
    });
  }

  build(): Buffer {
    const cdStart = this.cursor;
    const cdChunks: Buffer[] = [];
    for (const e of this.entries) {
      const nameBuf = Buffer.from(e.name, 'utf8');
      const cdEntry = Buffer.alloc(46);
      cdEntry.writeUInt32LE(0x02014b50, 0); // signature
      cdEntry.writeUInt16LE(20, 4);          // version made by
      cdEntry.writeUInt16LE(20, 6);          // version needed
      cdEntry.writeUInt16LE(0x0800, 8);      // general purpose bit flag — UTF-8
      cdEntry.writeUInt16LE(0, 10);          // method 0 = STORE
      cdEntry.writeUInt16LE(0, 12);          // mod time
      cdEntry.writeUInt16LE(0, 14);          // mod date
      cdEntry.writeUInt32LE(e.crc32, 16);
      cdEntry.writeUInt32LE(e.data.length, 20); // compressed size
      cdEntry.writeUInt32LE(e.data.length, 24); // uncompressed size
      cdEntry.writeUInt16LE(nameBuf.length, 28);
      cdEntry.writeUInt16LE(0, 30);          // extra field len
      cdEntry.writeUInt16LE(0, 32);          // comment len
      cdEntry.writeUInt16LE(0, 34);          // disk number
      cdEntry.writeUInt16LE(0, 36);          // internal attrs
      cdEntry.writeUInt32LE(0, 38);          // external attrs
      cdEntry.writeUInt32LE(e.localHeaderOffset, 42);
      cdChunks.push(cdEntry, nameBuf);
      this.cursor += cdEntry.length + nameBuf.length;
    }
    const cdSize = this.cursor - cdStart;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);            // EOCD signature
    eocd.writeUInt16LE(0, 4);                      // disk number
    eocd.writeUInt16LE(0, 6);                      // start disk
    eocd.writeUInt16LE(this.entries.length, 8);    // entries on this disk
    eocd.writeUInt16LE(this.entries.length, 10);   // entries total
    eocd.writeUInt32LE(cdSize, 12);                // CD size
    eocd.writeUInt32LE(cdStart, 16);               // CD offset
    eocd.writeUInt16LE(0, 20);                     // comment len

    return Buffer.concat([...this.chunks, ...cdChunks, eocd]);
  }
}
