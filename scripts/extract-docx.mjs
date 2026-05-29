import { readFileSync, writeFileSync } from 'fs';
import { inflateRawSync } from 'zlib';

const path = 'Cahier_des_charges_plateforme_acquisition_immobiliere.docx';
const buf = readFileSync(path);

function extractXml() {
  let offset = 0;
  while (offset < buf.length - 4) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const compression = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);

    if (name === 'word/document.xml') {
      const xml = compression === 8 ? inflateRawSync(data).toString('utf8') : data.toString('utf8');
      return xml;
    }

    offset = dataStart + compSize;
  }

  throw new Error('word/document.xml not found');
}

const xml = extractXml();
const text = xml
  .replace(/<w:tab[^/]*\/>/g, '\t')
  .replace(/<w:br[^/]*\/>/g, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

writeFileSync('cahier_extract.txt', text, 'utf8');
console.log('Extracted', text.length, 'chars');
