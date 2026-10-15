const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const INDEX = path.resolve(__dirname, '..', 'index.html');
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const CSP_SCRIPT_SRC_RE = /(<meta http-equiv="Content-Security-Policy" content="[^"]*?script-src )([^;"]*)/;

function inlineScriptHashes(html) {
  const text = html.replace(/\r\n?/g, '\n');
  const hashes = [];
  for (const m of text.matchAll(SCRIPT_RE)) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
    if (type && !/^(text\/javascript|module)$/i.test(type)) continue;
    hashes.push(`'sha256-${crypto.createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
  }
  return hashes;
}

function scriptSrc(html) {
  const m = html.match(CSP_SCRIPT_SRC_RE);
  return m ? m[2].trim().split(/\s+/) : null;
}

function withScriptHashes(html) {
  if (!CSP_SCRIPT_SRC_RE.test(html)) throw new Error('No script-src found in the Content-Security-Policy meta tag');
  return html.replace(CSP_SCRIPT_SRC_RE, `$1'self' ${inlineScriptHashes(html).join(' ')}`);
}

module.exports = { inlineScriptHashes, scriptSrc, withScriptHashes };

if (require.main === module) {
  const before = fs.readFileSync(INDEX, 'utf8');
  const after = withScriptHashes(before);
  if (after !== before) fs.writeFileSync(INDEX, after);
  console.log(after === before ? 'The script hashes in the security policy are already up to date.' : 'Updated the script hashes in the security policy.');
}
