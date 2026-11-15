/* ════════════════════════════════════════════════════════════
   فصل 01 — ابزارهای کمکی
   تابع‌های کوچک عمومی: متن امن، اعداد فارسی، تاریخ و ساعت، شناسه‌ی یکتا، ادغام داده، پیام و بوق.
   توابع اصلی: sha256Hex، beep، randomDigits، esc، fnum، digits، when، dateOnly و …
   ════════════════════════════════════════════════════════════ */

function sha256Hex(t) {
  if (window.crypto && window.crypto.subtle && window.TextEncoder) {
    return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)).then(function (b) {
      return Array.prototype.map
        .call(new Uint8Array(b), function (x) {
          return ("0" + x.toString(16)).slice(-2);
        })
        .join("");
    });
  }
  var h = 5381;
  for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return Promise.resolve("f" + (h >>> 0).toString(16));
}

var audioCtx = null,
  soundOn = true;

// بوق تأیید می‌زند (اگر کاربر آن را روشن کرده باشد).
function beep(kind) {
  try {
    if (navigator.vibrate) navigator.vibrate(kind === "err" ? [60, 40, 60] : 25);
  } catch (e) {}
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    var t = audioCtx.currentTime;
    var tone = function (f, s, du) {
      var o = audioCtx.createOscillator(),
        g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + s);
      g.gain.exponentialRampToValueAtTime(0.4, t + s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + s + du);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t + s);
      o.stop(t + s + du + 0.03);
    };
    if (kind === "err") tone(220, 0, 0.25);
    else {
      tone(880, 0, 0.12);
      tone(1320, 0.13, 0.18);
    }
  } catch (e) {}
}

function randomDigits(n) {
  var s = "";
  for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function elById(s) {
  return document.querySelector(s);
}

// متن را برای نمایش امن در HTML آماده می‌کند (جلوی تزریق کد را می‌گیرد).
function esc(t) {
  return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}

// رقم‌های فارسی و عربی را به انگلیسی تبدیل می‌کند.
function fnum(s) {
  return String(s || "")
    .replace(/[۰-۹]/g, function (d) {
      return "۰۱۲۳۴۵۶۷۸۹".indexOf(d);
    })
    .replace(/[٠-٩]/g, function (d) {
      return "٠١٢٣٤٥٦٧٨٩".indexOf(d);
    });
}

// فقط رقم‌ها را نگه می‌دارد (فارسی را هم به انگلیسی تبدیل می‌کند).
function digits(s) {
  return fnum(s).replace(/\s+/g, "");
}

var fmtDateTime = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Tehran",
});

// تاریخ و ساعت را به شکل خوانا (شمسی) نشان می‌دهد.
function when(iso) {
  try {
    return iso ? fmtDateTime.format(new Date(iso)) : "";
  } catch (e) {
    return "";
  }
}

var fmtD = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "short",
  timeZone: "Asia/Tehran",
});

function dateOnly(i) {
  try {
    return i ? fmtD.format(new Date(i)) : "";
  } catch (e) {
    return "";
  }
}

var fmtT = new Intl.DateTimeFormat("fa-IR", {
  timeStyle: "short",
  timeZone: "Asia/Tehran",
});

function timeHM(i) {
  try {
    return i ? fmtT.format(new Date(i)) : "";
  } catch (e) {
    return "";
  }
}

// یک شناسه‌ی یکتا برای رکورد جدید می‌سازد.
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// اعداد انگلیسی را به رقم فارسی تبدیل می‌کند.
function faDigits(n) {
  return new Intl.NumberFormat("fa-IR").format(n);
}

// زمان فعلی را با قالب استاندارد برمی‌گرداند.
function nowIso() {
  return new Date().toISOString();
}

/* ---------- storage ---------- */
function deepMerge(a, b) {
  var o = Object.assign({}, a);
  Object.keys(b).forEach(function (k) {
    var v = b[k];
    o[k] =
      v && typeof v === "object" && !Array.isArray(v) && o[k] && typeof o[k] === "object"
        ? deepMerge(o[k], v)
        : v;
  });
  return o;
}

function fillDeep(cur, add) {
  if (cur === undefined || cur === null) return add;
  var isObj = function (x) {
    return x && typeof x === "object" && !Array.isArray(x);
  };
  if (!isObj(cur) || !isObj(add)) return cur;
  var o = Object.assign({}, cur);
  Object.keys(add).forEach(function (k) {
    o[k] = fillDeep(cur[k], add[k]);
  });
  return o;
}

function fillMerge(cur, d) {
  var rest = {},
    keep = {};
  Object.keys(d).forEach(function (k) {
    (KEEP_FIRST.indexOf(k) >= 0 ? keep : rest)[k] = d[k];
  });
  var o = deepMerge(cur, rest);
  Object.keys(keep).forEach(function (k) {
    o[k] = fillDeep(cur[k], keep[k]);
  });
  return o;
}

function norm(t) {
  return String(t || "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\s]+/g, "")
    .toLowerCase();
}

var JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

var jalaliFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function toJalali(iso) {
  if (!iso) return null;
  try {
    var p = {};
    jalaliFormatter.formatToParts(new Date(iso)).forEach(function (x) {
      p[x.type] = x.value;
    });
    var y = parseInt(p.year, 10);
    return isNaN(y) ? null : { y: y, m: +p.month, d: +p.day };
  } catch (e) {
    return null;
  }
}

function timeOnly(i) {
  try {
    return i ? fmtT.format(new Date(i)) : "";
  } catch (e) {
    return "";
  }
}

var toastTimer;

// یک پیام کوتاه موقت پایین صفحه نشان می‌دهد.
function toast(m) {
  S.toast = m;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    S.toast = "";
    render();
  }, 3200);
}

function fieldValue(id) {
  var e = document.getElementById(id);
  return e ? e.value.trim() : "";
}

var pointerDown = null;
