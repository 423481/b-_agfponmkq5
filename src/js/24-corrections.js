/* ════════════════════════════════════════════════════════════
   فصل 24 — اصلاح اشتباه شماره و سوخت
   دکمه‌ی «اصلاح اشتباه» چکمن، درخواست اصلاح، تبدیل و اعمال اصلاحیه.
   توابع اصلی: corrBtn، corrPage، isQual، corrAll، corrPendingCount، corrStatusTxt، corrLine، corrCard و …
   ════════════════════════════════════════════════════════════ */

/* v92 (شاسی): اصلاح اشتباه از صفحه‌ی شناسایی برداشته شد؛ یک دکمه‌ی کوچک صفحه‌ی تک‌کاره‌ی اصلاح را باز می‌کند */
var CORR_REASONS = [
  "اشتباه تایپی",
  "اسکن اشتباه",
  "از روی برچسب اشتباه خوانده شد",
  "اشتباه در ثبت اولیه",
];

function corrBtn(d) {
  return (
    corrCard(d) +
    (canEdit(d.sheet, d.key)
      ? '<button type="button" class="btn corrbtn" data-act="corropen">✎ اصلاح اشتباه (شماره یا سوخت)</button>'
      : "")
  );
}

// صفحه‌ی «اصلاح اشتباه» چکمن برای شماره و سوخت.
function corrPage(d) {
  var c = carRecords(d.key),
    I = c.I,
    k = S.corrOpen,
    chRec = c.recs.filter(function (x) {
      return x.sheet === "chassis" && x.fuel;
    })[0];
  var h =
    '<div class="sxpage corrpage"><div class="sxh"><b>اصلاح اشتباه</b><span class="num">' +
    esc(d.key) +
    "</span></div>";
  if (k === "pick") {
    h += '<p class="corrq">چه چیزی اشتباه ثبت شده است؟</p><div class="corrpick">';
    CORR_FIELDS.forEach(function (f) {
      if (I[f] && CORR_PICK[d.sheet].indexOf(f) >= 0)
        h +=
          '<button type="button" class="corrbig" data-act="corrsel" data-f="' +
          f +
          '"><span>' +
          esc(NUM_LABEL[f]) +
          '</span><b class="num">' +
          esc(I[f]) +
          "</b></button>";
    });
    if (chRec && d.sheet !== "trim")
      h +=
        '<button type="button" class="corrbig" data-act="corrsel" data-f="fuel"><span>نوع سوخت</span><b>' +
        esc(fuelTxt(chRec.fuel)) +
        "</b></button>";
    h +=
      '</div><div class="corrbtns"><button type="button" class="btn" data-act="corrback">▶ بازگشت</button></div>';
  } else if (k === "fuel" && chRec) {
    h +=
      '<form data-form="corrfuel" class="corrform"><div class="corrcur"><small>نوع سوخت ثبت‌شده</small><b>' +
      esc(fuelTxt(chRec.fuel)) +
      "</b></div>" +
      fuelPicker("cf_fuel", "", "نوع سوخت درست") +
      corrReasons("cf_reason") +
      (S.corrErr ? '<p class="err">' + esc(S.corrErr) + "</p>" : "") +
      '<div class="corrbtns"><button class="btn ok" type="submit">✓ ثبت اصلاح</button><button type="button" class="btn" data-act="corrback">▶ بازگشت</button></div><p class="hint">اصلاح فوری اعمال می‌شود و مقدار قبلی، دلیل، نام و زمان در سوابق می‌ماند.</p></form>';
  } else if (k && I[k]) {
    h +=
      '<form data-form="corrreq" class="corrform"><input type="hidden" id="cr_f" value="' +
      esc(k) +
      '"><div class="corrcur"><small>' +
      esc(NUM_LABEL[k]) +
      ' ثبت‌شده</small><b class="num">' +
      esc(I[k]) +
      '</b></div><label class="f">' +
      esc(NUM_LABEL[k]) +
      ' درست<div class="row" style="gap:8px;flex-wrap:nowrap"><input class="in num ltr" id="cr_new" inputmode="numeric" autocomplete="off" style="flex:1 1 auto;min-width:0"><button type="button" class="btn" data-act="livescan" data-scan="cr_new" style="flex:0 0 auto;min-height:48px">اسکن</button></div></label>' +
      corrReasons("cr_reason") +
      (S.corrErr ? '<p class="err">' + esc(S.corrErr) + "</p>" : "") +
      '<div class="corrbtns"><button class="btn ok" type="submit">' +
      "✓ ثبت اصلاح" +
      '</button><button type="button" class="btn" data-act="corrback">▶ بازگشت</button></div><p class="hint">اصلاح فوری اعمال می‌شود و شماره‌ی قبلی، دلیل، نام و زمان در سوابق می‌ماند.</p></form>';
  } else {
    S.corrOpen = "pick";
    return corrPage(d);
  }
  return h + "</div>";
}

/* ---------- اصلاح شماره‌ی اشتباه (درخواست چکمن، تأیید کیفیت یا مالک) ---------- */
var CORR_REC = {
  serial: "serial",
  chassis: "chassisNo",
  engine: "engine",
  room: "room",
};

var CORR_FIELDS = ["chassis", "engine", "serial", "room"];

var CORR_PICK = {
  chassis: ["chassis", "engine"],
  engine: ["engine"],
  trim: ["room"],
  final1: ["serial", "chassis", "engine", "room"],
  final2: ["serial", "chassis", "engine", "room"],
  gas: ["chassis", "engine"],
  mech: ["serial", "chassis", "engine", "room"],
  mech2: ["serial", "chassis", "engine", "room"],
  roll: ["serial", "chassis", "engine", "room"],
  road: ["serial", "chassis", "engine", "room"],
  comm: ["serial", "chassis", "engine", "room"],
};

function isQual() {
  return !!S.user && (S.user.station === "quality" || S.user.id === "owner");
}

function corrAll() {
  return S.corr || [];
}

function corrPendingCount() {
  return corrAll().filter(function (r) {
    return r.status === "pending";
  }).length;
}

function corrStatusTxt(r) {
  return r.status === "applied"
    ? "اعمال شد"
    : r.status === "rejected"
      ? "رد شد"
      : "در انتظار بررسی";
}

function corrLine(r) {
  return (
    '<div class="it"><div class="row"><span class="grow"><b>' +
    esc(NUM_LABEL[r.field]) +
    ':</b> <span class="num">' +
    esc(r.field === "fuel" ? fuelTxt(r.oldVal) : r.oldVal) +
    '</span> ← <b class="num">' +
    esc(r.field === "fuel" ? fuelTxt(r.newVal) : r.newVal) +
    '</b> <span class="chip ' +
    (r.status === "pending" ? "open" : "closed") +
    '">' +
    corrStatusTxt(r) +
    "</span></span></div>" +
    '<div class="m">دلیل: ' +
    esc(r.reason) +
    '</div><div class="m">' +
    whoWhen(r.by, r.at, "درخواست‌کننده") +
    "</div>" +
    (r.decidedAt
      ? '<div class="m">' +
        whoWhen(r.decidedBy, r.decidedAt, r.status === "applied" ? "اعمال‌کننده" : "ردکننده") +
        "</div>" +
        (r.decNote ? '<div class="m">توضیح: ' + esc(r.decNote) + "</div>" : "")
      : "") +
    "</div>"
  );
}

/* سابقه‌ی اصلاح شماره‌های این خودرو (خود اصلاح فقط از دکمه‌ی «اصلاح اشتباه» چکمن ایستگاه انجام می‌شود) */
function corrCard(d) {
  var c = carRecords(d.key),
    I = c.I,
    vals = [d.key, I.serial, I.chassis, I.engine, I.room].filter(Boolean);
  var mine = corrAll().filter(function (r) {
    return r.field === "fuel"
      ? vals.indexOf(r.chassisKey) >= 0
      : vals.indexOf(r.oldVal) >= 0 || vals.indexOf(r.newVal) >= 0;
  });
  var done = [];
  c.recs.forEach(function (x) {
    Object.keys(x.corrections || {}).forEach(function (k) {
      if (
        !mine.some(function (r) {
          return r.id === k;
        }) &&
        !done.some(function (y) {
          return y.id === k;
        })
      )
        done.push(
          Object.assign(
            {
              id: k,
              status: "applied",
              decidedBy: x.corrections[k].by,
              decidedAt: x.corrections[k].at,
              by: x.corrections[k].reqBy || x.corrections[k].by,
              at: x.corrections[k].reqAt || x.corrections[k].at,
            },
            x.corrections[k],
          ),
        );
    });
  });
  if (!mine.length && !done.length) return "";
  return (
    '<div class="card"><h2>اصلاح شماره‌ی اشتباه</h2><div class="chip open" style="margin-bottom:8px">شماره در این پرونده اصلاح شده یا درخواست اصلاح دارد</div><div class="items">' +
    mine.concat(done).map(corrLine).join("") +
    "</div></div>"
  );
}

/* آیا این شماره در پرونده‌ی خودروی دیگری هست؟ (بعد از ensureCar، داده‌ی سرور هم در حافظه است) */
function numTaken(field, v) {
  return S.data.insp.some(function (x) {
    return SHEETS[x.sheet] && identOf(x)[field] === v;
  });
}

function corrView() {
  var all = corrAll(),
    pend = all.filter(function (r) {
      return r.status === "pending";
    }),
    dn = all
      .filter(function (r) {
        return r.status !== "pending";
      })
      .slice(0, 40);
  var h =
    pend.length || dn.length
      ? '<div class="card"><h2>درخواست‌های اصلاح شماره (' +
        faDigits(pend.length) +
        ' در انتظار)</h2><p class="hint">با «اعمال»، شماره در همه‌ی برگه‌های همان خودرو عوض می‌شود و شماره‌ی قبلی، دلیل و نام شما در تاریخچه می‌ماند. تأییدهای قبلی چکمن‌ها دست‌نخورده می‌ماند.</p></div>'
      : "";
  if (!pend.length && dn.length)
    h += '<div class="card"><p class="hint" style="margin:0">درخواستی در انتظار نیست.</p></div>';
  pend.forEach(function (r) {
    h +=
      '<div class="card">' +
      corrLine(r) +
      '<div class="kvs" style="margin-top:8px"><div class="kv"><small>شماره‌ی قبلی</small><b class="num">' +
      esc(r.oldVal) +
      '</b></div><div class="kv"><small>شماره‌ی جدید</small><b class="num">' +
      esc(r.newVal) +
      "</b></div></div>" +
      '<label class="f" style="margin-top:10px">توضیح (برای رد کردن الزامی است)<input class="in" id="cn_' +
      esc(r.id) +
      '" autocomplete="off"></label><div class="row" style="margin-top:8px"><button class="btn primary" data-act="corrapply" data-id="' +
      esc(r.id) +
      '">اعمال اصلاح</button><button class="btn" data-act="corrreject" data-id="' +
      esc(r.id) +
      '">رد درخواست</button><button class="btn sm" data-act="opencar" data-q="' +
      esc(r.field === "fuel" ? r.chassisKey : r.oldVal) +
      '">پرونده</button></div></div>';
  });
  if (dn.length) {
    h +=
      '<div class="card"><h2>تاریخچه</h2><div class="items">' +
      dn.map(corrLine).join("") +
      "</div></div>";
  }
  return h;
}

/* ساخت رکورد با شماره‌ی تازه؛ اگر از تلاش قبلیِ نیمه‌کاره‌ی همین خودرو مانده باشد خطا نمی‌دهد، اگر از خودروی دیگری باشد می‌ایستد */
function createMoved(id, copy) {
  return store.create("inspections", id, copy).catch(function (e) {
    if (!e || e.message !== DUP_MSG || !store.get) throw e;
    return store.get("inspections", id).then(function (cur) {
      if (!cur || cur.createdAt !== copy.createdAt) throw e;
    });
  });
}

function corrEntry(r, ts) {
  return {
    field: r.field,
    oldVal: r.oldVal,
    newVal: r.newVal,
    by: S.user.name,
    byId: S.user.id,
    at: ts,
    reason: r.reason,
    reqBy: r.by,
    reqAt: r.at,
  };
}

function markCorrApplied(r, ts) {
  return store.update("users", r.id, {
    status: "applied",
    decidedBy: S.user.name,
    decidedById: S.user.id,
    decidedAt: ts,
  });
}

function corrApplyFuel(r) {
  var chassis = carRecords(r.chassisKey).recs.filter(function (x) {
    return x.sheet === "chassis";
  })[0];
  if (!chassis) return Promise.reject(new Error("برگه شاسی پیدا نشد."));
  var ts = nowIso(),
    corr = {};
  corr[r.id] = corrEntry(r, ts);
  return store
    .update("inspections", chassis.id, { fuel: r.newVal, corrections: corr })
    .then(function () {
      return markCorrApplied(r, ts);
    });
}

// شناسه‌هایی که شماره‌ی جدیدشان نباید «خودروی دیگر» حساب شود
function sameCarIds(car, recs, f, nv) {
  var same = {};
  car.forEach(function (x) {
    same[x.id] = 1;
  });
  recs.forEach(function (x) {
    if (SHEETS[x.sheet].keyKind === f) same[docId(x.sheet, nv)] = 1;
  });
  return same;
}

function numberTakenByOther(f, nv, same) {
  return S.data.insp.some(function (x) {
    return SHEETS[x.sheet] && !same[x.id] && identOf(x)[f] === nv;
  });
}

// اصلاح یک برگه: اگر کلید همین شماره است رکورد جابه‌جا می‌شود، وگرنه فقط فیلد عوض می‌شود
function corrRecordOp(x, r, entry) {
  var corr = {};
  corr[r.id] = entry;
  if (SHEETS[x.sheet].keyKind === r.field) {
    var cp = Object.assign({}, x);
    delete cp.id;
    cp.key = r.newVal;
    cp.corrections = Object.assign({}, x.corrections || {}, corr);
    return createMoved(docId(x.sheet, r.newVal), cp).then(function () {
      return store.del("inspections", x.id);
    });
  }
  var u = { corrections: corr };
  u[CORR_REC[r.field]] = r.newVal;
  return store.update("inspections", x.id, u);
}

function corrArchiveOps(f, ov, nv) {
  var ops = [];
  S.data.arch
    .filter(function (a) {
      return a.id === ov || a[f] === ov;
    })
    .forEach(function (a) {
      if (a.id === ov) {
        var ac = Object.assign({}, a);
        delete ac.id;
        ac.key = nv;
        ac[f] = nv;
        ops.push(
          store.set("archives", nv, ac).then(function () {
            return store.del("archives", a.id);
          }),
        );
      } else {
        var au = {};
        au[f] = nv;
        ops.push(store.update("archives", a.id, au));
      }
    });
  return ops;
}

// اصلاحیه را اعمال می‌کند و تاریخچه‌ی تغییر را نگه می‌دارد.
function corrApply(r) {
  if (r.field === "fuel") return corrApplyFuel(r);
  var f = r.field,
    ov = r.oldVal,
    nv = r.newVal,
    e = numErr(f, nv);
  if (e) return Promise.reject(new Error(e));
  var car = carRecords(ov).recs,
    recs = car.filter(function (x) {
      return identOf(x)[f] === ov;
    });
  if (numberTakenByOther(f, nv, sameCarIds(car, recs, f, nv)))
    return Promise.reject(new Error("شماره‌ی جدید قبلاً برای خودروی دیگری ثبت شده است."));
  if (!recs.length)
    return Promise.reject(new Error("پرونده‌ای با شماره‌ی قبلی پیدا نشد (شاید قبلاً اصلاح شده)."));
  var ts = nowIso(),
    entry = corrEntry(r, ts),
    ops = recs
      .map(function (x) {
        return corrRecordOp(x, r, entry);
      })
      .concat(corrArchiveOps(f, ov, nv));
  return Promise.all(ops).then(function () {
    return markCorrApplied(r, ts);
  });
}

function identOf(d) {
  var kk = SHEETS[d.sheet] && SHEETS[d.sheet].keyKind;
  return {
    serial: kk === "serial" ? d.key : d.serial,
    color: d.color,
    chassis: kk === "chassis" ? d.key : d.chassisNo,
    engine: kk === "engine" ? d.key : d.engine,
    room: kk === "room" ? d.key : d.room,
  };
}

function identIndex() {
  if (IDENT_IX.rows === S.data.insp) return IDENT_IX;
  var par = Object.create(null),
    groups = Object.create(null);
  function find(x) {
    while (par[x] !== x) {
      par[x] = par[par[x]];
      x = par[x];
    }
    return x;
  }
  function union(a, b) {
    a = find(a);
    b = find(b);
    if (a !== b) par[b] = a;
  }
  var list = [];
  S.data.insp.forEach(function (d) {
    if (!SHEETS[d.sheet]) return;
    var o = identOf(d),
      ids = IDENT_F.map(function (f) {
        return o[f] && String(o[f]);
      }).filter(Boolean);
    if (!ids.length) return;
    ids.forEach(function (v) {
      if (!(v in par)) par[v] = v;
      union(ids[0], v);
    });
    list.push({ d: d, o: o, id0: ids[0] });
  });
  list.forEach(function (x) {
    var r = find(x.id0),
      g = groups[r] || (groups[r] = { I: {}, recs: [] });
    g.recs.push(x.d);
    ["serial", "color", "chassis", "engine", "room"].forEach(function (f) {
      if (x.o[f] && !g.I[f]) g.I[f] = x.o[f];
    });
  });
  IDENT_IX = { rows: S.data.insp, par: par, groups: groups, find: find };
  return IDENT_IX;
}

function identGroup(v) {
  var x = identIndex(),
    k = String(v);
  return k in x.par ? x.groups[x.find(k)] : null;
}

function identity(v) {
  var g = identGroup(v);
  return g ? g.I : {};
}

function resolveKey(sheet, k) {
  if (insp(sheet, k)) return k;
  var I = identity(k),
    t = I[SHEETS[sheet].keyKind];
  return t || k;
}

function lenOf(k) {
  var L = (S.cfg && S.cfg.len && S.cfg.len[k]) || LEN_DEF[k],
    X = S.cfg && S.cfg.lenX && S.cfg.lenX[k];
  if (CURP === "ex") return X || L;
  if (CURP === "padra" || !X) return L;
  return [Math.min(L[0], X[0]), Math.max(L[1], X[1])];
}

// شماره‌ی واردشده را از نظر طول و رقم بررسی می‌کند.
function numErr(kind, v) {
  if (!v) return "";
  if (!/^\d+$/.test(v)) return NUM_LABEL[kind] + " فقط باید رقم باشد.";
  var r = lenOf(kind);
  if (v.length < r[0] || v.length > r[1])
    return (
      NUM_LABEL[kind] +
      " باید " +
      (r[0] === r[1] ? faDigits(r[0]) : faDigits(r[0]) + " تا " + faDigits(r[1])) +
      " رقم باشد."
    );
  return "";
}

function typedErr(sheet, vals) {
  var e = "";
  Object.keys(FIELD_KIND).forEach(function (f) {
    if (!e && vals[f] !== undefined) e = numErr(FIELD_KIND[f], vals[f]);
  });
  if (
    !e &&
    PSHEETS.indexOf(sheet) >= 0 &&
    vals.product !== undefined &&
    vals.product !== "padra" &&
    vals.product !== "ex"
  )
    e = "محصول (پادرا یا اکستند) را انتخاب کنید.";
  if (!e && sheet === "chassis" && !vals.engine) e = "شماره موتور الزامی است.";
  if (!e && sheet === "chassis" && vals.fuel !== "dual" && vals.fuel !== "single")
    e = "نوع سوخت (دوگانه‌سوز یا تک‌سوز) را انتخاب کنید.";
  return e;
}

// شماره‌ی تکراری را پیدا می‌کند (هیچ شماره‌ای نباید تکراری ثبت شود).
function conflictFor(sheet, key, vals) {
  if (isTestMode()) return "";
  var o = identOf({
    sheet: sheet,
    key: key,
    serial: vals.serial,
    chassisNo: vals.chassisNo,
    engine: vals.engine,
    room: vals.room,
    color: "",
  });
  var id = docId(sheet, key),
    F = ["serial", "chassis", "engine", "room"],
    msg = "";
  S.data.insp.forEach(function (x) {
    if (msg || !SHEETS[x.sheet] || x.id === id) return;
    var ox = identOf(x);
    F.forEach(function (f) {
      if (msg || !o[f] || ox[f] !== o[f]) return;
      F.forEach(function (g) {
        if (msg || g === f || !o[g] || !ox[g] || o[g] === ox[g]) return;
        msg =
          NUM_LABEL[f] +
          " " +
          o[f] +
          " قبلاً برای خودروی دیگری ثبت شده است (" +
          NUM_LABEL[g] +
          " " +
          ox[g] +
          ").";
      });
    });
  });
  return msg;
}

// در ثبت اولیه‌ی ایستگاه گاز، این دو مورد از برگه‌ی شاسی/تزیینات خوانده می‌شود
var GAS_CREATE_HIDDEN = ["color", "engine"];

function idFields(sheet, pre, d) {
  d = d || {};
  var out = "";
  var kind = SHEETS[sheet].keyKind,
    L = sheet === "chassis" ? [] : [["color", "رنگ", d.color, 0]];
  if (sheet !== "chassis" && kind !== "serial") L.unshift(["serial", "شماره سریال", d.serial, 0]);
  if (sheet === "chassis") L.push(["fuel", "نوع سوخت", d.fuel, 0]);
  if (sheet === "chassis") L.push(["engine", "شماره موتور", d.engine, 1]);
  else {
    if (kind !== "chassis") L.push(["chassisNo", "شماره شاسی", d.chassisNo, 1]);
    if (SHEETS[sheet].keyKind !== "room") L.push(["room", "شماره اتاق", d.room, 1]);
    if (SHEETS[sheet].keyKind !== "engine") L.push(["engine", "شماره موتور", d.engine, 1]);
  }
  var hid = (HIDE[sheet] || []).concat(pre === "c_" && sheet === "gas" ? GAS_CREATE_HIDDEN : []);
  L = L.filter(function (f) {
    return hid.indexOf(f[0]) < 0;
  });
  var prodPre = pre === "c_" && PSHEETS.indexOf(sheet) >= 0 && !d.product ? lastProduct() : "";
  if (pre === "c_" && PSHEETS.indexOf(sheet) >= 0)
    out += prodPicker(pre + "product", d.product || prodPre, "محصول (الزامی)");
  L.forEach(function (f) {
    if (f[0] === "fuel") {
      var pf = pre === "c_" && !f[2] ? lastFuel() : "",
        curFuel = f[2] || pf;
      out += fuelPicker(pre + "fuel", curFuel, "نوع سوخت (الزامی)");
      if (pre === "c_")
        out +=
          (pf || prodPre
            ? '<p class="hint" style="flex:1 1 100%;font-size:15px;margin:0">' +
              (pf && prodPre ? "محصول و نوع سوخت" : pf ? "نوع سوخت" : "محصول") +
              " از آخرین انتخاب شما پر شده است؛ اگر عوض شده، عوضش کنید.</p>"
            : "") +
          '<p class="hint" id="fuelcons" style="flex:1 1 100%;font-size:15px;margin:0">' +
          fuelCons(curFuel) +
          "</p>";
      return;
    }
    if (sheet === "chassis" && f[0] === "engine") {
      out +=
        '<div class="f grow"><label for="' +
        pre +
        'engine">' +
        f[1] +
        ' (الزامی)</label><div class="row"><input class="in num ltr grow" id="' +
        pre +
        'engine" inputmode="numeric" autocomplete="off" value="' +
        esc(f[2] || "") +
        '"><button type="button" class="btn" data-act="livescan" data-scan="' +
        pre +
        'engine">اسکن بارکد</button></div></div>';
      return;
    }
    out +=
      '<label class="f grow">' +
      f[1] +
      ((f[0] === "chassisNo" || f[0] === "room") && kind === "serial" && !d[f[0]]
        ? " (لازم، از روی برچسب)"
        : " (اختیاری)") +
      '<input class="in' +
      (f[3] ? " num ltr" : "") +
      '" id="' +
      pre +
      f[0] +
      '" autocomplete="off" value="' +
      esc(f[2] || "") +
      '"></label>';
  });
  return out;
}

function idVals(sheet, pre) {
  var o = idVals0(sheet, pre);
  (HIDE[sheet] || []).forEach(function (k) {
    delete o[k];
  });
  return o;
}

function idVals0(sheet, pre) {
  var px =
    pre === "c_" && PSHEETS.indexOf(sheet) >= 0 ? { product: fieldValue(pre + "product") } : {};
  if (sheet === "chassis")
    return Object.assign(
      { engine: digits(fieldValue(pre + "engine")), fuel: fieldValue(pre + "fuel") },
      px,
    );
  var o = Object.assign({ color: fieldValue(pre + "color") }, px);
  if (SHEETS[sheet].keyKind !== "serial") o.serial = fieldValue(pre + "serial");
  if (SHEETS[sheet].keyKind !== "chassis") o.chassisNo = digits(fieldValue(pre + "chassisNo"));
  if (SHEETS[sheet].keyKind !== "room") o.room = digits(fieldValue(pre + "room"));
  if (SHEETS[sheet].keyKind !== "engine") o.engine = digits(fieldValue(pre + "engine"));
  return o;
}

function clickCorrection(ev, el, a, id, d) {
  if (a === "corrapply" && isQual()) {
    var rq = corrAll().filter(function (x) {
      return x.id === id && x.status === "pending";
    })[0];
    if (!rq) return true;
    save(function () {
      return corrApply(rq);
    }, "اصلاح شماره اعمال شد").then(function (ok) {
      if (ok && S.key === rq.oldVal && SHEETS[S.sheet].keyKind === rq.field) {
        S.key = rq.newVal;
        render();
      }
    });

    return true;
  }
  if (a === "corrreject" && isQual()) {
    var rq2 = corrAll().filter(function (x) {
      return x.id === id && x.status === "pending";
    })[0];
    if (!rq2) return true;
    var nt = fieldValue("cn_" + id);
    if (!nt) {
      toast("برای رد کردن، توضیح بنویسید.");
      return true;
    }
    save(function () {
      return store.update("users", id, {
        status: "rejected",
        decidedBy: S.user.name,
        decidedById: S.user.id,
        decidedAt: nowIso(),
        decNote: nt,
      });
    }, "درخواست رد شد");

    return true;
  }
  return false;
}

function submitCorrRequest() {
  var dq = insp(S.sheet, S.key),
    Iq = identity(S.key),
    fq = fieldValue("cr_f"),
    nq = digits(fieldValue("cr_new")),
    rq3 = fieldValue("cr_reason"),
    oq = Iq[fq],
    eq = "";
  if (!dq || !fq || !oq) eq = "شماره‌ای که اشتباه است را انتخاب کنید.";
  else if (!nq) eq = "شماره‌ی درست را وارد کنید.";
  else if (numErr(fq, nq)) eq = numErr(fq, nq);
  else if (nq === oq) eq = "شماره‌ی جدید با شماره‌ی قبلی یکی است.";
  else if (rq3.length < 3) eq = "دلیل اصلاح را بنویسید.";
  S.corrErr = eq;
  if (eq) {
    render();
    return;
  }
  ensureCar([nq]).then(function () {
    if (numTaken(fq, nq)) {
      S.corrErr =
        "این شماره قبلاً برای خودروی دیگری ثبت شده است؛ اگر آن هم اشتباه است با کیفیت هماهنگ کنید.";
      render();
      return;
    }
    var at = nowIso(),
      rid = "corr_" + uid(),
      rr = {
        kind: "corr",
        field: fq,
        oldVal: oq,
        newVal: nq,
        reason: rq3,
        sheet: S.sheet,
        key: S.key,
        by: S.user.name,
        byId: S.user.id,
        station: S.user.station,
        at: at,
        status: "applied",
        decidedBy: S.user.name,
        decidedById: S.user.id,
        decidedAt: at,
      };
    saveOnce(
      "corr",
      function () {
        return store.set("users", rid, rr).then(function () {
          return corrApply(Object.assign({ id: rid }, rr));
        });
      },
      "شماره اصلاح شد",
    ).then(function (ok) {
      if (ok) {
        S.corrOpen = "";
        S.corrErr = "";
      }
      if (ok && S.key === oq && SHEETS[S.sheet].keyKind === fq) {
        S.key = nq;
      }
      render();
    });
  });
}
