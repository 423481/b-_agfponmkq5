/* ════════════════════════════════════════════════════════════
   فصل 02 — ذخیره‌سازی و ارتباط با سرور
   بانک داده‌ی محلی، دمو، Supabase، صف آفلاین، ذخیره‌ی ایمن، همگام‌سازی و حافظه‌ی نهان.
   توابع اصلی: makeLocal، verGet، verPut، sbFetch، makeSupabase، probeSupa، makeRemote، offStore و …
   ════════════════════════════════════════════════════════════ */

var S = {
  view: "login",
  tab: "inspect",
  user: null,
  pick: null,
  loginErr: "",
  sheet: "chassis",
  key: "",
  searchErr: "",
  formErr: "",
  bulkMsg: "",
  toast: "",
  editing: null,
  editErr: "",
  isOwner: false,
  confirmDel: null,
  confirmUser: null,
  data: { insp: [], users: [], arch: [] },
  carq: "",
  mode: "connecting",
};

var store = null;

/* v159: «اولی می‌ماند» — در امضا و بندهای سالم، مقدار موجود هیچ‌وقت با مقدار تازه جایگزین نمی‌شود */
var KEEP_FIRST = ["signs", "items", "final"];

// بانک داده‌ی محلی (حالت دمو و آزمایشی) را می‌سازد؛ داده در خود مرورگر می‌ماند.
function makeLocal() {
  var data = {};
  try {
    data = JSON.parse(localStorage.getItem("zq-demo2") || "{}");
  } catch (e) {}
  var subs = {};
  function save() {
    try {
      localStorage.setItem("zq-demo2", JSON.stringify(data));
    } catch (e) {}
  }
  function list(c) {
    return Object.keys(data[c] || {}).map(function (id) {
      return Object.assign({ id: id }, data[c][id]);
    });
  }
  function emit(c) {
    (subs[c] || []).forEach(function (f) {
      f(list(c));
    });
  }
  return {
    mode: "local",
    get: function (c, id) {
      return Promise.resolve((data[c] && data[c][id]) || null);
    },
    set: function (c, id, d) {
      (data[c] = data[c] || {})[id] = d;
      save();
      emit(c);
      return Promise.resolve();
    },
    create: function (c, id, d) {
      if (data[c] && data[c][id]) return Promise.reject(new Error(DUP_MSG));
      (data[c] = data[c] || {})[id] = d;
      save();
      emit(c);
      return Promise.resolve();
    },
    update: function (c, id, d) {
      (data[c] = data[c] || {})[id] = deepMerge(data[c][id] || {}, d);
      save();
      emit(c);
      return Promise.resolve();
    },
    fill: function (c, id, d) {
      (data[c] = data[c] || {})[id] = fillMerge(data[c][id] || {}, d);
      save();
      emit(c);
      return Promise.resolve();
    },
    del: function (c, id) {
      if (data[c]) delete data[c][id];
      save();
      emit(c);
      return Promise.resolve();
    },
    sub: function (c, f) {
      (subs[c] = subs[c] || []).push(f);
      f(list(c));
    },
  };
}

function verGet(id) {
  try {
    return (JSON.parse(localStorage.getItem(VER_K) || "{}") || {})[id] || null;
  } catch (e) {
    return null;
  }
}

function verPut(id, v) {
  try {
    var m = JSON.parse(localStorage.getItem(VER_K) || "{}") || {};
    m[id] = { salt: v.salt, hash: v.hash };
    localStorage.setItem(VER_K, JSON.stringify(m));
  } catch (e) {}
}

function sbFetch(path, opt, ms) {
  opt = opt || {};
  var h = Object.assign(
    API_URL
      ? { Authorization: "Bearer " + authBearer() }
      : { apikey: SUPA_KEY, Authorization: "Bearer " + authBearer() },
    opt.headers || {},
  );
  var ctl = typeof AbortController !== "undefined" ? new AbortController() : null,
    tm = ctl
      ? setTimeout(function () {
          ctl.abort();
        }, ms || 15000)
      : null;
  return fetch((API_URL ? API_URL + "/" : SUPA_URL + "/rest/v1/") + path, {
    method: opt.method || "GET",
    headers: h,
    body: opt.body,
    signal: ctl ? ctl.signal : undefined,
  }).then(
    function (r) {
      if (tm) clearTimeout(tm);
      if (!r.ok)
        return r.text().then(function (t) {
          throw new Error("سرور: " + r.status + " " + t.slice(0, 120));
        });
      return r.status === 204
        ? null
        : r.text().then(function (t) {
            return t ? JSON.parse(t) : null;
          });
    },
    function (e) {
      if (tm) clearTimeout(tm);
      throw new Error("اتصال به سرور برقرار نشد");
    },
  );
}

/* ── اتصال Supabase / سرویس دیتابیس شرکت ──
   وضعیت هر اتصال در یک شیء sb نگه داشته می‌شود (حافظه‌ی رکوردها، مشترک‌ها، زمان‌سنج‌ها)؛
   توابع زیر فقط روی همین sb کار می‌کنند و makeSupabase آن‌ها را به هم وصل می‌کند. */

var SB_FULL_MS = 300000; // هر ۵ دقیقه یک همگام‌سازی کامل (برای دیدن حذف‌ها)
var SB_PAGE = 500;
var SB_META_PAGE = 1000;
var SB_IDS_BATCH = 40;

function newSbState() {
  return { cache: {}, subs: {}, timers: {}, busy: {}, pins: {}, last: {}, nFull: {}, winBroken: false };
}

function sbRows(sb, c) {
  var m = sb.cache[c] || {};
  return Object.keys(m).map(function (id) {
    return Object.assign({ id: id }, m[id].data);
  });
}

function sbEmit(sb, c) {
  (sb.subs[c] || []).forEach(function (f) {
    f(sbRows(sb, c));
  });
}

function sbQuote(v) {
  return '"' + String(v).replace(/"/g, '\\"') + '"';
}

function sbMaxAt(a, b) {
  return !b || a > b ? a : b;
}

// رشته‌ی in.(...) برای فهرستی از مقدارها
function sbInList(vs) {
  return (
    "in.(" +
    vs
      .map(function (v) {
        return encodeURIComponent(sbQuote(v));
      })
      .join(",") +
    ")"
  );
}

function sbChunks(list, size) {
  var parts = [];
  for (var i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
}

// ردیف‌های خوانده‌شده را در حافظه می‌گذارد و شناسه‌شان را «سنجاق» می‌کند تا بعداً هم‌گام بمانند
function sbAddRows(sb, c, arr) {
  var m = (sb.cache[c] = sb.cache[c] || {});
  (arr || []).forEach(function (r) {
    m[r.id] = { data: r.data || {}, at: r.updated_at };
    (sb.pins[c] = sb.pins[c] || {})[r.id] = 1;
  });
}

function sbWinParam(sb, c) {
  if (sb.winBroken || typeof WINQ !== "function") return "";
  try {
    return WINQ(c) || "";
  } catch (e) {
    return "";
  }
}

// شناسه و زمان تغییر همه‌ی رکوردهای داخل بازه؛ اگر سرور فیلتر بازه را نپذیرد بدون بازه می‌خواند
function sbMetaAll(sb, c) {
  var extra = sbWinParam(sb, c),
    out = [];
  function go(off) {
    return sbFetch(
      c + "?select=id,updated_at" + extra + "&order=id&limit=" + SB_META_PAGE + "&offset=" + off,
    ).then(function (r) {
      r = r || [];
      out = out.concat(r);
      return r.length >= SB_META_PAGE ? go(off + SB_META_PAGE) : out;
    });
  }
  return go(0).catch(function (e) {
    if (extra && /^سرور/.test((e && e.message) || "")) {
      sb.winBroken = true;
      extra = "";
      out = [];
      return go(0);
    }
    throw e;
  });
}

// رکوردهای سنجاق‌شده‌ای که بیرون از بازه مانده‌اند را هم به فهرست meta اضافه می‌کند
function sbPinMeta(sb, c, meta) {
  var have = {};
  meta.forEach(function (r) {
    have[r.id] = 1;
  });
  var ids = Object.keys(sb.pins[c] || {}).filter(function (i) {
    return !have[i];
  });
  if (!ids.length) return Promise.resolve(meta);
  return Promise.all(
    sbChunks(ids, SB_IDS_BATCH).map(function (p) {
      return sbFetch(c + "?select=id,updated_at&id=" + sbInList(p));
    }),
  ).then(function (res) {
    res.forEach(function (a) {
      meta = meta.concat(a || []);
    });
    return meta;
  });
}

// یک دور جست‌وجوی خودرو با چند مقدار (شناسه‌ی برگه‌ها، فیلدهای شماره و بایگانی)
function sbCarRound(sb, vs) {
  var ids = [];
  Object.keys(SHEETS).forEach(function (sh) {
    vs.forEach(function (v) {
      ids.push(sh + "_" + v);
    });
  });
  var reqs = sbChunks(ids, SB_IDS_BATCH).map(function (part) {
    return sbFetch("inspections?select=id,data,updated_at&id=" + sbInList(part));
  });
  ["key", "serial", "chassisNo", "engine", "room"].forEach(function (f) {
    reqs.push(
      sbFetch("inspections?select=id,data,updated_at&data-%3E%3E" + f + "=in.(" + vs.join(",") + ")"),
    );
  });
  reqs.push(
    sbFetch("archives?select=id,data,updated_at&id=" + sbInList(vs)).then(function (a) {
      sbAddRows(sb, "archives", a);
      return [];
    }),
  );
  return Promise.all(reqs).then(function (res) {
    var rows = [];
    res.forEach(function (a) {
      rows = rows.concat(a || []);
    });
    return rows;
  });
}

var SB_NUM_RE = /^[A-Za-z0-9]{3,20}$/;

// شماره‌های دیگر (سریال/شاسی/موتور/اتاق) که از رکوردهای پیداشده می‌آید و هنوز جست‌وجو نشده
function sbRelatedNumbers(rows, done) {
  var more = [];
  rows.forEach(function (r) {
    var d = r.data || {};
    [d.key, d.serial, d.chassisNo, d.engine, d.room].forEach(function (v) {
      v = v && String(v);
      if (v && SB_NUM_RE.test(v) && !done[v]) {
        done[v] = 1;
        more.push(v);
      }
    });
  });
  return more;
}

// خودرو را با هر شماره‌ای (و شماره‌های مرتبط) از سرور می‌آورد
function sbFetchCar(sb, vals) {
  var seen = {},
    vs = (vals || []).map(String).filter(function (v) {
      return SB_NUM_RE.test(v) && !seen[v] && (seen[v] = 1);
    });
  if (!vs.length) return Promise.resolve();
  var done = {};
  vs.forEach(function (v) {
    done[v] = 1;
  });
  return sbCarRound(sb, vs)
    .then(function (rows) {
      sbAddRows(sb, "inspections", rows);
      var more = sbRelatedNumbers(rows, done);
      if (!more.length) return;
      return sbCarRound(sb, more.slice(0, 12)).then(function (r2) {
        sbAddRows(sb, "inspections", r2);
      });
    })
    .then(function () {
      sbEmit(sb, "inspections");
      sbEmit(sb, "archives");
    });
}

function sbFetchSince(sb, days) {
  var since = new Date(Date.now() - days * 86400000).toISOString();
  function go(off) {
    return sbFetch(
      "inspections?select=id,data,updated_at&updated_at=gte." +
        since +
        "&order=id&limit=" +
        SB_PAGE +
        "&offset=" +
        off,
    ).then(function (r) {
      r = r || [];
      sbAddRows(sb, "inspections", r);
      return r.length >= SB_PAGE ? go(off + SB_PAGE) : null;
    });
  }
  return go(0).then(function () {
    sbEmit(sb, "inspections");
  });
}

/* خواندن افزایشی: فقط رکوردهایی که از آخرین بار تغییر کرده‌اند؛ هر ۵ دقیقه یک بار هم همگام‌سازی کامل (برای حذف‌ها) */
function sbDelta(sb, c) {
  var m = sb.cache[c],
    since = new Date(Date.parse(sb.last[c]) - 30000).toISOString(),
    got = false;
  function go(off) {
    return sbFetch(
      c +
        "?select=id,data,updated_at&updated_at=gte." +
        encodeURIComponent(since) +
        "&order=updated_at,id&limit=" +
        SB_META_PAGE +
        "&offset=" +
        off,
    ).then(function (r) {
      r = r || [];
      r.forEach(function (x) {
        sb.last[c] = sbMaxAt(x.updated_at, sb.last[c]);
        if (!m[x.id] || m[x.id].at !== x.updated_at) {
          m[x.id] = { data: x.data || {}, at: x.updated_at };
          got = true;
        }
      });
      return r.length >= SB_META_PAGE ? go(off + SB_META_PAGE) : null;
    });
  }
  return go(0).then(
    function () {
      sb.busy[c] = false;
      if (got) sbEmit(sb, c);
    },
    function () {
      sb.busy[c] = false;
    },
  );
}

// رکوردهای حذف‌شده را از حافظه برمی‌دارد و شناسه‌ی رکوردهای تازه/تغییرکرده را برمی‌گرداند
function sbReconcile(sb, c, meta) {
  var m = (sb.cache[c] = sb.cache[c] || {}),
    seen = {},
    need = [],
    changed = false;
  meta.forEach(function (r) {
    seen[r.id] = 1;
    if (!m[r.id] || m[r.id].at !== r.updated_at) need.push(r.id);
  });
  Object.keys(m).forEach(function (id) {
    if (!seen[id]) {
      delete m[id];
      changed = true;
    }
  });
  return { need: need, changed: changed };
}

function sbFetchByIds(sb, c, need) {
  var m = sb.cache[c];
  return Promise.all(
    sbChunks(need, SB_IDS_BATCH).map(function (ids) {
      return sbFetch(c + "?select=id,data,updated_at&id=" + sbInList(ids));
    }),
  ).then(function (res) {
    res.forEach(function (arr) {
      (arr || []).forEach(function (r) {
        m[r.id] = { data: r.data || {}, at: r.updated_at };
      });
    });
    sb.busy[c] = false;
    sbEmit(sb, c);
  });
}

// همگام‌سازی کامل: فهرست شناسه‌ها را می‌خواند و فقط تغییرکرده‌ها را می‌آورد
function sbFullSync(sb, c) {
  return sbMetaAll(sb, c)
    .then(function (meta0) {
      return sbPinMeta(sb, c, meta0);
    })
    .then(function (meta) {
      sb.nFull[c] = Date.now();
      (meta || []).forEach(function (r) {
        sb.last[c] = sbMaxAt(r.updated_at, sb.last[c]);
      });
      var diff = sbReconcile(sb, c, meta || []);
      if (!diff.need.length) {
        sb.busy[c] = false;
        if (diff.changed) sbEmit(sb, c);
        return;
      }
      return sbFetchByIds(sb, c, diff.need);
    })
    .catch(function () {
      sb.busy[c] = false;
    });
}

function sbPoll(sb, c) {
  if (sb.busy[c]) return;
  sb.busy[c] = true;
  if (
    sb.last[c] &&
    sb.nFull[c] &&
    Date.now() - sb.nFull[c] < SB_FULL_MS &&
    !isNaN(Date.parse(sb.last[c]))
  ) {
    sb.cache[c] = sb.cache[c] || {};
    return sbDelta(sb, c);
  }
  return sbFullSync(sb, c);
}

var SB_JSON = { "Content-Type": "application/json" };

// نتیجه‌ی نوشتن را بلافاصله در حافظه می‌گذارد و کمی بعد از سرور دوباره می‌خواند
function sbRemember(sb, c, id, d, delay) {
  (sb.cache[c] = sb.cache[c] || {})[id] = { data: d, at: "local-" + Date.now() };
  sbEmit(sb, c);
  setTimeout(function () {
    sbPoll(sb, c);
  }, delay);
}

function sbPut(sb, c, id, d) {
  return sbFetch(c + "?on_conflict=id", {
    method: "POST",
    headers: Object.assign({ Prefer: "resolution=merge-duplicates,return=minimal" }, SB_JSON),
    body: JSON.stringify([{ id: id, data: d }]),
  }).then(function () {
    sbRemember(sb, c, id, d, 300);
  });
}

/* فقط‌جدید: اگر همین شناسه قبلاً هست، چیزی نوشته نمی‌شود و خطا می‌دهد (هیچ ثبتی روی ثبت دیگر نمی‌نشیند) */
function sbCreate(sb, c, id, d) {
  return sbFetch(c + "?on_conflict=id", {
    method: "POST",
    headers: Object.assign({ Prefer: "resolution=ignore-duplicates,return=representation" }, SB_JSON),
    body: JSON.stringify([{ id: id, data: d }]),
  }).then(function (res) {
    if (!res || !res.length) {
      sbFetchCar(sb, [d.key, d.serial, d.chassisNo, d.engine, d.room].filter(Boolean).map(String)).then(
        function () {
          sbEmit(sb, c);
        },
        function () {},
      );
      setTimeout(function () {
        sbPoll(sb, c);
      }, 100);
      throw new Error(DUP_MSG);
    }
    sbRemember(sb, c, id, d, 300);
  });
}

function sbDelete(sb, c, id) {
  return sbFetch(c + "?id=eq." + encodeURIComponent(id), {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  }).then(function () {
    if (sb.cache[c]) delete sb.cache[c][id];
    sbEmit(sb, c);
  });
}

function sbFetchAll(sb) {
  function all(c) {
    function go(off) {
      return sbFetch(c + "?select=id,data,updated_at&order=id&limit=" + SB_PAGE + "&offset=" + off).then(
        function (r) {
          r = r || [];
          sbAddRows(sb, c, r);
          return r.length >= SB_PAGE ? go(off + SB_PAGE) : null;
        },
      );
    }
    return go(0);
  }
  return Promise.all([all("inspections"), all("archives")]).then(function () {
    sbEmit(sb, "inspections");
    sbEmit(sb, "archives");
  });
}

function sbGet(c, id) {
  return sbFetch(c + "?select=data&id=eq." + encodeURIComponent(id)).then(function (r) {
    return r && r[0] ? r[0].data || {} : null;
  });
}

function sbSubscribe(sb, c, f) {
  (sb.subs[c] = sb.subs[c] || []).push(f);
  sbPoll(sb, c);
  if (!sb.timers[c])
    sb.timers[c] = setInterval(
      function () {
        if (!document.hidden) sbPoll(sb, c);
      },
      c === "inspections" ? 5000 : 10000,
    );
}

/* v109: قفل خوش‌بینانه — نوشتن فقط اگر updated_at از زمان خواندن عوض نشده باشد؛ وگرنه دوباره بخوان و ادغام کن */
function sbMergeWrite(sb, c, id, d, mergeFn) {
  var tries = 0;
  function attempt() {
    return sbFetch(c + "?select=data,updated_at&id=eq." + encodeURIComponent(id)).then(function (r) {
      var row = r && r[0];
      if (!row) {
        if (c === "inspections" || c === "archives")
          throw new Error("این پرونده دیگر وجود ندارد (شاید حذف شده). صفحه را تازه کنید.");
        return sbPut(sb, c, id, deepMerge({}, d));
      }
      var merged = mergeFn(row.data || {}, d);
      return sbPatchIfUnchanged(c, id, row.updated_at, merged).then(function (res) {
        if (res && res.length) return sbRemember(sb, c, id, merged, 300);
        if (++tries < 5)
          return new Promise(function (ok) {
            setTimeout(ok, 80 + Math.random() * 220);
          }).then(attempt);
        throw new Error("تداخل ذخیره؛ دوباره تلاش کنید");
      });
    });
  }
  return attempt();
}

// نوشتن فقط اگر زمان تغییر هنوز همان زمانِ خوانده‌شده باشد؛ پاسخ خالی = کس دیگری نوشته است
function sbPatchIfUnchanged(c, id, readAt, merged) {
  return sbFetch(c + "?id=eq." + encodeURIComponent(id) + "&updated_at=eq." + encodeURIComponent(readAt), {
    method: "PATCH",
    headers: Object.assign({ Prefer: "return=representation" }, SB_JSON),
    body: JSON.stringify({ data: merged, updated_at: new Date().toISOString() }),
  });
}

// ارتباط با سرور را می‌سازد: خواندن، نوشتن، حذف و به‌روزرسانی.
function makeSupabase() {
  var sb = newSbState();
  return {
    mode: "shared",
    supa: true,
    fetchCar: function (vals) {
      return sbFetchCar(sb, vals);
    },
    fetchSince: function (days) {
      return sbFetchSince(sb, days);
    },
    fetchAll: function () {
      return sbFetchAll(sb);
    },
    get: sbGet,
    kick: function () {
      ["inspections", "users", "archives"].forEach(function (c) {
        sbPoll(sb, c);
      });
    },
    set: function (c, id, d) {
      return sbPut(sb, c, id, d);
    },
    create: function (c, id, d) {
      return sbCreate(sb, c, id, d);
    },
    update: function (c, id, d) {
      return sbMergeWrite(sb, c, id, d, deepMerge);
    },
    fill: function (c, id, d) {
      return sbMergeWrite(sb, c, id, d, fillMerge);
    },
    del: function (c, id) {
      return sbDelete(sb, c, id);
    },
    sub: function (c, f) {
      sbSubscribe(sb, c, f);
    },
  };
}

function probeSupa() {
  return sbFetch("inspections?select=id&limit=1", {}, 6000).then(
    function () {
      return makeSupabase();
    },
    function () {
      return null;
    },
  );
}

// بین حالت محلی و سرور انتخاب می‌کند و بانک داده‌ی نهایی را برمی‌گرداند.
function makeRemote(db) {
  return {
    mode: "shared",
    set: function (c, id, d) {
      return db.doc(c + "/" + id).set(d);
    },
    update: function (c, id, d) {
      return db.doc(c + "/" + id).update(d);
    },
    fill: function (c, id, d) {
      return db.doc(c + "/" + id).update(d);
    },
    del: function (c, id) {
      return db.doc(c + "/" + id).delete();
    },
    sub: function (c, f) {
      db.collection(c).onSnapshot(
        function (s) {
          f(
            s.docs.map(function (d) {
              return Object.assign({ id: d.id }, d.data());
            }),
          );
        },
        function () {},
      );
    },
  };
}

/* ---------- offline queue: when the connection drops, changes are kept on the device and sent later ---------- */
var DUP_MSG = "این شماره قبلاً ثبت شده است؛ اطلاعات تازه گرفته شد. دوباره باز کنید.";

var OFFLINE = { q: [], busy: false, failed: 0, sent: 0 };

/* v166: اگر حافظه‌ی دائمی پر شد، نسخه‌ی پشتیبان صف در sessionStorage می‌ماند (فقط تا بستن تب) و بعد از بازشدن دوباره خوانده می‌شود */
var OFF_SS = "zq-offq-ss",
  OFF_FULL_MSG =
    "حافظه‌ی دستگاه پر است؛ ثبت‌های آفلاین فقط تا بسته‌شدن صفحه نگه داشته می‌شوند. صفحه را نبندید و به اینترنت وصل شوید.";

function offStore(k, v) {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch (e) {
    return false;
  }
}

function offFreeCache() {
  try {
    localStorage.removeItem("cm_ucache");
    return true;
  } catch (e) {
    return false;
  }
}

function offPut(k, j) {
  return offStore(k, j) || (offFreeCache() && offStore(k, j));
}

function offWarnFull() {
  if (OFFLINE.full) return;
  OFFLINE.full = true;
  setTimeout(function () {
    toast(OFF_FULL_MSG);
  }, 0);
}

function offSave() {
  var j = JSON.stringify(OFFLINE.q);
  if (offPut("zq-offq", j)) {
    OFFLINE.full = false;
    try {
      sessionStorage.removeItem(OFF_SS);
    } catch (e) {}
    return true;
  }
  try {
    sessionStorage.setItem(OFF_SS, j);
  } catch (e) {}
  offWarnFull();
  return false;
}

function isAuthErr(e) {
  return /سرور: 401/.test((e && e.message) || "");
}

function isNetErr(e) {
  return !navigator.onLine || /اتصال به سرور/.test((e && e.message) || "");
}

function overlay(rows, c) {
  var ops = OFFLINE.q.filter(function (o) {
    return o.c === c;
  });
  if (!ops.length) return rows;
  var m = {};
  rows.forEach(function (r) {
    m[r.id] = r;
  });
  ops.forEach(function (o) {
    if (o.k === "del") delete m[o.id];
    else if (o.k === "set" || o.k === "create") m[o.id] = Object.assign({ id: o.id }, o.d);
    else
      m[o.id] = Object.assign(
        { id: o.id },
        (o.k === "fill" ? fillMerge : deepMerge)(m[o.id] || {}, o.d),
      );
  });
  return Object.keys(m).map(function (k) {
    return m[k];
  });
}

var RAW_ROWS = { insp: [], users: [], arch: [] };

function feedUsers(rows0) {
  var rows = overlay(rows0, "users");
  S.ownerRec =
    rows.filter(function (r) {
      return r.id === "__owner";
    })[0] || null;
  S.cfg =
    rows.filter(function (r) {
      return r.id === "__cfg";
    })[0] || null;
  S.lists =
    rows.filter(function (r) {
      return r.id === "__lists";
    })[0] || null;
  S.hid =
    (
      rows.filter(function (r) {
        return r.id === "__hide";
      })[0] || {}
    ).h || {};
  S.lg = rows
    .filter(function (r) {
      return String(r.id).indexOf("lg_") === 0;
    })
    .sort(function (a, b) {
      return (b.at || "") < (a.at || "") ? -1 : 1;
    });
  S.stops = rows.filter(function (r) {
    return String(r.id).indexOf("stop_") === 0;
  });
  S.pshorts = rows.filter(function (r) {
    return String(r.id).indexOf("psh_") === 0;
  });
  S.cpfs = rows.filter(function (r) {
    return String(r.id).indexOf("cpf_") === 0;
  });
  S.corr = rows
    .filter(function (r) {
      return String(r.id).indexOf("corr_") === 0;
    })
    .sort(function (a, b) {
      return (b.at || "") < (a.at || "") ? -1 : 1;
    });
  var sp = smpSplitDups(
    rows.filter(function (r) {
      return String(r.id).indexOf("smp_") === 0;
    }),
  );
  S.smp = sp.shown;
  S.smpDup = sp.hidden;
  S.data.users = rows.filter(function (r) {
    return (
      r.id !== "__owner" &&
      r.id !== "__cfg" &&
      r.id !== "__lists" &&
      r.id !== "__hide" &&
      String(r.id).indexOf("corr_") !== 0 &&
      String(r.id).indexOf("lg_") !== 0 &&
      String(r.id).indexOf("smp_") !== 0 &&
      String(r.id).indexOf("stop_") !== 0 &&
      String(r.id).indexOf("psh_") !== 0 &&
      String(r.id).indexOf("cpf_") !== 0
    );
  });
  setTimeout(sessRestore, 0);
}

function reapply() {
  PCACHE = {};
  S.data.insp = visT(overlay(RAW_ROWS.insp, "inspections"));
  feedUsers(RAW_ROWS.users);
  S.data.arch = visT(overlay(RAW_ROWS.arch, "archives"));
  render();
}

/* ---------- #28: light loading (time window), exact-number fetch on demand ---------- */
function winDays() {
  var W = (S.lists && S.lists.win) || {},
    mg =
      S.user &&
      (S.user.id === "owner" ||
        S.user.role === "prodmgr" ||
        ["commercial", "quality", "planning"].indexOf(S.user.station) >= 0);
  var fin = S.user && (S.user.station === "st4" || S.user.station === "st5");
  return mg ? +W.mgr || 30 : +W.chk || (fin ? 2 : 1);
}

function WINQ(c) {
  if (c === "users") return "";
  var since = new Date(Date.now() - winDays() * 86400000).toISOString();
  if (c === "inspections")
    return (
      "&or=" +
      encodeURIComponent("(updated_at.gte." + since + ",data->>final.is.null,data->>openS.eq.1)")
    );
  if (c === "archives") return "&updated_at=gte." + since;
  return "";
}

// شماره‌ها به‌علاوه‌ی شماره‌های هم‌خودرو که تا حالا در حافظه است (شاسی، موتور، اتاق، سریال)
function withLinkedNumbers(vals) {
  var out = [];
  (vals || []).forEach(function (v) {
    if (!v) return;
    var I = identity(v);
    out.push(String(v), I.serial, I.chassis, I.engine, I.room);
  });
  return out;
}

function ensureCar(vals) {
  if (!store || !store.fetchCar) return Promise.resolve();
  var need = withLinkedNumbers(vals)
    .map(function (v) {
      return String(v || "");
    })
    .filter(function (v, i, a) {
      return v && !CARF[v] && a.indexOf(v) === i;
    });
  if (!need.length) return Promise.resolve();
  return store.fetchCar(need).then(
    function () {
      need.forEach(function (v) {
        CARF[v] = 1;
      });
    },
    function () {},
  );
}

function markS(id, d) {
  var cur = S.data.insp.filter(function (x) {
      return x.id === id;
    })[0],
    items = deepMerge((cur && cur.items) || {}, d.items),
    open = 0;
  Object.keys(items).forEach(function (k) {
    var it = items[k];
    if (it && it.r === "shortage" && !it.closedAt) open = 1;
  });
  return Object.assign({}, d, { openS: open });
}

/* v110: کاربران آخرین اتصال موفق برای ورود وقتی برنامه بدون سرور باز می‌شود (تا ۷ روز) */
var UCACHE_KEY = "cm_ucache";

function ucacheSave(rows) {
  if (!rows || !rows.length) return;
  try {
    localStorage.setItem(UCACHE_KEY, JSON.stringify({ at: Date.now(), rows: rows }));
  } catch (e) {}
}

function ucacheGet() {
  try {
    var c = JSON.parse(localStorage.getItem(UCACHE_KEY) || "null");
    return c && c.rows && c.rows.length && Date.now() - c.at <= UCACHE_MS ? c : null;
  } catch (e) {
    return null;
  }
}

function offWrap(st) {
  function run(k, c, id, d) {
    function queue() {
      OFFLINE.q.push({ k: k, c: c, id: id, d: d, at: Date.now() });
      offSave();
      reapply();
      setTimeout(offFlush, 1500);
      return true;
    }
    if (OFFLINE.q.length) return Promise.resolve(queue());
    var p =
      k === "del"
        ? st.del(c, id)
        : k === "set"
          ? st.set(c, id, d)
          : k === "create"
            ? st.create(c, id, d)
            : k === "fill"
              ? st.fill(c, id, d)
              : st.update(c, id, d);
    return p.catch(function (e) {
      if (isNetErr(e) || isAuthErr(e)) {
        OFFLINE.lastErr = (e && e.message) || "";
        return queue();
      }
      throw e;
    });
  }
  var w = Object.assign({}, st);
  w.raw = st;
  w.set = function (c, id, d) {
    return run("set", c, id, d);
  };
  w.create = function (c, id, d) {
    return run("create", c, id, d);
  };
  w.update = function (c, id, d) {
    if (c === "inspections" && d && d.items) d = markS(id, d);
    return run("update", c, id, d);
  };
  w.fill = function (c, id, d) {
    if (c === "inspections" && d && d.items) d = markS(id, d);
    return run("fill", c, id, d);
  };
  w.del = function (c, id) {
    return run("del", c, id);
  };
  return w;
}

// رکوردهای صف آفلاین را وقتی اینترنت برگشت به سرور می‌فرستد.
function offFlush() {
  if (OFFLINE.busy || !OFFLINE.q.length || !store || !store.raw) return;
  OFFLINE.busy = true;
  (function step() {
    var o = OFFLINE.q[0];
    if (!o) {
      OFFLINE.busy = false;
      if (OFFLINE.failed) {
        OFFLINE.failed = 0;
        OFFLINE.sent = 0;
        toast(
          "بعضی ثبت‌های آفلاین پذیرفته نشد (مثلاً شماره قبلاً ثبت شده بود). از «وضعیت ارسال» نسخه‌ی پشتیبان بگیرید.",
        );
      } else if (OFFLINE.sent) {
        OFFLINE.sent = 0;
        toast("تغییرات ذخیره‌شده‌ی آفلاین ارسال شد");
      }
      reapply();
      return;
    }
    var st = store.raw,
      p =
        o.k === "del"
          ? st.del(o.c, o.id)
          : o.k === "set"
            ? st.set(o.c, o.id, o.d)
            : o.k === "create"
              ? st.create(o.c, o.id, o.d)
              : o.k === "fill"
                ? st.fill(o.c, o.id, o.d)
                : st.update(o.c, o.id, o.d);
    p.then(
      function () {
        OFFLINE.q.shift();
        OFFLINE.sent++;
        OFFLINE.lastErr = "";
        offSave();
        step();
      },
      function (e) {
        OFFLINE.lastErr = (e && e.message) || "";
        if (isNetErr(e) || isAuthErr(e)) {
          OFFLINE.busy = false;
          return;
        }
        offBadAdd(o, OFFLINE.lastErr);
        OFFLINE.q.shift();
        OFFLINE.failed++;
        offSave();
        step();
      },
    );
  })();
}

/* ---------- وضعیت صف ارسال آفلاین (با لمس نوشته‌ی «آفلاین» بالای صفحه) ---------- */
var BAD_K = "zq-offbad";

var BAD_MEM = [];

function offBadStored() {
  try {
    return JSON.parse(localStorage.getItem(BAD_K) || "[]");
  } catch (e) {
    return [];
  }
}

function offBad() {
  return offBadStored().concat(BAD_MEM);
}

function offBadAdd(o, err) {
  var rec = Object.assign({ err: String(err || "") }, o),
    b = offBadStored();
  b.push(rec);
  if (!offPut(BAD_K, JSON.stringify(b))) {
    BAD_MEM.push(rec);
    offWarnFull();
  }
}

function offErrText() {
  var e = OFFLINE.lastErr || "";
  if (!e) return "خطایی ثبت نشده؛ شاید هنوز تلاشی نشده است. «ارسال دوباره» را بزنید.";
  if (/401/.test(e))
    return "سرور اعتبار ورود را قبول نمی‌کند. خروج بزنید و دوباره با رمز وارد شوید.";
  if (/اتصال به سرور/.test(e))
    return "اتصال به سرور برقرار نشد، یا ثبت اول خیلی سنگین است (مثلاً عکس).";
  return e;
}

var OFF_KIND = {
  set: "ذخیره",
  create: "ثبت جدید",
  update: "به‌روزرسانی",
  del: "حذف",
};

function offLine(label, value) {
  return '<div class="it"><small>' + label + "</small><b>" + value + "</b></div>";
}

function offHeadInfo(o) {
  if (!o) return offLine("صف", "خالی است");
  var kb = Math.max(1, Math.round(JSON.stringify(o.d || {}).length / 1024));
  return (
    offLine("اولین ثبت در صف", esc(OFF_KIND[o.k] || o.k) + " · " + esc(o.c) + " · " + esc(o.id)) +
    offLine("مدت ماندن در صف", esc(elapsedTxt(Date.now() - (o.at || Date.now())))) +
    offLine("حجم", "حدود " + faDigits(kb) + " کیلوبایت")
  );
}

function offButtons() {
  var h =
    '<div class="row" style="margin-top:12px"><button class="btn primary" data-act="offretry">ارسال دوباره‌ی همین حالا</button><button class="btn" data-act="offbackup">ذخیره‌ی نسخه‌ی پشتیبان صف</button></div>';
  if (!OFFLINE.q.length) return h;
  if (S.offSkip)
    return (
      h +
      '<div class="row" style="margin-top:12px"><span class="hint" style="color:var(--open)">ثبت اول کنار گذاشته شود؟ (در پشتیبان هست و حذف نمی‌شود)</span><button class="btn sm primary" data-act="offskipyes">بله، کنار گذاشته شود</button><button class="btn sm" data-act="offskipno">انصراف</button></div>'
    );
  return (
    h +
    '<div class="row" style="margin-top:12px"><button class="btn sm" data-act="offskipask"' +
    (S.offBacked ? "" : " disabled") +
    ">کنار گذاشتن ثبت اول</button>" +
    (S.offBacked ? "" : '<span class="hint">اول نسخه‌ی پشتیبان را ذخیره کنید.</span>') +
    "</div>"
  );
}

function offPanel() {
  if (!S.offOpen) return "";
  var bad = offBad().length;
  return (
    '<div class="card"><div class="row"><h2 class="grow" style="margin:0;font-size:18px">وضعیت ارسال</h2><button class="btn sm" data-act="offtoggle">بستن</button></div>' +
    offLine("تعداد ثبت‌های ارسال‌نشده", faDigits(OFFLINE.q.length)) +
    offLine("اینترنت گوشی", navigator.onLine === false ? "قطع" : "وصل") +
    offHeadInfo(OFFLINE.q[0]) +
    offLine("آخرین خطا", esc(offErrText())) +
    (OFFLINE.lastErr
      ? '<p class="hint" style="margin:6px 0 0;direction:ltr;text-align:left">' +
        esc(OFFLINE.lastErr.slice(0, 160)) +
        "</p>"
      : "") +
    (bad ? offLine("ثبت‌های رد‌شده (در پشتیبان می‌آید)", faDigits(bad)) : "") +
    offButtons() +
    "</div>"
  );
}

function offBackup() {
  var data = {
    at: nowIso(),
    by: S.user ? S.user.name : "",
    queue: OFFLINE.q,
    parked: offBad(),
  };
  S.offBacked = true;
  return saveFile(
    "offline-queue-" + nowIso().slice(0, 10) + ".json",
    new Blob([JSON.stringify(data)], { type: "application/json" }),
  );
}

function offSkipFirst() {
  var o = OFFLINE.q.shift();
  if (o) offBadAdd(o, "کنار گذاشته شد توسط " + (S.user ? S.user.name : ""));
  OFFLINE.busy = false;
  offSave();
  S.offSkip = false;
  S.offBacked = false;
  render();
  offFlush();
}

/* ---------- رندر بی‌اثر (فقط کاربر شاسی داخل ویزارد خودرو) ---------- */
function inChassisCar() {
  return wizStation() && isChs(S.sheet) && !!S.key && !S.doneScr;
}

/* مقایسه‌ی سبک: اگر همه‌ی فیلدها همان شیء قبلی‌اند یعنی تغییری نیست؛ در غیر این صورت مقایسه‌ی کامل با JSON */
function sameRow(a, b) {
  var n = 0,
    k;
  for (k in a) {
    n++;
    if (a[k] !== b[k]) return JSON.stringify(a) === JSON.stringify(b);
  }
  for (k in b) n--;
  return n === 0 || JSON.stringify(a) === JSON.stringify(b);
}

function changedRows(oldRows, newRows) {
  var old = {},
    out = [];
  oldRows.forEach(function (r) {
    old[r.id] = r;
  });
  newRows.forEach(function (r) {
    var o = old[r.id];
    delete old[r.id];
    if (!o || !sameRow(o, r)) out.push(r);
  });
  Object.keys(old).forEach(function (id) {
    out.push(old[id]);
  });
  return out;
}

function touchesCar(changed, key) {
  var c = carRecords(key),
    vals = [key, c.I.serial, c.I.chassis, c.I.engine, c.I.room].filter(Boolean);
  return changed.some(function (d) {
    var o = identOf(d);
    return ["serial", "chassis", "engine", "room"].some(function (f) {
      return o[f] && vals.indexOf(o[f]) >= 0;
    });
  });
}

// با تغییر داده‌ی بازدیدها صفحه را فقط در صورت لزوم دوباره می‌سازد.
function onInspections(rows) {
  RAW_ROWS.insp = rows;
  var next = visT(overlay(rows, "inspections"));
  var changed = changedRows(S.data.insp, next);
  if (!changed.length) return;
  if (!inChassisCar()) {
    PCACHE = {};
    S.data.insp = next;
    render();
    return;
  }
  var mine = touchesCar(changed, S.key);
  PCACHE = {};
  S.data.insp = next;
  if (mine) render();
}

// اتصال اولیه، بارگذاری داده‌ها و شروع به‌روزرسانی دوره‌ای.
function connect() {
  var done = false;
  /* v109: بدون اتصال به سرور هرگز حالت محلی/بی‌صدا فعال نمی‌شود؛ خطا نشان داده و هر ۸ ثانیه دوباره تلاش می‌شود */
  var retrying = false;
  function startOffline(cached) {
    use(offWrap(makeSupabase()));
    S.offStart = true;
    RAW_ROWS.users = cached.rows;
    S.usersReady = true;
    feedUsers(cached.rows);
    render();
  }
  function connFail() {
    if (done || retrying) return;
    var cached = ucacheGet();
    if (cached) {
      startOffline(cached);
      return;
    }
    retrying = true;
    S.connErr = true;
    render();
    setTimeout(function () {
      retrying = false;
      S.connErr = false;
      probeSupa().then(function (sb) {
        if (sb) use(offWrap(sb));
        else connFail();
      });
    }, 8000);
  }
  window.addEventListener("hashchange", function () {
    if (!S.user) render();
  });
  function use(st) {
    if (done) return;
    done = true;
    store = st;
    S.mode = st.mode;
    S.supa = !!st.supa;
    if (st.mode === "local") S.isOwner = true;
    st.sub("inspections", onInspections);
    st.sub("users", function (rows) {
      S.offStart = false;
      ucacheSave(rows);
      RAW_ROWS.users = rows;
      S.usersReady = true;
      feedUsers(rows);
      render();
    });
    setTimeout(sessRestore, 0);
    st.sub("archives", function (rows) {
      RAW_ROWS.arch = rows;
      S.data.arch = visT(overlay(rows, "archives"));
      if (!inChassisCar()) render();
    });
    render();
  }
  probeSupa().then(function (sb) {
    if (sb) {
      use(offWrap(sb));
      return;
    }
    var p = window.claude && window.claude.use ? window.claude.use("db") : Promise.resolve(null);
    p.then(
      function (db) {
        if (db) {
          use(makeRemote(db));
          return;
        }
        if (/[?&]demo=1/.test(location.search)) {
          use(makeLocal());
          return;
        }
        connFail();
      },
      function () {
        connFail();
      },
    );
  });
  if (window.claude && window.claude.use)
    window.claude
      .use("user")
      .then(function (u) {
        return u ? u.isOwner() : false;
      })
      .then(
        function (o) {
          S.isOwner = !!o || S.mode === "local";
          render();
        },
        function () {},
      );
  setTimeout(function () {
    if (!done) connFail();
  }, 12000);
}

/* تا تمام‌شدن یک ثبت، لمس دوباره‌ی همان دکمه ثبت دوم نمی‌سازد (اتصال کند یا آفلاین) */
var SAVING = {};

// مثل save ولی جلوی ثبت دوباره با دو بار لمس را می‌گیرد.
function saveOnce(key, fn, okMsg, quiet) {
  if (SAVING[key]) {
    if (!quiet) toast("در حال ثبت؛ چند لحظه صبر کنید.");
    return Promise.resolve(false);
  }
  SAVING[key] = 1;
  return save(fn, okMsg).then(function (ok) {
    delete SAVING[key];
    return ok;
  });
}

// ذخیره‌ی ایمن: اگر شبکه قطع بود در صف آفلاین می‌گذارد.
function save(fn, okMsg) {
  return Promise.resolve()
    .then(fn)
    .then(function () {
      if (okMsg) beep();
      if (okMsg && (OFFLINE.q.length || !(isChs(S.sheet) && S.tab === "inspect")))
        toast(okMsg + (OFFLINE.q.length ? " (آفلاین ذخیره شد؛ با برگشتن اتصال ارسال می‌شود)" : ""));
      return true;
    })
    .catch(function (e) {
      toast("ذخیره نشد. " + ((e && e.message) || "دوباره تلاش کنید."));
      return false;
    });
}

/* ---------- derived ---------- */
/* v96 (فقط کاربر شاسی): نتیجه‌ی محاسبه‌های پرهزینه تا وقتی S.data.insp یا فهرست‌های مالک عوض نشده نگه داشته می‌شود.
   نتیجه‌ی کش‌شده مشترک است؛ فقط‌خواندنی استفاده شود. برای بقیه‌ی ایستگاه‌ها مستقیم محاسبه می‌شود. */
var memoRows = null,
  memoLists = null,
  memoBags = {};

function memoFor(name, arg, compute) {
  if (!wizStation()) return compute();
  if (memoRows !== S.data.insp || memoLists !== S.lists) {
    memoRows = S.data.insp;
    memoLists = S.lists;
    memoBags = {};
  }
  var bag = memoBags[name] || (memoBags[name] = {}),
    k = String(arg);
  return k in bag ? bag[k] : (bag[k] = compute());
}

/* کش ساده بر پایهٔ مرجع داده‌ها: تا وقتی داده یا فهرست‌ها عوض نشده، دوباره محاسبه نمی‌شود */
var rowCache = {};

function cachedByRows(name, key, compute) {
  var c = rowCache[name];
  if (c && c.rows === S.data.insp && c.lists === S.lists && c.key === key) return c.v;
  var v = compute();
  rowCache[name] = { rows: S.data.insp, lists: S.lists, key: key, v: v };
  return v;
}

function docId(sheet, key) {
  return sheet + "_" + key;
}

function insp(sheet, key) {
  var id = docId(sheet, key);
  return S.data.insp.filter(function (x) {
    return x.id === id;
  })[0];
}

function secItemId(sec, i) {
  return sec.id + "-" + i;
}

/* ---------- actions ---------- */
function writeItems(map, msg) {
  var id = docId(S.sheet, S.key),
    d0 = insp(S.sheet, S.key);
  if (d0 && d0.final && isChs(d0.sheet))
    Object.keys(map).forEach(function (k) {
      var m = map[k];
      if (m.removed) {
        var o = (d0.items || {})[k] || {};
        m.removedPost = true;
        m.wasNote = o.part || o.note || "";
        m.wasR = o.r || "";
      } else if (m.custom && m.r) m.post = true;
    });
  var sig = itemsSig(id, map);
  if (!sig)
    return save(function () {
      return store.update("inspections", id, { items: map });
    }, msg);
  return saveOnce(
    "items_" + sig,
    function () {
      return store.update("inspections", id, { items: map });
    },
    msg,
  );
}

/* برای ایرادِ تازه، امضای محتوا؛ لمس دوباره‌ی همان ثبت تا تمام‌شدنش نادیده گرفته می‌شود */
function itemsSig(id, map) {
  var fresh = Object.keys(map).filter(function (k) {
    return map[k] && map[k].custom && map[k].r;
  });
  if (!fresh.length) return "";
  return (
    id +
    "|" +
    fresh
      .map(function (k) {
        var t = map[k];
        return [t.r, t.note || "", t.part || "", t.sec || ""].join("~");
      })
      .sort()
      .join("|")
  );
}
