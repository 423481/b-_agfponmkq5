/* ════════════════════════════════════════════════════════════
   فصل 50 — داشبورد مدیریتی
   مرکز راهبری کیفیت و تولید: فیلترها، آمار امروز، توقف خط، پارتو، پیگیری و خروجی داشبورد.
   توابع اصلی: dashAllowed، dashF، dashFree، dayStart، dashPeriod، parseHm، fmtHm، shiftCfg و …
   ════════════════════════════════════════════════════════════ */

var DASH_RANGES = [
  ["today", "امروز"],
  ["yday", "دیروز"],
  ["d7", "۷ روز اخیر"],
  ["d30", "۳۰ روز اخیر"],
];

var DASH_DEF = {
  sec: "follow",
  fo: "",
  range: "d30",
  shift: "",
  station: "",
  prod: "",
  status: "",
  q: "",
  sort: "old",
  more: DASH_PAGE,
  car: "",
};

var DASH_NA = "اطلاعات در دسترس نیست";

var DASHD = null,
  DASHR = null;

/* DASHD: فهرست تخت رکوردها/ایرادها؛ DASHR: نتیجه‌ی آخرین فیلتر */

function dashAllowed() {
  var u = S.user;
  if (!u) return false;
  if (isCustomRole(u)) return rolePerm("dash");
  return u.id === "owner" || u.station === "quality" || u.station === "planning" || isMgrUser(u);
}

/* حساب مدیریتی هر بار با بازه‌ی «امروز» شروع می‌کند؛ فیلترها با عوض‌شدن کاربر دوباره ساخته می‌شود */
function dashF() {
  var uid = S.user ? S.user.id : "";
  if (!S.dash || S.dash.uid !== uid)
    S.dash = Object.assign(
      { uid: uid },
      DASH_DEF,
      isMgrUser(S.user) || isCustomRole(S.user) ? { range: "today" } : {},
    );
  return S.dash;
}

function dashFree() {
  DASHD = null;
  DASHR = null;
}

/* ---------- زمان و شیفت ---------- */
function dayStart(ms) {
  return Math.floor((ms + TEHRAN_MS) / DAY_MS) * DAY_MS - TEHRAN_MS;
}

function dashPeriod(range, now) {
  var t0 = dayStart(now);
  if (range === "today") return { from: t0, to: t0 + DAY_MS };
  if (range === "yday") return { from: t0 - DAY_MS, to: t0 };
  return {
    from: t0 - ((range === "d7" ? 7 : 30) - 1) * DAY_MS,
    to: t0 + DAY_MS,
  };
}

/* دو نقطه اختیاری است: ۰۷:۰۰، ۰۷۰۰، ۷۳۰ و ۷ (فقط ساعت) هر سه درست‌اند، چون کیبورد عددی گوشی دو نقطه ندارد */
function parseHm(s) {
  var m = /^(?:([01]?\d|2[0-3])[:.٫\/\s]?([0-5]\d)|([01]?\d|2[0-3]))$/.exec(digits(s).trim());
  return m ? (m[3] != null ? +m[3] * 60 : +m[1] * 60 + +m[2]) : null;
}

function fmtHm(min) {
  return ("0" + Math.floor(min / 60)).slice(-2) + ":" + ("0" + (min % 60)).slice(-2);
}

/* شیفت ۱ از شروع شیفت ۱ تا شروع شیفت ۲؛ بقیه‌ی ساعت‌ها شیفت ۲. تا تنظیم نشده null برمی‌گردد. */
function shiftCfg() {
  var c = (S.lists && S.lists.shift) || {},
    a = parseHm(c.s1),
    b = parseHm(c.s2),
    e = c.s3 ? parseHm(c.s3) : null;
  return a != null && b != null && a < b
    ? { s1: a, s2: b, s3: e != null && e > b ? e : null }
    : null;
}

function shiftOf(ms, cfg) {
  var m = Math.floor(((ms + TEHRAN_MS) % DAY_MS) / 60000);
  return m >= cfg.s1 && m < cfg.s2 ? 1 : 2;
}

function elapsedTxt(ms) {
  var m = Math.max(0, Math.floor(ms / 60000)),
    d = Math.floor(m / 1440),
    h = Math.floor((m % 1440) / 60);
  return d
    ? faDigits(d) + " روز و " + faDigits(h) + " ساعت"
    : h
      ? faDigits(h) + " ساعت و " + faDigits(m % 60) + " دقیقه"
      : faDigits(m) + " دقیقه";
}

/* ---------- جمع‌آوری (یک بار برای هر تغییر داده) ---------- */
function carIdOf(r) {
  var o = identOf(r);
  return o.chassis || o.serial || o.room || o.engine || r.key;
}

/* محصول هر خودرو از برگه‌های شاسی/موتور/تزیینات؛ یک بار نمایه می‌شود تا برای هر رکورد کل داده پیمایش نشود */
function dashProdIndex() {
  var by = {};
  S.data.insp.forEach(function (r) {
    if (!r.product || !SHEETS[r.sheet] || PSHEETS.indexOf(r.sheet) < 0) return;
    var o = identOf(r);
    ["serial", "chassis", "engine", "room"].forEach(function (f) {
      if (o[f]) by[o[f]] = r.product;
    });
  });
  return by;
}

function dashProd(r, by) {
  var raw = r.product;
  if (!raw && PSHEETS.indexOf(r.sheet) < 0) {
    var o = identOf(r);
    raw = by[o.chassis] || by[o.serial] || by[o.room] || by[o.engine] || "";
  }
  return raw === "ex" ? "ex" : "padra";
}

function dashCollect() {
  var recs = [],
    defs = [],
    prodBy = dashProdIndex(),
    scope = userSheets();
  S.data.insp.forEach(function (r) {
    if (r.test || !SHEETS[r.sheet] || (scope && scope.indexOf(r.sheet) < 0)) return;
    var base = { r: r, car: carIdOf(r), prod: dashProd(r, prodBy) },
      ms = Date.parse(r.createdAt);
    if (!isNaN(ms)) recs.push(Object.assign({ ms: ms }, base));
    var items = r.items || {};
    Object.keys(items).forEach(function (id) {
      var it = items[id],
        dm = Date.parse(it.at || r.createdAt);
      if (DEF_R[it.r] && !isNaN(dm))
        defs.push(Object.assign({ ms: dm, id: id, it: it, open: !it.closedAt }, base));
    });
  });
  return { recs: recs, defs: defs };
}

function dashData() {
  var scopeKey = String(userSheets());
  if (!DASHD || DASHD.insp !== S.data.insp || DASHD.scopeKey !== scopeKey)
    DASHD = {
      insp: S.data.insp,
      scopeKey: scopeKey,
      data: dashCollect(),
      labels: {},
    };
  return DASHD.data;
}

/* ---------- محاسبه ---------- */
function dashPredicates(F, cfg) {
  return {
    base: function (x) {
      return (!F.prod || x.prod === F.prod) && (!F.station || x.r.sheet === F.station);
    },
    shiftOk: function (x) {
      return !F.shift || (!!cfg && shiftOf(x.ms, cfg) === +F.shift);
    },
    statusOk: function (x) {
      return !F.status || (F.status === "open") === x.open;
    },
  };
}

function countCars(recs) {
  var s = {};
  recs.forEach(function (x) {
    s[x.car] = 1;
  });
  return Object.keys(s).length;
}

function dashStations(recs, defs) {
  var out = {};
  STAGES.forEach(function (k) {
    out[k] = { ids: {}, cars: 0, defects: 0, open: 0, last: null, lastMs: 0 };
  });
  recs.forEach(function (x) {
    var s = out[x.r.sheet];
    s.ids[x.car] = 1;
    if (!s.last || x.ms > s.lastMs) {
      s.last = x.r;
      s.lastMs = x.ms;
    }
  });
  defs.forEach(function (x) {
    var s = out[x.r.sheet];
    s.defects++;
    if (x.open) s.open++;
  });
  STAGES.forEach(function (k) {
    out[k].cars = Object.keys(out[k].ids).length;
    delete out[k].ids;
  });
  return out;
}

/* متن آیتم برای هر (برگه، آیتم، محصول) یک بار ساخته می‌شود */
function defectLabel(x) {
  var it = x.it;
  if (it.custom) return it.part || it.free || it.note || "توضیح دستی";
  dashData();
  var L = DASHD.labels,
    k = x.r.sheet + "|" + x.id + "|" + x.prod;
  return L[k] || (L[k] = labelOf(x.r.sheet, x.id, x.r));
}

function dashPareto(defs) {
  var count = {};
  defs.forEach(function (x) {
    var k = SHEETS[x.r.sheet].name + " - " + defectLabel(x);
    count[k] = (count[k] || 0) + 1;
  });
  return Object.keys(count)
    .map(function (k) {
      return { k: k, n: count[k] };
    })
    .sort(function (a, b) {
      return b.n - a.n;
    })
    .slice(0, 8);
}

function dashDaily(defs, pass, now) {
  var t0 = dayStart(now),
    days = [];
  for (var i = 6; i >= 0; i--) days.push({ from: t0 - i * DAY_MS, n: 0 });
  defs.forEach(function (x) {
    var i = Math.floor((x.ms - days[0].from) / DAY_MS);
    if (i >= 0 && i < 7 && pass(x)) days[i].n++;
  });
  return days;
}

function dashShifts(recs, defs, cfg) {
  var out = [
    { ids: {}, defects: 0 },
    { ids: {}, defects: 0 },
  ];
  recs.forEach(function (x) {
    out[shiftOf(x.ms, cfg) - 1].ids[x.car] = 1;
  });
  defs.forEach(function (x) {
    out[shiftOf(x.ms, cfg) - 1].defects++;
  });
  return out.map(function (s) {
    return { cars: Object.keys(s.ids).length, defects: s.defects };
  });
}

// آمار داشبورد را از رکوردها حساب می‌کند.
function dashCompute(F, now) {
  var D = dashData(),
    cfg = shiftCfg(),
    P = dashPeriod(F.range, now),
    f = dashPredicates(F, cfg);
  var inP = function (x) {
    return x.ms >= P.from && x.ms < P.to && f.base(x);
  };
  var recsIn = D.recs.filter(inP),
    defsIn = D.defs.filter(inP);
  var recs = recsIn.filter(f.shiftOk),
    defsShift = defsIn.filter(f.shiftOk),
    defs = defsShift.filter(f.statusOk);
  var st = dashStations(recs, defs),
    keys = F.station ? [F.station] : userSheets() || STAGES;
  return {
    period: P,
    cfg: cfg,
    keys: keys,
    stations: st,
    defTotal: defs.length,
    nRecs: recs.length,
    cars: countCars(recs),
    openList: defsShift
      .filter(function (x) {
        return x.open;
      })
      .sort(function (a, b) {
        return a.ms - b.ms;
      }),
    withRecords: keys.filter(function (k) {
      return st[k].cars > 0;
    }).length,
    pareto: dashPareto(defs),
    daily: dashDaily(
      D.defs,
      function (x) {
        return f.base(x) && f.shiftOk(x) && f.statusOk(x);
      },
      now,
    ),
    shifts: cfg ? dashShifts(recsIn, defsIn.filter(f.statusOk), cfg) : null,
  };
}

function dashResult(F, now) {
  var key = [
    F.range,
    F.shift,
    F.station,
    F.prod,
    F.status,
    dayStart(now),
    String(userSheets()),
    JSON.stringify((S.lists && S.lists.shift) || ""),
  ].join("|");
  if (!DASHR || DASHR.insp !== S.data.insp || DASHR.key !== key)
    DASHR = { insp: S.data.insp, key: key, res: dashCompute(F, now) };
  return DASHR.res;
}

/* ---------- صفحه ---------- */
function dashPeriodTxt(P) {
  return (
    "از تاریخ " +
    dateOnly(new Date(P.from).toISOString()) +
    " تا تاریخ " +
    dateOnly(new Date(P.to - 1).toISOString())
  );
}

function dashChips(key, items, cur) {
  return (
    '<div class="dchips">' +
    items
      .map(function (x) {
        return (
          '<button type="button" class="pick" data-act="dset" data-k="' +
          key +
          '" data-v="' +
          x[0] +
          '" aria-pressed="' +
          (cur === x[0]) +
          '">' +
          x[1] +
          "</button>"
        );
      })
      .join("") +
    "</div>"
  );
}

function dashNote() {
  var D = dashData(),
    err = "";
  if (S.connErr)
    err =
      '<p class="err" style="margin:8px 0 0">اتصال به سرور برقرار نیست؛ اعداد ممکن است ناقص باشند.</p>';
  else if (!D.recs.length && !D.defs.length)
    err =
      '<p class="err" style="margin:8px 0 0">هنوز داده‌ای بارگذاری نشده است؛ صفرها به معنی «بدون ثبت» نیست.</p>';
  return (
    err +
    '<details class="dnote"><summary class="hint">توضیح اعداد و محدودیت‌ها</summary><p class="hint">این صفحه فقط برای مشاهده است. اعداد از داده‌ی بارگذاری‌شده‌ی همین دستگاه (' +
    faDigits(winDays()) +
    " روز اخیر) محاسبه می‌شود و ساعت هر ثبت، ساعت دستگاه ثبت‌کننده است (تقریبی). «ایراد» در این صفحه شامل ایراد، کسری و قطعه نمونه است. شمار خودرو بر اساس شماره‌ی ثبت‌شده در هر برگه است.</p>" +
    winNoteBody() +
    "</details>"
  );
}

function dashFilterBody(F, R) {
  var shift = R.cfg
    ? dashChips(
        "shift",
        [
          ["", "همه"],
          ["1", "شیفت ۱ (صبح)"],
          ["2", "شیفت ۲ (بعدازظهر)"],
        ],
        F.shift,
      )
    : '<p class="hint" style="margin:6px 0 0">تنظیم نشده (مدیر ساعت شروع شیفت‌ها را در «تنظیمات» وارد کند)</p>';
  var opts = [["", "همه‌ی ایستگاه‌ها"]]
    .concat(
      (userSheets() || STAGES).map(function (k) {
        return [k, SHEETS[k].name];
      }),
    )
    .map(function (o) {
      return (
        '<option value="' +
        o[0] +
        '"' +
        (o[0] === F.station ? " selected" : "") +
        ">" +
        esc(o[1]) +
        "</option>"
      );
    })
    .join("");
  return (
    '<div style="margin-top:10px"><b>شیفت</b>' +
    shift +
    "</div>" +
    '<label class="f" style="margin-top:10px">ایستگاه<select class="in" id="dash_station">' +
    opts +
    "</select></label>" +
    '<div style="margin-top:10px"><b>محصول</b>' +
    dashChips(
      "prod",
      [
        ["", "همه"],
        ["padra", "پادرا"],
        ["ex", "اکستند"],
      ],
      F.prod,
    ) +
    "</div>" +
    '<div style="margin-top:10px"><b>وضعیت ایراد (برای تحلیل‌ها)</b>' +
    dashChips(
      "status",
      [
        ["", "همه"],
        ["open", "باز"],
        ["closed", "بسته‌شده"],
      ],
      F.status,
    ) +
    "</div>" +
    '<p class="hint" style="margin:8px 0 0">فهرست «نیازمند پیگیری» همیشه فقط موارد باز را نشان می‌دهد.</p>'
  );
}

function dashLabel(list, v) {
  var x = list.filter(function (o) {
    return o[0] === v;
  })[0];
  return x ? x[1] : "";
}

function dashSummary(F, R) {
  var sh = !R.cfg ? "" : F.shift ? " · شیفت " + faDigits(F.shift) : " · همه شیفت‌ها";
  return (
    esc(dashLabel(DASH_RANGES, F.range)) +
    sh +
    " · " +
    (F.station ? esc(SHEETS[F.station].name) : "همه ایستگاه‌ها") +
    " · " +
    (F.prod ? esc(PRODN[F.prod]) : "پادرا و اکستند") +
    "<br> " +
    dashPeriodTxt(R.period)
  );
}

function dashHead(F, R) {
  return (
    '<div class="card dhead"><div class="row"><h2 class="grow" style="margin:0;font-size:18px">مرکز راهبری</h2><button class="btn sm" data-act="dset" data-k="fo" data-v="' +
    (F.fo ? "" : "1") +
    '" aria-expanded="' +
    !!F.fo +
    '">' +
    (F.fo ? "بستن فیلتر ▴" : "فیلتر ▾") +
    "</button></div>" +
    '<p class="hint dsum">' +
    dashSummary(F, R) +
    "</p>" +
    (F.fo ? dashFilterBody(F, R) : "") +
    dashNote() +
    "</div>"
  );
}

function dashKv(title, value, sub, small, tone) {
  return (
    '<div class="kv' +
    (tone ? " " + tone : "") +
    '"><small>' +
    title +
    '</small><b class="num' +
    (small ? " dna" : "") +
    '">' +
    value +
    "</b>" +
    (sub ? "<small>" + sub + "</small>" : "") +
    "</div>"
  );
}

function dashCards(R) {
  return (
    '<div class="card dcards"><div class="kvs">' +
    dashKv("خودروهای ثبت‌شده", faDigits(R.cars), "", false, "info") +
    dashKv(
      "ایرادهای باز",
      faDigits(R.openList.length),
      "",
      false,
      R.openList.length ? "bad" : "good",
    ) +
    dashKv(
      "ایستگاه‌های دارای ثبت",
      faDigits(R.withRecords) + " از " + faDigits(R.keys.length),
      "",
      false,
      R.withRecords === R.keys.length ? "good" : "",
    ) +
    dashKv("کسری‌های باز", faDigits(shortOpenCount()), "", false, shortOpenCount() ? "bad" : "good") +
    "</div></div>"
  );
}

function dashDesc(x) {
  return defectLabel(x) + (!x.it.custom && x.it.note ? " — " + x.it.note : "");
}

function dashItem(head, lines) {
  return (
    '<div class="ditem"><div class="dh">' +
    head +
    "</div>" +
    lines
      .map(function (l) {
        return '<div class="dl">' + l + "</div>";
      })
      .join("") +
    "</div>"
  );
}

function dashLine(label, value) {
  return "<small>" + label + ":</small> " + value;
}

function dashTypeChip(r) {
  return '<span class="chip ' + (r === "ng" ? "open" : r) + '">' + esc(typeName(r)) + "</span>";
}

function dashFollowRow(x, now) {
  return (
    '<details class="dfrow"><summary><div class="l1"><b class="num">' +
    esc(x.car) +
    '</b><span class="dst">' +
    esc(SHEETS[x.r.sheet].name) +
    "</span>" +
    dashTypeChip(x.it.r) +
    "</div>" +
    '<div class="l2"><span class="ds">' +
    esc(dashDesc(x)) +
    '</span><span class="dw">' +
    esc(elapsedTxt(now - x.ms)) +
    "</span></div></summary>" +
    '<div class="dbody"><div>' +
    dashLine("شرح", esc(dashDesc(x))) +
    "</div><div>" +
    whoWhen(x.it.by, x.it.at || x.r.createdAt) +
    "</div><div>" +
    dashLine("مدت انتظار", elapsedTxt(now - x.ms)) +
    "</div><div>" +
    dashLine("آخرین اقدام", "اقدامی ثبت نشده") +
    "</div></div></details>"
  );
}

function dashFollowRows(R, F) {
  var rows = R.openList,
    q = digits(F.q);
  if (q)
    rows = rows.filter(function (x) {
      return String(x.car).indexOf(q) >= 0;
    });
  return F.sort === "new" ? rows.slice().reverse() : rows;
}

function dashFollowCard(F, R, now) {
  var rows = dashFollowRows(R, F),
    shown = rows.slice(0, F.more);
  var h =
    '<div class="card"><h2>موارد نیازمند پیگیری (' +
    faDigits(rows.length) +
    ")</h2>" +
    '<form data-form="dashq" class="row"><label class="f grow">جست‌وجوی شماره خودرو<input class="in num ltr" id="dq" inputmode="numeric" autocomplete="off" value="' +
    esc(F.q) +
    '"></label><button class="btn" type="submit">جست‌وجو</button></form>' +
    dashChips(
      "sort",
      [
        ["old", "قدیمی‌ترین انتظار اول"],
        ["new", "تازه‌ترین اول"],
      ],
      F.sort,
    );
  if (!rows.length)
    return (
      h +
      '<p class="hint" style="margin:10px 0 0">' +
      (F.q ? "موردی با این شماره پیدا نشد." : "مورد بازی در این بازه نیست.") +
      "</p></div>"
    );
  h +=
    '<div class="dfrows">' +
    shown
      .map(function (x) {
        return dashFollowRow(x, now);
      })
      .join("") +
    "</div>";
  if (rows.length > shown.length)
    h +=
      '<button class="btn sm" data-act="dmore" style="margin-top:10px">نمایش بیشتر (' +
      faDigits(rows.length - shown.length) +
      " مورد دیگر)</button>";
  return h + "</div>";
}

function dashStationRow(k, s) {
  var none = !s.cars,
    rate = s.cars ? Math.min(100, Math.round((s.defects * 100) / s.cars)) : 0;
  var last = s.last
    ? "<details><summary>آخرین ثبت برگه</summary>" +
      whoWhen(s.last.createdBy, s.last.createdAt) +
      "</details>"
    : "";
  return (
    '<div class="dst2' +
    (s.open ? " bad" : "") +
    (none ? " none" : "") +
    '"><div class="nm">' +
    esc(SHEETS[k].name) +
    "</div>" +
    (none
      ? '<span class="hint">بدون ثبت در بازه</span>'
      : '<div class="nums"><span><small>خودرو</small><b class="num">' +
        faDigits(s.cars) +
        '</b></span><span><small>ایراد</small><b class="num">' +
        faDigits(s.defects) +
        '</b></span><span><small>باز</small><b class="num">' +
        faDigits(s.open) +
        '</b></span></div><div class="dbr" title="ایراد به ازای هر خودرو"><i style="width:' +
        rate +
        '%"></i></div>' +
        last) +
    "</div>"
  );
}

function dashStationsCard(R) {
  var none = R.keys.filter(function (k) {
    return !R.stations[k].cars;
  });
  var h = '<div class="card"><h2>وضعیت ایستگاه‌ها</h2>';
  if (none.length && none.length < R.keys.length)
    h +=
      '<p class="err" style="margin:0">ایستگاه‌های بدون ثبت در این بازه: ' +
      none
        .map(function (k) {
          return esc(SHEETS[k].name);
        })
        .join("، ") +
      "</p>";
  else if (none.length) h += '<p class="hint" style="margin:0">در این بازه هیچ ثبتی نیست.</p>';
  return (
    h +
    '<div class="dgrid">' +
    R.keys
      .map(function (k) {
        return dashStationRow(k, R.stations[k]);
      })
      .join("") +
    "</div>" +
    '<p class="hint" style="margin:10px 0 0">نوار قرمز: ایراد به ازای هر خودروی بازرسی‌شده. «بدون ثبت» یعنی در داده‌ی بارگذاری‌شده ثبتی نیست؛ لزوماً به معنی توقف ایستگاه نیست.</p></div>'
  );
}

function dashBar(label, n, max, extra, color) {
  var pc = max ? Math.round((n * 100) / max) : 0;
  return (
    '<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span>' +
    label +
    '</span><span class="num"><bdi>' +
    faDigits(n) +
    (extra || "") +
    "</bdi></span></div>" +
    '<div style="height:10px;background:#8883;border-radius:5px;overflow:hidden"><div style="width:' +
    pc +
    "%;height:100%;background:" +
    (color || "var(--open)") +
    '"></div></div></div>'
  );
}

function dashDayLabel(from) {
  var j = toJalali(new Date(from + 12 * 3600000).toISOString());
  return j ? faDigits(j.d) + " " + JALALI_MONTHS[j.m - 1] : "";
}

function dashShiftBlock(R) {
  if (!R.shifts)
    return '<p class="hint" style="margin:0">مقایسه‌ی شیفت‌ها: تنظیم نشده (ساعت شروع شیفت‌ها در «تنظیمات» وارد شود).</p>';
  var mx = Math.max(R.shifts[0].defects, R.shifts[1].defects);
  return R.shifts
    .map(function (s, i) {
      return dashBar(
        "شیفت " + faDigits(i + 1) + " · " + faDigits(s.cars) + " خودرو",
        s.defects,
        mx,
        "",
        i ? "var(--wait)" : "var(--stamp)",
      );
    })
    .join("");
}

function dashAnalysisCard(R) {
  var dmx = Math.max.apply(
      null,
      R.daily.map(function (d) {
        return d.n;
      }),
    ),
    cum = 0;
  var h =
    '<div class="card"><h2>تحلیل</h2><h3 class="dsec" style="margin-top:0">ایرادهای ۷ روز اخیر</h3>' +
    R.daily
      .map(function (d) {
        return dashBar(dashDayLabel(d.from), d.n, dmx, "", "var(--stamp)");
      })
      .join("") +
    '<h3 class="dsec">شیفت ۱ و شیفت ۲ (در بازه)</h3>' +
    dashShiftBlock(R) +
    '<h3 class="dsec">پارتو: پرتکرارترین موارد (در بازه)</h3>';
  if (!R.pareto.length) return h + '<p class="hint" style="margin:0">موردی ثبت نشده است.</p></div>';
  R.pareto.forEach(function (x) {
    cum += x.n;
    h += dashBar(
      esc(x.k),
      x.n,
      R.pareto[0].n,
      " (" +
        faDigits(Math.round((x.n * 100) / R.defTotal)) +
        "٪ - تجمعی " +
        faDigits(Math.round((cum * 100) / R.defTotal)) +
        "٪)",
    );
  });
  return h + "</div>";
}

function dashCarRows(C) {
  var by = {};
  C.recs.forEach(function (d) {
    by[d.sheet] = d;
  });
  return STAGES.map(function (k) {
    var d = by[k];
    return dashItem(
      "<span>" + esc(SHEETS[k].name) + "</span>",
      [esc(stageStatus(d))].concat(d ? [whoWhen(d.createdBy, d.createdAt)] : []),
    );
  }).join("");
}

function dashCarCard(F) {
  var h =
    '<div class="card"><h2>پرونده‌ی سریع خودرو</h2><form data-form="dashcar" class="row"><label class="f grow">شماره شاسی یا سریال<input class="in num ltr" id="dcq" inputmode="numeric" autocomplete="off" value="' +
    esc(F.car) +
    '"></label><button class="btn primary" type="submit">نمایش</button></form>';
  if (!F.car) return h + "</div>";
  var C = carRecords(F.car);
  if (!C.recs.length)
    return (
      h +
      '<p class="hint" style="margin:10px 0 0">برای این شماره در داده‌ی بارگذاری‌شده ثبتی پیدا نشد (ممکن است قدیمی‌تر از بازه‌ی بارگذاری باشد).</p></div>'
    );
  return (
    h +
    '<p class="hint" style="margin:10px 0 0">شاسی: <bdi>' +
    esc(C.I.chassis || "—") +
    "</bdi> · سریال: <bdi>" +
    esc(C.I.serial || "—") +
    "</bdi> · موتور: <bdi>" +
    esc(C.I.engine || "—") +
    "</bdi></p>" +
    dashCarRows(C) +
    "</div>"
  );
}

function dashExportCard() {
  return '<div class="card"><h2>خروجی</h2><p class="hint" style="margin:0 0 10px">فایل شامل تاریخ تهیه و فیلترهای انتخاب‌شده است.</p><div class="row"><button class="btn" data-act="dashx" data-k="xlsx">دانلود اکسل</button><button class="btn" data-act="dashx" data-k="pdf">دانلود PDF</button></div></div>';
}

var DASH_SECS = [
  ["follow", "پیگیری"],
  ["stations", "ایستگاه‌ها"],
  ["analysis", "تحلیل"],
  ["car", "خودرو"],
  ["export", "خروجی"],
];

var DASH_BODY = {
  follow: function (F, R, now) {
    return dashFollowCard(F, R, now);
  },
  stations: function (F, R) {
    return dashStationsCard(R);
  },
  analysis: function (F, R) {
    return dashAnalysisCard(R);
  },
  car: function (F) {
    return dashCarCard(F);
  },
  export: function () {
    return dashExportCard();
  },
};

function dashTabs(F, R) {
  return (
    '<div class="subtabs" role="tablist">' +
    DASH_SECS.map(function (x) {
      var n =
        x[0] === "follow" && R.openList.length
          ? '<span class="cnt">' + faDigits(R.openList.length) + "</span>"
          : "";
      return (
        '<button type="button" class="subtab" role="tab" data-act="dset" data-k="sec" data-v="' +
        x[0] +
        '" aria-selected="' +
        (F.sec === x[0]) +
        '">' +
        x[1] +
        n +
        "</button>"
      );
    }).join("") +
    "</div>"
  );
}

// صفحه‌ی داشبورد مدیریتی.
function dashView() {
  if (!dashAllowed())
    return '<div class="card"><p class="hint" style="margin:0">این بخش برای شما فعال نیست.</p></div>';
  var F = dashF(),
    now = Date.now();
  if (!shiftCfg()) F.shift = "";
  if (!DASH_BODY[F.sec]) F.sec = "follow";
  var R = dashResult(F, now),
    L = dashLive(F, now);
  return (
    '<div class="dshgrid">' +
    dashSlot("head", dashHead(F, R)) +
    dashSlot("hero", dashHeroCard(L, now)) +
    dashSlot("trio", dashTrioCard(L)) +
    dashSlot("hours", dashHoursCard(L)) +
    dashSlot("side", dashLinesCard(L) + dashCards(R)) +
    dashSlot("nav", '<div class="dsticky">' + dashChips("range", DASH_RANGES, F.range) + dashTabs(F, R) + "</div>") +
    dashSlot("body", DASH_BODY[F.sec](F, R, now)) +
    "</div>" +
    '<button type="button" class="totop" data-act="totop" aria-label="برگشت به بالا">▲</button>'
  );
}

// هر بخش داشبورد در یک جایگاه شبکه می‌نشیند؛ در گوشی جایگاه‌ها نامرئی‌اند (display: contents).
function dashSlot(name, html) {
  return html ? '<div class="dg dg-' + name + '">' + html + "</div>" : "";
}

/* ---------- بخش زنده‌ی داشبورد: تولید امروز، توقف، راندمان، وضعیت خطوط ---------- */
var DASHL = null;

function sumMs(by) {
  return Object.keys(by).reduce(function (n, k) {
    return n + by[k];
  }, 0);
}

/* راندمان = میانگین خط‌ها از (زمان برنامه‌ای − توقف) تقسیم بر زمان برنامه‌ای */
function dashEff(lines, by, plannedMs) {
  if (!lines.length || plannedMs <= 0) return null;
  return (
    (lines.reduce(function (n, l) {
      return n + Math.max(0, 1 - (by[l] || 0) / plannedMs);
    }, 0) /
      lines.length) *
    100
  );
}

function dashTargetN(F) {
  var t = (S.lists && S.lists.target) || {},
    n = function (k) {
      return parseInt(digits(t[k] || ""), 10) || 0;
    };
  return F.prod ? n(F.prod) : n("padra") + n("ex");
}

/* تولید = خودروهای دارای اولین ثبت «نهایی بالا» (شمارش در نصب اتاق)؛ هر خودرو یک بار */
function dashProduction(F, t0) {
  var D = dashData(),
    sc = userSheets(),
    res = {
      ok: !sc || sc.indexOf("final1") >= 0,
      today: {},
      yday: 0,
      ngT: 0,
      ngY: 0,
    },
    ydayCars = {};
  if (!res.ok) return res;
  D.recs.forEach(function (x) {
    if (x.r.sheet !== "final1" || (F.prod && x.prod !== F.prod)) return;
    if (x.ms >= t0) {
      if (!(x.car in res.today) || x.ms < res.today[x.car]) res.today[x.car] = x.ms;
    } else if (x.ms >= t0 - DAY_MS) ydayCars[x.car] = 1;
  });
  res.yday = Object.keys(ydayCars).length;
  D.defs.forEach(function (x) {
    if (x.it.r !== "ng" || (F.prod && x.prod !== F.prod)) return;
    if (x.ms >= t0) res.ngT++;
    else if (x.ms >= t0 - DAY_MS) res.ngY++;
  });
  return res;
}

function dashHours(todayMs, t0, now, cfg) {
  var cnt = {},
    lo = cfg ? Math.floor(cfg.s1 / 60) : 6,
    hi = Math.max(
      cfg && cfg.s3 ? Math.ceil(cfg.s3 / 60) - 1 : 17,
      Math.floor((now - t0) / 3600000),
    );
  Object.keys(todayMs).forEach(function (c) {
    var h = Math.floor((todayMs[c] - t0) / 3600000);
    cnt[h] = (cnt[h] || 0) + 1;
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
  });
  var out = [];
  for (var h = Math.max(0, lo); h <= Math.min(23, hi); h++) out.push({ h: h, n: cnt[h] || 0 });
  return out;
}

// آمار زنده‌ی امروز: تولید، توقف، راندمان، نسبت به دیروز.
function dashLiveCompute(F, now) {
  var t0 = dayStart(now),
    cfg = shiftCfg(),
    P = dashProduction(F, t0),
    lines = listK("stopLines");
  (S.stops || []).forEach(function (x) {
    if (lines.indexOf(x.line) < 0) lines.push(x.line);
  });
  var shiftOn = !!(cfg && cfg.s3),
    fromT = t0 + (shiftOn ? cfg.s1 : 0) * 60000,
    toT = Math.min(now, t0 + (shiftOn ? cfg.s3 : 1440) * 60000);
  var byT = stopMsByLine(fromT, toT, now),
    byY = stopMsByLine(fromT - DAY_MS, t0 + (shiftOn ? cfg.s3 : 1440) * 60000 - DAY_MS, now);
  var open = openStops();
  return {
    prodOk: P.ok,
    prodN: Object.keys(P.today).length,
    prodY: P.yday,
    ngT: P.ngT,
    ngY: P.ngY,
    target: dashTargetN(F),
    hours: dashHours(P.today, t0, now, cfg),
    stopMin: Math.round(sumMs(byT) / 60000),
    stopYMin: Math.round(sumMs(byY) / 60000),
    eff: shiftOn ? dashEff(lines, byT, toT - fromT) : null,
    effY: shiftOn ? dashEff(lines, byY, t0 + cfg.s3 * 60000 - (t0 + cfg.s1 * 60000)) : null,
    shiftOn: shiftOn,
    lines: lines.map(function (l) {
      var o = open.filter(function (x) {
        return x.line === l;
      })[0];
      return {
        n: l,
        stopped: !!o,
        reason: o ? o.reason : "",
        since: o ? o.startAt : "",
      };
    }),
  };
}

function dashLive(F, now) {
  var key = [
    F.prod,
    Math.floor(now / 60000),
    String(userSheets()),
    JSON.stringify([S.lists && S.lists.shift, S.lists && S.lists.target, listK("stopLines")]),
  ].join("|");
  if (!DASHL || DASHL.insp !== S.data.insp || DASHL.stops !== S.stops || DASHL.key !== key)
    DASHL = {
      insp: S.data.insp,
      stops: S.stops,
      key: key,
      res: dashLiveCompute(F, now),
    };
  return DASHL.res;
}

/* مقایسه با دیروز؛ lowerBetter برای توقف و ایراد (کمتر = بهتر) */
function dashDelta(cur, prev, lowerBetter) {
  if (!prev) return { txt: cur ? "دیروز ثبتی نبود" : "—", tone: "flat" };
  var d = Math.round(((cur - prev) / prev) * 100);
  if (!d) return { txt: "بدون تغییر نسبت به دیروز", tone: "flat" };
  var good = lowerBetter ? d < 0 : d > 0;
  return {
    txt: (d > 0 ? "▲ " : "▼ ") + faDigits(Math.abs(d)) + "٪ نسبت به دیروز",
    tone: good ? "good" : "bad",
  };
}

function dashRing(pct) {
  var C = 2 * Math.PI * 52,
    on = (Math.min(100, pct) / 100) * C;
  return (
    '<svg viewBox="0 0 120 120" role="img" aria-label="پیشرفت تولید ' +
    faDigits(pct) +
    ' درصد"><circle class="bg" cx="60" cy="60" r="52" fill="none" stroke-width="12"/><circle class="fg" cx="60" cy="60" r="52" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="' +
    on.toFixed(1) +
    " " +
    C.toFixed(1) +
    '" transform="rotate(-90 60 60)"/></svg>'
  );
}

function dashHeroCard(L, now) {
  if (!L.prodOk)
    return (
      '<div class="card"><h2>تولید امروز</h2><p class="hint" style="margin:0">' +
      DASH_NA +
      "</p></div>"
    );
  var dl = dashDelta(L.prodN, L.prodY, false),
    pct = L.target ? Math.round((L.prodN / L.target) * 100) : null;
  return (
    '<div class="card dl-hero"><div class="dl-top"><div><small>خودرو تولیدشده‌ی امروز</small><b class="dl-big num">' +
    faDigits(L.prodN) +
    '</b><span class="dl-badge ' +
    dl.tone +
    '">' +
    dl.txt +
    "</span></div>" +
    '<div class="dl-date"><small>امروز</small><b>' +
    esc(dateOnly(new Date(now).toISOString())) +
    "</b></div></div>" +
    (pct == null
      ? '<p class="hint" style="margin:0">هدف روزانه تنظیم نشده است (مدیر در «تنظیمات» وارد می‌کند).</p>'
      : '<div class="dl-ring">' +
        dashRing(pct) +
        '<div><b class="pct num">' +
        faDigits(pct) +
        "٪</b><small>پیشرفت تولید روزانه</small><small>هدف روزانه: " +
        faDigits(L.target) +
        " خودرو</small></div></div>") +
    "</div>"
  );
}

function dashTrioCard(L) {
  var effTxt =
    L.eff == null
      ? '<b class="dna">—</b><small>' +
        (L.shiftOn ? "برنامه‌ای نیست" : "پایان شیفت تنظیم نشده") +
        "</small>"
      : '<b class="num">' +
        faDigits(Math.round(L.eff)) +
        "٪</b><small>" +
        (L.effY == null
          ? "&nbsp;"
          : (Math.round(L.eff - L.effY) >= 0 ? "▲ " : "▼ ") +
            faDigits(Math.abs(Math.round(L.eff - L.effY))) +
            " واحد نسبت به دیروز") +
        "</small>";
  var sd = dashDelta(L.stopMin, L.stopYMin, true),
    nd = dashDelta(L.ngT, L.ngY, true);
  return (
    '<div class="dl-trio"><div class="dl-c good"><small>راندمان</small>' +
    effTxt +
    "</div>" +
    '<div class="dl-c wait"><small>توقف خطوط</small><b class="num">' +
    faDigits(L.stopMin) +
    "</b><small>دقیقه · " +
    sd.txt +
    "</small></div>" +
    '<div class="dl-c bad"><small>ایرادهای کیفیت</small><b class="num">' +
    faDigits(L.ngT) +
    "</b><small>" +
    nd.txt +
    "</small></div></div>"
  );
}

function dashLinesCard(L) {
  if (!L.lines.length) return "";
  return (
    '<div class="card"><h2>وضعیت خطوط تولید</h2><div class="dl-lines">' +
    L.lines
      .map(function (l) {
        return (
          '<div class="dl-line' +
          (l.stopped ? " stop" : "") +
          '"><b><i></i>' +
          esc(l.n) +
          "</b><small>" +
          (l.stopped ? "متوقف: " + esc(l.reason) + " — از ساعت " + esc(timeHM(l.since)) : "فعال") +
          "</small></div>"
        );
      })
      .join("") +
    "</div></div>"
  );
}

function dashHoursCard(L) {
  if (!L.prodOk) return "";
  var max = Math.max.apply(
    null,
    L.hours
      .map(function (x) {
        return x.n;
      })
      .concat([1]),
  );
  return (
    '<div class="card"><h2>تولید ساعتی امروز</h2><div class="dl-bars">' +
    L.hours
      .map(function (x) {
        return (
          '<div class="dl-bar"><small class="num">' +
          (x.n ? faDigits(x.n) : "") +
          '</small><i style="height:' +
          Math.round((x.n / max) * 100) +
          '%"></i><small class="num">' +
          faDigits(x.h) +
          "</small></div>"
        );
      })
      .join("") +
    '</div><p class="hint" style="margin:8px 0 0">ساعت هر ثبت، ساعت دستگاه ثبت‌کننده است (تقریبی). توقف‌ها را برنامه‌ریزی ثبت می‌کند.</p></div>'
  );
}

/* ---------- تنظیم ساعت شیفت‌ها (فقط مدیر) ---------- */
function shiftCard() {
  var c = (S.lists && S.lists.shift) || {};
  var body =
    '<form data-form="cfgshift" class="mgform"><div class="mgrow"><label class="f">شروع شیفت ۱ (صبح)<input class="in num ltr" id="sh1" inputmode="numeric" autocomplete="off" placeholder="0700" value="' +
    esc(c.s1 || "") +
    '"></label>' +
    '<label class="f">شروع شیفت ۲ (بعدازظهر)<input class="in num ltr" id="sh2" inputmode="numeric" autocomplete="off" placeholder="1530" value="' +
    esc(c.s2 || "") +
    '"></label>' +
    '<label class="f">پایان شیفت ۲ (برای راندمان)<input class="in num ltr" id="sh3" inputmode="numeric" autocomplete="off" placeholder="2330" value="' +
    esc(c.s3 || "") +
    '"></label></div>' +
    '<button class="btn primary" type="submit">ذخیره ساعت شیفت‌ها</button></form>';
  return mgCard(
    "sliders",
    "ساعت شیفت‌ها",
    "برای فیلتر و مقایسه‌ی شیفت و حساب راندمان در داشبورد. ساعت را فقط با عدد بنویسید، مثلاً ۰۷۰۰ (دو نقطه لازم نیست). «پایان شیفت ۲» را بنویسید تا راندمان محاسبه شود؛ تا وارد نشود، راندمان «تنظیم نشده» است.",
    body,
  );
}

function targetCard() {
  var t = (S.lists && S.lists.target) || {};
  var body =
    '<form data-form="cfgtarget" class="mgform"><div class="mgrow"><label class="f">پادرا (خودرو در روز)<input class="in num ltr" id="tg_padra" inputmode="numeric" autocomplete="off" value="' +
    esc(t.padra || "") +
    '"></label>' +
    '<label class="f">اکستند (خودرو در روز)<input class="in num ltr" id="tg_ex" inputmode="numeric" autocomplete="off" value="' +
    esc(t.ex || "") +
    '"></label></div>' +
    '<button class="btn primary" type="submit">ذخیره هدف روزانه</button></form>';
  return mgCard(
    "sliders",
    "هدف تولید روزانه",
    "برای حلقه‌ی «پیشرفت تولید» در داشبورد. هر محصولی که خالی بماند در هدف حساب نمی‌شود.",
    body,
  );
}

/* ---------- خروجی اکسل / PDF ---------- */
function dashFilterRows(F, R, now) {
  var iso = new Date(now).toISOString(),
    P = R.period;
  var shift = !R.cfg ? "تنظیم نشده" : F.shift ? "شیفت " + F.shift : "همه";
  var status = { "": "همه", open: "باز", closed: "بسته‌شده" }[F.status];
  return [
    ["عنوان", "مقدار"],
    ["تهیه‌کننده", S.user.name],
    ["تاریخ تهیه", dateOnly(iso)],
    ["ساعت تهیه", timeHM(iso)],
    ["بازه از تاریخ", dateOnly(new Date(P.from).toISOString())],
    ["بازه تا تاریخ", dateOnly(new Date(P.to - 1).toISOString())],
    ["شیفت", shift],
    ["ایستگاه", F.station ? SHEETS[F.station].name : "همه"],
    ["محصول", F.prod ? PRODN[F.prod] : "همه"],
    ["وضعیت ایراد (تحلیل‌ها)", status],
    ["خودروهای ثبت‌شده", String(R.cars)],
    ["ایرادهای باز", String(R.openList.length)],
    ["ایستگاه‌های دارای ثبت", R.withRecords + " از " + R.keys.length],
    ["منتظر تأیید", DASH_NA],
    ["توضیح", "داده‌ی بارگذاری‌شده‌ی همین دستگاه؛ ساعت ثبت، ساعت دستگاه ثبت‌کننده است (تقریبی)."],
  ];
}

function dashFollowExport(R, now) {
  return [
    ["شماره خودرو", "ایستگاه", "نوع", "شرح", "ثبت‌کننده", "تاریخ ثبت", "ساعت ثبت", "مدت انتظار"],
  ].concat(
    R.openList.map(function (x) {
      var at = x.it.at || x.r.createdAt;
      return [
        x.car,
        SHEETS[x.r.sheet].name,
        typeName(x.it.r),
        dashDesc(x),
        x.it.by || "",
        dateOnly(at),
        timeHM(at),
        elapsedTxt(now - x.ms),
      ];
    }),
  );
}

function dashStationExport(R) {
  return [
    [
      "ایستگاه",
      "خودروی بازرسی‌شده",
      "ایراد",
      "باز",
      "ایراد به ازای هر خودرو",
      "آخرین ثبت: نام",
      "تاریخ",
      "ساعت",
    ],
  ].concat(
    R.keys.map(function (k) {
      var s = R.stations[k],
        l = s.last;
      return [
        SHEETS[k].name,
        String(s.cars),
        String(s.defects),
        String(s.open),
        s.cars ? String(Math.round((s.defects * 100) / s.cars) / 100) : "—",
        l ? l.createdBy || "" : "بدون ثبت در بازه",
        l ? dateOnly(l.createdAt) : "",
        l ? timeHM(l.createdAt) : "",
      ];
    }),
  );
}

function dashAnalysisExport(R) {
  var rows = [["بخش", "عنوان", "تعداد"]];
  R.daily.forEach(function (d) {
    rows.push(["۷ روز اخیر", dashDayLabel(d.from), String(d.n)]);
  });
  if (R.shifts)
    R.shifts.forEach(function (s, i) {
      rows.push(["شیفت", "شیفت " + (i + 1) + " (" + s.cars + " خودرو)", String(s.defects)]);
    });
  R.pareto.forEach(function (x) {
    rows.push(["پارتو", x.k, String(x.n)]);
  });
  return rows;
}

/* بخش زنده‌ی داشبورد (تولید امروز، توقف، راندمان، خطوط، ساعت‌به‌ساعت) برای خروجی */
function dashLiveExport(L) {
  var na = DASH_NA,
    pct = L.target && L.prodOk ? Math.round((L.prodN / L.target) * 100) : null,
    num = function (ok, v) {
      return ok ? faDigits(v) : na;
    };
  var eff = function (v) {
    return v == null ? "—" : faDigits(Math.round(v));
  };
  var kpi = [
    ["شاخص", "امروز", "دیروز", "توضیح"],
    [
      "خودروی تولیدشده",
      num(L.prodOk, L.prodN),
      num(L.prodOk, L.prodY),
      L.target
        ? "هدف روزانه " + faDigits(L.target) + (pct == null ? "" : " — " + faDigits(pct) + "٪")
        : "هدف روزانه تنظیم نشده",
    ],
    ["ایراد ثبت‌شده", num(L.prodOk, L.ngT), num(L.prodOk, L.ngY), ""],
    ["توقف خط (دقیقه)", faDigits(L.stopMin), faDigits(L.stopYMin), ""],
    ["راندمان (٪)", eff(L.eff), eff(L.effY), L.shiftOn ? "" : "پایان شیفت تنظیم نشده"],
  ];
  var lines = [["خط", "وضعیت", "دلیل توقف", "تاریخ شروع توقف", "ساعت شروع توقف"]].concat(
    L.lines.map(function (l) {
      return [
        l.n,
        l.stopped ? "متوقف" : "در حال کار",
        l.reason,
        l.stopped ? dateOnly(l.since) : "",
        l.stopped ? timeHM(l.since) : "",
      ];
    }),
  );
  var hours = [["ساعت", "تعداد خودرو"]].concat(
    L.hours.map(function (x) {
      return [faDigits(x.h) + " تا " + faDigits(x.h + 1), faDigits(x.n)];
    }),
  );
  var out = [{ n: "تولید و توقف امروز", r: kpi, w: [24, 14, 14, 40], h: [0] }];
  if (L.lines.length) out.push({ n: "وضعیت خطوط", r: lines, w: [20, 14, 26, 18, 14], h: [0] });
  if (L.prodOk && L.hours.length) out.push({ n: "تولید ساعتی", r: hours, w: [22, 16], h: [0] });
  return out;
}

function dashSections(F, R, now) {
  var sum = { n: "خلاصه", r: dashFilterRows(F, R, now), w: [28, 60], h: [0] };
  return [sum].concat(dashLiveExport(dashLive(F, now))).concat([
    {
      n: "نیازمند پیگیری",
      r: dashFollowExport(R, now),
      w: [16, 24, 12, 40, 18, 14, 10, 18],
      h: [0],
    },
    {
      n: "ایستگاه‌ها",
      r: dashStationExport(R),
      w: [28, 14, 10, 8, 16, 18, 14, 10],
      h: [0],
    },
    { n: "تحلیل", r: dashAnalysisExport(R), w: [16, 50, 10], h: [0] },
  ]);
}

/* PDF: صفحه‌ها روی canvas کشیده می‌شود تا مرورگر حروف فارسی را درست بچسباند */
function buildDashPdf(secs, subtitle) {
  var PW = 1240,
    PH = 1754,
    M = 64,
    LH = 27,
    pad = 8,
    F = "Vazirmatn, Tahoma, Arial, sans-serif",
    pages = [],
    cv,
    ctx,
    y;
  function font(sz, b) {
    ctx.font = (b ? "700 " : "400 ") + sz + "px " + F;
  }
  function newPage() {
    cv = document.createElement("canvas");
    cv.width = PW;
    cv.height = PH;
    ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, PW, PH);
    ctx.direction = "rtl";
    ctx.textBaseline = "top";
    ctx.textAlign = "right";
    font(30, 1);
    ctx.fillStyle = "#14213d";
    ctx.fillText("مرکز راهبری کیفیت و تولید - زامیاد", PW - M, M);
    font(20, 0);
    ctx.fillStyle = "#555";
    ctx.fillText(subtitle, PW - M, M + 42);
    ctx.strokeStyle = "#14213d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(M, M + 74);
    ctx.lineTo(PW - M, M + 74);
    ctx.stroke();
    pages.push(cv);
    y = M + 94;
  }
  function wrap(t, mw) {
    var lines = [],
      cur = "";
    String(t || "")
      .split(/\s+/)
      .forEach(function (w) {
        var test = cur ? cur + " " + w : w;
        if (ctx.measureText(test).width > mw && cur) {
          lines.push(cur);
          cur = w;
        } else cur = test;
      });
    lines.push(cur);
    return lines;
  }
  function columns(sec) {
    var total = sec.w.reduce(function (a, b) {
        return a + b;
      }, 0),
      x = PW - M;
    return sec.w.map(function (w) {
      var cw = ((PW - 2 * M) * w) / total,
        c = { r: x, w: cw };
      x -= cw;
      return c;
    });
  }
  function drawRow(cols, cells, bold, bg) {
    font(19, bold);
    var lines = cells.map(function (v, i) {
        return wrap(v, cols[i].w - pad * 2);
      }),
      n = Math.max.apply(
        null,
        lines.map(function (l) {
          return l.length;
        }),
      ),
      h = n * LH + pad * 2;
    if (y + h > PH - M - 40) return h;
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(M, y, PW - 2 * M, h);
    }
    ctx.fillStyle = bold ? "#14213d" : "#1b1b1b";
    ctx.strokeStyle = "#c4ccda";
    ctx.lineWidth = 1;
    ctx.strokeRect(M, y, PW - 2 * M, h);
    lines.forEach(function (l, i) {
      l.forEach(function (t, k) {
        ctx.fillText(t, cols[i].r - pad, y + pad + k * LH);
      });
      ctx.beginPath();
      ctx.moveTo(cols[i].r - cols[i].w, y);
      ctx.lineTo(cols[i].r - cols[i].w, y + h);
      ctx.stroke();
    });
    y += h;
    return 0;
  }
  function table(sec) {
    var cols = columns(sec);
    function put(cells, bold, bg) {
      if (drawRow(cols, cells, bold, bg)) {
        newPage();
        drawRow(cols, sec.r[0], 1, "#dce3f0");
        drawRow(cols, cells, bold, bg);
      }
    }
    font(26, 1);
    ctx.fillStyle = "#14213d";
    if (y + 120 > PH - M - 40) newPage();
    ctx.fillText(sec.n, PW - M, y);
    y += 42;
    put(sec.r[0], 1, "#dce3f0");
    sec.r.slice(1).forEach(function (r) {
      put(r, 0);
    });
    y += 24;
  }
  newPage();
  secs.forEach(table);
  pages.forEach(function (p, i) {
    var c = p.getContext("2d");
    c.direction = "ltr";
    c.textBaseline = "top";
    c.fillStyle = "#555";
    c.font = "400 20px " + F;
    c.textAlign = "center";
    c.fillText(i + 1 + " / " + pages.length, PW / 2, PH - M);
  });
  return packPdf(pages, PW, PH);
}

// خروجی PDF/Excel داشبورد.
function dashExport(kind) {
  var F = dashF(),
    now = Date.now(),
    secs = dashSections(F, dashResult(F, now), now),
    base = "quality-dashboard-" + new Date(now).toISOString().slice(0, 10);
  if (kind === "xlsx") return saveFile(base + ".xlsx", packXlsx(secs));
  var sub =
    "تاریخ تهیه: " +
    dateOnly(new Date(now).toISOString()) +
    "   ساعت: " +
    timeHM(new Date(now).toISOString()) +
    "   تهیه‌کننده: " +
    S.user.name;
  return loadPdfFonts().then(function () {
    return saveFile(base + ".pdf", buildDashPdf(secs, sub));
  });
}

function clickDashboard(ev, el, a, id, d) {
  if (a === "totop") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }
  if (a === "dset" && dashAllowed()) {
    var df = dashF();
    df[el.getAttribute("data-k")] = el.getAttribute("data-v");
    df.more = DASH_PAGE;
    render();
    return true;
  }
  if (a === "dmore" && dashAllowed()) {
    dashF().more += DASH_PAGE;
    render();
    return true;
  }
  if (a === "dashx" && dashAllowed()) {
    toast("در حال ساخت فایل…");
    var dk = el.getAttribute("data-k");
    setTimeout(function () {
      dashExport(dk).catch(function (e) {
        toast("ساخت فایل ناموفق بود: " + ((e && e.message) || ""));
      });
    }, 50);
    return true;
  }
  if (a === "rprod") {
    S.rprod = el.getAttribute("data-v") || "";
    render();
    return true;
  }
  return false;
}

function submitDashSearch() {
  var dq = dashF();
  dq.q = fieldValue("dq");
  dq.more = DASH_PAGE;
  render();
}

function submitDashCar() {
  var dcq = digits(fieldValue("dcq"));
  ensureCar([dcq]).then(function () {
    dashF().car = dcq;
    render();
  });
}

function submitShiftHours() {
  var sh1 = parseHm(fieldValue("sh1")),
    sh2 = parseHm(fieldValue("sh2")),
    sh3 = fieldValue("sh3") ? parseHm(fieldValue("sh3")) : null;
  if (sh1 == null || sh2 == null || sh1 >= sh2) {
    toast(
      "ساعت‌ها را فقط با عدد بنویسید (مثلاً ۰۷۰۰ و ۱۵۳۰) و شروع شیفت ۱ را زودتر از شیفت ۲ بگذارید.",
    );
    return;
  }
  if (fieldValue("sh3") && (sh3 == null || sh3 <= sh2)) {
    toast("پایان شیفت ۲ را با عدد و بعد از شروع شیفت ۲ بنویسید (مثلاً ۲۳۳۰).");
    return;
  }
  lsSave(
    function (c) {
      c.shift = {
        s1: fmtHm(sh1),
        s2: fmtHm(sh2),
        s3: sh3 != null ? fmtHm(sh3) : "",
      };
    },
    "ساعت شیفت‌ها",
    false,
  );
}

function submitDailyTarget() {
  var tgP = digits(fieldValue("tg_padra")),
    tgX = digits(fieldValue("tg_ex"));
  lsSave(
    function (c) {
      c.target = { padra: tgP, ex: tgX };
    },
    "هدف تولید روزانه",
    false,
  );
}
