/* ════════════════════════════════════════════════════════════
   فصل 21 — ایستگاه نهایی بالا و پایین (EWT1/EWT2) و اتصال شماره‌ها
   اتصال سریال به شاسی و اتاق، تأیید ۳ رقم آخر موتور، برچسب سوخت.
   توابع اصلی: linkCheck، linkCard، unlinkedChassisRooms، linkPickers، corrReasons، engineFromBarcode، serialLinkStep
   ════════════════════════════════════════════════════════════ */

// فهرست انتخاب شاسی/اتاق با ترتیب «قدیمی‌ترین اول» فقط برای این ایستگاه‌هاست
var OLDEST_FIRST_SHEETS = ["gas", "final1"];
var PICK_WINDOW_MS = 2 * 86400000;
var PICK_LIMIT = 12;
var SINGLE_NO_GAS_MSG =
  "این خودرو تک‌سوز است؛ تست نشتی گاز لازم نیست و برگه‌ای برایش باز نمی‌شود.";

// ایستگاه تست گاز کنترل برچسب شیشه ندارد؛ شاسی و اتاق را فقط از فهرست انتخاب می‌کند
function labelCheckNeeded(sheet) {
  return sheet !== "gas";
}

/* تطبیق برچسب شیشه با ثبت شاسی (سه رقم آخر موتور + نوع سوخت)؛ خطا را برمی‌گرداند و در عدم تطابق سوخت درخواست اصلاح برای کیفیت می‌سازد */
// تأیید ۳ رقم آخر موتور و برچسب سوخت هنگام اتصال.
function linkCheck(L2, engIn, fuelIn) {
  if (!labelCheckNeeded(L2.sheet)) return "";
  var le = "",
    lfv = "";
  if (L2.engineVerified) {
    var v3 = digits(engIn);
    if (v3.length !== 3) le = "سه رقم آخر شماره موتور را از روی برچسب بنویسید.";
    else if (String(L2.engine).slice(-3) !== v3)
      le =
        "سه رقم آخر موتور برچسب (" +
        v3 +
        ") با موتور برگه شاسی (" +
        String(L2.engine).slice(-3) +
        ") نمی‌خواند. شاسی یا اتاق انتخاب‌شده اشتباه است.";
  }
  if (!le && L2.fuel) {
    lfv = String(fuelIn || "").trim();
    if (!lfv) le = "نوع سوخت را از روی برچسب انتخاب کنید.";
    else if (lfv !== L2.fuel) {
      le =
        "نوع سوخت برچسب (" +
        fuelTxt(lfv) +
        ") با ثبت شاسی (" +
        fuelTxt(L2.fuel) +
        ") نمی‌خواند. اتصال ثبت نشد و به کیفیت اطلاع داده شد.";
      var cid = "corr_" + uid();
      if (
        !corrAll().some(function (x) {
          return x.status === "pending" && x.field === "fuel" && x.chassisKey === L2.chassis;
        })
      )
        store
          .set("users", cid, {
            kind: "corr",
            field: "fuel",
            oldVal: L2.fuel,
            newVal: lfv,
            reason: "عدم تطابق نوع سوخت برچسب با ثبت شاسی هنگام اتصال سریال " + L2.key,
            sheet: L2.sheet,
            key: L2.key,
            chassisKey: L2.chassis,
            by: S.user.name,
            byId: S.user.id,
            station: S.user.station,
            at: nowIso(),
            status: "pending",
          })
          .catch(function () {});
    }
  }
  return le;
}

// کادر «تأیید با برچسب شیشه» صفحه‌ی تأیید اتصال
function linkLabelBox(L) {
  var h = "";
  h +=
    '<div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--line)"><b>تأیید با برچسب شیشه</b><p class="hint" style="margin:6px 0 10px">برای اطمینان، دو چیز را از روی خود برچسب شیشه وارد کنید. اگر با ثبت شاسی نخواند، اتصال ثبت نمی‌شود.</p>';
  if (L.engineVerified)
    h +=
      '<label class="f">سه رقم آخر شماره موتور روی برچسب<input class="in num ltr" id="lk_eng" inputmode="numeric" maxlength="3" autocomplete="off" style="max-width:160px"></label>';
  else h += '<p class="hint">برگه شاسی با موتور ثبت‌شده پیدا نشد؛ تطبیق موتور ممکن نیست.</p>';
  if (L.fuel)
    h +=
      '<div style="margin-top:10px">' +
      fuelPicker("lk_fuel", "", "نوع سوخت از روی برچسب (تک‌سوز «بنزینی» / دوگانه‌سوز)") +
      "</div>";
  h += "</div>";
  return h;
}

// اتصال سریال خط نهایی به شاسی و شماره‌ی اتاق.
function linkCard() {
  var L = S.linkConfirm,
    h =
      '<div class="card"><h2>تأیید اتصال خودرو</h2><p class="hint">این اتصال همه برگه‌های این خودرو را به هم وصل می‌کند. مقدارها را با برچسب روی شیشه مقایسه کنید.</p><div class="kvs"><div class="kv"><small>شماره سریال</small><b class="num">' +
      esc(L.key) +
      '</b></div><div class="kv"><small>شماره شاسی</small><b class="num">' +
      esc(L.chassis) +
      '</b></div><div class="kv"><small>شماره اتاق</small><b class="num">' +
      esc(L.room) +
      '</b></div><div class="kv"><small>شماره موتور (از برگه شاسی)</small><b class="num">' +
      esc(L.engine || "—") +
      "</b></div></div>";
  L.warn.forEach(function (w) {
    h +=
      '<p class="err" style="margin-top:10px">' +
      esc(w) +
      " اگر مطمئن هستید ادامه دهید، وگرنه شماره را اصلاح کنید.</p>";
  });
  if (labelCheckNeeded(L.sheet)) h += linkLabelBox(L);
  if (S.linkErr) h += '<p class="err" style="margin-top:10px">' + esc(S.linkErr) + "</p>";
  return (
    h +
    '<div class="row" style="margin-top:14px"><button class="btn ok" data-act="linkyes">درست است، ذخیره</button><button class="btn" data-act="linkno">اصلاح شماره‌ها</button></div></div>'
  );
}

function unlinkedChassisRooms(sheet) {
  var lc = {},
    lr = {},
    chs = [],
    rms = [],
    oldestFirst = OLDEST_FIRST_SHEETS.indexOf(sheet) >= 0,
    since = new Date(Date.now() - PICK_WINDOW_MS).toISOString();
  S.data.insp.forEach(function (x) {
    if (SHEETS[x.sheet] && SHEETS[x.sheet].keyKind === "serial") {
      var o = identOf(x);
      if (o.chassis) lc[o.chassis] = 1;
      if (o.room) lr[o.room] = 1;
    }
    if (x.sheet === "chassis") chs.push(x);
    else if (x.sheet === "trim") rms.push(x);
  });
  var order = function (a, b) {
      var newer = (b.createdAt || "") < (a.createdAt || "");
      return newer !== oldestFirst ? -1 : 1;
    },
    wanted = function (x) {
      return !oldestFirst || (x.createdAt || "") >= since;
    };
  return {
    ch: chs
      .filter(function (x) {
        return !lc[x.key] && wanted(x) && !(sheet === "gas" && x.fuel === "single");
      })
      .sort(order)
      .slice(0, PICK_LIMIT),
    rm: rms
      .filter(function (x) {
        return !lr[x.key] && wanted(x);
      })
      .sort(order)
      .slice(0, PICK_LIMIT),
  };
}

function pickButton(field, key, notes) {
  return (
    '<button type="button" class="pk num" data-act="pickfill" data-f="' +
    field +
    '" data-v="' +
    esc(key) +
    '" aria-pressed="false">' +
    esc(key) +
    notes
      .map(function (n) {
        return "<small>" + esc(n) + "</small>";
      })
      .join("") +
    "</button>"
  );
}

// دکمه‌ی شاسی: موتور کامل و ساعت ثبت (برای فهرست قدیمی‌ترین‌اول)
function chassisPickNotes(x, full) {
  if (!full) return x.engine ? ["موتور …" + String(x.engine).slice(-3)] : [];
  return (x.engine ? ["موتور " + x.engine] : []).concat(["ثبت " + timeHM(x.createdAt)]);
}

function pickColumn(title, list, emptyText, btn) {
  return (
    "<div><b>" +
    title +
    '</b><div class="pickrow col">' +
    (list.length ? list.map(btn).join("") : '<span class="hint">' + emptyText + "</span>") +
    "</div></div>"
  );
}

// فهرست دو ستونه، قدیمی‌ترین ثبت اول (ترتیب رسیدن خودروها از خط)
function pickColumns(u) {
  return (
    '<div class="card lkpick first"><h2>انتخاب شاسی و اتاق این خودرو</h2><p class="hint">سریال خوانده شد. قدیمی‌ترین ثبت‌شده اول است. شاسی و اتاق را از روی برچسب شیشه لمس کنید؛ اگر در فهرست نبود، پایین تایپ کنید.</p><div class="pickcols">' +
    pickColumn("شاسی و موتور", u.ch, "شاسی وصل‌نشده‌ای نیست.", function (x) {
      return pickButton("c_chassisNo", x.key, chassisPickNotes(x, true));
    }) +
    pickColumn("اتاق", u.rm, "اتاق وصل‌نشده‌ای نیست.", function (x) {
      return pickButton("c_room", x.key, ["ثبت " + timeHM(x.createdAt)]);
    }) +
    "</div></div>"
  );
}

function linkPickers() {
  var u = cachedByRows("linkPick", S.sheet, function () {
      return unlinkedChassisRooms(S.sheet);
    }),
    ch = u.ch,
    rm = u.rm;
  if (OLDEST_FIRST_SHEETS.indexOf(S.sheet) >= 0) return pickColumns(u);
  var h =
    '<div class="card lkpick"><h2>انتخاب شاسی و اتاق این خودرو</h2><p class="hint">سریال خوانده شد. شماره‌ی شاسی و اتاق را از روی برچسب شیشه با لمس انتخاب کنید (فقط شاسی‌ها و اتاق‌هایی که هنوز به سریالی وصل نشده‌اند). اگر در فهرست نبود، پایین تایپ کنید.</p>';
  h += '<b>شاسی</b><div class="pickrow">';
  if (!ch.length) h += '<span class="hint">شاسی وصل‌نشده‌ای نیست.</span>';
  ch.forEach(function (x) {
    h += pickButton("c_chassisNo", x.key, chassisPickNotes(x, false));
  });
  h += '</div><b>اتاق</b><div class="pickrow">';
  if (!rm.length) h += '<span class="hint">اتاق وصل‌نشده‌ای نیست.</span>';
  rm.forEach(function (x) {
    h += pickButton("c_room", x.key, []);
  });
  return h + "</div></div>";
}

// خودروهای رسیده به نهایی بالا که هنوز برگه‌ی نهایی پایین ندارند، قدیمی‌ترین اول
function awaitingFinal2() {
  return cachedByRows("awaitF2", "", function () {
    var done = {},
      engineOf = {},
      since = new Date(Date.now() - PICK_WINDOW_MS).toISOString();
    S.data.insp.forEach(function (x) {
      if (x.sheet === "final2") done[x.key] = 1;
      else if (x.sheet === "chassis" && x.engine) engineOf[x.key] = x.engine;
    });
    return S.data.insp
      .filter(function (x) {
        return x.sheet === "final1" && !done[x.key] && (x.createdAt || "") >= since;
      })
      .sort(function (a, b) {
        return (a.createdAt || "") < (b.createdAt || "") ? -1 : 1;
      })
      .slice(0, PICK_LIMIT)
      .map(function (x) {
        return { key: x.key, engine: x.engine || engineOf[x.key], room: x.room, at: x.createdAt };
      });
  });
}

function awaitingFinal2Button(c) {
  var notes = (c.engine ? ["موتور " + c.engine] : [])
    .concat(c.room ? ["اتاق " + c.room] : [])
    .concat(["نهایی بالا " + timeHM(c.at)]);
  return pickButton("", c.key, notes).replace(
    'data-act="pickfill" data-f=""',
    'data-act="open" data-sheet="final2" data-key="' + esc(c.key) + '"'
  );
}

// نهایی پایین (داخل چال) به شماره‌ی شیشه دسترسی ندارد؛ ماشین بعدی را از این فهرست باز می‌کند
function awaitingFinal2Card() {
  var list = awaitingFinal2();
  return (
    '<div class="card lkpick first"><h2>در انتظار نهایی پایین</h2><p class="hint">خودروهایی که نهایی بالا را گذرانده‌اند؛ قدیمی‌ترین اول. برای باز کردن برگه لمس کنید.</p><div class="pickrow col">' +
    (list.length
      ? list.map(awaitingFinal2Button).join("")
      : '<span class="hint">خودرویی در انتظار نیست.</span>') +
    "</div></div>"
  );
}

function corrReasons(tid) {
  return (
    '<div class="f"><span>دلیل اصلاح (الزامی)</span></div><div class="corrreasons">' +
    CORR_REASONS.map(function (r) {
      return (
        '<button type="button" class="pick" data-act="corrrsn" data-t="' +
        tid +
        '" data-v="' +
        esc(r) +
        '" aria-pressed="false">' +
        esc(r) +
        "</button>"
      );
    }).join("") +
    '</div><textarea class="in" id="' +
    tid +
    '" rows="2" placeholder="یکی از دلیل‌ها را بزنید یا خودتان بنویسید"></textarea>'
  );
}

/* v108: کسری رگلاتور / مخزن CNG / پالت مخزن، تست نشتی گاز را معوق می‌کند؛ قبل از مرحله‌ی نهایی باید انجام یا با دلیل عبور داده شود */
var GAS_FINAL_SHEET = "comm";

/* بارکد موتور MM101S + ۷ رقم + یک رقم پایانی؛ شماره‌ی موتور همان ۷ رقم است */
function engineFromBarcode(t) {
  var m = /^MM101S(\d{7})\d?$/i.exec(t);
  return m ? m[1] : t;
}

/* خودرویی که فقط با سریال باز می‌شود باید به شاسی و اتاق وصل باشد؛ اگر این مرحله کار را تمام کرد true برمی‌گرداند */
function serialLinkStep(rec, I3) {
  var needC = !(rec.chassisNo || I3.chassis),
    needR = !(rec.room || I3.room);
  if (needC || needR) {
    S.formErr =
      "این سریال هنوز به خودرو وصل نشده است. شماره شاسی و شماره اتاق را از روی برچسب شیشه وارد کنید تا به برگه‌های قبلی (شاسی، موتور، تزیینات) وصل شود.";
    render();
    return true;
  }
  var typed = !!(rec.chassisNo || rec.room);
  if (typed) {
    var ch = rec.chassisNo || I3.chassis,
      rm = rec.room || I3.room,
      bad = "";
    S.data.insp.forEach(function (x) {
      var o = identOf(x);
      if (!o.serial || o.serial === S.key) return;
      if (ch && o.chassis === ch)
        bad = "شاسی " + ch + " قبلاً به سریال " + o.serial + " وصل شده است.";
      if (rm && o.room === rm) bad = "اتاق " + rm + " قبلاً به سریال " + o.serial + " وصل شده است.";
    });
    if (bad) {
      S.formErr = bad + " اگر اشتباه ثبت شده، مدیر باید اصلاح کند.";
      render();
      return true;
    }
    var ce = insp("chassis", ch),
      w = [],
      te = insp("trim", rm);
    if (S.sheet === "gas" && ce && ce.fuel === "single") {
      S.formErr = SINGLE_NO_GAS_MSG;
      render();
      return true;
    }
    if (ce && te && prodOf(ce) !== prodOf(te)) {
      S.formErr =
        "محصول شاسی (" +
        PRODN[prodOf(ce)] +
        ") با محصول اتاق (" +
        PRODN[prodOf(te)] +
        ") یکی نیست. شماره‌ها را دوباره با برچسب شیشه مقایسه کنید.";
      render();
      return true;
    }
    rec.product = carProd(S.key, [ce, te]) || undefined;
    if (rec.product === undefined) delete rec.product;
    if (!ce) w.push("برگه شاسی " + ch + " هنوز ثبت نشده است.");
    if (!insp("trim", rm)) w.push("برگه تزیینات اتاق " + rm + " هنوز ثبت نشده است.");
    var LK = {
      sheet: S.sheet,
      key: S.key,
      rec: rec,
      chassis: ch,
      room: rm,
      engine: (ce && ce.engine) || rec.engine || I3.engine || "",
      engineVerified: !!(ce && ce.engine),
      fuel: (ce && ce.fuel) || "",
      warn: w,
    };
    var e3 = digits(fieldValue("c_lk_eng")),
      fu3 = fieldValue("c_lk_fuel");
    var labelTyped = !labelCheckNeeded(S.sheet) || ((!LK.engineVerified || e3.length === 3) && (!LK.fuel || fu3));
    if (!w.length && labelTyped) {
      var le3 = linkCheck(LK, e3, fu3);
      if (le3) {
        S.formErr = le3;
        render();
        return true;
      }
      S.formErr = "";
      var lid = docId(S.sheet, S.key);
      saveOnce(
        "open_" + lid,
        function () {
          return store.create("inspections", lid, rec);
        },
        "برگه باز شد",
      );
      return true;
    }
    S.linkConfirm = LK;
    S.linkErr = "";
    S.formErr = "";
    render();
    return true;
  }
  return false;
}
