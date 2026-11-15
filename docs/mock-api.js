/* سرور آزمایشی: همان قراردادی را که برنامه از دیتابیس می‌خواهد (زیرمجموعهٔ PostgREST) روی حافظه پیاده می‌کند.
   اجرا: node tools/mock-api.js [port]   — فقط برای آزمون؛ سرویس واقعی همین رفتار را روی SQL می‌سازد. */
const http = require("http"), url = require("url");
const db = { inspections: new Map(), users: new Map(), archives: new Map() };
const now = () => new Date().toISOString();
let lastMs = 0;
const stamp = () => { lastMs = Math.max(Date.now(), lastMs + 1); return new Date(lastMs).toISOString(); }; // همیشه صعودی و یکتا

function parseIn(v) { // in.("a","b") یا in.(1,2)
  const m = /^in\.\((.*)\)$/.exec(v); if (!m) return null;
  return (m[1].match(/"(?:[^"\\]|\\.)*"|[^,]+/g) || []).map((x) => x.replace(/^"|"$/g, "").replace(/\\"/g, '"'));
}
function pick(r, sel) {
  if (!sel || sel === "*") return r;
  const o = {}; sel.split(",").forEach((k) => { o[k] = r[k]; }); return o;
}
function body(req) {
  return new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b ? JSON.parse(b) : null)); });
}
function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS" });
  res.end(obj === null ? "" : JSON.stringify(obj));
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, null);
  const u = url.parse(req.url, true), c = u.pathname.replace(/^\//, ""), q = u.query;
  const t = db[c];
  if (!t) return send(res, 404, { error: "مجموعه نامعتبر" });
  const prefer = req.headers.prefer || "";
  if (req.method === "GET") {
    if (q.or) return send(res, 400, { error: "or پشتیبانی نمی‌شود" }); // برنامه خودش به حالت بدون بازه برمی‌گردد
    let rows = [...t.entries()].map(([id, v]) => ({ id, data: v.data, updated_at: v.at }));
    if (q.id) {
      const m = /^(eq|in)\.(.*)$/.exec(q.id);
      const ids = m[1] === "eq" ? [decodeURIComponent(m[2])] : parseIn(q.id);
      rows = rows.filter((r) => ids.includes(r.id));
    }
    if (q.updated_at) { const m = /^(gte|eq)\.(.*)$/.exec(q.updated_at); rows = rows.filter((r) => m[1] === "gte" ? r.updated_at >= m[2] : r.updated_at === m[2]); }
    Object.keys(q).filter((k) => k.startsWith("data->>")).forEach((k) => {
      const f = k.slice(7), vs = parseIn(q[k]); rows = rows.filter((r) => vs.includes(String((r.data || {})[f])));
    });
    const ord = (q.order || "id").split(",");
    rows.sort((a, b) => { for (const k of ord) { if (a[k] < b[k]) return -1; if (a[k] > b[k]) return 1; } return 0; });
    const off = +q.offset || 0, lim = +q.limit || 1000;
    return send(res, 200, rows.slice(off, off + lim).map((r) => pick(r, q.select)));
  }
  const b = await body(req);
  if (req.method === "POST") { // upsert / فقط‌جدید
    const ignore = /ignore-duplicates/.test(prefer), out = [];
    for (const r of b) {
      if (t.has(r.id) && ignore) continue;
      t.set(r.id, { data: r.data, at: stamp() }); out.push({ id: r.id, data: r.data, updated_at: t.get(r.id).at });
    }
    return send(res, /representation/.test(prefer) ? 201 : 201, /representation/.test(prefer) ? out : null);
  }
  if (req.method === "PATCH") { // قفل خوش‌بینانه: id و updated_at هر دو باید بخوانند
    const id = decodeURIComponent((/^eq\.(.*)$/.exec(q.id) || [])[1] || ""), at = decodeURIComponent((/^eq\.(.*)$/.exec(q.updated_at) || [])[1] || "");
    const r = t.get(id);
    if (!r || (q.updated_at && r.at !== at)) return send(res, 200, []);
    r.data = b.data; r.at = stamp();
    return send(res, 200, [{ id, data: r.data, updated_at: r.at }]);
  }
  if (req.method === "DELETE") { t.delete(decodeURIComponent((/^eq\.(.*)$/.exec(q.id) || [])[1] || "")); return send(res, 204, null); }
  send(res, 405, { error: "متد نامعتبر" });
}).listen(+process.argv[2] || 8899, () => console.log("mock api up"));
