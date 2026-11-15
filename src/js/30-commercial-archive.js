/* ════════════════════════════════════════════════════════════
   فصل 30 — ایستگاه تجاری، بایگانی و PDI
   تأیید نهایی تجاری، کد ۷۴ و تحویل با کسری، بایگانی خودرو (قفل حذف)، بازگشت PDI.
   توابع اصلی: releaseOf، releaseForm، releaseCard، archIdSet، isArchivedCar، assertNotArchived، archOf، archHist و …
   ════════════════════════════════════════════════════════════ */

/* تحویل با کسری: کیفیت مونتاژ (تجاری) کد(های) تعریف‌شده توسط مدیر را روی کل خودرو ثبت می‌کند */
function releaseOf(d) {
  var r = carRecords(d.key).recs.filter(function (x) {
    return x.sheet === GAS_FINAL_SHEET && x.release && x.release.codes && x.release.codes.length;
  })[0];
  return r ? r.release : null;
}

function releaseForm() {
  var L = listK("relCodes");
  if (!L.length)
    return '<p class="hint" style="margin:8px 0 0">کدی تعریف نشده است؛ مدیر در «فهرست‌ها» کدهای تحویل با کسری را اضافه کند.</p>';
  return (
    '<div class="chips" style="margin-top:8px">' +
    L.map(function (c, i) {
      return (
        '<label class="chip"><input type="checkbox" class="relcb" value="' +
        esc(c) +
        '"> ' +
        esc(c) +
        "</label>"
      );
    }).join("") +
    "</div>" +
    '<label class="f" style="margin-top:10px">توضیح (اختیاری)<input class="in" id="rel_note" autocomplete="off"></label><button type="button" class="btn sm" data-act="relsave" style="margin-top:8px">ثبت تحویل با کسری</button>'
  );
}

// تحویل با کسری: انتخاب کد (مثلاً ۴۶/۴۸) و توضیح.
function releaseCard(d) {
  var r = releaseOf(d),
    can = d.sheet === GAS_FINAL_SHEET && canEdit(d.sheet, d.key);
  if (r)
    return (
      '<div class="card"><div class="err" style="margin:0"><b>تحویل با کسری</b><p style="margin:6px 0 0">' +
      r.codes.map(esc).join("<br>") +
      "</p>" +
      (r.note ? '<p class="hint" style="margin:6px 0 0">' + esc(r.note) + "</p>" : "") +
      whoWhen(r.by, r.at) +
      (can
        ? '<button type="button" class="btn sm" data-act="relcancel" style="margin-top:8px">لغو تحویل با کسری</button>'
        : "") +
      "</div></div>"
    );
  if (can && openOnCar(d).length)
    return (
      '<div class="card"><b>تحویل خودرو با کسری</b><p class="hint" style="margin:4px 0 0">کد(های) مربوط را انتخاب کنید؛ کسری‌ها باز می‌مانند و پیگیری می‌شوند.</p>' +
      releaseForm() +
      "</div>"
    );
  return "";
}

/* ---------- بایگانی، ارجاع از PDI و بایگانی مجدد ---------- */
var ARCH_EVENT = {
  archive: "بایگانی",
  reopen: "بازگشایی — ایراد برگشتی از PDI",
  rearchive: "بایگانی مجدد",
};

/* خودروی بایگانی‌شده: هیچ‌کس پرونده‌اش را حذف نمی‌کند (مرجع شکایت‌های بعدی). رکورد آزمایشی مستثناست */
var ARCH_IDS = { rows: null, set: null };

function archIdSet() {
  if (ARCH_IDS.rows !== S.data.arch) {
    var set = Object.create(null);
    S.data.arch.forEach(function (a) {
      [a.id, a.serial, a.chassis, a.engine, a.room].forEach(function (v) {
        if (v) set[v] = 1;
      });
    });
    ARCH_IDS = { rows: S.data.arch, set: set };
  }
  return ARCH_IDS.set;
}

// آیا این خودرو بایگانی شده است؟ (برای قفل حذف)
function isArchivedCar(d) {
  if (d.test) return false;
  var set = archIdSet();
  return carIdents(d).some(function (v) {
    return set[v];
  });
}

var ARCH_LOCK_MSG = "این خودرو بایگانی شده است و پرونده‌اش حذف نمی‌شود.";

/* پیش از حذف یک برگه: اگر بایگانی خودرو هنوز بارگیری نشده، از سرور می‌پرسد؛ خطای اتصال یعنی حذف نشود */
// قفل حذف: خودروی بایگانی‌شده هرگز حذف نمی‌شود (حساس؛ بدون هماهنگی تغییر ندهید).
function assertNotArchived(d) {
  if (!d || d.test) return Promise.resolve();
  if (isArchivedCar(d)) return Promise.reject(new Error(ARCH_LOCK_MSG));
  if (!store.get) return Promise.resolve();
  var ids = carIdents(d).filter(function (v, i, a) {
    return a.indexOf(v) === i;
  });
  return Promise.all(
    ids.map(function (k) {
      return store.get("archives", k);
    }),
  ).then(function (rs) {
    if (rs.some(Boolean)) throw new Error(ARCH_LOCK_MSG);
  });
}

function archOf(key) {
  return S.data.arch.filter(function (a) {
    return a.id === key;
  })[0];
}

/* پرونده‌های قدیمی تاریخچه ندارند؛ رویداد اول از خود بایگانی ساخته می‌شود */
function archHist(a) {
  return (
    a.hist || [
      {
        type: "archive",
        by: a.by,
        byId: a.byId,
        at: a.at,
        code745: !!a.code745,
      },
    ]
  );
}

function archiveCheck(c) {
  var badOpen = 0,
    shortOpen = 0;
  c.recs.forEach(function (r) {
    Object.keys(r.items || {}).forEach(function (i2) {
      var x = r.items[i2];
      if (x.closedAt) return;
      if (x.r === "ng" || x.r === "sample") badOpen++;
      else if (x.r === "shortage") shortOpen++;
    });
  });
  var missA = stagesFor(c.recs).some(function (k) {
    var r = c.recs.filter(function (d) {
      return d.sheet === k;
    })[0];
    return !r || stat(r).signed < stat(r).secs;
  });
  return {
    badOpen: badOpen,
    shortOpen: shortOpen,
    err: badOpen
      ? "خودرو ایراد یا نمونه‌ی باز دارد و بایگانی نمی‌شود."
      : missA
        ? "همه مراحل خودرو هنوز تأیید نشده است."
        : "",
  };
}

function archiveStages(c) {
  return stagesFor(c.recs).map(function (k) {
    var r = c.recs.filter(function (d) {
      return d.sheet === k;
    })[0];
    var sg = r
      ? Object.keys(r.signs || {}).map(function (i) {
          return r.signs[i];
        })
      : [];
    return {
      sheet: k,
      name: SHEETS[k].name,
      by: sg
        .map(function (x) {
          return x.by;
        })
        .join("، "),
      at: sg.length ? sg[sg.length - 1].at : "",
    };
  });
}

function archiveEvent(type, extra) {
  return Object.assign({ type: type, by: S.user.name, byId: S.user.id, at: nowIso() }, extra || {});
}

// بایگانی خودرو بعد از تجاری (کد ۷۴ اگر کسری باز باشد).
function archiveCar(q) {
  var c = carRecords(q),
    I = c.I,
    chk = archiveCheck(c);
  if (chk.err) {
    toast(chk.err);
    return;
  }
  var ev = archiveEvent("archive", { code745: chk.shortOpen > 0 });
  save(
    function () {
      return store.set("archives", c.key, {
        key: c.key,
        serial: I.serial || "",
        color: I.color || "",
        chassis: I.chassis || "",
        engine: I.engine || "",
        room: I.room || "",
        by: ev.by,
        byId: ev.byId,
        at: ev.at,
        formCode: FORM_CODE,
        stages: archiveStages(c),
        code745: chk.shortOpen > 0,
        shortAtArchive: chk.shortOpen,
        reopened: false,
        hist: [ev],
        test: c.recs.some(function (r) {
          return r.test;
        }),
      });
    },
    chk.shortOpen > 0 ? "پرونده با کد ۷۴ بایگانی شد" : "پرونده بایگانی شد",
  );
}

function rearchiveCar(q) {
  var c = carRecords(q),
    a = archOf(c.key),
    chk = archiveCheck(c);
  if (!a || !a.reopened) return;
  if (chk.err) {
    toast(chk.err);
    return;
  }
  var ev = archiveEvent("rearchive", { code745: chk.shortOpen > 0 });
  save(function () {
    return store.update("archives", a.id, {
      reopened: false,
      by: ev.by,
      byId: ev.byId,
      at: ev.at,
      stages: archiveStages(c),
      code745: chk.shortOpen > 0,
      shortAtArchive: chk.shortOpen,
      hist: archHist(a).concat([ev]),
    });
  }, "پرونده دوباره بایگانی شد");
}

/* ایراد دیده‌شده در PDI شرکت: به برگه‌ی تجاری اضافه می‌شود و پرونده‌ی بایگانی‌شده بازگشایی می‌شود */
// ثبت ایراد PDI و برگرداندن خودرو به تجاری.
function pdiReturn(q) {
  var c = carRecords(q),
    a = archOf(c.key),
    note = fieldValue("pdi_note"),
    pdiBy = fieldValue("pdi_by");
  if (!a) return;
  if (!note) {
    toast("ایرادی را که در PDI دیده شده بنویسید.");
    return;
  }
  var comm = c.recs.filter(function (r) {
    return r.sheet === "comm";
  })[0];
  if (!comm) {
    toast("برگه‌ی تجاری این خودرو پیدا نشد.");
    return;
  }
  var ev = archiveEvent("reopen", { note: note, pdiBy: pdiBy }),
    items = {};
  items["pdi_" + uid()] = {
    r: "ng",
    custom: true,
    sec: "comm",
    pdi: true,
    post: true,
    note: note,
    pdiBy: pdiBy,
    by: ev.by,
    byId: ev.byId,
    at: ev.at,
    closedAt: "",
    closedBy: "",
  };
  ["pdi_note", "pdi_by"].forEach(function (k) {
    var e = document.getElementById(k);
    if (e) e.value = "";
  });
  save(function () {
    return Promise.all([
      store.update("inspections", comm.id, { items: items }),
      store.update("archives", a.id, {
        reopened: true,
        reopenAt: ev.at,
        reopenBy: ev.by,
        reopenById: ev.byId,
        hist: archHist(a).concat([ev]),
      }),
    ]);
  }, "ایراد PDI ثبت و پرونده بازگشایی شد");
}

function archivedBlock(c, a) {
  var h =
    '<div class="signrow" style="border:0;margin:0;padding:0"><div class="stamp done"><b>بایگانی</b><span>' +
    esc(a.by) +
    "</span><small>" +
    esc(when(a.at)) +
    "</small></div><div><b>" +
    (a.reopened
      ? "این پرونده بایگانی شده بود و برگشتی از PDI است."
      : "این پرونده بایگانی شده است.") +
    "</b></div></div>";
  if (!a.reopened) return h;
  var chk = archiveCheck(c);
  h +=
    '<div class="nt ng" style="margin-top:10px"><b>برگشتی از PDI — در انتظار رفع</b><div class="m">' +
    whoWhen(a.reopenBy, a.reopenAt, "بازگشایی‌کننده") +
    "</div></div>";
  return (
    h +
    (chk.err
      ? '<p class="hint" style="margin-top:10px">بایگانی مجدد: ' + esc(chk.err) + "</p>"
      : '<p class="hint" style="margin:10px 0">' +
        (chk.shortOpen
          ? faDigits(chk.shortOpen) + " کسری باز است و خودرو با کد ۷۴ دوباره بایگانی می‌شود."
          : "همه‌ی ایرادها رفع شده است.") +
        '</p><button class="btn primary" data-act="rearchive" data-q="' +
        esc(c.key) +
        '">بایگانی مجدد به نام من</button>')
  );
}

function pdiCard(c, a) {
  var rows = archHist(a)
    .slice()
    .reverse()
    .map(function (e) {
      return (
        '<div class="it"><b>' +
        esc(ARCH_EVENT[e.type] || e.type) +
        '</b><div class="m">' +
        whoWhen(e.by, e.at) +
        "</div>" +
        (e.pdiBy ? '<div class="m">بازرس PDI: ' + esc(e.pdiBy) + "</div>" : "") +
        (e.note ? '<div class="m">توضیح: ' + esc(e.note) + "</div>" : "") +
        (e.code745 ? '<div class="m">کد ۷۴</div>' : "") +
        "</div>"
      );
    })
    .join("");
  return (
    '<div class="card"><h2>ایراد برگشتی از PDI</h2><p class="hint" style="margin-bottom:8px">اگر در بازرسی PDI شرکت ایرادی دیده شد، اینجا ثبت کنید. پرونده بازگشایی می‌شود تا ایراد رفع و دوباره بایگانی شود.</p>' +
    '<label class="f">ایراد دیده‌شده در PDI (الزامی)<textarea class="in" id="pdi_note"></textarea></label><label class="f" style="margin-top:8px">نام بازرس PDI (اختیاری)<input class="in" id="pdi_by" autocomplete="off"></label>' +
    '<button class="btn primary" style="margin-top:10px" data-act="pdiadd" data-q="' +
    esc(c.key) +
    '">ثبت ایراد و بازگشایی پرونده</button></div>' +
    '<div class="card"><h2>تاریخچه‌ی بایگانی</h2><div class="items">' +
    rows +
    "</div></div>"
  );
}

function pdiPendingCard() {
  var L = S.data.arch.filter(function (a) {
    return a.reopened;
  });
  if (!L.length) return "";
  return (
    '<div class="card" style="border:2px solid #c0392b"><h2>ارجاعی از PDI — منتظر رفع (' +
    faDigits(L.length) +
    ")</h2>" +
    L.map(function (a) {
      return (
        '<div class="it"><div class="row"><b class="num grow">' +
        esc(a.serial || a.key) +
        '</b><button class="btn sm" data-act="opencar" data-q="' +
        esc(a.key) +
        '">پرونده</button></div><div class="m">' +
        whoWhen(a.reopenBy, a.reopenAt, "بازگشایی‌کننده") +
        "</div></div>"
      );
    }).join("") +
    "</div>"
  );
}

function carSearchCard(q, ro) {
  return (
    '<div class="card"><h2>پرونده خودرو ' +
    (ro ? "(فقط مشاهده)" : "(واحد تجاری)") +
    '</h2><form data-form="carsearch" class="row"><label class="f grow">شماره سریال / شاسی / موتور / اتاق<input class="in num ltr" id="cq" inputmode="numeric" autocomplete="off" autofocus value="' +
    esc(q) +
    '"></label><button type="button" class="btn" data-act="livescan" data-scan="" style="align-self:flex-end">اسکن بارکد</button><button class="btn primary" type="submit" style="align-self:flex-end">نمایش پرونده</button></form></div>'
  );
}

function carIdentCard(c) {
  var I = c.I;
  return (
    '<div class="card"><div class="kvs"><div class="kv"><small>شماره سریال</small><b class="num">' +
    esc(I.serial || "—") +
    '</b></div><div class="kv"><small>رنگ</small><b>' +
    esc(I.color || "—") +
    '</b></div><div class="kv"><small>شماره شاسی</small><b class="num">' +
    esc(I.chassis || "—") +
    '</b></div><div class="kv"><small>شماره موتور</small><b class="num">' +
    esc(I.engine || "—") +
    '</b></div><div class="kv"><small>شماره اتاق</small><b class="num">' +
    esc(I.room || "—") +
    '</b></div></div><div class="row" style="margin-top:12px"><button class="btn sm" data-act="xlsx" data-q="' +
    esc(c.key) +
    '">خروجی Excel</button><button class="btn sm" data-act="pdf" data-q="' +
    esc(c.key) +
    '">خروجی PDF</button></div></div>'
  );
}

// نام امضاکنندگان یک برگه (بدون تکرار)
function signersOf(r) {
  return Object.keys(r.signs || {})
    .map(function (i) {
      return r.signs[i].by;
    })
    .filter(function (v, i, a) {
      return a.indexOf(v) === i;
    })
    .join("، ");
}

function stageRow(k, r) {
  var st = r ? stat(r) : null,
    done = r && st.signed === st.secs;
  return {
    done: done,
    html:
      '<div class="it ' +
      (done ? "ok" : "") +
      '"><div class="top2"><span class="lb">' +
      esc(SHEETS[k].name) +
      '</span><span class="prog">' +
      (done ? "تأیید شده · " + esc(r ? signersOf(r) : "") : r ? "در حال بازدید" : "ثبت نشده") +
      (st && st.open ? " · " + faDigits(st.open) + " مورد باز" : "") +
      "</span></div></div>",
  };
}

// کارت «مراحل تولید» و نام مرحله‌های ناقص
function stagesCard(c) {
  var miss = [],
    h = '<div class="card"><h2>مراحل تولید</h2><div class="items">';
  stagesFor(c.recs).forEach(function (k) {
    var row = stageRow(
      k,
      c.recs.filter(function (d) {
        return d.sheet === k;
      })[0],
    );
    if (!row.done) miss.push(SHEETS[k].name);
    h += row.html;
  });
  return { html: h + "</div></div>", miss: miss };
}

// موردهای ایراد/نمونه/کسری یک خودرو؛ closed=true بسته‌شده‌ها
function carItems(c, closed) {
  var out = [];
  c.recs.forEach(function (r) {
    Object.keys(r.items || {}).forEach(function (id) {
      var it = r.items[id];
      if ((it.r === "ng" || it.r === "sample" || it.r === "shortage") && !!it.closedAt === closed)
        out.push({ r: r, id: id, it: it });
    });
  });
  return out;
}

function openItemCard(o, ro, arch) {
  var aid = "ca_" + o.r.id + "__" + o.id;
  return (
    '<div class="it ng"><div class="nt ' +
    o.it.r +
    '"><div><span class="chip ' +
    (o.it.r === "ng" ? "open" : o.it.r) +
    '">' +
    (o.it.r === "ng" ? "ایراد" : o.it.r === "shortage" ? "کسری" : "قطعه نمونه") +
    "</span> <b>" +
    esc(SHEETS[o.r.sheet].name) +
    "</b> · " +
    esc(labelOf(o.r.sheet, o.id, o.r)) +
    "</div>" +
    (o.it.note ? "<p>" + esc(o.it.note) + "</p>" : "") +
    '<div class="m">' +
    whoWhen(o.it.by, o.it.at, "ثبت‌کننده") +
    "</div>" +
    (ro || (arch && !arch.reopened && o.it.r !== "shortage")
      ? ""
      : '<label class="f" style="margin-top:8px">اقدام انجام‌شده<textarea class="in" id="' +
        aid +
        '" placeholder="چه اقدامی برای رفع انجام شد؟"></textarea></label><div class="row"><button class="btn sm ok" data-act="cclose" data-doc="' +
        esc(o.r.id) +
        '" data-id="' +
        esc(o.id) +
        '">ثبت اقدام و بستن مورد</button></div>') +
    "</div></div>"
  );
}

function openItemsCard(open, ro, arch) {
  var h =
    '<div class="card"><h2>ایرادها، نمونه‌ها و کسری‌های باز (' + faDigits(open.length) + ")</h2>";
  if (!open.length) h += '<p class="hint" style="margin:0">مورد بازی نیست.</p>';
  open.forEach(function (o) {
    h += openItemCard(o, ro, arch);
  });
  return h + "</div>";
}

function closedItemsCard(closed) {
  if (!closed.length) return "";
  var h = '<div class="card"><h2>مورد‌های بسته‌شده (' + faDigits(closed.length) + ")</h2>";
  closed.forEach(function (o) {
    h +=
      '<div class="it"><b>' +
      esc(SHEETS[o.r.sheet].name) +
      "</b> · " +
      esc(labelOf(o.r.sheet, o.id, o.r)) +
      noteBlock(o.r, o.id, o.it, false) +
      "</div>";
  });
  return h + "</div>";
}

// بخش بایگانی برای حالتی که هنوز بایگانی نشده و کاربر فقط‌مشاهده نیست
function archiveActionHtml(c, open, miss) {
  var openDef = open.filter(function (o) {
      return o.it.r !== "shortage";
    }),
    openShort = open.filter(function (o) {
      return o.it.r === "shortage";
    });
  if (miss.length || openDef.length)
    return (
      '<p class="hint">بایگانی وقتی ممکن است که همه مراحل تأیید شده و ایراد یا نمونه‌ی بازی نمانده باشد. کسری باز مانع بایگانی نیست.' +
      (miss.length ? " مرحله‌های ناقص: " + esc(miss.join("، ")) + "." : "") +
      (openDef.length ? " " + faDigits(openDef.length) + " ایراد یا نمونه‌ی باز." : "") +
      "</p>"
    );
  return (
    '<p class="hint" style="margin-bottom:10px">' +
    (openShort.length
      ? faDigits(openShort.length) +
        " کسری باز است. خودرو با کد ۷۴ بایگانی می‌شود و کسری‌ها باز می‌ماند تا برنامه‌ریزی یا چکمن همان واحد ببندد."
      : "همه مراحل تأیید شده و مورد بازی نیست.") +
    '</p><button class="btn primary" data-act="archive" data-q="' +
    esc(c.key) +
    '">' +
    (openShort.length ? "بایگانی با کد ۷۴ به نام من" : "بایگانی پرونده به نام من") +
    "</button>"
  );
}

function archiveCard(c, arch, ro, open, miss) {
  var h = '<div class="card"><h2>بایگانی پرونده</h2>';
  if (ro)
    h +=
      '<p class="hint" style="margin:0">' +
      (arch ? "این پرونده بایگانی شده است." : "هنوز بایگانی نشده است.") +
      "</p>";
  else if (arch) h += archivedBlock(c, arch);
  else h += archiveActionHtml(c, open, miss);
  return h + "</div>";
}

// پرونده‌ی کامل خودرو برای تجاری/مالک.
function carView() {
  var q = S.carq,
    ro = carReadOnly(),
    h = carSearchCard(q, ro);
  if (!q) return h + (ro ? "" : pdiPendingCard());
  var c = carRecords(q);
  if (!c.recs.length)
    return (
      h +
      '<div class="card"><p class="hint" style="margin:0">برای این شماره هیچ برگه‌ای ثبت نشده است.</p></div>'
    );
  var arch = archOf(c.key),
    stages = stagesCard(c),
    open = carItems(c, false);
  return (
    h +
    carIdentCard(c) +
    stages.html +
    openItemsCard(open, ro, arch) +
    closedItemsCard(carItems(c, true)) +
    pshCarCard(c) +
    cpfCarCard(c) +
    archiveCard(c, arch, ro, open, stages.miss) +
    (arch && !ro ? pdiCard(c, arch) : "")
  );
}

function archiveView() {
  var h = '<div class="card"><h2>بایگانی (' + faDigits(S.data.arch.length) + ")</h2>";
  if (!S.data.arch.length)
    return h + '<p class="hint" style="margin:0">هنوز پرونده‌ای بایگانی نشده است.</p></div>';
  h +=
    '<div class="tbl"><table><thead><tr><th>شماره شاسی</th><th>سریال</th><th>رنگ</th><th>بایگانی‌کننده</th><th>تاریخ و ساعت</th><th></th></tr></thead><tbody>';
  S.data.arch
    .slice()
    .sort(function (a, b) {
      return (b.at || "") < (a.at || "") ? -1 : 1;
    })
    .forEach(function (a) {
      h +=
        '<tr><td><b class="num">' +
        esc(a.chassis || a.key) +
        '</b></td><td class="num">' +
        esc(a.serial || "") +
        "</td><td>" +
        esc(a.color || "") +
        (a.code745
          ? ' <span class="chip open">کد ۷۴' +
            (function () {
              var n = 0;
              carRecords(a.key).recs.forEach(function (r) {
                Object.keys(r.items || {}).forEach(function (i3) {
                  var x = r.items[i3];
                  if (x.r === "shortage" && !x.closedAt) n++;
                });
              });
              return n ? " · " + faDigits(n) + " کسری باز" : " · کسری‌ها بسته شد";
            })() +
            "</span>"
          : "") +
        "</td><td>" +
        esc(a.by || "") +
        "</td><td>" +
        esc(when(a.at)) +
        '</td><td><button class="btn sm" data-act="opencar" data-q="' +
        esc(a.key) +
        '">مشاهده</button></td></tr>';
    });
  return h + "</tbody></table></div></div>";
}

function clickCommercial(ev, el, a, id, d) {
  if ((a === "repcsv" || a === "repmcsv") && isCom() && S.rd) {
    exportReportCsv(a);
    return true;
  }
  if (a === "cclose" && isCom()) return commercial_cclose(ev, el, a, id, d);
  if (a === "archive" && isCom()) {
    archiveCar(el.getAttribute("data-q"));
    return true;
  }
  if (a === "rearchive" && isCom()) {
    rearchiveCar(el.getAttribute("data-q"));
    return true;
  }
  if (a === "pdiadd" && isCom()) {
    pdiReturn(el.getAttribute("data-q"));
    return true;
  }
  if (a === "opencar" && isCom()) {
    S.carq = el.getAttribute("data-q");
    S.tab = "car";
    render();
    return true;
  }
  return false;
}

// اقدام «cclose» از clickCommercial
function commercial_cclose(ev, el, a, id, d) {
  var doc = el.getAttribute("data-doc"),
    note = fieldValue("ca_" + doc + "__" + id);
  if (!note) {
    toast("اقدام انجام‌شده را بنویسید.");
    return true;
  }
  var mm = {};
  mm[id] = {
    closedAt: nowIso(),
    closedBy: S.user.name,
    closedById: S.user.id,
    closeNote: note,
  };
  save(function () {
    return store.update("inspections", doc, { items: mm });
  }, "مورد بسته شد");
  return true;
}
