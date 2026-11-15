/* ════════════════════════════════════════════════════════════
   فصل 40 — واحد برنامه‌ریزی: توقف خط و کسری برنامه‌ریزی
   ثبت توقف خط (شروع/پایان/ویرایش)، ثبت کسری برنامه‌ریزی با اسکن شماره‌ی خودرو.
   توابع اصلی: canStop، openStops، stopTab، stopOptions، minuteOfDay، stopTimeMs، stopError، stopAdd و …
   ════════════════════════════════════════════════════════════ */

/* ---------- ثبت توقف خط (واحد برنامه‌ریزی) ---------- */
function canStop() {
  return !!S.user && S.user.station === "planning";
}

function openStops() {
  return (S.stops || []).filter(function (x) {
    return !x.endAt;
  });
}

function stopTab() {
  var n = openStops().length;
  return (
    '<button class="tab" role="tab" data-act="tab" data-t="stop" aria-selected="' +
    (S.tab === "stop") +
    '">توقف خط' +
    (n ? '<span class="cnt">' + faDigits(n) + "</span>" : "") +
    "</button>"
  );
}

function stopOptions(list, cur) {
  var all = cur && list.indexOf(cur) < 0 ? list.concat([cur]) : list;
  return all
    .map(function (v) {
      return "<option" + (v === cur ? " selected" : "") + ">" + esc(v) + "</option>";
    })
    .join("");
}

function minuteOfDay(iso) {
  return Math.floor(((Date.parse(iso) + TEHRAN_MS) % DAY_MS) / 60000);
}

function stopTimeMs(min) {
  return dayStart(Date.now()) + min * 60000;
}

function stopError(line, reason, sm, em, now) {
  if (!line || !reason) return "خط و دلیل توقف را انتخاب کنید.";
  if ((fieldValue("st_from") && sm == null) || (fieldValue("st_to") && em == null))
    return "ساعت را فقط با عدد بنویسید (مثلاً ۰۹۳۰).";
  var start = sm == null ? now : stopTimeMs(sm);
  if (start > now + 60000) return "ساعت شروع از الان دیرتر است.";
  if (em != null) {
    var end = stopTimeMs(em);
    if (end <= start) return "ساعت پایان باید بعد از ساعت شروع باشد.";
    if (end > now + 60000) return "ساعت پایان از الان دیرتر است.";
  }
  if (
    em == null &&
    openStops().some(function (x) {
      return x.line === line;
    })
  )
    return "برای این خط یک توقف باز هست؛ اول آن را پایان دهید.";
  return "";
}

// ثبت توقف خط توسط واحد برنامه‌ریزی.
function stopAdd() {
  var line = fieldValue("st_line"),
    reason = fieldValue("st_reason"),
    now = Date.now();
  var sm = fieldValue("st_from") ? parseHm(fieldValue("st_from")) : null,
    em = fieldValue("st_to") ? parseHm(fieldValue("st_to")) : null;
  var err = stopError(line, reason, sm, em, now);
  if (err) {
    toast(err);
    return;
  }
  var doc = {
    kind: "stop",
    line: line,
    reason: reason,
    note: fieldValue("st_note"),
    startAt: new Date(sm == null ? now : stopTimeMs(sm)).toISOString(),
    endAt: em == null ? "" : new Date(stopTimeMs(em)).toISOString(),
    by: S.user.name,
    byId: S.user.id,
    at: nowIso(),
  };
  ["st_from", "st_to", "st_note"].forEach(function (k) {
    var e = document.getElementById(k);
    if (e) e.value = "";
  });
  save(function () {
    return store.set("users", "stop_" + uid(), doc);
  }, "توقف ثبت شد");
}

/* خطای ویرایش توقف؛ ساعت‌ها روی همان روزِ شروع توقف حساب می‌شوند */
function stopEditError(x, line, reason, sm, em, now) {
  if (!line || !reason) return "خط و دلیل توقف را انتخاب کنید.";
  if (sm == null || (fieldValue("se_to") && em == null))
    return "ساعت را فقط با عدد بنویسید (مثلاً ۰۹۳۰).";
  var day = dayStart(Date.parse(x.startAt)),
    start = day + sm * 60000,
    end = em == null ? 0 : day + em * 60000;
  if (start > now + 60000 || end > now + 60000) return "ساعت از الان دیرتر است.";
  if (em != null && end <= start) return "ساعت پایان باید بعد از ساعت شروع باشد.";
  if (
    em == null &&
    openStops().some(function (o) {
      return o.id !== x.id && o.line === line;
    })
  )
    return "برای این خط یک توقف باز دیگر هست؛ اول آن را پایان دهید.";
  return "";
}

function stopEdit(id) {
  var x = (S.stops || []).filter(function (r) {
    return r.id === id;
  })[0];
  if (!x) return;
  var line = fieldValue("se_line"),
    reason = fieldValue("se_reason"),
    sm = parseHm(fieldValue("se_from")),
    em = fieldValue("se_to") ? parseHm(fieldValue("se_to")) : null;
  var err = stopEditError(x, line, reason, sm, em, Date.now());
  if (err) {
    toast(err);
    return;
  }
  var day = dayStart(Date.parse(x.startAt)),
    ch = {
      line: line,
      reason: reason,
      note: fieldValue("se_note"),
      startAt: new Date(day + sm * 60000).toISOString(),
      endAt: em == null ? "" : new Date(day + em * 60000).toISOString(),
      editBy: S.user.name,
      editById: S.user.id,
      editAt: nowIso(),
    };
  S.stopEdit = "";
  save(function () {
    return store.update("users", id, ch);
  }, "توقف ویرایش شد");
}

// پایان دادن به توقف باز.
function stopEnd(id) {
  var x = (S.stops || []).filter(function (r) {
    return r.id === id;
  })[0];
  if (!x || x.endAt) return;
  save(function () {
    return store.update("users", id, {
      endAt: nowIso(),
      endBy: S.user.name,
      endById: S.user.id,
    });
  }, "پایان توقف ثبت شد");
}

function stopEditForm(x) {
  return (
    '<form data-form="stopedit" data-id="' +
    esc(x.id) +
    '" class="mgform"><div class="it">' +
    '<label class="f">خط<select class="in" id="se_line">' +
    stopOptions(listK("stopLines"), x.line) +
    "</select></label>" +
    '<label class="f">دلیل توقف<select class="in" id="se_reason">' +
    stopOptions(listK("stopReasons"), x.reason) +
    "</select></label>" +
    '<div class="mgrow"><label class="f">ساعت شروع<input class="in num ltr" id="se_from" inputmode="numeric" autocomplete="off" value="' +
    fmtHm(minuteOfDay(x.startAt)) +
    '"></label>' +
    '<label class="f">ساعت پایان (خالی = هنوز ادامه دارد)<input class="in num ltr" id="se_to" inputmode="numeric" autocomplete="off" value="' +
    (x.endAt ? fmtHm(minuteOfDay(x.endAt)) : "") +
    '"></label></div>' +
    '<label class="f">توضیح<input class="in" id="se_note" autocomplete="off" value="' +
    esc(x.note || "") +
    '"></label>' +
    '<div class="row"><button class="btn primary sm" type="submit">ذخیره‌ی تغییر</button><button class="btn sm" type="button" data-act="stopeditno">انصراف</button></div></div></form>'
  );
}

function stopManageBtns(x) {
  if (S.stopDel === x.id)
    return (
      '<div class="row" style="margin-top:8px"><button class="btn sm" data-act="stopdelyes" data-id="' +
      esc(x.id) +
      '">تأیید حذف</button><button class="btn sm" data-act="stopdelno">انصراف</button></div>'
    );
  return (
    '<div class="row" style="margin-top:8px"><button class="btn sm" data-act="stopedit" data-id="' +
    esc(x.id) +
    '">ویرایش</button><button class="btn sm" data-act="stopdelask" data-id="' +
    esc(x.id) +
    '">حذف</button></div>'
  );
}

function stopItem(x, now, canEnd) {
  if (canEnd && S.stopEdit === x.id) return stopEditForm(x);
  var end = x.endAt ? Date.parse(x.endAt) : now,
    dur = elapsedTxt(end - Date.parse(x.startAt));
  return (
    '<div class="it"><div class="row"><b class="grow">' +
    esc(x.line) +
    '</b><span class="chip ' +
    (x.endAt ? "closed" : "open") +
    '">' +
    (x.endAt ? "پایان یافته" : "باز") +
    "</span></div>" +
    '<div class="m">دلیل: ' +
    esc(x.reason) +
    "</div>" +
    '<div class="m">شروع: ' +
    esc(dateOnly(x.startAt)) +
    " — ساعت " +
    esc(timeHM(x.startAt)) +
    "</div>" +
    (x.endAt
      ? '<div class="m">پایان: ' +
        esc(dateOnly(x.endAt)) +
        " — ساعت " +
        esc(timeHM(x.endAt)) +
        "</div>"
      : "") +
    '<div class="m">مدت: ' +
    dur +
    "</div>" +
    (x.note ? '<div class="m">توضیح: ' + esc(x.note) + "</div>" : "") +
    '<div class="m">' +
    whoWhen(x.by, x.at, "ثبت‌کننده") +
    "</div>" +
    (x.editAt ? '<div class="m">' + whoWhen(x.editBy, x.editAt, "ویرایش‌کننده") + "</div>" : "") +
    (canEnd && !x.endAt
      ? '<button class="btn sm primary" data-act="stopend" data-id="' +
        esc(x.id) +
        '" style="margin-top:8px">پایان توقف (همین حالا)</button>'
      : "") +
    (canEnd ? stopManageBtns(x) : "") +
    "</div>"
  );
}

function stopView() {
  var now = Date.now(),
    all = (S.stops || []).slice().sort(function (a, b) {
      return (b.startAt || "") < (a.startAt || "") ? -1 : 1;
    });
  var open = all.filter(function (x) {
      return !x.endAt;
    }),
    done = all
      .filter(function (x) {
        return x.endAt;
      })
      .slice(0, 15);
  var h =
    '<div class="card"><h2>ثبت توقف خط</h2><form data-form="stopadd" data-stp="1" class="mgform">' +
    '<label class="f" data-step="خط و دلیل توقف">خط<select class="in" id="st_line">' +
    stopOptions(listK("stopLines")) +
    "</select></label>" +
    '<label class="f" data-step="خط و دلیل توقف">دلیل توقف<select class="in" id="st_reason">' +
    stopOptions(listK("stopReasons")) +
    "</select></label>" +
    '<div class="mgrow" data-step="زمان توقف"><label class="f">ساعت شروع<input class="in num ltr" id="st_from" inputmode="numeric" autocomplete="off" placeholder="0930"><small class="hint">خالی = همین حالا</small></label>' +
    '<label class="f">ساعت پایان<input class="in num ltr" id="st_to" inputmode="numeric" autocomplete="off" placeholder="1000"><small class="hint">خالی = هنوز ادامه دارد</small></label></div>' +
    '<label class="f" data-step="توضیح (اختیاری)">توضیح (اختیاری)<input class="in" id="st_note" autocomplete="off"></label>' +
    '<button class="btn primary" type="submit">ثبت توقف</button></form></div>';
  h +=
    '<div class="card"><h2>توقف‌های باز (' +
    faDigits(open.length) +
    ")</h2>" +
    (open.length
      ? open
          .map(function (x) {
            return stopItem(x, now, true);
          })
          .join("")
      : '<p class="hint" style="margin:0">توقف بازی نیست.</p>') +
    "</div>";
  if (done.length)
    h +=
      '<div class="card"><h2>آخرین توقف‌های پایان‌یافته</h2>' +
      done
        .map(function (x) {
          return stopItem(x, now, canStop());
        })
        .join("") +
      "</div>";
  return h;
}

/* ---------- کسری‌های برنامه‌ریزی (جدا از ایراد/کسری چکمن‌ها؛ هر ردیف یک سند psh_*) ---------- */
function isPlanningUser(u) {
  return !!u && u.station === "planning" && !isMgrUser(u) && !isCustomRole(u);
}

function canPlanShort() {
  return isPlanningUser(S.user);
}

function openPsh() {
  return (S.pshorts || []).filter(function (x) {
    return !x.closedAt;
  });
}

function pshTab() {
  var n = openPsh().length;
  return (
    '<button class="tab" role="tab" data-act="tab" data-t="psh" aria-selected="' +
    (S.tab === "psh") +
    '">کسری برنامه‌ریزی' +
    (n ? '<span class="cnt">' + faDigits(n) + "</span>" : "") +
    "</button>"
  );
}

var PSH_ST = {
  "شاسی و موتور": "chassis",
  تزیینات: "trim",
  "نهایی بالا": "st4",
  "نهایی پایین": "st5",
};

function pshStLabel(st) {
  return (
    Object.keys(PSH_ST).filter(function (k) {
      return PSH_ST[k] === st;
    })[0] || ""
  );
}

/* «کد — شرح — ایستگاه مسئول»؛ ایستگاه و کد اختیاری‌اند */
function pshSplit(item) {
  var parts = item.split(" — "),
    st = "";
  if (parts.length > 1 && PSH_ST[parts[parts.length - 1]]) {
    st = PSH_ST[parts.pop()];
  }
  return parts.length > 1
    ? { code: parts[0], text: parts.slice(1).join(" — "), st: st }
    : { code: "", text: parts[0], st: st };
}

function pshPicker() {
  var sel = S.psSel || {},
    q = norm(S.psQ || "");
  return listK("planShorts")
    .map(function (it) {
      var p = pshSplit(it),
        hide = q && norm(it).indexOf(q) < 0;
      return (
        '<label class="pshrow" data-q="' +
        esc(it) +
        '"' +
        (hide ? ' style="display:none"' : "") +
        '><input type="checkbox" data-act="pssel" data-v="' +
        esc(it) +
        '"' +
        (sel[it] ? " checked" : "") +
        '><span class="num ltr">' +
        esc(p.code) +
        '</span><span class="grow">' +
        esc(p.text) +
        '<small class="hint" style="display:block">' +
        esc(pshStLabel(p.st) || "ایستگاه مشخص نشده") +
        "</small></span></label>"
      );
    })
    .join("");
}

function pshFilterDom(v) {
  var q = norm(v);
  Array.prototype.forEach.call(document.querySelectorAll("#pshlist .pshrow"), function (e) {
    e.style.display = !q || norm(e.getAttribute("data-q")).indexOf(q) >= 0 ? "" : "none";
  });
}

function pshFindDom(v) {
  var q = digits(v);
  Array.prototype.forEach.call(document.querySelectorAll("#pshopen [data-k]"), function (e) {
    e.style.display = !q || e.getAttribute("data-k").indexOf(q) >= 0 ? "" : "none";
  });
}

function pshSelCount() {
  return Object.keys(S.psSel || {}).length;
}

function pshAddCard() {
  return (
    '<div class="card"><h2>ثبت کسری برای یک خودرو</h2><form data-form="pshadd" data-stp="1" class="mgform">' +
    '<div class="row" data-step="شماره‌ی خودرو" data-req="1"><label class="f grow">سریال، شاسی، موتور یا اتاق<input class="in num ltr" id="ps_key" inputmode="numeric" autocomplete="off"></label><button type="button" class="btn" data-act="livescan" data-scan="ps_key" style="align-self:flex-end">اسکن بارکد</button></div>' +
    '<label class="f" data-step="انتخاب کسری‌ها">جستجو در فهرست (کد یا نام قطعه)<input class="in" id="psq" autocomplete="off" value="' +
    esc(S.psQ || "") +
    '"></label>' +
    '<div id="pshlist" class="pshlist" data-step="انتخاب کسری‌ها">' +
    pshPicker() +
    "</div>" +
    '<button class="btn primary" type="submit">ثبت <span id="pshn">' +
    faDigits(pshSelCount()) +
    "</span> کسری</button></form></div>"
  );
}

// ثبت کسری برنامه‌ریزی برای یک خودرو.
function pshAdd() {
  var typed = digits(fieldValue("ps_key")),
    sel = Object.keys(S.psSel || {});
  if (!typed) {
    toast("شماره‌ی خودرو را بنویسید");
    return;
  }
  if (!sel.length) {
    toast("حداقل یک کسری را انتخاب کنید");
    return;
  }
  var car = carRecords(typed).key,
    have = {};
  openPsh().forEach(function (x) {
    if (x.car === car) have[x.code + "|" + x.text] = 1;
  });
  var now = nowIso(),
    docs = [];
  sel.forEach(function (it) {
    var p = pshSplit(it);
    if (!have[p.code + "|" + p.text])
      docs.push({
        kind: "pshort",
        key: typed,
        car: car,
        code: p.code,
        text: p.text,
        st: p.st,
        by: S.user.name,
        byId: S.user.id,
        at: now,
        closedAt: "",
        closedBy: "",
        closedById: "",
      });
  });
  if (!docs.length) {
    toast("این کسری‌ها برای این خودرو از قبل باز هستند");
    return;
  }
  S.psSel = {};
  S.psQ = "";
  var k = document.getElementById("ps_key");
  if (k) k.value = "";
  save(
    function () {
      return Promise.all(
        docs.map(function (d) {
          return store.set("users", "psh_" + uid(), d);
        }),
      );
    },
    faDigits(docs.length) + " کسری ثبت شد",
  );
}

// رفع کسری برنامه‌ریزی (واحد برنامه‌ریزی، تجاری، مالک یا ایستگاه مسئول).
function pshClose(id) {
  var x = (S.pshorts || []).filter(function (r) {
    return r.id === id;
  })[0];
  if (!x || x.closedAt) return;
  save(function () {
    return store.update("users", id, {
      closedAt: nowIso(),
      closedBy: S.user.name,
      closedById: S.user.id,
    });
  }, "کسری رفع شد");
}

/* رفع: برنامه‌ریزی، تجاری، مدیر و چکمن ایستگاه مسئولِ همان کسری */
function pshCanClose(x) {
  var u = S.user;
  return (
    !!u &&
    !x.closedAt &&
    (u.id === "owner" ||
      isPlanningUser(u) ||
      u.station === "commercial" ||
      (!!x.st && u.station === x.st))
  );
}

function pshRowActions(x) {
  var del = canPlanShort() && S.psDel === x.id;
  if (del)
    return (
      '<div class="row" style="margin-top:8px"><button class="btn sm" data-act="pshdelyes" data-id="' +
      esc(x.id) +
      '">تأیید حذف</button><button class="btn sm" data-act="pshdelno">انصراف</button></div>'
    );
  if (!pshCanClose(x)) return "";
  return (
    '<div class="row" style="margin-top:8px"><button class="btn sm primary" data-act="pshclose" data-id="' +
    esc(x.id) +
    '">رفع شد</button>' +
    (canPlanShort()
      ? '<button class="btn sm" data-act="pshdelask" data-id="' + esc(x.id) + '">حذف</button>'
      : "") +
    "</div>"
  );
}

function pshRow(x) {
  return (
    '<div class="it' +
    (x.closedAt ? "" : " ng") +
    '"><div class="row"><b class="grow"><span class="num ltr">' +
    esc(x.code) +
    "</span> " +
    esc(x.text) +
    '</b><span class="chip ' +
    (x.closedAt ? "closed" : "shortage") +
    '">' +
    (x.closedAt ? "رفع شد" : "کسری") +
    "</span></div>" +
    '<div class="m">ایستگاه مسئول: ' +
    esc(pshStLabel(x.st) || "مشخص نشده") +
    "</div>" +
    '<div class="m">' +
    whoWhen(x.by, x.at, "ثبت‌کننده") +
    "</div>" +
    (x.closedAt
      ? '<div class="m">' + whoWhen(x.closedBy, x.closedAt, "رفع‌کننده") + "</div>"
      : "") +
    pshRowActions(x) +
    "</div>"
  );
}

function pshByCar(list) {
  var g = {},
    order = [];
  list.forEach(function (x) {
    if (!g[x.car]) {
      g[x.car] = [];
      order.push(x.car);
    }
    g[x.car].push(x);
  });
  return order.map(function (k) {
    return {
      car: k,
      list: g[k].sort(function (a, b) {
        return (a.at || "") < (b.at || "") ? -1 : 1;
      }),
    };
  });
}

function pshOpenCard() {
  var open = openPsh(),
    gs = pshByCar(open).slice(0, 60);
  var h = '<div class="card"><h2>کسری‌های باز برنامه‌ریزی (' + faDigits(open.length) + ")</h2>";
  if (!open.length) return h + '<p class="hint" style="margin:0">کسری بازی نیست.</p></div>';
  h +=
    '<label class="f">پیدا کردن خودرو<input class="in num ltr" id="psf" inputmode="numeric" autocomplete="off"></label><div id="pshopen">';
  gs.forEach(function (g) {
    h +=
      '<div data-k="' +
      esc(g.car) +
      '"><h3 style="margin:14px 0 6px">خودرو <b class="num">' +
      esc(g.car) +
      '</b> <span class="chip open">' +
      faDigits(g.list.length) +
      " کسری</span></h3>" +
      g.list.map(pshRow).join("") +
      "</div>";
  });
  return h + "</div></div>";
}

function pshDoneCard() {
  var done = (S.pshorts || [])
    .filter(function (x) {
      return x.closedAt;
    })
    .sort(function (a, b) {
      return a.closedAt < b.closedAt ? 1 : -1;
    })
    .slice(0, 15);
  if (!done.length) return "";
  return (
    '<div class="card"><h2>آخرین کسری‌های رفع‌شده</h2>' +
    done
      .map(function (x) {
        return '<div class="m"><b class="num">' + esc(x.car) + "</b></div>" + pshRow(x);
      })
      .join("") +
    "</div>"
  );
}

function pshView() {
  return pshAddCard() + pshOpenCard() + pshDoneCard();
}

/* در پرونده‌ی خودرو: فقط نمایش */
function pshForCar(c) {
  var ids = [c.key, c.I.serial, c.I.chassis, c.I.engine, c.I.room].filter(Boolean);
  return (S.pshorts || [])
    .filter(function (x) {
      return ids.indexOf(x.car) >= 0 || ids.indexOf(x.key) >= 0;
    })
    .sort(function (a, b) {
      return (a.at || "") < (b.at || "") ? -1 : 1;
    });
}

/* نوار کسری‌های باز برنامه‌ریزی بالای ویزارد هر ایستگاه */
function pshWizBlock(d) {
  var open = pshForCar(carRecords(d.key)).filter(function (x) {
    return !x.closedAt;
  });
  if (!open.length) return "";
  var h =
    '<button type="button" class="histbar hot" data-act="pshtoggle" aria-expanded="' +
    !!S.pshWizOpen +
    '"><b>کسری برنامه‌ریزی</b><span>' +
    faDigits(open.length) +
    " کسری باز</span><i>" +
    (S.pshWizOpen ? "▴" : "▾") +
    "</i></button>";
  return h + (S.pshWizOpen ? '<div class="histlist">' + open.map(pshRow).join("") + "</div>" : "");
}

function pshCarCard(c) {
  var list = pshForCar(c);
  if (!list.length) return "";
  var n = list.filter(function (x) {
    return !x.closedAt;
  }).length;
  return (
    '<div class="card"><h2>کسری‌های برنامه‌ریزی (' +
    faDigits(n) +
    " باز از " +
    faDigits(list.length) +
    ")</h2>" +
    list
      .map(function (x) {
        return pshRow(x);
      })
      .join("") +
    "</div>"
  );
}

function clickPlanShort(ev, el, a, id, d) {
  if (a === "pshtoggle") {
    S.pshWizOpen = !S.pshWizOpen;
    render();
    return true;
  }
  if (a === "pssel") return planShort_pssel(ev, el, a, id, d);
  if (a === "pshclose") return planShort_pshclose(ev, el, a, id, d);
  if (!canPlanShort()) return false;
  if (a === "pshdelask") {
    S.psDel = id;
    render();
    return true;
  }
  if (a === "pshdelno") {
    S.psDel = "";
    render();
    return true;
  }
  if (a === "pshdelyes") return planShort_pshdelyes(ev, el, a, id, d);
  return false;
}

// اقدام «pssel» از clickPlanShort
function planShort_pssel(ev, el, a, id, d) {
  var v = el.getAttribute("data-v");
  S.psSel = S.psSel || {};
  if (el.checked) S.psSel[v] = 1;
  else delete S.psSel[v];
  var n = document.getElementById("pshn");
  if (n) n.textContent = faDigits(pshSelCount());
  return true;
}

// اقدام «pshclose» از clickPlanShort
function planShort_pshclose(ev, el, a, id, d) {
  var px = (S.pshorts || []).filter(function (r) {
    return r.id === id;
  })[0];
  if (px && pshCanClose(px)) pshClose(id);
  return true;
}

// اقدام «pshdelyes» از clickPlanShort
function planShort_pshdelyes(ev, el, a, id, d) {
  S.psDel = "";
  save(function () {
    return store.del("users", id);
  }, "کسری حذف شد");
  return true;
}

/* دقیقه‌های توقف هر خط در بازه‌ی [from,to]؛ توقف‌های هم‌پوشان یک خط یک‌بار شمرده می‌شوند */
function stopMsByLine(from, to, now) {
  var by = {};
  (S.stops || []).forEach(function (x) {
    var a = Math.max(Date.parse(x.startAt), from),
      b = Math.min(x.endAt ? Date.parse(x.endAt) : now, to);
    if (b > a) (by[x.line] = by[x.line] || []).push([a, b]);
  });
  Object.keys(by).forEach(function (k) {
    var iv = by[k].sort(function (p, q) {
        return p[0] - q[0];
      }),
      sum = 0,
      cur = null;
    iv.forEach(function (r) {
      if (cur && r[0] <= cur[1]) cur[1] = Math.max(cur[1], r[1]);
      else {
        if (cur) sum += cur[1] - cur[0];
        cur = [r[0], r[1]];
      }
    });
    if (cur) sum += cur[1] - cur[0];
    by[k] = sum;
  });
  return by;
}

function clickStops(ev, el, a, id, d) {
  if (!canStop()) return false;
  if (a === "stopedit") {
    S.stopEdit = id;
    S.stopDel = "";
    render();
    return true;
  }
  if (a === "stopeditno") {
    S.stopEdit = "";
    render();
    return true;
  }
  if (a === "stopdelask") {
    S.stopDel = id;
    S.stopEdit = "";
    render();
    return true;
  }
  if (a === "stopdelno") {
    S.stopDel = "";
    render();
    return true;
  }
  if (a === "stopdelyes") {
    S.stopDel = "";
    save(function () {
      return store.del("users", id);
    }, "توقف حذف شد");
    return true;
  }
  return false;
}

function submitStopEdit(ev) {
  stopEdit(ev.target.getAttribute("data-id"));
}

function submitStopAdd() {
  stopAdd();
}
