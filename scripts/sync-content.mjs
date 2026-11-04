import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const root = fileURLToPath(new URL('../', import.meta.url));
export function loadContent() {
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/content.js'),'utf8'),context,{timeout:1000});
  return context.window.NEOX_CONTENT;
}
export function syncContent({check = false} = {}) {
  const {i18n} = loadContent(), pt = i18n.pt;
  const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const file = path.join(root,'index.html');
  const before = fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
  let html = before.replace(/<([a-z][a-z0-9-]*)\b([^>]*\bdata-i18n="([^"]+)"[^>]*)>([^<]*)<\/\1>/gi,(all,tag,attrs,key) => typeof pt[key] === 'string' ? `<${tag}${attrs}>${escape(pt[key])}</${tag}>` : all);
  html = html.replace(/<[a-z][^>]*>/gi,tag => {
    for (const [suffix,attr] of [['placeholder','placeholder'],['aria','aria-label'],['alt','alt'],['title','title']]) {
      const key = new RegExp(`data-i18n-${suffix}="([^"]+)"`).exec(tag)?.[1];
      if (key && typeof pt[key] === 'string') tag = tag.replace(new RegExp(`\\b${attr}="[^"]*"`),`${attr}="${escape(pt[key])}"`);
    }
    return tag;
  });
  html = html.replace(/(<meta name="description" content=")[^"]+/,`$1${escape(pt.meta_desc)}`);
  html = html.replace(/(<meta (?:property="og:description"|name="twitter:description") content=")[^"]+/g,`$1${escape(pt.meta_desc)}`);
  html = html.replace(/(assets\/(?:js|css)\/[^"?]+\.(?:js|css))(?:\?v=[a-z0-9]+)?(?=")/g,(all,name)=> {
    const hash = createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex').slice(0,10);
    return `${name}?v=${hash}`;
  });
  if (check && html !== before) throw new Error('Os textos ou versões do HTML precisam de node scripts/sync-content.mjs');
  if (!check) fs.writeFileSync(file,html);
  return html;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) syncContent();
