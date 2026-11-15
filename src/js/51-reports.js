/* ════════════════════════════════════════════════════════════
   فصل 51 — گزارش‌ها و خروجی PDF و Excel
   داده‌ی گزارش هر ایستگاه، سربرگ، سطرهای ایراد/کسری، ساخت Excel و PDF، نمودارها.
   توابع اصلی: reportData، saveFile، crc32، zipStore، xmlEsc، colL، sheetXml، stationTitle و …
   ════════════════════════════════════════════════════════════ */

/* ---------- export (Excel / PDF), no external libraries ---------- */
// داده‌ی یک گزارش (ایستگاه یا کل خودرو) را آماده می‌کند.
var DEFECT_KINDS = { ng: 1, sample: 1, shortage: 1 };
var RESULT_TEXT = { ng: "ایراد", sample: "قطعه نمونه", shortage: "کسری", done: "انجام شد" };

function uniqueJoin(names) {
  return names
    .filter(function (v, i, a) {
      return a.indexOf(v) === i;
    })
    .join("، ");
}

// خلاصه‌ی یک ایستگاه برای خروجی: امضاها، وضعیت، آخرین تأیید و تعداد موارد باز
function stageInfo(k, r) {
  var sh = SHEETS[k],
    st = r ? stat(r) : null,
    signs = r
      ? sh.sections
          .map(function (sec) {
            return { name: sec.name, s: r.signs && r.signs[sec.id] };
          })
          .filter(function (x) {
            return x.s;
          })
      : [],
    last = signs.length ? signs[signs.length - 1].s : null;
  return {
    k: k,
    name: stationTitle(k),
    page: sh.page,
    rec: r,
    signs: signs,
    status: !r ? "ثبت نشده" : st.signed === st.secs ? "تأیید شده" : "در حال بازدید",
    by: uniqueJoin(
      signs.map(function (x) {
        return x.s.by;
      }),
    ),
    at: last ? when(last.at) : "",
    atIso: last ? last.at : "",
    open: st ? st.open : 0,
  };
}

// متن وضعیت یک بند بازرسی
function itemStatusText(it, sec, r) {
  var signed = r.signs && r.signs[sec.id],
    s =
      RESULT_TEXT[it.r] ||
      (sec.choice
        ? signed
          ? "انجام نشده"
          : "بازدید نشده"
        : it.r === "ok" || signed
          ? "سالم"
          : "بازدید نشده");
  if (!DEFECT_KINDS[it.r]) return s;
  return s + (it.closedAt ? " (بسته شد)" : " (باز)");
}

function exportRow(k, item, it, status, note) {
  return {
    stage: stationTitle(k),
    item: item,
    r: it.r || "",
    status: status,
    note: note,
    by: it.by || "",
    at: it.at ? when(it.at) : "",
    atIso: it.at || "",
    closedBy: it.closedBy || "",
    closedAt: it.closedAt ? when(it.closedAt) : "",
    closedIso: it.closedAt || "",
    closeNote: it.closeNote || "",
  };
}

// ردیف‌های بندهای فهرست برگه + ایرادهای دستی که در فهرست نیستند
function stageRows(k, r) {
  var rows = [],
    known = {};
  secsOf(r.sheet, prodOf(r)).forEach(function (sec) {
    visItems(r, sec).forEach(function (x) {
      var id = secItemId(sec, x.i),
        it = (r.items && r.items[id]) || {};
      known[id] = 1;
      rows.push(
        exportRow(
          k,
          x.l,
          it,
          itemStatusText(it, sec, r),
          (it.note || "") + (it.bc ? (it.note ? " — " : "") + "بارکد: " + it.bc : ""),
        ),
      );
    });
  });
  Object.keys(r.items || {}).forEach(function (id) {
    var it = r.items[id];
    if (known[id] || !DEFECT_KINDS[it.r]) return;
    rows.push(
      exportRow(
        k,
        "توضیح دستی",
        it,
        RESULT_TEXT[it.r] + (it.closedAt ? " (بسته شد)" : " (باز)"),
        it.note || "",
      ),
    );
  });
  return rows;
}

// خروجی ایستگاه شاسی بازدید موتور همان خودرو را هم دارد (چکمن EWT1 هر دو را بازدید می‌کند)
function reportSheets(c, sheet) {
  if (!sheet) return stagesFor(c.recs);
  var hasEngine =
    sheet === "chassis" &&
    c.recs.some(function (d) {
      return d.sheet === "engine";
    });
  return hasEngine ? ["chassis", "engine"] : [sheet];
}

function reportData(q, sheet) {
  var c = carRecords(q),
    stages = [],
    rows = [],
    arch = archOf(c.key);
  reportSheets(c, sheet).forEach(function (k) {
    var r = c.recs.filter(function (d) {
      return d.sheet === k;
    })[0];
    stages.push(stageInfo(k, r));
    if (r) rows = rows.concat(stageRows(k, r));
  });
  return {
    key: c.key,
    prod: carProd(c.key) || "padra",
    I: c.I,
    stages: stages,
    rows: rows,
    defects: rows.filter(function (x) {
      return DEFECT_KINDS[x.r];
    }),
    arch: arch,
    archHist: arch ? archHist(arch) : [],
    at: when(nowIso()),
    atIso: nowIso(),
    by: S.user ? S.user.name : "",
    sheet: sheet || "",
    cpf: cpfRows(c),
    recKey: sheet && stages[0] && stages[0].rec ? stages[0].rec.key : c.key,
    multi: !sheet || stages.length > 1,
  };
}

function saveFile(name, blob) {
  var p =
    window.claude && window.claude.use ? window.claude.use("downloads") : Promise.resolve(null);
  return p
    .catch(function () {
      return null;
    })
    .then(function (dl) {
      if (dl) return dl.save({ filename: name, data: blob });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        a.remove();
      }, 800);
    })
    .catch(function (e) {
      if (e && e.code === "declined") return;
      toast("ذخیره فایل ممکن نشد" + (e && e.message ? ": " + e.message : ""));
    });
}

/* --- minimal xlsx writer --- */
var CRC_T = (function () {
  var t = [],
    c,
    n,
    k;
  for (n = 0; n < 256; n++) {
    c = n;
    for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(u8) {
  var c = 0xffffffff;
  for (var i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  var enc = new TextEncoder(),
    parts = [],
    cd = [],
    off = 0;
  files.forEach(function (f) {
    var nm = enc.encode(f.name),
      data = enc.encode(f.data),
      crc = crc32(data);
    var h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true);
    h.setUint16(8, 0, true);
    h.setUint16(10, 0, true);
    h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true);
    h.setUint16(26, nm.length, true);
    h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nm, data);
    var c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, 0, true);
    c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, nm.length, true);
    c.setUint32(42, off, true);
    cd.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + data.length;
  });
  var cdLen = 0;
  cd.forEach(function (x) {
    cdLen += x.length;
  });
  var e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, cdLen, true);
  e.setUint32(16, off, true);
  return new Blob(parts.concat(cd, [new Uint8Array(e.buffer)]), {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function xmlEsc(s) {
  return String(s == null ? "" : s)
    .replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    })
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function colL(i) {
  var s = "";
  i++;
  while (i > 0) {
    var m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function sheetXml(rows, widths, headRows, tone) {
  var x =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews><cols>';
  widths.forEach(function (w, i) {
    x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
  });
  x += "</cols><sheetData>";
  rows.forEach(function (r, ri) {
    x += '<row r="' + (ri + 1) + '">';
    r.forEach(function (v, ci) {
      x +=
        '<c r="' +
        colL(ci) +
        (ri + 1) +
        '" t="inlineStr" s="' +
        (headRows.indexOf(ri) >= 0 ? 1 : (tone && tone(r)) || 0) +
        '"><is><t xml:space="preserve">' +
        xmlEsc(v) +
        "</t></is></c>";
    });
    x += "</row>";
  });
  return x + "</sheetData></worksheet>";
}

function stationTitle(sheet) {
  return STATION_TITLE[sheet] || SHEETS[sheet].name;
}

/* سربرگ: خط اصلی (نام ایستگاه یا پرونده کامل) و خط شماره */
// سربرگ گزارش: عنوان ایستگاه، شناسه‌ی خودرو، تاریخ.
function reportHead(rep) {
  var own = ownIdent(rep);
  return {
    main: rep.sheet ? "ایستگاه " + stationTitle(rep.sheet) : "پرونده کامل خودرو",
    num: own[0] + " " + own[1],
  };
}

function reportTitle(rep) {
  var h = reportHead(rep);
  return h.main + " · " + h.num;
}

/* شماره‌های مرتبط با هر ایستگاه در مشخصات خروجی */
var REPORT_IDS = {
  chassis: ["chassis", "engine"],
  engine: ["engine"],
  trim: ["room"],
  final1: ["serial", "chassis", "engine", "room"],
  final2: ["serial", "chassis", "engine", "room"],
  gas: ["serial", "chassis", "engine"],
  mech: ["serial", "chassis", "engine", "room"],
  mech2: ["serial", "chassis", "engine", "room"],
  roll: ["serial", "chassis", "engine", "room"],
  road: ["serial", "chassis", "engine", "room"],
  comm: ["serial", "chassis", "engine", "room"],
};

var ID_LABEL = {
  serial: "شماره سریال",
  chassis: "شماره شاسی",
  engine: "شماره موتور",
  room: "شماره اتاق",
};

var OWN_ID = { chassis: "chassis", engine: "engine", trim: "room" };

var ALL_IDS = ["serial", "chassis", "engine", "room"];

/* شماره‌ی اصلی خروجی: شاسی→شاسی، تزیینات→اتاق، بقیه (و پرونده کامل)→سریال؛ اگر ثبت نشده باشد کلید همان برگه با عنوان خودش */
// شناسه‌ی اصلی گزارش ایستگاه (شاسی=شماره‌ی شاسی، تزیینات=شماره‌ی اتاق، بقیه=سریال).
function ownIdent(rep) {
  var f = OWN_ID[rep.sheet] || "serial",
    v = rep.I[f];
  if (v) return [ID_LABEL[f], v];
  if (rep.sheet) return [SHEETS[rep.sheet].keyLabel, rep.recKey];
  return rep.I.chassis ? [ID_LABEL.chassis, rep.I.chassis] : [ID_LABEL.serial, rep.key];
}

function idRows(rep) {
  var own = rep.sheet ? OWN_ID[rep.sheet] || "serial" : "serial";
  return [own]
    .concat(
      ALL_IDS.filter(function (f) {
        return f !== own;
      }),
    )
    .map(function (f) {
      return [ID_LABEL[f], rep.I[f] || "—"];
    });
}

function reportInfoRows(rep) {
  var I = rep.I,
    a = rep.arch,
    s0 = rep.stages[0],
    R;
  if (rep.sheet) {
    R = idRows(rep).concat([
      ["محصول", PRODF[rep.prod || "padra"]],
      ["کد فرم", FORM_CODE],
    ]);
    if (I.color) R.push(["رنگ", I.color]);
    if (s0) {
      if (s0.rec) R.push(["سوخت", fuelTxt(fuelOf(s0.rec))]);
      R.push(
        ["وضعیت ایستگاه", s0.status],
        ["تأییدکننده", s0.by || "—"],
        ["تاریخ تأیید", dateOnly(s0.atIso) || "—"],
        ["ساعت تأیید", timeHM(s0.atIso) || "—"],
      );
    }
  } else {
    R = idRows(rep).concat(
      [
        ["رنگ", I.color || "—"],
        ["کد فرم", FORM_CODE],
        ["محصول", PRODF[rep.prod || "padra"]],
      ],
      [
        [
          "وضعیت پرونده",
          a ? (a.reopened ? "بازگشایی‌شده (برگشتی از PDI)" : "بایگانی شده") : "بایگانی نشده",
        ],
      ],
    );
    if (a)
      R.push(
        ["بایگانی‌کننده", a.by],
        ["تاریخ بایگانی", dateOnly(a.at)],
        ["ساعت بایگانی", timeHM(a.at)],
      );
  }
  R.push(
    ["تهیه‌کننده", rep.by],
    ["تاریخ تهیه", dateOnly(rep.atIso)],
    ["ساعت تهیه", timeHM(rep.atIso)],
  );
  return R;
}

/* تأیید بخش‌های یک مرحله: ردیف‌های [بخش، نام، تاریخ، ساعت] */
function signRows(stage) {
  return stage.signs.map(function (x) {
    return [x.name, x.s.by || "—", dateOnly(x.s.at) || "—", timeHM(x.s.at) || "—"];
  });
}

function closeLines(d) {
  if (!d.closedAt) return "";
  return (
    "\nبسته شد" +
    (d.closeNote ? "\nاقدام: " + d.closeNote : "") +
    "\nبسته‌کننده: " +
    (d.closedBy || "—") +
    "\nتاریخ بستن: " +
    dateOnly(d.closedIso) +
    "\nساعت بستن: " +
    timeHM(d.closedIso)
  );
}

var ACT_LABEL = { ng: "رفع عیب", shortage: "تأمین قطعه", sample: "نمونه بودن" };

var DEF_TYPES = [
  ["ng", "ایرادها"],
  ["shortage", "کسری‌ها"],
  ["sample", "قطعات نمونه"],
];

var DEF_TONE = { ng: "#fdeceb", shortage: "#fff4d6", sample: "#eaf1fb" };

function whoLinesText(by, iso) {
  return (
    "نام: " + (by || "—") + "\nتاریخ: " + (dateOnly(iso) || "—") + "\nساعت: " + (timeHM(iso) || "—")
  );
}

function actionText(d) {
  return d.closedAt
    ? ACT_LABEL[d.r] + ": " + (d.closeNote || "—") + "\n" + whoLinesText(d.closedBy, d.closedIso)
    : "هنوز باز است";
}

function defectStatus(d) {
  return d.closedAt ? "بسته شد" : "باز";
}

/* ردیف جدول نوع‌های ایراد/کسری/نمونه: [مرحله؟، مورد، شرح، ثبت (نام/تاریخ/ساعت)، وضعیت، اقدام] */
function typedRow(d, whole) {
  return (whole ? [d.stage] : []).concat([
    d.item,
    d.note || "—",
    whoLinesText(d.by, d.atIso),
    defectStatus(d),
    actionText(d),
  ]);
}

var TYPED_HEAD = ["مورد", "شرح", "ثبت‌شده توسط", "وضعیت", "اقدام انجام‌شده"];

function okCounts(rep) {
  var g = {},
    order = [];
  rep.rows.forEach(function (d) {
    var o = g[d.stage] || (g[d.stage] = [d.stage, 0, 0, 0, 0]);
    if (order.indexOf(d.stage) < 0) order.push(d.stage);
    if (isProblem(d)) o[4]++;
    else if (d.status === "سالم") o[1]++;
    else if (d.r === "done" || d.status === "انجام شد") o[2]++;
    else o[3]++;
  });
  return order.map(function (k) {
    var o = g[k];
    return [o[0], String(o[1]), String(o[2]), String(o[3]), String(o[4])];
  });
}

function defectRow(d, whole) {
  return (whole ? [d.stage] : []).concat([
    d.item,
    d.status,
    (d.note || "—") + closeLines(d),
    d.by || "—",
    dateOnly(d.atIso) || "—",
    timeHM(d.atIso) || "—",
  ]);
}

// فایل Excel گزارش را می‌سازد.
// ردیف‌های برگه‌ی «خلاصه»؛ heads شماره‌ی سطرهای عنوان را برای رنگ‌آمیزی نگه می‌دارد
function xlsxSummaryRows(rep) {
  var head = reportHead(rep),
    A = [[head.main, head.num]].concat(reportInfoRows(rep)),
    heads = [0],
    section = function (titles) {
      A.push(["", ""]);
      heads.push(A.length);
      A.push(titles);
    };
  section(["بخش تأییدشده", "نام", "تاریخ تأیید", "ساعت تأیید"]);
  rep.stages.forEach(function (st) {
    signRows(st).forEach(function (r) {
      A.push(rep.multi ? [st.name + " — " + r[0], r[1], r[2], r[3]] : r);
    });
  });
  if (!rep.sheet && rep.archHist.length) {
    section(["رویداد بایگانی", "نام", "تاریخ", "ساعت", "توضیح"]);
    histRows(rep.archHist).forEach(function (r) {
      A.push(r);
    });
  }
  if (!rep.sheet) {
    section(["مرحله", "صفحه فرم", "وضعیت", "تأییدکننده", "تاریخ تأیید", "ساعت تأیید", "موارد باز"]);
    rep.stages.forEach(function (s) {
      A.push([
        s.name,
        s.page ? faDigits(s.page) + " از " + faDigits(PAGES) : "",
        s.status,
        s.by,
        dateOnly(s.atIso),
        timeHM(s.atIso),
        String(s.open || 0),
      ]);
    });
  }
  return { A: A, heads: heads };
}

// برگه‌ی «همه موارد»: مشکل‌دارها اول
function xlsxAllSheet(rep) {
  var C = [["مرحله", "مورد", "وضعیت", "شرح", "ثبت‌کننده", "تاریخ ثبت", "ساعت ثبت"]];
  rep.rows
    .slice()
    .sort(function (x, y) {
      return isProblem(y) - isProblem(x);
    })
    .forEach(function (d) {
      var p = isProblem(d);
      C.push([
        d.stage,
        d.item,
        d.status,
        d.note,
        p ? d.by : "",
        p ? dateOnly(d.atIso) : "",
        p ? timeHM(d.atIso) : "",
      ]);
    });
  return {
    n: "همه موارد",
    r: C,
    w: [26, 40, 18, 40, 18, 14, 10],
    h: [0],
    tone: function (r) {
      var st = r[2] || "";
      if (/بسته/.test(st)) return 4;
      if (!/باز/.test(st)) return 0;
      return /^کسری/.test(st) ? 3 : 2;
    },
  };
}

/* رنگ ردیف: ۲ قرمز (باز)، ۳ کهربایی (کسری باز)، ۴ سبز (بسته) */
function xlsxDefectSheet(rep, t) {
  var list = defectsOf(rep, t[0]),
    R = [
      [reportTitle(rep) + " — " + t[1] + " (" + faDigits(list.length) + ")"],
      [
        "مرحله",
        "مورد",
        "شرح",
        "ثبت‌کننده",
        "تاریخ ثبت",
        "ساعت ثبت",
        "وضعیت",
        "نوع اقدام",
        "اقدام انجام‌شده",
        "اقدام‌کننده",
        "تاریخ اقدام",
        "ساعت اقدام",
      ],
    ];
  list.forEach(function (d) {
    R.push([
      d.stage,
      d.item,
      d.note,
      d.by,
      dateOnly(d.atIso),
      timeHM(d.atIso),
      defectStatus(d),
      d.closedAt ? ACT_LABEL[d.r] : "",
      d.closeNote || "",
      d.closedBy || "",
      dateOnly(d.closedIso),
      timeHM(d.closedIso),
    ]);
  });
  return {
    n: t[1],
    r: R,
    w: [24, 32, 40, 18, 14, 10, 12, 14, 40, 18, 14, 10],
    h: [0, 1],
    tone: function (r) {
      return r[6] === "بسته شد" ? 4 : t[0] === "shortage" ? 3 : 2;
    },
  };
}

function xlsxCpfSheet(rep) {
  return {
    n: "حفاظت از مشتری",
    r: [
      ["فرم‌های حفاظت از مشتری (" + faDigits(rep.cpf.length) + ")"],
      ["شماره فرم", "وضعیت", "شرح ایراد", "اقدام حفاظت", "معتبر تا", "امضاها", "بستن فرم"],
    ].concat(rep.cpf),
    w: [14, 14, 36, 36, 16, 50, 40],
    h: [0, 1],
  };
}

function buildXlsx(rep) {
  var sum = xlsxSummaryRows(rep),
    out = DEF_TYPES.map(function (t) {
      return xlsxDefectSheet(rep, t);
    });
  if (rep.cpf.length) out.push(xlsxCpfSheet(rep));
  out.push({ n: "خلاصه", r: sum.A, w: [28, 34, 16, 28, 16, 12, 12], h: sum.heads });
  out.push(xlsxAllSheet(rep));
  return packXlsx(out);
}

/* --- PDF: pages drawn on canvas (browser shapes Persian), packed as JPEG into a minimal PDF --- */
/* بوم و ابزار مشترک ساخت PDF (فرم ایستگاه و فرم نمونه‌زنی): صفحه، سرتیتر، جدول و شماره‌ی صفحه */
var PDF_FONT = "Vazirmatn, Tahoma, Arial, sans-serif";

// ابزار مشترک رسم PDF (متن فارسی، جدول، رنگ).
function pdfWrapLine(P, t, mw) {
  var lines = [],
    cur = "";
  String(t || "")
    .split(/\s+/)
    .forEach(function (w) {
      var test = cur ? cur + " " + w : w;
      if (P.ctx.measureText(test).width > mw && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    });
  lines.push(cur);
  return lines;
}

// شکستن متن به خط‌ها؛ با keepLines خط‌های جدید متن حفظ می‌شود
function pdfWrap(P, o, t, mw) {
  if (!o.keepLines) return pdfWrapLine(P, t, mw);
  var out = [];
  String(t || "")
    .split("\n")
    .forEach(function (p) {
      out = out.concat(pdfWrapLine(P, p, mw));
    });
  return out;
}

// مختصات ستون‌ها از راست: X[i] = {r: لبه‌ی راست، w: عرض}
function pdfColumns(P, cols) {
  var total = cols.reduce(function (a, x) {
      return a + x.w;
    }, 0),
    W = P.PW - 2 * P.M,
    x0 = P.PW - P.M,
    X = [];
  cols.forEach(function (k) {
    var w = (W * k.w) / total;
    X.push({ r: x0, w: w });
    x0 -= w;
  });
  return { X: X, W: W };
}

var PDF_PAD = 10;

function pdfTableHead(P, o, cols, L) {
  P.font(o.fs, 1);
  var h = o.lh + PDF_PAD * 2;
  P.ensure(h + o.lh * 2);
  var c = P.ctx;
  c.fillStyle = "#dce3f0";
  c.fillRect(P.M, P.y, L.W, h);
  c.fillStyle = "#14213d";
  c.textAlign = "right";
  cols.forEach(function (k, i) {
    c.fillText(k.t, L.X[i].r - PDF_PAD, P.y + PDF_PAD);
  });
  c.strokeStyle = "#9aa5b8";
  c.lineWidth = 1;
  c.strokeRect(P.M, P.y, L.W, h);
  P.y += h;
}

function pdfTableRow(P, o, cols, L, r, tint) {
  P.font(o.fs, 0);
  var lines = r.map(function (v, i) {
      return pdfWrap(P, o, v, L.X[i].w - PDF_PAD * 2);
    }),
    n = Math.max.apply(
      null,
      lines.map(function (l) {
        return l.length;
      }),
    ),
    h = n * o.lh + PDF_PAD * 2;
  if (P.y + h > P.PH - P.M - 40) {
    P.newPage();
    pdfTableHead(P, o, cols, L);
    P.font(o.fs, 0);
  }
  var c = P.ctx,
    bg = tint && tint(r);
  if (bg) {
    c.fillStyle = bg;
    c.fillRect(P.M, P.y, L.W, h);
  }
  c.fillStyle = "#1b1b1b";
  c.textAlign = "right";
  P.font(o.fs, 0);
  lines.forEach(function (l, i) {
    l.forEach(function (t, k) {
      c.fillText(t, L.X[i].r - PDF_PAD, P.y + PDF_PAD + k * o.lh);
    });
  });
  c.strokeStyle = "#c4ccda";
  c.strokeRect(P.M, P.y, L.W, h);
  L.X.forEach(function (k) {
    c.beginPath();
    c.moveTo(k.r - k.w, P.y);
    c.lineTo(k.r - k.w, P.y + h);
    c.stroke();
  });
  P.y += h;
}

function pdfTable(P, o, cols, rows, tint) {
  var L = pdfColumns(P, cols);
  pdfTableHead(P, o, cols, L);
  rows.forEach(function (r) {
    pdfTableRow(P, o, cols, L, r, tint);
  });
  P.y += 10;
}

function pdfPainter(o) {
  var P = { PW: 1240, PH: 1754, M: 64, pages: [], ctx: null, y: 0 };
  P.font = function (sz, b) {
    P.ctx.font = (b ? "700 " : "400 ") + sz + "px " + PDF_FONT;
  };
  P.newPage = function () {
    var cv = document.createElement("canvas"),
      c;
    cv.width = P.PW;
    cv.height = P.PH;
    c = P.ctx = cv.getContext("2d");
    c.fillStyle = "#fff";
    c.fillRect(0, 0, P.PW, P.PH);
    c.direction = "rtl";
    c.textBaseline = "top";
    c.textAlign = "right";
    P.y = o.header(P);
    P.pages.push(cv);
  };
  P.ensure = function (h) {
    if (P.y + h > P.PH - P.M - 40) P.newPage();
  };
  P.heading = function (t) {
    P.ensure(230);
    P.y += 18;
    P.font(28, 1);
    P.ctx.fillStyle = "#14213d";
    P.ctx.textAlign = "right";
    P.ctx.fillText(t, P.PW - P.M, P.y);
    P.y += 46;
  };
  P.table = function (cols, rows, tint) {
    pdfTable(P, o, cols, rows, tint);
  };
  P.finish = function (label) {
    P.pages.forEach(function (p, i) {
      var c = p.getContext("2d");
      c.direction = "ltr";
      c.textBaseline = "top";
      c.fillStyle = "#555";
      c.font = "400 20px " + PDF_FONT;
      c.textAlign = "center";
      c.fillText(label + "  ·  " + (i + 1) + " / " + P.pages.length, P.PW / 2, P.PH - P.M);
    });
    return packPdf(P.pages, P.PW, P.PH);
  };
  return P;
}

// فایل PDF گزارش را می‌سازد.
// عنوان بالای هر صفحه‌ی PDF خودرو (نام فرم، عنوان، شماره‌ی خودرو و خط جداکننده)
function pdfPageHeader(head) {
  return function (p) {
    var c = p.ctx,
      M = p.M,
      PW = p.PW;
    p.font(24, 0);
    c.fillStyle = "#555";
    c.fillText("فرم ثبت سوابق خودکنترلی", PW - M, M);
    p.font(36, 1);
    c.fillStyle = "#14213d";
    c.fillText(head.main, PW - M, M + 36);
    p.font(28, 1);
    c.fillStyle = "#1f5fa8";
    c.fillText(head.num, PW - M, M + 86);
    c.strokeStyle = "#14213d";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(M, M + 130);
    c.lineTo(PW - M, M + 130);
    c.stroke();
    return M + 150;
  };
}

// یک خط توضیح کم‌رنگ، وقتی بخشی داده ندارد
function pdfNote(P, text) {
  P.ensure(50);
  P.font(24, 0);
  P.ctx.fillStyle = "#555";
  P.ctx.textAlign = "right";
  P.ctx.fillText(text, P.PW - P.M, P.y);
  P.y += 40;
}

function pdfInfoSection(P, rep) {
  var info = reportInfoRows(rep),
    pairs = [];
  P.font(24, 0);
  for (var k = 0; k < info.length; k += 2) pairs.push(info[k].concat(info[k + 1] || ["", ""]));
  P.table(
    [
      { t: "عنوان", w: 2 },
      { t: "مقدار", w: 3 },
      { t: "عنوان", w: 2 },
      { t: "مقدار", w: 3 },
    ],
    pairs,
  );
}

function pdfSummarySection(P, rep) {
  var openN = function (t) {
    return String(
      defectsOf(rep, t).filter(function (d) {
        return !d.closedAt;
      }).length,
    );
  };
  P.heading("خلاصه");
  P.table(
    [
      { t: "ایراد باز", w: 1 },
      { t: "کسری باز", w: 1 },
      { t: "قطعه نمونه باز", w: 1 },
      { t: "بسته‌شده", w: 1 },
    ],
    [
      [
        openN("ng"),
        openN("shortage"),
        openN("sample"),
        String(
          rep.defects.filter(function (d) {
            return d.closedAt;
          }).length,
        ),
      ],
    ],
  );
}

// جدول جداگانه برای هر نوع (ایراد، کسری، قطعه نمونه)
function pdfDefectSections(P, rep, whole) {
  DEF_TYPES.forEach(function (t) {
    var list = defectsOf(rep, t[0]),
      sIdx = whole ? 4 : 3;
    P.heading(t[1] + " (" + faDigits(list.length) + ")");
    if (!list.length) return pdfNote(P, "موردی ثبت نشده است.");
    P.table(
      (whole ? [{ t: "مرحله", w: 1.8 }] : []).concat([
        { t: TYPED_HEAD[0], w: 2.4 },
        { t: TYPED_HEAD[1], w: 2.6 },
        { t: TYPED_HEAD[2], w: 2.4 },
        { t: TYPED_HEAD[3], w: 1.3 },
        { t: TYPED_HEAD[4], w: 3.4 },
      ]),
      list.map(function (d) {
        return typedRow(d, whole);
      }),
      function (r) {
        return r[sIdx] === "بسته شد" ? "#e8f5ec" : DEF_TONE[t[0]];
      },
    );
  });
}

function pdfCpfSection(P, rep) {
  P.heading("فرم‌های حفاظت از مشتری (" + faDigits(rep.cpf.length) + ")");
  P.table(
    [
      { t: "شماره", w: 1.2 },
      { t: "وضعیت", w: 1.4 },
      { t: "شرح ایراد", w: 3 },
      { t: "اقدام حفاظت", w: 3 },
      { t: "امضاها", w: 4 },
    ],
    rep.cpf.map(function (r) {
      return [
        r[0],
        r[1],
        r[2],
        r[3] + "\nمعتبر تا: " + r[4],
        r[5] + (r[6] !== "—" ? "\n— بسته شد —\n" + r[6] : ""),
      ];
    }),
    function (r) {
      return /بسته/.test(r[1]) ? "#e8f5ec" : /منقضی/.test(r[1]) ? "#fdeceb" : null;
    },
  );
}

function pdfStagesSection(P, rep) {
  P.heading("مراحل تولید");
  P.table(
    [
      { t: "مرحله", w: 5 },
      { t: "صفحه", w: 1.4 },
      { t: "وضعیت", w: 2 },
      { t: "تأییدکننده", w: 3 },
      { t: "تاریخ تأیید", w: 2.4 },
      { t: "ساعت", w: 1.4 },
      { t: "باز", w: 1 },
    ],
    rep.stages.map(function (s) {
      return [
        s.name,
        s.page ? faDigits(s.page) + " از " + faDigits(PAGES) : "",
        s.status,
        s.by,
        dateOnly(s.atIso),
        timeHM(s.atIso),
        String(s.open || 0),
      ];
    }),
    function (r) {
      return r[2] === "تأیید شده" ? null : "#fff4d6";
    },
  );
}

function pdfArchiveSection(P, rep) {
  P.heading("تاریخچه‌ی بایگانی");
  P.table(
    [
      { t: "رویداد", w: 3.4 },
      { t: "نام", w: 2.6 },
      { t: "تاریخ", w: 2 },
      { t: "ساعت", w: 1.4 },
      { t: "توضیح", w: 4.6 },
    ],
    histRows(rep.archHist),
  );
}

function pdfSignSection(P, rep, whole) {
  var rows = [];
  P.heading("تأییدهای بخش‌ها");
  rep.stages.forEach(function (st) {
    signRows(st).forEach(function (r) {
      rows.push(whole ? [st.name + " — " + r[0], r[1], r[2], r[3]] : r);
    });
  });
  if (!rows.length) return pdfNote(P, "هنوز تأییدی ثبت نشده است.");
  P.table(
    [
      { t: "بخش", w: 4 },
      { t: "نام", w: 3 },
      { t: "تاریخ", w: 2 },
      { t: "ساعت", w: 1.4 },
    ],
    rows,
  );
}

function pdfOkSection(P, rep) {
  P.heading("بندهای بازدیدشده (فهرست کامل در Excel)");
  P.table(
    [
      { t: "مرحله", w: 4 },
      { t: "سالم", w: 1.2 },
      { t: "انجام‌شده", w: 1.5 },
      { t: "بازدید/انجام نشده", w: 2 },
      { t: "ایراد/کسری/نمونه", w: 2.2 },
    ],
    okCounts(rep),
  );
}

function buildPdf(rep) {
  var P = pdfPainter({ fs: 24, lh: 36, keepLines: true, header: pdfPageHeader(reportHead(rep)) }),
    whole = !rep.sheet;
  P.newPage();
  pdfInfoSection(P, rep);
  pdfSummarySection(P, rep);
  pdfDefectSections(P, rep, rep.multi);
  if (rep.cpf.length) pdfCpfSection(P, rep);
  if (whole) pdfStagesSection(P, rep);
  if (whole && rep.archHist.length) pdfArchiveSection(P, rep);
  pdfSignSection(P, rep, rep.multi);
  pdfOkSection(P, rep);
  return P.finish(FORM_CODE);
}

/* بسته‌بندی چند برگه (n نام، r ردیف‌ها، w عرض ستون‌ها، h ردیف‌های سرتیتر) در فایل xlsx */
// فایل xlsx را از برگه‌ها بسته‌بندی می‌کند.
function packXlsx(sh) {
  var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  var ct =
    X +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    sh
      .map(function (x, i) {
        return (
          '<Override PartName="/xl/worksheets/sheet' +
          (i + 1) +
          '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        );
      })
      .join("") +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
  var rels =
    X +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  var wb =
    X +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    sh
      .map(function (x, i) {
        return '<sheet name="' + x.n + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      })
      .join("") +
    "</sheets></workbook>";
  var wr =
    X +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sh
      .map(function (x, i) {
        return (
          '<Relationship Id="rId' +
          (i + 1) +
          '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' +
          (i + 1) +
          '.xml"/>'
        );
      })
      .join("") +
    '<Relationship Id="rId' +
    (sh.length + 1) +
    '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  var files = [
    { name: "[Content_Types].xml", data: ct },
    { name: "_rels/.rels", data: rels },
    { name: "xl/workbook.xml", data: wb },
    { name: "xl/_rels/workbook.xml.rels", data: wr },
    {
      name: "xl/styles.xml",
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE3F0"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFDECEB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF4D6"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F5EC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    },
  ];
  sh.forEach(function (x, i) {
    files.push({
      name: "xl/worksheets/sheet" + (i + 1) + ".xml",
      data: sheetXml(x.r, x.w, x.h, x.tone),
    });
  });
  return zipStore(files);
}

// قلم وزیرمتن را پیش از ساخت PDF بارگذاری می‌کند تا متن فارسی درست رسم شود.
function loadPdfFonts() {
  if (!(document.fonts && document.fonts.load)) return Promise.resolve();
  return Promise.all([
    document.fonts.load("400 22px Vazirmatn"),
    document.fonts.load("700 22px Vazirmatn"),
  ]).catch(function () {});
}

// دکمه‌ی PDF/Excel را اجرا می‌کند و نام فایل را می‌سازد.
function doExport(kind, q, sheet) {
  var rep = reportData(q, sheet),
    base = (sheet || "car") + "-" + ownIdent(rep)[1];
  if (kind === "xlsx") {
    return saveFile(base + ".xlsx", buildXlsx(rep));
  }
  return loadPdfFonts().then(function () {
    return saveFile(base + ".pdf", buildPdf(rep));
  });
}

function repData(y, m, d) {
  var cars = [],
    defs = [],
    month = {},
    open = 0;
  S.data.insp.forEach(function (r) {
    if (ASSEMBLY.indexOf(r.sheet) < 0 || !SHEETS[r.sheet] || r.test) return;
    if (S.rprod && prodOf(r) !== S.rprod) return;
    if (r.sheet === "final1") {
      var j = toJalali(r.createdAt);
      if (j && j.y === y && j.m === m) {
        month[j.d] = month[j.d] || { c: 0, x: 0 };
        month[j.d].c++;
        if (j.d === d) cars.push(r);
      }
    }
    Object.keys(r.items || {}).forEach(function (id) {
      var it = r.items[id];
      if (it.r !== "ng" && it.r !== "sample" && it.r !== "shortage") return;
      if (!it.closedAt) open++;
      var j = toJalali(it.at);
      if (j && j.y === y && j.m === m) {
        month[j.d] = month[j.d] || { c: 0, x: 0 };
        month[j.d].x++;
        if (j.d === d) defs.push({ r: r, id: id, it: it });
      }
    });
  });
  defs.sort(function (a, b) {
    return (a.it.at || "") < (b.it.at || "") ? -1 : 1;
  });
  cars.sort(function (a, b) {
    return (a.createdAt || "") < (b.createdAt || "") ? -1 : 1;
  });
  return { cars: cars, defs: defs, month: month, open: open };
}

function typeName(r) {
  return r === "ng" ? "ایراد" : r === "shortage" ? "کسری" : "قطعه نمونه";
}

function chartSvg(R, y, m) {
  var nd = m <= 6 ? 31 : m <= 11 ? 30 : 29,
    W = 760,
    H = 240,
    L = 36,
    B = 26,
    T = 14,
    bw = (W - L - 8) / nd,
    mx = 1;
  for (var k = 1; k <= nd; k++) {
    var v = R.month[k];
    if (v) mx = Math.max(mx, v.c, v.x);
  }
  var sy = (H - B - T) / mx,
    o =
      '<svg class="bars" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="نمودار ماهانه">';
  for (var g = 0; g <= mx && g <= 8; g += Math.max(1, Math.ceil(mx / 4))) {
    var yy = H - B - g * sy;
    o +=
      '<line x1="' +
      L +
      '" x2="' +
      W +
      '" y1="' +
      yy +
      '" y2="' +
      yy +
      '" stroke="#8884" stroke-width="1"/><text x="' +
      (L - 6) +
      '" y="' +
      (yy + 4) +
      '" font-size="11" text-anchor="end" fill="currentColor">' +
      faDigits(g) +
      "</text>";
  }
  for (var d = 1; d <= nd; d++) {
    var mv = R.month[d] || { c: 0, x: 0 },
      x0 = L + (d - 1) * bw + bw * 0.12,
      w = bw * 0.38;
    if (mv.c)
      o +=
        '<rect x="' +
        x0 +
        '" y="' +
        (H - B - mv.c * sy) +
        '" width="' +
        w +
        '" height="' +
        mv.c * sy +
        '" fill="#2a5db0"/>';
    if (mv.x)
      o +=
        '<rect x="' +
        (x0 + w) +
        '" y="' +
        (H - B - mv.x * sy) +
        '" width="' +
        w +
        '" height="' +
        mv.x * sy +
        '" fill="#c0392b"/>';
    if (d % 2 === 1 || nd <= 16)
      o +=
        '<text x="' +
        (L + (d - 0.5) * bw) +
        '" y="' +
        (H - 8) +
        '" font-size="10" text-anchor="middle" fill="currentColor">' +
        faDigits(d) +
        "</text>";
  }
  return o + "</svg>";
}

function inJalaliMonth(iso, y, m) {
  var j = toJalali(iso);
  return !!(j && j.y === y && j.m === m);
}

// یک ایرادِ ماه جاری را در آمار ثبت می‌کند
function countNgItem(st, r, id, it) {
  st.ngTotal++;
  st.perSt[r.sheet]++;
  var gg = gradeOf(r, id) || "بدون گرید";
  st.gr[gg] = (st.gr[gg] || 0) + 1;
  var lb = it.custom ? it.part || it.free || it.note || "توضیح دستی" : labelOf(r.sheet, id, r),
    k = SHEETS[r.sheet].name + " - " + lb;
  st.par[k] = (st.par[k] || 0) + 1;
}

// آمار ماه: خودروهای تولیدشده، خودروهای دارای ایراد، ایراد به تفکیک ایستگاه/عنوان/گرید
function qualityStats(y, m) {
  var st = { prod: {}, ngKey: {}, perSt: {}, par: {}, ngTotal: 0, gr: {} };
  ASSEMBLY.forEach(function (k) {
    st.perSt[k] = 0;
  });
  S.data.insp.forEach(function (r) {
    if (ASSEMBLY.indexOf(r.sheet) < 0 || !SHEETS[r.sheet] || r.test) return;
    if (S.rprod && prodOf(r) !== S.rprod) return;
    if (r.sheet === "final1" && inJalaliMonth(r.createdAt, y, m)) st.prod[r.key] = 1;
    Object.keys(r.items || {}).forEach(function (id) {
      var it = r.items[id];
      if (it.r !== "ng") return;
      st.ngKey[r.key] = 1;
      if (inJalaliMonth(it.at, y, m)) countNgItem(st, r, id, it);
    });
  });
  return st;
}

function qualityKpiHtml(cars, bad, ngTotal) {
  var dpu = cars ? ngTotal / cars : 0,
    ftq = cars ? Math.round(((cars - bad) * 1000) / cars) / 10 : 0;
  return (
    '<div class="kvs"><div class="kv"><small>DPU (ایراد به ازای هر خودرو)</small><b>' +
    faDigits(Math.round(dpu * 100) / 100) +
    '</b></div><div class="kv"><small>FTQ (بدون ایراد در بار اول)</small><b>' +
    faDigits(ftq) +
    '٪</b></div><div class="kv"><small>خودروی تولیدشده</small><b>' +
    faDigits(cars) +
    '</b></div><div class="kv"><small>کل ایرادها</small><b>' +
    faDigits(ngTotal) +
    "</b></div></div>" +
    '<p class="hint" style="margin:8px 0">فقط «ایراد» شمرده می‌شود (کسری و قطعه نمونه نه). FTQ یعنی خودروهایی که در هیچ ایستگاهی ایراد نگرفته‌اند.</p>'
  );
}

function stationDpuTable(perSt, cars) {
  var h =
    '<div class="tbl"><table><thead><tr><th>ایستگاه</th><th>ایراد</th><th>DPU</th></tr></thead><tbody>';
  ASSEMBLY.forEach(function (k) {
    h +=
      "<tr><td>" +
      esc(SHEETS[k].name) +
      "</td><td>" +
      faDigits(perSt[k]) +
      "</td><td>" +
      faDigits(cars ? Math.round((perSt[k] * 100) / cars) / 100 : 0) +
      "</td></tr>";
  });
  return h + "</tbody></table></div>";
}

function paretoHtml(par, ngTotal) {
  var arr = Object.keys(par)
    .map(function (k) {
      return { k: k, n: par[k] };
    })
    .sort(function (a, b) {
      return b.n - a.n;
    })
    .slice(0, 8);
  if (!arr.length) return "";
  var cum = 0,
    h = '<h3 style="margin:16px 0 8px;font-size:15px">پارتو: پرتکرارترین ایرادها</h3>';
  arr.forEach(function (x) {
    cum += x.n;
    var pc = Math.round((x.n * 100) / ngTotal),
      cp = Math.round((cum * 100) / ngTotal);
    h +=
      '<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span>' +
      esc(x.k) +
      '</span><span class="num">' +
      faDigits(x.n) +
      " (" +
      faDigits(pc) +
      "٪ - تجمعی " +
      faDigits(cp) +
      '٪)</span></div><div style="height:10px;background:#8883;border-radius:5px"><div style="height:10px;width:' +
      (x.n * 100) / arr[0].n +
      '%;background:#c0392b;border-radius:5px"></div></div></div>';
  });
  return h;
}

function gradeTable(gr) {
  if (
    S.rprod === "padra" ||
    !Object.keys(gr).some(function (k) {
      return k !== "بدون گرید";
    })
  )
    return "";
  var h =
    '<h3 style="margin:16px 0 8px;font-size:15px">ایرادها بر اساس گرید (آیتم‌های اکستند)</h3><div class="tbl"><table><thead><tr><th>گرید</th><th>تعداد ایراد</th></tr></thead><tbody>';
  Object.keys(gr)
    .sort()
    .forEach(function (k) {
      h += "<tr><td>" + esc(k) + "</td><td>" + faDigits(gr[k]) + "</td></tr>";
    });
  return (
    h +
    '</tbody></table></div><p class="hint" style="margin-top:6px">گرید فقط برای آیتم‌های فهرست اکستند ثبت شده است.</p>'
  );
}

function qualityCard(y, m) {
  var st = qualityStats(y, m),
    cars = Object.keys(st.prod).length,
    bad = Object.keys(st.prod).filter(function (k) {
      return st.ngKey[k];
    }).length,
    h =
      '<div class="card"><h2>شاخص‌های کیفیت ماه ' +
      JALALI_MONTHS[m - 1] +
      " " +
      faDigits(y).replace(/٬/g, "") +
      "</h2>";
  if (!cars && !st.ngTotal)
    return h + '<p class="hint" style="margin:0">داده‌ای برای این ماه ثبت نشده است.</p></div>';
  return (
    h +
    qualityKpiHtml(cars, bad, st.ngTotal) +
    stationDpuTable(st.perSt, cars) +
    paretoHtml(st.par, st.ngTotal) +
    gradeTable(st.gr) +
    "</div>"
  );
}

function prodChips() {
  return (
    '<div class="card"><b>محصول</b><div class="chips" style="margin-top:8px">' +
    [
      ["", "همه"],
      ["padra", "پادرا"],
      ["ex", "اکستند"],
    ]
      .map(function (x) {
        return (
          '<button type="button" class="pick" data-act="rprod" data-v="' +
          x[0] +
          '" aria-pressed="' +
          ((S.rprod || "") === x[0]) +
          '">' +
          x[1] +
          "</button>"
        );
      })
      .join("") +
    "</div></div>"
  );
}

function selectOptions(values, labelOf, cur) {
  return values
    .map(function (v) {
      return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + labelOf(v) + "</option>";
    })
    .join("");
}

function yearLabel(y) {
  return faDigits(y).replace(/٬/g, "");
}

// کارت انتخاب سال، ماه و روز گزارش
function reportDateCard(today, y, m, d) {
  var ys = [today.y - 1, today.y, today.y + 1].filter(function (v, i, a) {
    return a.indexOf(v) === i;
  });
  if (ys.indexOf(y) < 0) ys.push(y);
  var days = Array.apply(null, Array(31)).map(function (_, i) {
    return i + 1;
  });
  return (
    '<div class="card"><h2>گزارش تولید و ایرادها (مونتاژ تا نهایی پایین)</h2><form class="row" onsubmit="return false"><label class="f grow">سال<select class="in" id="rd_y">' +
    selectOptions(ys, yearLabel, y) +
    '</select></label><label class="f grow">ماه<select class="in" id="rd_m">' +
    selectOptions(
      JALALI_MONTHS.map(function (n, i) {
        return i + 1;
      }),
      function (v) {
        return JALALI_MONTHS[v - 1];
      },
      m,
    ) +
    '</select></label><label class="f grow">روز<select class="in" id="rd_d">' +
    selectOptions(days, faDigits, d) +
    '</select></label></form><p class="hint" style="margin-top:8px">تعداد خودروی تولیدشده بر اساس ثبت اولین برگه «نهایی بالا» هر خودرو (نصب اتاق روی شاسی) شمرده می‌شود.</p></div>'
  );
}

function reportDayCard(R, y, m, d) {
  var cnt = { ng: 0, sample: 0, shortage: 0 };
  R.defs.forEach(function (x) {
    cnt[x.it.r]++;
  });
  return (
    '<div class="card"><h2>روز ' +
    faDigits(d) +
    " " +
    JALALI_MONTHS[m - 1] +
    " " +
    yearLabel(y) +
    '</h2><div class="kvs"><div class="kv"><small>خودروی تولیدشده</small><b>' +
    faDigits(R.cars.length) +
    '</b></div><div class="kv"><small>ایراد ثبت‌شده</small><b>' +
    faDigits(cnt.ng) +
    '</b></div><div class="kv"><small>قطعه نمونه</small><b>' +
    faDigits(cnt.sample) +
    '</b></div><div class="kv"><small>کسری ثبت‌شده</small><b>' +
    faDigits(cnt.shortage) +
    '</b></div><div class="kv"><small>مورد باز (کل)</small><b>' +
    faDigits(R.open) +
    '</b></div></div><div class="row" style="margin-top:12px"><button class="btn sm" data-act="repcsv">ذخیره گزارش روز (Excel / CSV)</button></div></div>'
  );
}

function reportByStationCard(R) {
  var by = {};
  ASSEMBLY.forEach(function (k) {
    by[k] = { ng: 0, sample: 0, shortage: 0 };
  });
  R.defs.forEach(function (x) {
    by[x.r.sheet][x.it.r]++;
  });
  var h =
    '<div class="card"><h2>ایرادها به تفکیک ایستگاه</h2><div class="tbl"><table><thead><tr><th>ایستگاه</th><th>ایراد</th><th>نمونه</th><th>کسری</th></tr></thead><tbody>';
  ASSEMBLY.forEach(function (k) {
    var b = by[k];
    h +=
      "<tr><td>" +
      esc(SHEETS[k].name) +
      "</td><td>" +
      faDigits(b.ng) +
      "</td><td>" +
      faDigits(b.sample) +
      "</td><td>" +
      faDigits(b.shortage) +
      "</td></tr>";
  });
  return h + "</tbody></table></div></div>";
}

function reportDefectRow(x) {
  var ser = identOf(x.r).serial || x.r.key;
  return (
    "<tr><td>" +
    esc(timeOnly(x.it.at)) +
    '</td><td class="num">' +
    esc(ser) +
    "</td><td>" +
    esc(SHEETS[x.r.sheet].name) +
    "</td><td>" +
    typeName(x.it.r) +
    (x.it.closedAt ? " (بسته)" : "") +
    "</td><td>" +
    esc(x.it.custom ? "" : labelOf(x.r.sheet, x.id, x.r)) +
    (x.it.note ? " " + esc(x.it.note) : "") +
    "</td><td>" +
    esc(x.it.by || "") +
    "</td></tr>"
  );
}

function reportDefectsCard(R) {
  var h = '<div class="card"><h2>فهرست ایرادها (' + faDigits(R.defs.length) + ")</h2>";
  if (!R.defs.length) return h + '<p class="hint" style="margin:0">موردی ثبت نشده است.</p></div>';
  return (
    h +
    '<div class="tbl"><table><thead><tr><th>ساعت</th><th>سریال / شماره</th><th>ایستگاه</th><th>نوع</th><th>مورد و شرح</th><th>ثبت‌کننده</th></tr></thead><tbody>' +
    R.defs.map(reportDefectRow).join("") +
    "</tbody></table></div></div>"
  );
}

function reportCarRow(r) {
  var I = identity(r.key);
  return (
    "<tr><td>" +
    esc(timeOnly(r.createdAt)) +
    '</td><td class="num">' +
    esc(I.serial || r.key) +
    '</td><td class="num">' +
    esc(I.chassis || "—") +
    '</td><td class="num">' +
    esc(I.room || "—") +
    "</td></tr>"
  );
}

function reportCarsCard(R) {
  var h = '<div class="card"><h2>خودروهای تولیدشده این روز (' + faDigits(R.cars.length) + ")</h2>";
  if (!R.cars.length) return h + '<p class="hint" style="margin:0">خودرویی ثبت نشده است.</p></div>';
  return (
    h +
    '<div class="tbl"><table><thead><tr><th>ساعت</th><th>سریال</th><th>شاسی</th><th>اتاق</th></tr></thead><tbody>' +
    R.cars.map(reportCarRow).join("") +
    "</tbody></table></div></div>"
  );
}

function reportMonthCard(R, y, m) {
  var tc = 0,
    tx = 0;
  Object.keys(R.month).forEach(function (k) {
    tc += R.month[k].c;
    tx += R.month[k].x;
  });
  return (
    '<div class="card"><h2>نمودار ماه ' +
    JALALI_MONTHS[m - 1] +
    " " +
    yearLabel(y) +
    '</h2><p class="hint" style="margin-bottom:8px"><span style="color:#2a5db0">■</span> خودروی تولیدشده (' +
    faDigits(tc) +
    ') &nbsp; <span style="color:#c0392b">■</span> ایراد، نمونه و کسری (' +
    faDigits(tx) +
    ")</p>" +
    chartSvg(R, y, m) +
    '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="repmcsv">ذخیره جدول ماه (Excel / CSV)</button></div></div>'
  );
}

function reportView() {
  var today = toJalali(nowIso());
  if (!S.rd) S.rd = { y: today.y, m: today.m, d: today.d };
  var y = S.rd.y,
    m = S.rd.m,
    d = S.rd.d,
    R = repData(y, m, d);
  return (
    repWinNote() +
    prodChips() +
    reportDateCard(today, y, m, d) +
    repeatCard(y, m, d) +
    reportDayCard(R, y, m, d) +
    qualityCard(y, m) +
    reportByStationCard(R) +
    reportDefectsCard(R) +
    reportCarsCard(R) +
    reportMonthCard(R, y, m)
  );
}

function csvSave(name, rows) {
  var t =
    "\ufeff" +
    rows
      .map(function (r) {
        return r
          .map(function (v) {
            v = String(v == null ? "" : v);
            return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
          })
          .join(",");
      })
      .join("\r\n");
  return saveFile(name, new Blob([t], { type: "text/csv;charset=utf-8" }));
}

function winNoteBody() {
  if (!S.supa) return "";
  return (
    '<p class="hint" style="margin:0">این گزارش بر اساس داده‌ی بارگذاری‌شده است: ' +
    faDigits(winDays()) +
    ' روز اخیر و همه‌ی بازدیدهای تأیید نهایی‌نشده. برای گزارش دوره‌ی طولانی‌تر ابتدا بارگذاری کنید.</p><button class="btn sm" data-act="loadrep" style="margin-top:8px">بارگذاری ۶۰ روز اخیر</button>'
  );
}

function repWinNote() {
  return S.supa ? '<div class="card">' + winNoteBody() + "</div>" : "";
}

/* بسته‌بندی صفحه‌های canvas (JPEG) در یک PDF ساده */
function packPdf(pages, PW, PH) {
  var enc = new TextEncoder(),
    chunks = [],
    len = 0,
    offs = [],
    n = pages.length,
    N = 2 + 3 * n;
  function add(u) {
    chunks.push(u);
    len += u.length;
  }
  function addS(s) {
    add(enc.encode(s));
  }
  addS("%PDF-1.4\n");
  offs[1] = len;
  addS("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  var kids = [];
  for (var i = 0; i < n; i++) kids.push(3 + 3 * i + " 0 R");
  offs[2] = len;
  addS("2 0 obj\n<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + n + " >>\nendobj\n");
  pages.forEach(function (p, i) {
    var bin = atob(p.toDataURL("image/jpeg", 0.9).split(",")[1]),
      u = new Uint8Array(bin.length);
    for (var k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
    var po = 3 + 3 * i,
      co = 4 + 3 * i,
      io = 5 + 3 * i,
      cs = "q 595 0 0 842 0 0 cm /Im0 Do Q";
    offs[po] = len;
    addS(
      po +
        " 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 " +
        io +
        " 0 R >> >> /Contents " +
        co +
        " 0 R >>\nendobj\n",
    );
    offs[co] = len;
    addS(co + " 0 obj\n<< /Length " + cs.length + " >>\nstream\n" + cs + "\nendstream\nendobj\n");
    offs[io] = len;
    addS(
      io +
        " 0 obj\n<< /Type /XObject /Subtype /Image /Width " +
        PW +
        " /Height " +
        PH +
        " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
        u.length +
        " >>\nstream\n",
    );
    add(u);
    addS("\nendstream\nendobj\n");
  });
  var xo = len,
    x = "xref\n0 " + (N + 1) + "\n0000000000 65535 f \n";
  for (var j = 1; j <= N; j++) x += ("0000000000" + offs[j]).slice(-10) + " 00000 n \n";
  addS(x + "trailer\n<< /Size " + (N + 1) + " /Root 1 0 R >>\nstartxref\n" + xo + "\n%%EOF");
  return new Blob(chunks, { type: "application/pdf" });
}

function exportReportCsv(a) {
  var R2 = repData(S.rd.y, S.rd.m, S.rd.d),
    nm = "report-" + S.rd.y + "-" + S.rd.m + (a === "repcsv" ? "-" + S.rd.d : "") + ".csv",
    rows2;
  if (a === "repcsv") {
    rows2 = [
      ["گزارش روز", S.rd.d + " " + JALALI_MONTHS[S.rd.m - 1] + " " + S.rd.y],
      ["خودروی تولیدشده", R2.cars.length],
      [],
      ["ساعت", "سریال", "شاسی", "اتاق"],
    ];
    R2.cars.forEach(function (r) {
      var I = identity(r.key);
      rows2.push([timeOnly(r.createdAt), I.serial || r.key, I.chassis || "", I.room || ""]);
    });
    rows2.push([], ["ساعت", "سریال", "ایستگاه", "نوع", "مورد", "شرح", "ثبت‌کننده", "وضعیت"]);
    R2.defs.forEach(function (x) {
      rows2.push([
        timeOnly(x.it.at),
        identOf(x.r).serial || x.r.key,
        SHEETS[x.r.sheet].name,
        typeName(x.it.r),
        x.it.custom ? "" : labelOf(x.r.sheet, x.id, x.r),
        x.it.note || "",
        x.it.by || "",
        x.it.closedAt ? "بسته" : "باز",
      ]);
    });
  } else {
    rows2 = [["روز", "خودروی تولیدشده", "ایراد، نمونه و کسری"]];
    for (var dd = 1; dd <= 31; dd++) {
      var v2 = R2.month[dd];
      if (v2) rows2.push([dd, v2.c, v2.x]);
    }
  }
  csvSave(nm, rows2);
  return;
}
