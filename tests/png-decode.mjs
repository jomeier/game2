// A tiny PNG reader for the test assertions (DG-P-08).
// It decodes a PNG file into a pixel array with no library. Only the parts a
// screenshot needs: 8-bit RGB or RGBA, no interlace, all filter types.
// decodePng(bytes) -> { width, height, channels, data }   data is row-major RGBA.
// pixel(image, x, y) -> [r, g, b, a] with a in 0..255.

import { inflateSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';

/** Read one big-endian unsigned 32-bit integer from a DataView or a Buffer. */
function u32(source, offset) {
  const view = source instanceof DataView
    ? source
    : new DataView(source.buffer, source.byteOffset, source.byteLength);
  return view.getUint32(offset, false);
}

/** Split a PNG buffer into its chunks: { type, data } in file order. */
function chunks(buffer) {
  const out = [];
  let offset = 8;
  while (offset < buffer.byteLength) {
    const length = u32(buffer, offset);
    const type = String.fromCharCode(...buffer.subarray(offset + 4, offset + 8));
    out.push({ type, data: buffer.subarray(offset + 8, offset + 8 + length) });
    offset += 12 + length;
  }
  return out;
}

/** Undo the PNG line filters for one scanline. */
function unfilter(filter, line, prev, bpp) {
  for (let i = 0; i < line.length; i += 1) {
    const left = i >= bpp ? line[i - bpp] : 0;
    const up = prev ? prev[i] : 0;
    const upLeft = prev && i >= bpp ? prev[i - bpp] : 0;
    if (filter === 1) line[i] = (line[i] + left) & 255;
    else if (filter === 2) line[i] = (line[i] + up) & 255;
    else if (filter === 3) line[i] = (line[i] + ((left + up) >> 1)) & 255;
    else if (filter === 4) {
      const p = left + up - upLeft;
      const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
      const predict = (pa <= pb && pa <= pc) ? left : (pb <= pc ? up : upLeft);
      line[i] = (line[i] + predict) & 255;
    }
  }
  return line;
}

/** Decode a PNG buffer into a row-major RGBA byte array. */
export function decodePng(buffer) {
  const list = chunks(buffer);
  const head = list[0].data;
  const width = u32(head, 0);
  const height = u32(head, 4);
  const depth = list[0].data[8];
  const color = list[0].data[9];
  const interlace = list[0].data[12];
  if (depth !== 8 || interlace !== 0) throw new Error(`png: depth ${depth} or interlace ${interlace}`);
  const channels = color === 6 ? 4 : color === 2 ? 3 : 0;
  if (!channels) throw new Error(`png: color type ${color} is not RGB or RGBA`);

  const idat = Buffer.concat(list.filter((c) => c.type === 'IDAT').map((c) => c.data));
  const raw = inflateSync(idat);
  const stride = width * channels;
  const data = new Uint8Array(width * height * 4);
  let offset = 0;
  let prev = null;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[offset];
    offset += 1;
    const line = Uint8Array.prototype.slice.call(raw.subarray(offset, offset + stride));
    offset += stride;
    unfilter(filter, line, prev, channels);
    for (let x = 0; x < width; x += 1) {
      const from = x * channels;
      const to = (y * width + x) * 4;
      data[to] = line[from];
      data[to + 1] = line[from + 1];
      data[to + 2] = line[from + 2];
      data[to + 3] = channels === 4 ? line[from + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data };
}

/** Read a PNG file from disk and decode it. */
export async function decodePngFile(path) {
  return decodePng(await readFile(path));
}

/** Return the RGBA values of one pixel as an array of four numbers. */
export function pixel(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [image.data[offset], image.data[offset + 1], image.data[offset + 2], image.data[offset + 3]];
}
