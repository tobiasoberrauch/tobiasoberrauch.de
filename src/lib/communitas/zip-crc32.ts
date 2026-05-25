/**
 * CRC-32 (IEEE 802.3 polynomial 0xEDB88320) — required for ZIP file format.
 *
 * Standalone implementation to avoid an extra dependency. Table generated
 * on first use, kept in module state.
 */

let table: Uint32Array | null = null;

function buildTable(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
}

export function crc32(buf: Uint8Array): number {
  if (!table) table = buildTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
