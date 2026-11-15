/* ════════════════════════════════════════════════════════════
   فصل 04 — قاب برنامه: نوار بالا، منو، تب‌ها و رندر
   نوار بالا، منوی ⋯، اندازه‌ی نوشته و حالت دستکش، تب‌ها، ساخت صفحه و رندر اصلی، صفحه‌ی خطا.
   توابع اصلی: applyTheme، isTestMode، notTest، visT، newTestCar، tcRec، tcFilled، tcFillAll و …
   ════════════════════════════════════════════════════════════ */

/* v101 (فقط تزیینات): قالب نهایی شاسی برای تزیینات؛ isChs = شاسی/موتور/تزیینات و wizStation برای کش، ماندن در صفحه و اصلاح فوری شماره‌ی اتاق (سوخت فقط در شاسی). */
/* v100 (فقط موتور): صفحه‌ی مرحله‌ای شاسی برای برگه‌ی موتور (شناسایی، EWT1، کسری، تأیید نهایی)؛ همان تابع isChs برای شاسی و موتور؛ اصلاح فقط شماره‌ی موتور و سوخت. */
/* v96 (فقط کاربر شاسی): کش محاسبه‌های پرهزینه (identity، carRecords، فهرست بندها، ایرادهای پرتکرار) تا عوض‌شدن داده؛ viewSave فقط با تغییر می‌نویسد. */
/* v95 (فقط شاسی): قاب ثابت هر مرحله (فقط فهرست‌های داخلی اسکرول می‌شوند)؛ ماندن در همان صفحه و متن نانوشته بعد از رفرش؛ حذف ایرادهای پیش‌فرض و «بگو یا بنویس»؛ برچسب‌های هم‌اندازه. */
/* v94 (فقط شاسی): ایرادهای پرتکرار هر بخش (انتخاب‌وثبت) وسط صفحه‌ی EWT با نوار ایراد کوچک پایین؛ دکمه‌ی «◇ نمونه» همیشه در کادر بالا (حتی پرونده‌ی بسته، به‌صورت اصلاحیه). */
/* v93 (فقط شاسی): صفحه‌ی سبز بدون «ادامه» (لمس کوتاه می‌بندد، کشیدن نمی‌بندد) و با لمس دایره‌ی سبز دوباره باز می‌شود؛ اتاق از انتخاب اصلاح برداشته شد؛ «ساعت» به‌جای تاریخ در شناسایی؛ کد فرم در کادر بالا؛ چیدمان یکدست و پر کردن فضای خالی؛ فهرست کسری بلند. */
/* v92 (فقط شاسی): اصلاح شماره/سوخت از صفحه‌ی شناسایی برداشته شد ← دکمه‌ی «اصلاح اشتباه» با صفحه‌ی تک‌کاره (انتخاب مورد، شماره‌ی درست با اسکن، دلیل آماده)؛ «✓ رفع» کنار همه‌ی ایرادها و کسری‌های باز؛ هدر با برچسب «شماره شاسی» و سوخت جدا؛ کسری فقط در مرحله‌ی ۴؛ «نمونه» از صفحه‌ی بندها برداشته شد؛ مقیاس نوشتار ثابت در شناسایی. */
/* v64: لمس مرحله‌ی تمام‌شده = نمایش کامل آن؛ مرحله‌ی «کسری و نمونه» با تأیید کلی بالا و کرکره‌ی کسری/نمونه. v63: مراحل نواری (شناسایی ← EWT1 ← EWT2 ← کسری ← تأیید نهایی) در شاسی، مرحله‌ی کسری، دکمه‌ی حالت تیره. v62: نقش سرپرست شاسی، کد بازیابی رمز، رمز تازه توسط مدیر/سرپرست، «رمزم را فراموش کردم». v61: چند ایراد/کسری با صدا و «بعدی» (جدا ثبت می‌شود)، تغییر رمز توسط چکمن شاسی. v60: بند به بند در نوار: لمس بند → ایراد/نمونه؛ نوار بزرگ‌تر. v59: حالت تمرکز در شاسی (هدر/تب‌ها پنهان، نوار بازگشت)، برگردان بعد از تأیید بخش. v58: حالت یک‌نوار در شاسی: بقیه‌ی کارت‌ها پشت «موارد بیشتر»، کسری و تأیید نهایی داخل نوار. v57: نوار بالاترین بخش برگه و باز شدن با اسکرول به آن. v56: کرکره‌ای در سطح بخش (فقط شاسی): تأیید کلی یک‌دکمه‌ای، ایراد با نوشتن/گفتن، بخش تأییدشده سبز/قرمز جمع می‌شود. v55: نوار کرکره‌ای (فقط برگه‌ی شاسی): بند ثبت‌شده سبز/قرمز جمع می‌شود و با لمس باز می‌شود. v53: #30 بوق، #32 سبز تأیید، #34 حالت آزمایشی. v54: #31 نوار مرحله‌ای، #33 کم‌کردن سؤال‌ها (بازشدن خودکار برگه، سوخت بدون کارت تأیید + برگردان، تأیید برچسب در همان صفحه) */
/* ---------- #30 بوق تأیید ---------- */
var THEME = "";

function applyTheme() {
  if (THEME) document.documentElement.setAttribute("data-theme", THEME);
  else document.documentElement.removeAttribute("data-theme");
}

function isTestMode() {
  return !!(S.tm && isOwnerU());
}

function notTest(r) {
  return !r || !r.test;
}

function visT(rows) {
  return isOwnerU() ? rows : rows.filter(notTest);
}

function newTestCar() {
  var used = {};
  (S.data.insp || []).forEach(function (x) {
    ["serial", "chassisNo", "engine", "room"].forEach(function (f) {
      if (x[f]) used[x[f]] = 1;
    });
    if (x.key) used[x.key] = 1;
  });
  function uq() {
    var v;
    do {
      v = "999" + randomDigits(6);
    } while (used[v]);
    used[v] = 1;
    return v;
  }
  var o = S.tcar || {};
  return {
    serial: uq(),
    chassis: uq(),
    room: uq(),
    engine: uq(),
    fuel: o.fuel || "dual",
    product: o.product || "padra",
  };
}

function tcRec(sheet) {
  var c = S.tcar,
    kk = SHEETS[sheet].keyKind,
    key =
      kk === "serial"
        ? c.serial
        : kk === "chassis"
          ? c.chassis
          : kk === "engine"
            ? c.engine
            : c.room;
  var rec = {
    sheet: sheet,
    key: key,
    serial: c.serial,
    chassisNo: c.chassis,
    room: c.room,
    engine: c.engine,
    color: "",
    fuel: c.fuel,
    product: c.product,
    test: true,
    createdBy: S.user.name,
    createdAt: nowIso(),
    formCode: FORM_CODE,
    formPage: SHEETS[sheet].page,
    items: {},
    signs: {},
  };
  if (kk === "serial") delete rec.serial;
  if (kk === "chassis") delete rec.chassisNo;
  if (kk === "engine") delete rec.engine;
  if (kk === "room") delete rec.room;
  return rec;
}

/* حالت آزمایشی: همه‌ی مراحل خودروی تستی را کامل و تأیید می‌کند تا فقط بایگانی بماند */
function tcFilled(sheet) {
  var r = tcRec(sheet),
    t = nowIso(),
    who = S.user.name,
    id = S.user.id,
    st = { by: who, byId: id, at: t, open: 0, formCode: FORM_CODE };
  secsOf(sheet, prodOf(r)).forEach(function (sc) {
    if (!sc.choice)
      visItems(r, sc).forEach(function (x) {
        r.items[secItemId(sc, x.i)] = {
          r: "ok",
          note: "",
          by: who,
          byId: id,
          at: t,
          closedAt: "",
          closedBy: "",
        };
      });
    r.signs[sc.id] = st;
  });
  r.final = st;
  if (hasShortStep(sheet)) r.shDone = { by: who, byId: id, at: t };
  return r;
}

function tcFillAll() {
  var c = S.tcar,
    recs = stagesFor([{ sheet: "chassis", fuel: c.fuel }]).map(tcFilled);
  save(function () {
    return Promise.all(
      recs.map(function (r) {
        return store.set("inspections", docId(r.sheet, r.key), r);
      }),
    );
  }, "همه‌ی مراحل خودروی تستی تأیید شد؛ حالا بایگانی کن").then(function (ok) {
    if (ok) {
      S.carq = c.serial;
      S.tab = "car";
      render();
    }
  });
}

function blockedBy(sheet, key) {
  if (isTestMode()) return null;
  var i = CHAIN.indexOf(sheet);
  if (i < 1 || !key) return null;
  var prev = CHAIN[i - 1],
    x = carRecords(key).recs.filter(function (d) {
      return d.sheet === prev;
    })[0];
  if (!x || stat(x).signed < stat(x).secs) return prev;
  return null;
}

function ownsSheet(sheet) {
  return !!S.user && SHEETS[sheet].station === S.user.station;
}

function canEdit(sheet, key) {
  return ownsSheet(sheet) && !blockedBy(sheet, key);
}

function mySheets() {
  return Object.keys(SHEETS)
    .filter(ownsSheet)
    .sort(function (a, b) {
      return STAGES.indexOf(a) - STAGES.indexOf(b);
    });
}

function totalOpen() {
  return cachedByRows("totalOpen", "", function () {
    return S.data.insp.reduce(function (n, d) {
      return n + (SHEETS[d.sheet] ? stat(d).open : 0);
    }, 0);
  });
}

/* ---------- views ---------- */
function whoLines(u) {
  var sec =
    u.station === "trim" ? " · بخش " + esc(pickSec(pickOf(u)) ? pickSec(pickOf(u)).toUpperCase() : "هر دو") : "";
  return (
    '<span class="whoin whoin3"><span class="nm">' +
    esc(u.name) +
    "</span><small>ایستگاه: " +
    esc(STATION_NAME[u.station]) +
    sec +
    "</small><small>کد پرسنلی: " +
    esc(u.id) +
    "</small></span>"
  );
}

function syncText() {
  return OFFLINE.q.length
    ? "آفلاین · " +
        faDigits(OFFLINE.q.length) +
        " تغییر در انتظار ارسال" +
        (OFFLINE.full ? " · حافظه پر است" : "")
    : navigator.onLine === false
      ? "اتصال قطع است"
      : S.offStart
        ? "آفلاین · سرور در دسترس نیست"
        : S.mode === "shared"
          ? "ذخیره مشترک"
          : S.mode === "local"
            ? "ذخیره روی همین دستگاه"
            : "در حال اتصال";
}

function syncChip() {
  return (
    '<span class="sync ' +
    (S.mode === "shared" && !S.offStart && !OFFLINE.q.length && navigator.onLine !== false
      ? ""
      : "local") +
    '" data-act="offtoggle" role="button" tabindex="0"><i></i>' +
    syncText() +
    "</span>"
  );
}

function userBlock(u) {
  if (u.station !== "owner") return whoLines(u);
  return (
    '<span class="whoin"><span class="nm">' +
    esc(u.name) +
    "</span> <small>· ایستگاه " +
    esc(STATION_NAME[u.station]) +
    "</small></span>"
  );
}

/* منوی ⋯: رمز، صدا، اندازه‌ی نوشته، حالت دستکش، خروج */
var TEXT_SIZES = [
  ["s", "کوچک"],
  ["m", "متوسط"],
  ["l", "بزرگ"],
];

// منوی ⋯ : اندازه‌ی نوشته، حالت دستکش، رمز، خروج.
function menuPanel(u) {
  var tz = prefGet("cm_tsz", "m");
  return (
    '<div class="menu" role="menu">' +
    (u.id !== "owner" && u.station === "chassis"
      ? '<button class="btn" data-act="pwopen">🔑 رمز من</button>'
      : "") +
    '<button class="btn" data-act="snd" aria-pressed="' +
    soundOn +
    '">' +
    (soundOn ? "🔔 صدا: روشن" : "🔕 صدا: خاموش") +
    "</button>" +
    '<div class="menurow"><span>اندازه‌ی نوشته</span><div class="seg">' +
    TEXT_SIZES.map(function (x) {
      return (
        '<button type="button" data-act="tsz" data-v="' +
        x[0] +
        '" aria-pressed="' +
        (x[0] === tz) +
        '">' +
        x[1] +
        "</button>"
      );
    }).join("") +
    "</div></div>" +
    '<button class="btn" data-act="glove" aria-pressed="' +
    (prefGet("cm_glove", "0") === "1") +
    '">🧤 حالت دستکش: ' +
    (prefGet("cm_glove", "0") === "1" ? "روشن" : "خاموش") +
    "</button>" +
    '<button class="btn danger" data-act="logout">خروج</button></div>'
  );
}

function prefGet(k, d) {
  try {
    return localStorage.getItem(k) || d;
  } catch (e) {
    return d;
  }
}

function prefApplyLater() {
  document.addEventListener("DOMContentLoaded", prefApply);
  prefApply();
}

function prefApply() {
  var r = document.documentElement;
  r.setAttribute("data-tsz", prefGet("cm_tsz", "m"));
  r.setAttribute("data-glove", prefGet("cm_glove", "0"));
}

// نوار بالای برنامه: نام برنامه، منو، کاربر و وضعیت همگام‌سازی.
function topBar() {
  var u = S.user;
  return (
    '<div class="top"><div class="brand"><h1>ثبت عیوب چکمن</h1><span class="proto">نسخه آزمایشی · ' +
    APP_VER +
    "</span>" +
    (u
      ? '<button class="btn sm menubtn" data-act="menu" aria-expanded="' +
        !!S.menu +
        '" aria-label="منو">⋯</button>'
      : "") +
    "</div>" +
    (u
      ? '<div class="who2">' + userBlock(u) + syncChip() + "</div>" + (S.menu ? menuPanel(u) : "")
      : "") +
    "</div>"
  );
}

function testBar() {
  var cur = S.user.station === "owner" ? "مدیر" : STATION_NAME[S.user.station] || S.user.station;
  var h =
    '<div class="card testbar"><div class="row"><b>حالت آزمایشی</b><span class="hint grow">ایستگاه: ' +
    esc(cur) +
    (isTestMode() ? " · خودروی تستی روشن" : "") +
    '</span><button class="btn sm" data-act="tbtoggle" aria-expanded="' +
    !!S.tbOpen +
    '">' +
    (S.tbOpen ? "بستن ▴" : "باز کردن ▾") +
    "</button></div>";
  if (!S.tbOpen) return h + "</div>";
  h +=
    '<p class="hint" style="margin-top:8px">کار را به‌جای هر ایستگاه بدون رمز انجام دهید. ثبت‌ها با نام «' +
    esc(S.user.id === "owner" ? "علی بابایی (آزمایشی)" : S.user.name) +
    '» ذخیره می‌شود.</p><div class="tbgrid">';
  [
    "chassis",
    "trim",
    "gas",
    "st4",
    "st5",
    "mech",
    "roll",
    "quality",
    "commercial",
    "planning",
  ].forEach(function (k) {
    h +=
      '<button class="btn sm" data-act="teststation" data-id="' +
      k +
      '" aria-pressed="' +
      (S.user.station === k) +
      '">' +
      esc(STATION_NAME[k]) +
      "</button>";
  });
  h += '</div><div class="hint" style="margin-top:10px">بخش چکمن:</div><div class="tbgrid g3">';
  var chs = S.user.station === "chassis",
    curSec = chs ? pickSec(pickOf(S.user)) : S.user.sec || "";
  (chs
    ? PICKS.map(function (p) {
        return [p[2], p[1]];
      })
    : [
        ["", "هر دو بخش"],
        ["ewt1", "فقط EWT1"],
        ["ewt2", "فقط EWT2"],
      ]
  ).forEach(function (x) {
    h +=
      '<button class="btn sm" data-act="testsec" data-v="' +
      x[0] +
      '" aria-pressed="' +
      (curSec === x[0]) +
      '">' +
      x[1] +
      "</button>";
  });
  return h + "</div>" + testCarCard() + "</div>";
}

// تعداد رکوردهای آزمایشی (بازدیدها و بایگانی) برای دکمه‌ی پاک‌کردن آن‌ها.
function testRecordCount() {
  function testRows(rows) {
    return (rows || []).filter(function (x) {
      return x.test;
    }).length;
  }
  return testRows(S.data.insp) + testRows(S.data.arch);
}

function testCarCard() {
  var on = isTestMode(),
    n = testRecordCount();
  var h =
    '<div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)"><div class="row"><b>خودروی تستی همه‌ی مراحل:</b><button class="btn sm ' +
    (on ? "ok" : "") +
    '" data-act="tmtoggle" aria-pressed="' +
    on +
    '">' +
    (on ? "روشن ✓" : "خاموش") +
    "</button></div>";
  if (!on)
    return (
      h +
      '<p class="hint" style="margin-top:6px">با روشن‌کردن، هر ایستگاه را بدون ثبت مراحل قبلی باز می‌کنی؛ ترتیب ایستگاه‌ها، تکراری‌بودن و بازه‌ی رقم‌ها بررسی نمی‌شود و همه‌ی ثبت‌ها «آزمایشی» می‌شود و در گزارش‌ها و دید چکمن‌ها نمی‌آید.</p>' +
      (n
        ? '<div class="row" style="margin-top:8px"><span class="hint">' +
          faDigits(n) +
          " رکورد آزمایشی وجود دارد.</span>" +
          tcDelBtns() +
          "</div>"
        : "") +
      "</div>"
    );
  if (!S.tcar) S.tcar = newTestCar();
  var c = S.tcar;
  h +=
    '<div class="tcnum"><span>سریال <b class="num">' +
    esc(c.serial) +
    '</b></span><span>شاسی <b class="num">' +
    esc(c.chassis) +
    '</b></span><span>اتاق <b class="num">' +
    esc(c.room) +
    '</b></span><span>موتور <b class="num">' +
    esc(c.engine) +
    "</b></span></div>";
  h +=
    '<div class="row"><span class="hint">سوخت:</span><button class="btn sm" data-act="tcfuel" data-v="dual" aria-pressed="' +
    (c.fuel === "dual") +
    '">دوگانه‌سوز</button><button class="btn sm" data-act="tcfuel" data-v="single" aria-pressed="' +
    (c.fuel === "single") +
    '">تک‌سوز</button><span class="hint">محصول:</span><button class="btn sm" data-act="tcprod" data-v="padra" aria-pressed="' +
    (c.product === "padra") +
    '">پادرا</button><button class="btn sm" data-act="tcprod" data-v="ex" aria-pressed="' +
    (c.product === "ex") +
    '">اکستند</button></div>';
  h +=
    '<div class="row" style="margin-top:8px">' +
    (mySheets().length
      ? '<button class="btn sm primary" data-act="tcopen">باز کردن برگه‌ی این ایستگاه برای خودروی تستی</button>'
      : "") +
    '<button class="btn sm" data-act="tcfill">تأیید خودکار همه‌ی مراحل</button><button class="btn sm" data-act="tccar">پرونده‌ی خودروی تستی</button><button class="btn sm" data-act="tcnew">خودروی تستی جدید</button>' +
    tcDelBtns() +
    "</div>";
  return (
    h +
    '<p class="hint" style="margin-top:6px">هر ایستگاه را از ردیف بالا انتخاب کن و «باز کردن برگه» را بزن. برای تجاری، برنامه‌ریزی و کیفیت از «پرونده‌ی خودروی تستی» استفاده کن.' +
    (n ? " " + faDigits(n) + " رکورد آزمایشی ثبت شده است." : "") +
    "</p></div>"
  );
}

function tcDelBtns() {
  var n = testRecordCount();
  if (!n) return "";
  if (S.tcDel)
    return (
      '<span class="hint" style="color:var(--open)">همه‌ی ' +
      faDigits(n) +
      ' رکورد آزمایشی پاک شود؟</span><button class="btn sm primary" data-act="tcdelyes">بله، پاک شود</button><button class="btn sm" data-act="tcdelno">انصراف</button>'
    );
  return '<button class="btn sm" data-act="tcdelask">پاک‌کردن همه‌ی داده‌های آزمایشی</button>';
}

function isCom() {
  return !!S.user && (S.user.station === "commercial" || S.user.id === "owner");
}

function shortTab() {
  return (
    '<button class="tab" role="tab" data-act="tab" data-t="short" aria-selected="' +
    (S.tab === "short") +
    '">کسری‌های باز' +
    (shortOpenCount() ? '<span class="cnt">' + faDigits(shortOpenCount()) + "</span>" : "") +
    "</button>"
  );
}

// تب‌های پایین/بالای صفحه را بر اساس نقش و ایستگاه کاربر می‌سازد.
function tabsBarAll() {
  if (isCustomRole(S.user)) return customTabs();
  var t = tabsBar0();
  if (!isMgrUser(S.user) && cpfAllowed()) t = t.replace(/<\/div>\s*$/, cpfTab() + "</div>");
  if (dashAllowed() && !ownerHome())
    t = t.replace(
      /<\/div>\s*$/,
      '<button class="tab" role="tab" data-act="tab" data-t="dash" aria-selected="' +
        (S.tab === "dash") +
        '">داشبورد</button></div>',
    );
  return t;
}

/* گوشی: نوار پایین حداکثر ۴ تب اصلی + «بیشتر» دارد؛ بقیه‌ی تب‌ها در برگه‌ی «بیشتر» می‌آیند.
   در لپ‌تاپ همه‌ی تب‌ها در نوار بالا دیده می‌شوند (جداسازی با CSS، کلاس tab-x). */
var TAB_BAR_MAX = 5;
var TAB_PRIORITY = { inspect: 0, short: 1, report: 2, dash: 3 };

function tabKey(btn) {
  return (btn.match(/data-t="([^"]+)"/) || [])[1] || "";
}

function sortTabsByPriority(tabs) {
  return tabs
    .map(function (b, i) {
      var p = TAB_PRIORITY[tabKey(b)];
      return { b: b, k: (p === undefined ? 10 : p) * 100 + i };
    })
    .sort(function (x, y) {
      return x.k - y.k;
    })
    .map(function (x) {
      return x.b;
    });
}

function tabsWithMore(html) {
  var m = html.match(/^(<div class="tabs main"[^>]*>)([\s\S]*)<\/div>\s*$/);
  var tabs = m ? m[2].match(/<button class="tab"[\s\S]*?<\/button>/g) || [] : [];
  if (tabs.length <= TAB_BAR_MAX) return html;
  tabs = sortTabsByPriority(tabs);
  var main = tabs.slice(0, TAB_BAR_MAX - 1),
    rest = tabs.slice(TAB_BAR_MAX - 1),
    restActive = rest.some(function (b) {
      return b.indexOf('aria-selected="true"') >= 0;
    }),
    badge = rest.some(function (b) {
      return b.indexOf('class="cnt"') >= 0;
    });
  var bar =
    m[1] +
    main.join("") +
    rest
      .map(function (b) {
        return b.replace('class="tab"', 'class="tab tab-x"');
      })
      .join("") +
    '<button class="tab tab-more" role="tab" data-act="tabmore" aria-expanded="' +
    !!S.moreOpen +
    '" aria-selected="' +
    restActive +
    '">بیشتر ⋯' +
    (badge ? '<span class="cnt">●</span>' : "") +
    "</button></div>";
  return (
    bar +
    (S.moreOpen
      ? '<div class="moresheet" role="menu">' +
        rest
          .map(function (b) {
            return b.replace('class="tab"', 'class="tab sheet-tab"');
          })
          .join("") +
        "</div>"
      : "")
  );
}

function tabsBar() {
  return tabsWithMore(tabsBarAll());
}

function tabBtn(t, label, extra) {
  return (
    '<button class="tab" role="tab" data-act="tab" data-t="' +
    t +
    '" aria-selected="' +
    (t === S.tab || (t === "admin" && ownerHome() && MGMT_VIEWS.indexOf(S.tab) >= 0)) +
    '">' +
    label +
    (extra || "") +
    "</button>"
  );
}

/* اصلاح شماره مستقیم و بدون تأیید است. حساب کیفیت از این تب اصلاح می‌کند؛ مدیر فقط وقتی درخواست قدیمی یا اختلاف سوخت برچسب باشد این تب را می‌بیند */
function corrPendTab() {
  var n = corrPendingCount();
  if (!isQual() || (S.user.id === "owner" && !n)) return "";
  return tabBtn("corr", "اصلاح شماره", n ? '<span class="cnt">' + faDigits(n) + "</span>" : "");
}

/* ایستگاه‌های خط: پرونده خودرو فقط برای مشاهده (رصد خودرو در خط)؛ واحد تجاری و نقش‌های مجاز مثل قبل */
function carReadOnly() {
  return !isCom() && !rolePerm("car");
}

function carTabAllowed() {
  return isCom() || rolePerm("car") || (!!S.user && mySheets().length > 0);
}

function carLineTab() {
  return carReadOnly() && carTabAllowed() ? tabBtn("car", "پرونده خودرو") : "";
}

function ownerHome() {
  return !!S.user && S.user.id === "owner" && S.user.station === "owner";
}

function smpOwnerTab() {
  var on = S.tab === "smp" || (S.tab === "admin" && S.adm === "smp");
  return '<button class="tab" role="tab" data-act="mg" data-t="smp" aria-selected="' + on + '">نمونه‌زنی</button>';
}

function ownerTabs() {
  var o = totalOpen(),
    sc = shortOpenCount();
  return (
    '<div class="tabs main" role="tablist">' +
    tabBtn("inspect", "بازدید") +
    tabBtn(
      "list",
      "همه بازدیدها",
      o ? '<span class="cnt">' + faDigits(o) + " مورد باز</span>" : "",
    ) +
    tabBtn("short", "کسری‌های باز", sc ? '<span class="cnt">' + faDigits(sc) + "</span>" : "") +
    tabBtn("report", "گزارش") +
    tabBtn("car", "پرونده خودرو") +
    tabBtn("dash", "داشبورد") +
    tabBtn("admin", "⚙ مدیریت") +
    smpOwnerTab() +
    corrPendTab() +
    "</div>"
  );
}

/* v160: چکمن فقط با سریال/شاسی خودرو را باز می‌کند و کسری‌هایش را همان‌جا می‌بیند و می‌بندد */
var CHECKMAN_STATIONS = ["chassis", "trim", "st4", "st5", "gas", "mech", "roll"];

function isCheckman() {
  return !!S.user && CHECKMAN_STATIONS.indexOf(S.user.station) >= 0;
}

function tabsBar0() {
  if (ownerHome()) return ownerTabs();
  var o = totalOpen();
  if (S.user && S.user.station === "planning")
    return (
      '<div class="tabs main" role="tablist">' +
      stopTab() +
      (isMgrUser(S.user) ? cpfTab() : pshTab()) +
      shortTab() +
      "</div>"
    );
  return (
    '<div class="tabs main" role="tablist"><button class="tab" role="tab" data-act="tab" data-t="inspect" aria-selected="' +
    (S.tab === "inspect") +
    '">بازدید</button>' +
    (isCheckman()
      ? ""
      : '<button class="tab" role="tab" data-act="tab" data-t="list" aria-selected="' +
        (S.tab === "list") +
        '">همه بازدیدها' +
        (o ? '<span class="cnt">' + faDigits(o) + " مورد باز</span>" : "") +
        "</button>" +
        shortTab()) +
    smpTab() +
    (isCom()
      ? '<button class="tab" role="tab" data-act="tab" data-t="report" aria-selected="' +
        (S.tab === "report") +
        '">گزارش</button><button class="tab" role="tab" data-act="tab" data-t="car" aria-selected="' +
        (S.tab === "car") +
        '">پرونده خودرو</button><button class="tab" role="tab" data-act="tab" data-t="archive" aria-selected="' +
        (S.tab === "archive") +
        '">بایگانی</button>'
      : carLineTab()) +
    corrPendTab() +
    (S.isOwner
      ? '<button class="tab" role="tab" data-act="tab" data-t="admin" aria-selected="' +
        (S.tab === "admin") +
        '">مدیریت</button><button class="tab" role="tab" data-act="tab" data-t="lists" aria-selected="' +
        (S.tab === "lists") +
        '">فهرست‌ها</button>'
      : "") +
    "</div>"
  );
}

/* v167.14: هر چکمن فقط بازدیدهای خودش (ساخته یا امضا) را در فهرست‌ها می‌بیند */
function isMine(d) {
  var u = S.user;
  return (
    d.createdBy === u.name ||
    Object.keys(d.signs || {}).some(function (k) {
      return d.signs[k].byId === u.id;
    })
  );
}

function focusOn() {
  if (!S.user || S.tab !== "inspect" || !S.key || !isChs(S.sheet)) return false;
  var d = insp(S.sheet, S.key);
  return !!(d && canEdit(S.sheet, S.key));
}

function html() {
  var h = html0();
  if (S.doneScr) h += doneOv();
  return S.smpDone ? h + smpDoneOv() : h;
}

// ساختار کامل هر صفحه را (نوار بالا، تب‌ها، محتوا) کنار هم می‌چیند.
function html0() {
  smpResume();
  if (smpWizOn() && S.user) return smpWiz() + smpBot();
  if (focusOn()) {
    var fd = insp(S.sheet, S.key);
    if (S.histPage && fd) return histPageView(fd);
    if (S.corrOpen && fd && isChs(fd.sheet) && canEdit(S.sheet, S.key) && !S.doneScr)
      return corrPage(fd);
    if (S.sxOpen && canEdit(S.sheet, S.key) && !S.doneScr) return sxPage(fd);
    return inspView() + botBar(fd);
  }
  if (!S.user) return lgPage();
  var h = topBar() + offPanel();
  if (S.user && S.pwOpen && S.user.id !== "owner" && S.user.station === "chassis") h += pwCard();
  var credit = '<p class="hint" style="text-align:center;margin-top:8px">A.B</p>';
  if (!S.user) return h + loginView() + credit;
  h += tabsBar();
  if (S.tab === "inspect" && S.user.station !== "owner") h += scopeBar(S.user);
  var mg = S.isOwner && MGMT_VIEWS.indexOf(S.tab) >= 0;
  if (mg) h += '<div class="mgpage">' + mgmtBar();
  if (S.user && S.user.id === "owner") h += testBar();
  if (isTestMode())
    h +=
      '<div class="tbanner">حالت آزمایشی روشن است: ترتیب ایستگاه‌ها و بررسی شماره‌ها اعمال نمی‌شود و ثبت‌ها آزمایشی (TEST) است. در گزارش‌ها و برای چکمن‌ها دیده نمی‌شود.</div>';
  return (
    h +
    (isCustomRole(S.user) && !rolePerm(S.tab)
      ? roleEmptyView()
      : S.tab === "dash" && dashAllowed()
        ? dashView()
        : S.tab === "smp" && smpCanView()
          ? smpView()
          : S.tab === "lists" && S.isOwner
            ? listsView()
            : S.tab === "admin" && S.isOwner
              ? adminView()
              : S.tab === "corr" && isQual()
                ? corrView()
                : S.tab === "list"
                  ? listView()
                  : S.tab === "car" && carTabAllowed()
                    ? carView()
                    : S.tab === "stop" && canStop()
                      ? stopView()
                      : S.tab === "psh" && canPlanShort()
                        ? pshView()
                        : S.tab === "cpf" && cpfAllowed()
                          ? cpfView()
                          : S.tab === "short" && canShort()
                            ? shortView() + pshOpenCard()
                            : S.tab === "report" && (isCom() || rolePerm("report"))
                              ? reportView()
                              : S.tab === "archive" && isCom()
                                ? archiveView()
                                : inspectView()) +
    (mg ? "</div>" : "") +
    credit
  );
}

/* ---------- render, keeping typed text ---------- */
/* به‌جای صفحه‌ی سفید: پیام خطا و دکمه‌ی بازنشانی ورود */
// صفحه‌ی خطا با دکمه‌ی پاک‌کردن حافظه‌ی ورود.
function fatalHtml(e) {
  var m =
    String((e && e.message) || e || "خطای ناشناخته") +
    (e && e.stack
      ? " | " + String(e.stack).split("\n").slice(1, 3).join(" ").replace(/\s+/g, " ")
      : "");
  var clr =
    "try{['cm_sess','cm_view','cm_tok'].forEach(function(k){localStorage.removeItem(k)})}catch(e){};location.reload()";
  return (
    '<div class="card" style="margin:24px 16px"><h2>مشکلی در نمایش صفحه پیش آمد</h2><p class="hint">این پیام را برای برنامه‌نویس بفرستید:</p><bdi dir="ltr" style="display:block;word-break:break-all;font-size:13px;margin:8px 0">' +
    esc(APP_VER + " — " + m) +
    "</bdi>" +
    '<div class="row"><button class="btn primary" onclick="location.reload()">بارگذاری دوباره</button><button class="btn" onclick="' +
    clr +
    '">پاک‌کردن حافظه‌ی ورود و بارگذاری دوباره</button></div></div>'
  );
}

// نمایش صفحه‌ی خطا به‌جای صفحه‌ی سفید.
function showFatal(e) {
  try {
    console.error(e);
    elById("#app").innerHTML = fatalHtml(e);
  } catch (x) {}
}

// صفحه را دوباره می‌سازد. بعد از هر تغییر حالت، همین تابع صدا زده می‌شود.
function render() {
  var root = elById("#app"),
    keep = {},
    act = document.activeElement && document.activeElement.id,
    out;
  root.querySelectorAll("input[id],select[id],textarea[id]").forEach(function (e) {
    keep[e.id] = e.value;
  });
  try {
    out = html();
  } catch (e) {
    showFatal(e);
    return;
  }
  root.innerHTML = out;
  Object.keys(keep).forEach(function (id) {
    var e = document.getElementById(id);
    if (e && keep[id] !== "") e.value = keep[id];
  });
  root.querySelectorAll(".fuelpick").forEach(function (g) {
    var hh = g.parentNode.querySelector("input[type=hidden]");
    if (hh && hh.value)
      g.querySelectorAll("[data-act=fuelpick]").forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-v") === hh.value ? "true" : "false");
      });
    if (hh && hh.id === "c_fuel") {
      var fcn = document.getElementById("fuelcons");
      if (fcn) fcn.textContent = fuelCons(hh.value || "");
    }
  });
  if (act) {
    var e = document.getElementById(act);
    if (e) {
      e.focus();
      try {
        e.setSelectionRange(e.value.length, e.value.length);
      } catch (x) {}
    }
  }
  root
    .querySelectorAll(".subtab[aria-selected=true],.tabs .tab[aria-selected=true]")
    .forEach(function (t) {
      var b = t.getBoundingClientRect();
      if (t.scrollIntoView && b.top >= 0 && b.bottom <= window.innerHeight)
        t.scrollIntoView({ inline: "center", block: "nearest" });
    });
  var sdn = root.querySelector(".stepdone:not(.after)");
  if (sdn) sdn.scrollTop = sdn.scrollHeight;
  if (S.sxDraft) {
    var tx0 = document.getElementById("sx");
    if (tx0 && !tx0.value) tx0.value = S.sxDraft;
    S.sxDraft = "";
  }
  if (S.drafts) {
    Object.keys(S.drafts).forEach(function (k) {
      var e = document.getElementById(k);
      if (e && S.drafts[k] && !e.value) e.value = S.drafts[k];
    });
    S.drafts = null;
  }
  elById("#toastbox").innerHTML = S.toast
    ? '<div class="toast" role="status">' + esc(S.toast) + "</div>"
    : "";
  viewSave();
  fitLogin();
  stepCreate();
}

function open_(sheet, key) {
  ensureCar([key]).then(function () {
    S.shSel = {};
    S.dfSel = {};
    S.rmSel = {};
    S.rmBulk = false;
    S.sheet = sheet;
    S.key = key;
    S.tab = "inspect";
    S.searchErr = "";
    S.formErr = "";
    S.editing = null;
    render();
    var sbx = document.querySelector(".stepbar");
    if (sbx) sbx.scrollIntoView();
    else window.scrollTo(0, 0);
  });
}

function clickPanelToggles(ev, el, a, id, d) {
  if (a === "stopend" && canStop()) {
    stopEnd(id);
    return true;
  }
  if (a === "histtoggle") {
    S.histPage = true;
    render();
    window.scrollTo(0, 0);
    return true;
  }
  if (a === "histback") {
    S.histPage = false;
    render();
    window.scrollTo(0, 0);
    return true;
  }
  if (a === "pwopen") {
    S.pwOpen = true;
    S.pwErr = "";
    render();
    return true;
  }
  if (a === "pwclose") {
    S.pwOpen = false;
    S.pwErr = "";
    render();
    return true;
  }
  return false;
}

function clickPreferences(ev, el, a, id, d) {
  if (a === "thmset") {
    THEME = el.getAttribute("data-v") || "";
    try {
      localStorage.setItem("thm", THEME);
    } catch (e) {}
    applyTheme();
    render();
    return true;
  }
  if (a === "thm") {
    var dk =
      document.documentElement.getAttribute("data-theme") === "dark" ||
      (!THEME && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    THEME = dk ? "light" : "dark";
    try {
      localStorage.setItem("thm", THEME);
    } catch (e) {}
    applyTheme();
    render();
    return true;
  }
  if (a === "snd") {
    soundOn = !soundOn;
    try {
      localStorage.setItem("snd", soundOn ? "1" : "0");
    } catch (e) {}
    if (soundOn) beep();
    render();
    return true;
  }
  return false;
}

// کلیک‌های ناوبری (تب‌ها، برگشت، باز کردن خودرو).
function clickNavigation(ev, el, a, id, d) {
  if (a === "roback") return navigation_roback(ev, el, a, id, d);
  if (a === "todaylist") {
    S.todayOpen = !S.todayOpen;
    render();
    return true;
  }
  if (a === "tab") return navigation_tab(ev, el, a, id, d);
  if (a === "mg") return navigation_mg(ev, el, a, id, d);
  if (a === "tabmore") {
    S.moreOpen = !S.moreOpen;
    render();
    return true;
  }
  if (a === "tbtoggle") {
    S.tbOpen = !S.tbOpen;
    render();
    return true;
  }
  if (a === "uadd") return navigation_uadd(ev, el, a, id, d);
  if (a === "uopen") {
    S.uOpen = S.uOpen === id ? "" : id;
    return true;
  }
  if (a === "sheet") {
    S.sheet = id;
    S.key = "";
    render();
    return true;
  }
  if (a === "open") {
    open_(el.getAttribute("data-sheet"), el.getAttribute("data-key"));
    return true;
  }
  return false;
}

// اقدام «roback» از clickNavigation
function navigation_roback(ev, el, a, id, d) {
  var k0 = S.key;
  S.key = "";
  S.wizFor = "";
  S.wizView = "";
  S.tab = isCom() ? "car" : "list";
  if (isCom()) S.carq = k0;
  render();
  window.scrollTo(0, 0);
  return true;
}

// اقدام «tab» از clickNavigation
function navigation_tab(ev, el, a, id, d) {
  S.moreOpen = false;
  S.tab = el.getAttribute("data-t");
  if (S.tab === "admin") {
    S.adm = "";
    S.lsPg = "";
  }
  if (S.tab !== "dash") dashFree();
  render();
  return true;
}

// اقدام «mg» از clickNavigation
function navigation_mg(ev, el, a, id, d) {
  S.moreOpen = false;
  var mt = el.getAttribute("data-t");
  S.lsPg = el.getAttribute("data-pg") || "";
  S.setPg = "";
  if (mt === "home") {
    S.tab = "admin";
    S.adm = "";
  } else if (MGMT_VIEWS.indexOf(mt) >= 0 && mt !== "admin") S.tab = mt;
  else {
    S.tab = "admin";
    S.adm = mt;
  }
  window.scrollTo(0, 0);
  render();
  return true;
}

// اقدام «uadd» از clickNavigation
function navigation_uadd(ev, el, a, id, d) {
  S.uAdd = !S.uAdd;
  S.formErr = "";
  S.bulkMsg = "";
  render();
  return true;
}
