import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = path.join(root, 'arena-v8.webp.b64');
const out = path.join(root, 'public', 'assets', 'ui', 'arena-v8.webp');

if (!fs.existsSync(source)) throw new Error('Missing arena-v8.webp.b64 source asset');

const base64 = fs.readFileSync(source, 'utf8').replace(/\s+/g, '');
const buffer = Buffer.from(base64, 'base64');

if (buffer.length < 50000) throw new Error(`arena-v8.webp is unexpectedly small: ${buffer.length} bytes`);
if (buffer.subarray(0, 4).toString('ascii') !== 'RIFF' || buffer.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('arena-v8.webp is not a valid WebP RIFF container');
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buffer);
console.log(`Materialized original verified arena-v8.webp: ${buffer.length} bytes`);
