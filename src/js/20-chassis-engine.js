/* ════════════════════════════════════════════════════════════
   فصل 20 — ایستگاه شاسی و موتور
   انتخاب بخش (EWT1 + موتور / EWT2 / هر سه)، یکی‌شدن موتور با شاسی، سوخت و محصول پیش‌فرض، خودرو بعدی.
   توابع اصلی: carProd، prodRaw، prodOf، secsOf، makeUser، pickSec، pickLoad، pickOf و …
   ════════════════════════════════════════════════════════════ */

function carProd(key, extra) {
  var rs = (extra || []).concat(carRecords(key).recs),
    i,
    x;
  for (i = 0; i < rs.length; i++) {
    x = rs[i];
    if (x && x.product && PSHEETS.indexOf(x.sheet) >= 0) return x.product;
  }
  return "";
}

function prodRaw(d) {
  if (!d) return "";
  if (d.product) return d.product;
  if (PSHEETS.indexOf(d.sheet) >= 0) return "";
  var k = d.id || d.sheet + "_" + d.key;
  if (PCACHE[k] === undefined) PCACHE[k] = carProd(d.key);
  return PCACHE[k];
}

function prodOf(d) {
  return prodRaw(d) === "ex" ? "ex" : "padra";
}

function secsOf(sheet, p) {
  var sh = SHEETS[sheet];
  if (p !== "ex") return sh.sections;
  if (!SECX[sheet])
    SECX[sheet] = sh.sections.map(function (x) {
      return Object.assign({}, x, {
        p: "ex",
        items: (EXTEND_ITEMS[sheet] && EXTEND_ITEMS[sheet][x.id]) || x.items,
      });
    });
  return SECX[sheet];
}

/* بخش فعال کاربر: بخش تعیین‌شده، مگر چکمنِ شاسی/تزیینات «هر دو» را انتخاب کرده باشد */
function makeUser(u) {
  var st = u.station === "engine" ? "chassis" : u.station,
    me = {
      id: u.id,
      name: u.name,
      station: st,
      sec: u.sec || "",
      role: u.role || "",
      mgrUnit: u.mgrUnit || "",
    };
  if (hasPick(st)) me.pick = pickLoad(me);
  return me;
}

function pickSec(v) {
  var p = PICKS.filter(function (x) {
    return x[0] === v;
  })[0];
  return p ? p[2] : undefined;
}

function pickLoad(u) {
  try {
    var v = localStorage.getItem("cm_pick_" + u.id);
    if (pickSec(v) !== undefined) return v;
  } catch (e) {}
  return scopeLoad(u.id) ? "all" : "";
}

// چکمن شاسی و تزیینات خودش بخش بازدید را انتخاب می‌کند
function hasPick(station) {
  return station === "chassis" || station === "trim";
}

// پیش‌فرض: شاسی با EWT1 شروع می‌شود، تزیینات بدون بخش تعیین‌شده «هر دو» است
function pickOf(u) {
  if (u.pick) return u.pick;
  if (u.sec === "ewt2") return "e2";
  return u.sec === "ewt1" || u.station === "chassis" ? "e1" : "all";
}

function pickSave(u) {
  try {
    localStorage.setItem("cm_pick_" + u.id, u.pick);
  } catch (e) {}
}

function activeSec() {
  if (!S.user) return "";
  return hasPick(S.user.station) ? pickSec(pickOf(S.user)) : S.user.sec;
}

// نوار انتخاب بخش: شاسی «EWT1 + موتور / EWT2 / هر سه»، تزیینات «EWT1 / EWT2 / هر دو».
function pickBar(u) {
  var cur = pickOf(u);
  return (
    '<div class="pickgrp" role="group" aria-label="بخش‌هایی که بازدید می‌کنید">' +
    (u.station === "trim" ? PICKS_TRIM : PICKS).map(function (p) {
      return (
        '<button class="btn sm" data-act="pick" data-v="' +
        p[0] +
        '" aria-pressed="' +
        (p[0] === cur) +
        '">' +
        p[1] +
        "</button>"
      );
    }).join("") +
    "</div>"
  );
}

function scopeLoad(id) {
  try {
    return localStorage.getItem("cm_scope_" + id) === "all";
  } catch (e) {
    return false;
  }
}

function secOK(id) {
  var sc = activeSec();
  return !sc || (id !== "ewt1" && id !== "ewt2") || sc === id;
}

function gradeOf(r, id) {
  if (prodOf(r) !== "ex") return "";
  var m = String(id).match(/^(\w+)-(\d+)$/);
  if (!m) return "";
  var g = EXTEND_GROUPS[r.sheet] && EXTEND_GROUPS[r.sheet][m[1]];
  return (g && g[+m[2]]) || "";
}

function prodPicker(id, cur, label) {
  return (
    '<div class="f grow" style="flex:1 1 100%"><span>' +
    label +
    '</span><div class="fuelpick"><button type="button" class="fbtn padra" data-act="fuelpick" data-f="' +
    id +
    '" data-v="padra" aria-pressed="' +
    (cur === "padra") +
    '">' +
    PRODN.padra +
    '</button><button type="button" class="fbtn ex" data-act="fuelpick" data-f="' +
    id +
    '" data-v="ex" aria-pressed="' +
    (cur === "ex") +
    '">' +
    PRODN.ex +
    '</button></div><input type="hidden" id="' +
    id +
    '" value="' +
    esc(cur || "") +
    '"></div>'
  );
}

function withP(p, fn) {
  var o = CURP;
  CURP = p;
  try {
    return fn();
  } finally {
    CURP = o;
  }
}

/* فهرست‌های قابل ویرایش توسط مالک: نام، حذف/بازگرداندن، افزودن، ترتیب، میکروفون/عکس/بارکد و اندازه */
function secCfg(sheet, sec) {
  var r = S.lists && (sec.p === "ex" ? S.lists.itemsX : S.lists.items),
    a = r && r[sheet];
  return (a && a[sec.id]) || {};
}

function secEntries(sheet, sec) {
  var cfg = secCfg(sheet, sec),
    ov = cfg.ov || {},
    add = cfg.add || [],
    n = sec.items.length,
    idx = [],
    i;
  for (i = 0; i < n + add.length; i++) idx.push(i);
  if (cfg.ord && cfg.ord.length) {
    var seen = {},
      o2 = [];
    cfg.ord.forEach(function (k) {
      k = +k;
      if (k >= 0 && k < idx.length && !seen[k]) {
        seen[k] = 1;
        o2.push(k);
      }
    });
    idx.forEach(function (k) {
      if (!seen[k]) o2.push(k);
    });
    idx = o2;
  }
  return idx.map(function (i) {
    return {
      i: i,
      orig: i < n ? sec.items[i] : null,
      p: i < n ? ov[i] || {} : add[i - n] || {},
      custom: i >= n,
    };
  });
}

function productShort(d) {
  return String(PRODF[prodOf(d)]).replace(/\s*\(.*\)\s*$/, "");
}

function fuelLabel(d, l) {
  return (fuelOf(d) === "single" && SINGLE_RENAME[d.sheet] && SINGLE_RENAME[d.sheet][l]) || l;
}

function fuelRaw(d) {
  if (!d) return "";
  if (d.fuel) return d.fuel;
  if (d.sheet === "chassis" || d.sheet === "engine") return "";
  var c = carRecords(d.key).recs.filter(function (x) {
    return x.sheet === "chassis" && x.fuel;
  })[0];
  return c ? c.fuel : "";
}

function fuelOf(d) {
  return fuelRaw(d) || "dual";
}

/* انتخاب بخش بازدید (EWT1/EWT2/هر دو) داخل صفحه‌ی بازدید، نه در سربرگ */
function scopeBar(u) {
  return hasPick(u.station) ? '<div class="scopebar">' + pickBar(u) + "</div>" : "";
}

function fuelCons(v) {
  return v === "single"
    ? "تک‌سوز: سه آیتم CNG شاسی، رگلاتور تزیینات، دو آیتم گاز رول تست و تست نشتی گاز برای این خودرو حذف می‌شود."
    : v === "dual"
      ? "دوگانه‌سوز: همه‌ی آیتم‌های گاز و تست نشتی گاز لازم است."
      : "نوع سوخت را با یکی از دو دکمه‌ی بالا انتخاب کنید.";
}

/* v162: نوع سوخت آخرین خودروی همین چکمن از قبل انتخاب می‌شود تا وقتی خودش عوضش کند؛ با «برگردان» پاک می‌شود تا دوباره انتخاب کند */
function lastFuel() {
  try {
    var v = localStorage.getItem("cm_fuel_" + S.user.id);
    if (v !== null) return v === "single" || v === "dual" ? v : "";
  } catch (e) {}
  return prevFuel();
}

function fuelRemember(v) {
  try {
    localStorage.setItem("cm_fuel_" + S.user.id, v);
  } catch (e) {}
}

/* محصول (پادرا / اکستند) هم مثل سوخت: آخرین انتخاب چکمن پیش‌فرض می‌شود تا وقتی خودش عوضش کند */
function lastProduct() {
  try {
    var v = localStorage.getItem("cm_prod_" + S.user.id);
    if (v === "padra" || v === "ex") return v;
  } catch (e) {}
  return "";
}

function productRemember(v) {
  try {
    localStorage.setItem("cm_prod_" + S.user.id, v);
  } catch (e) {}
}

function prevFuel() {
  var best = null;
  S.data.insp.forEach(function (x) {
    if (
      x.sheet === "chassis" &&
      x.fuel &&
      !x.test &&
      S.user &&
      x.createdBy === S.user.name &&
      (!best || (x.createdAt || "") > (best.createdAt || ""))
    )
      best = x;
  });
  return best ? best.fuel : "";
}

// انتخاب نوع سوخت (دوگانه/تک‌سوخت) و اثر آن روی آیتم‌های CNG.
function fuelCard() {
  var F = S.fuelConfirm,
    single = F.rec.fuel === "single";
  return (
    '<div class="card"><h2>تأیید نوع سوخت</h2><div class="kvs"><div class="kv"><small>شماره شاسی</small><b class="num">' +
    esc(F.key) +
    '</b></div><div class="kv"><small>شماره موتور</small><b class="num">' +
    esc(F.rec.engine) +
    '</b></div><div class="kv"><small>محصول</small><b>' +
    esc(PRODN[F.rec.product === "ex" ? "ex" : "padra"]) +
    '</b></div></div><div class="fuelbar ' +
    F.rec.fuel +
    '" style="font-size:26px;margin:12px 0">' +
    fuelTxt(F.rec.fuel) +
    '</div><p class="hint" style="font-size:15px">' +
    (single
      ? "خودرو <b>تک‌سوز</b> ثبت می‌شود: سه آیتم CNG از فرم شاسی، مجموعه رگلاتور از تزیینات و تست نشتی گاز برای این خودرو حذف می‌شود."
      : "خودرو <b>دوگانه‌سوز</b> ثبت می‌شود: همه‌ی آیتم‌های گاز و تست نشتی گاز لازم است.") +
    ' درست است؟</p><div class="row" style="margin-top:12px"><button class="btn ok" data-act="fuelyes">درست است، شروع بازدید</button><button class="btn" data-act="fuelno">اصلاح</button></div></div>'
  );
}

function fuelWarns(d) {
  if (fuelRaw(d) !== "single") return [];
  var w = [],
    recs = carRecords(d.key).recs;
  if (
    recs.some(function (x) {
      return x.sheet === "gas";
    })
  )
    w.push("برای این خودروی تک‌سوز برگه‌ی تست نشتی گاز ثبت شده است.");
  recs.forEach(function (r) {
    Object.keys(r.items || {}).forEach(function (id) {
      var it = r.items[id];
      if (it.closedAt || !(it.r === "ng" || it.r === "sample" || it.r === "shortage")) return;
      var lb = it.custom ? it.part || "" : origOf(r.sheet, id, r);
      if (
        ((prodOf(r) === "ex" ? SINGLE_HIDE_X : SINGLE_HIDE)[r.sheet] || []).indexOf(lb) >= 0 ||
        cngPartOf(lb)
      )
        w.push(
          "روی خودروی تک‌سوز مورد مربوط به گاز ثبت شده: «" +
            lb +
            "» در برگه " +
            SHEETS[r.sheet].name +
            ".",
        );
    });
  });
  return w;
}

/* v159: چکمنِ فقط‌EWT2 شاسی تازه باز نمی‌کند؛ شماره‌ها و سوخت را چکمن EWT1 ثبت می‌کند */
function waitsForEwt1() {
  return S.sheet === "chassis" && activeSec() === "ewt2";
}

/* v159: مرحله‌ی «موتور» داخل ورود شاسی — برگه‌ی موتور همان خودرو (با همان ساختار قبلی) کنار شاسی بازدید می‌شود.
   فقط برای چکمنی که بخش EWT1 را بازدید می‌کند (EWT1 یا هر دو)؛ چکمن فقط‌EWT2 موتور را نمی‌بیند. */
function mergedOn() {
  return !!S.user && S.user.station === "chassis" && secOK("ewt1");
}

function chassisOfEngine(engineKey) {
  return (
    S.data.insp.filter(function (x) {
      return x.sheet === "chassis" && x.engine === engineKey;
    })[0] || null
  );
}

// شاسی و برگه‌ی موتور همان خودرو را به هم وصل می‌کند.
function chassisPair(d) {
  if (!d || !mergedOn()) return null;
  if (d.sheet === "chassis") {
    var e = d.engine ? insp("engine", d.engine) : null;
    return e ? { c: d, e: e } : null;
  }
  if (d.sheet === "engine") {
    var c = chassisOfEngine(d.key);
    return c ? { c: c, e: d } : null;
  }
  return null;
}

function engineStepState(e) {
  if (!(e.signs && e.signs.ewt1)) return "todo";
  var sec = secsOf("engine", prodOf(e))[0];
  return secDefects(e, sec).some(function (x) {
    return x.it.r === "ng" && !x.it.closedAt;
  })
    ? "ng"
    : "done";
}

/* جابه‌جایی بین برگه‌ی شاسی و موتور بدون ریست‌شدن مرحله‌ی نمایش‌داده‌شده */
function switchDoc(sheet, key, view) {
  S.sheet = sheet;
  S.key = key;
  S.wizFor = docId(sheet, key);
  S.wizView = view || "";
  S.histPage = false;
  S.acOpen = false;
  S.corrOpen = "";
  S.more = false;
  S.shEdit = "";
  S.sxOpen = "";
  S.sitem = "";
  S.itemsOpen = false;
  S.shTab = "";
  S.sxErr = "";
  render();
  window.scrollTo(0, 0);
}

function openEngineStep(pr) {
  switchDoc("engine", pr.e.key, engineStepState(pr.e) === "todo" ? "" : "ewt1");
}

function openChassisStep(pr, view) {
  switchDoc("chassis", pr.c.key, view);
}

/* بعد از تأیید یک بخش: EWT1 شاسی ← موتور، تأیید موتور ← برگشت به شاسی؛ اگر همکار هم‌زمان همان بخش را زودتر تأیید کرده بود خبر می‌دهیم */
// بعد از امضای یک بخش شاسی، به مرحله‌ی بعد می‌رود.
function afterSectionSigned(sheet, key, sid) {
  var d = insp(sheet, key),
    sg = d && d.signs && d.signs[sid];
  if (sg && S.user && sg.byId && sg.byId !== S.user.id)
    toast("این بخش هم‌زمان توسط " + sg.by + " تأیید شده بود؛ تأیید او باقی ماند.");
  if (S.sheet !== sheet || S.key !== key || !d) return;
  var pr = chassisPair(d);
  if (!pr) return;
  if (sheet === "engine") openChassisStep(pr, "");
  else if (sid === "ewt1" && engineStepState(pr.e) === "todo") openEngineStep(pr);
}

function mergedFor(sheet, key, d) {
  var I = identity(key);
  d = d || {};
  return {
    serial: d.serial || I.serial || "",
    color: d.color || I.color || "",
    chassisNo: d.chassisNo || I.chassis || "",
    engine: d.engine || I.engine || "",
    room: d.room || I.room || "",
    fuel: d.fuel || "",
  };
}

function fuelPicker(id, cur, label) {
  return (
    '<div class="f grow" style="flex:1 1 100%"><span>' +
    label +
    '</span><div class="fuelpick"><button type="button" class="fbtn single" data-act="fuelpick" data-f="' +
    id +
    '" data-v="single" aria-pressed="' +
    (cur === "single") +
    '">تک‌سوز</button><button type="button" class="fbtn dual" data-act="fuelpick" data-f="' +
    id +
    '" data-v="dual" aria-pressed="' +
    (cur === "dual") +
    '">دوگانه‌سوز</button></div><input type="hidden" id="' +
    id +
    '" value="' +
    esc(cur || "") +
    '"></div>'
  );
}

function fuelTxt(v) {
  return v === "single" ? "تک‌سوز" : v === "dual" ? "دوگانه‌سوز" : "ثبت نشده";
}

/* انتخابگر در صفحه‌ی جست‌وجو است (وقتی خودرویی باز است نوار بالا دیده نمی‌شود)؛ برای خودروهای بعدی و خودروهای در جریان اعمال می‌شود */
function changePick(v) {
  if (pickSec(v) === undefined || v === pickOf(S.user)) return;
  S.user.pick = v;
  pickSave(S.user);
  render();
}

/* v159: با باز شدن شاسی، برگه‌ی موتور همان خودرو هم باز می‌شود تا شماره‌ها یک بار وارد شوند؛ اگر از قبل هست دست نمی‌خورد. شناسه‌ی برگه‌ی ساخته‌شده را برمی‌گرداند */
// با باز شدن شاسی، برگه‌ی موتور همان خودرو را خودکار می‌سازد.
function createEngineSheet(chassisRec) {
  var k = chassisRec.engine;
  if (!k || insp("engine", k) || !canEdit("engine", k)) return "";
  var id = docId("engine", k),
    rec = {
      sheet: "engine",
      key: k,
      createdBy: S.user.name,
      createdAt: nowIso(),
      formCode: FORM_CODE,
      formPage: SHEETS.engine.page,
      items: {},
      signs: {},
    };
  if (chassisRec.product) rec.product = chassisRec.product;
  if (chassisRec.test) rec.test = true;
  saveOnce(
    "open_" + id,
    function () {
      return store.create("inspections", id, rec);
    },
    "",
    true,
  );
  return id;
}

function submitFuelCorrection() {
  var chq = carRecords(S.key).recs.filter(function (x) {
      return x.sheet === "chassis" && x.fuel;
    })[0],
    nf = fieldValue("cf_fuel"),
    rf = fieldValue("cf_reason"),
    ef = "";
  if (!chq) ef = "برگه شاسی با نوع سوخت پیدا نشد.";
  else if (nf !== "single" && nf !== "dual") ef = "نوع سوخت درست را انتخاب کنید.";
  else if (nf === chq.fuel) ef = "نوع سوخت انتخابی با ثبت فعلی یکی است.";
  else if (rf.length < 3) ef = "دلیل اصلاح را بنویسید.";
  if (ef) {
    S.corrErr = ef;
    render();
    return;
  }
  S.corrErr = "";
  var rf2 = {
      kind: "corr",
      field: "fuel",
      oldVal: chq.fuel,
      newVal: nf,
      reason: rf,
      sheet: S.sheet,
      key: S.key,
      chassisKey: chq.key,
      by: S.user.name,
      byId: S.user.id,
      station: S.user.station,
      at: nowIso(),
      status: "pending",
    },
    rfid = "corr_" + uid();
  {
    rf2.status = "applied";
    rf2.decidedBy = S.user.name;
    rf2.decidedById = S.user.id;
    rf2.decidedAt = rf2.at;
    saveOnce(
      "corr",
      function () {
        return store.set("users", rfid, rf2).then(function () {
          return corrApply(Object.assign({ id: rfid }, rf2));
        });
      },
      "نوع سوخت اصلاح شد",
    ).then(function (ok) {
      if (ok) {
        S.corrOpen = "";
        S.corrErr = "";
      }
      render();
    });
  }
}
