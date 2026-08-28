import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const arena = path.join(root, 'public', 'assets', 'ui', 'arena-v8.webp');

if (!fs.existsSync(arena)) throw new Error('Missing embedded arena-v8.webp');
const buffer = fs.readFileSync(arena);
if (buffer.length !== 31610) throw new Error(`Unexpected arena-v8.webp size: ${buffer.length}`);
if (buffer.subarray(0, 4).toString('ascii') !== 'RIFF' || buffer.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('arena-v8.webp is not a WebP RIFF container');
}
const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
const expected = 'b39ecf4a27be2a7f8046791107f831749c6338bb30c506ea234a4359960afb84';
if (sha256 !== expected) throw new Error(`arena-v8.webp SHA-256 mismatch: ${sha256}`);
console.log(`Verified embedded arena-v8.webp: ${buffer.length} bytes, ${sha256}`);
