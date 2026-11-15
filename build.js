#!/usr/bin/env node
/* ساخت خروجی: همه‌ی فایل‌های src را به یک index.html می‌چسباند.
   اجرا:  node build.js     →  dist/index.html
   (فقط Node لازم است؛ بسته‌ی اضافه نیاز نیست.) */
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'src');
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const mime = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const dataUri = (rel) => {
  const f = path.join(SRC, rel);
  return 'data:' + (mime[path.extname(f)] || 'application/octet-stream') + ';base64,' + fs.readFileSync(f).toString('base64');
};
const manifest = JSON.parse(read('manifest.json'));

// CSS: ترتیب فایل‌ها طبق manifest؛ عکس‌ها داخل فایل خروجی گذاشته می‌شوند
let css = manifest.css.map(read).join('\n');
css = css.replace(/url\(\s*["']?\.\.\/(assets\/[^)"']+)["']?\s*\)/g, (_, p) => 'url(' + dataUri(p) + ')');

// بررسی ۱: هر فایل JS جداگانه باید بدون خطای نوشتاری باشد (نام فایل مشکل‌دار چاپ می‌شود)
const vm = require('vm');
const dup = {};
let problems = 0;
manifest.js.forEach((f) => {
  const code = read(f);
  try { new vm.Script(code, { filename: f }); } catch (e) { console.error('خطای نوشتاری در ' + f + ': ' + e.message); problems++; }
  (code.match(/^function (\w+)/gm) || []).forEach((m) => { const n = m.slice(9); (dup[n] = dup[n] || []).push(f); });
});
// بررسی ۲: یک تابع نباید در دو جا تعریف شود (دومی بی‌صدا اولی را خراب می‌کند)
Object.keys(dup).filter((n) => dup[n].length > 1).forEach((n) => { console.error('تابع تکراری «' + n + '» در: ' + dup[n].join('، ')); problems++; });
if (problems) { console.error('ساخت متوقف شد: ' + problems + ' مشکل.'); process.exit(1); }

// JS: همه داخل یک بلوک بسته؛ ترتیب فایل‌ها طبق manifest
const js = "(function () {\n'use strict';\n" + manifest.js.map(read).join('\n') + '\n})();';

let html = read('index.template.html');
html = html.replace(/(href=")(assets\/[^"]+)(")/g, (m, a, p, c) => a + dataUri(p) + c);
html = html.replace('/*@CSS*/', () => css).replace('/*@JS*/', () => js);

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);
console.log('dist/index.html ساخته شد (' + Math.round(html.length / 1024) + ' KB)');
