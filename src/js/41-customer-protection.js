/* ════════════════════════════════════════════════════════════
   فصل 41 — فرم حفاظت از مشتری
   ثبت فرم توسط سرپرست، امضای واحدها، اعتبار، بستن فرم با اقدام اصلاحی.
   توابع اصلی: cpfRows، mgrUnitOf، canCpfCreate، cpfAllowed، cpfTab، cpfSlots، cpfSigned، cpfDateKey و …
   ════════════════════════════════════════════════════════════ */

/* فرم‌های حفاظت از مشتری مرتبط با خودرو؛ داده‌ی ساده برای PDF و Excel */
function cpfRows(c) {
  return cpfForCar(c, false).map(function (f) {
    var sigs = cpfSlots(f)
      .map(function (x) {
        var sg = cpfSigned(f, x.k);
        return (
          x.label +
          (x.k === "oth" ? " (" + f.otherUnit + ")" : "") +
          ": " +
          (sg ? sg.by + " — " + dateOnly(sg.at) + " " + timeHM(sg.at) : "در انتظار امضا")
        );
      })
      .join("\n");
    return [
      f.no || "—",
      CPF_STATUS[cpfStatus(f)][0],
      f.defect || "—",
      f.action || "—",
      f.vtxt || "—",
      sigs,
      f.closedAt
        ? (f.corrective || "—") +
          "\nبسته‌کننده: " +
          (f.closedBy || "—") +
          "\nتاریخ: " +
          dateOnly(f.closedAt) +
          "\nساعت: " +
          timeHM(f.closedAt)
        : "—",
    ];
  });
}

/* ---------- فرم حفاظت از مشتری (FPQ 3503/01): ثبت با سرپرست تولید، امضای هر واحد با حساب خودش؛ سند cpf_* ---------- */
var CPF_SLOTS = [
  { k: "eng", label: "نماینده مهندسی", list: "cpfEng" },
  { k: "peng", label: "نماینده مهندسی تولید", list: "cpfProdEng" },
  { k: "sup", label: "مسئول / سرپرست تولید (جهت اجرا)" },
  { k: "qual", label: "نماینده کیفیت (تضمین / کنترل کیفیت)", list: "cpfQual" },
  { k: "oth", label: "نماینده سایر واحدهای ذیربط" },
];

var CPF_STATUS = {
  pending: ["در انتظار امضا", ""],
  active: ["معتبر", "shortage"],
  expired: ["منقضی", "open"],
  closed: ["بسته شد", "closed"],
};

function mgrUnitOf(u) {
  if (!u) return "";
  if (u.mgrUnit) return u.mgrUnit;
  var r = (S.data.users || []).filter(function (x) {
    return x.id === u.id;
  })[0];
  return (r && r.mgrUnit) || "";
}

function canCpfCreate() {
  return !!S.user && isCustomRole(S.user) && rolePerm("cpf");
}

function cpfAllowed() {
  var u = S.user;
  return !!u && (u.id === "owner" || u.station === "quality" || isMgrUser(u) || canCpfCreate());
}

function cpfTab() {
  var n = cpfWaiting().length;
  return (
    '<button class="tab" role="tab" data-act="tab" data-t="cpf" aria-selected="' +
    (S.tab === "cpf") +
    '">فرم حفاظت از مشتری' +
    (n ? '<span class="cnt">' + faDigits(n) + "</span>" : "") +
    "</button>"
  );
}

function cpfSlots(f) {
  return CPF_SLOTS.filter(function (x) {
    return x.k !== "oth" || f.otherUnit;
  });
}

function cpfSigned(f, k) {
  return f["sig_" + k];
}

function cpfDateKey(y, m, d) {
  return y * 10000 + m * 100 + d;
}

// وضعیت فرم: در انتظار امضا / فعال / منقضی / بسته.
function cpfStatus(f) {
  if (f.closedAt) return "closed";
  if (
    cpfSlots(f).some(function (x) {
      return !cpfSigned(f, x.k);
    })
  )
    return "pending";
  var t = toJalali(nowIso());
  return t && cpfDateKey(t.y, t.m, t.d) > f.vk ? "expired" : "active";
}

function cpfCanSign(f, k) {
  var u = S.user;
  if (
    !u ||
    cpfSigned(f, k) ||
    f.closedAt ||
    (u.role !== "mgr" && !(k === "qual" && u.station === "quality"))
  )
    return false;
  if (k === "oth") return mgrUnitOf(u) === f.otherUnit;
  if (k === "sup") return false;
  if (k === "qual" && u.station === "quality") return true;
  var slot = CPF_SLOTS.filter(function (x) {
    return x.k === k;
  })[0];
  return listK(slot.list).indexOf(mgrUnitOf(u)) >= 0;
}

function cpfWaiting() {
  return (S.cpfs || []).filter(function (f) {
    return (
      !f.closedAt &&
      cpfSlots(f).some(function (x) {
        return cpfCanSign(f, x.k);
      })
    );
  });
}

function cpfParseDate(txt) {
  var t = digits(txt).replace(/[\/\-.]/g, "");
  if (!/^\d{8}$/.test(t)) return null;
  var y = +t.slice(0, 4),
    m = +t.slice(4, 6),
    d = +t.slice(6);
  return y < 1300 || y > 1500 || m < 1 || m > 12 || d < 1 || d > 31
    ? null
    : {
        y: y,
        m: m,
        d: d,
        k: cpfDateKey(y, m, d),
        txt: y + "/" + (m < 10 ? "0" : "") + m + "/" + (d < 10 ? "0" : "") + d,
      };
}

function cpfCars(txt) {
  var seen = {},
    out = [];
  String(txt || "")
    .split(/[\s,،;؛\n]+/)
    .forEach(function (v) {
      var n = digits(v);
      if (n && !seen[n]) {
        seen[n] = 1;
        out.push(n);
      }
    });
  return out;
}

function cpfSignature() {
  return { by: S.user.name, byId: S.user.id, at: nowIso() };
}

// ثبت «فرم حفاظت از مشتری» توسط سرپرست تولید.
function cpfAdd() {
  var date = cpfParseDate(fieldValue("cf_valid")),
    cars = cpfCars(fieldValue("cf_cars")),
    defect = fieldValue("cf_defect"),
    action = fieldValue("cf_action");
  if (!defect || !action) {
    toast("شرح ایراد و شرح اقدام حفاظت از مشتری را بنویسید");
    return;
  }
  if (!date) {
    toast("تاریخ اعتبار را مثل ۱۴۰۵/۰۸/۲۰ بنویسید");
    return;
  }
  var t = toJalali(nowIso());
  if (t && date.k < cpfDateKey(t.y, t.m, t.d)) {
    toast("تاریخ اعتبار گذشته است");
    return;
  }
  if (!cars.length) {
    toast("شماره‌ی دست‌کم یک خودرو را بنویسید");
    return;
  }
  var f = {
    kind: "cpf",
    no: fieldValue("cf_no"),
    line: fieldValue("cf_line"),
    area: fieldValue("cf_area"),
    qrci: fieldValue("cf_qrci"),
    defect: defect,
    cause: fieldValue("cf_cause"),
    informed: !!(document.getElementById("cf_informed") || {}).checked,
    action: action,
    vk: date.k,
    vtxt: date.txt,
    cars: cars,
    otherUnit: fieldValue("cf_other"),
    sig_sup: cpfSignature(),
    createdAt: nowIso(),
    closedAt: "",
  };
  ["cf_no", "cf_qrci", "cf_defect", "cf_cause", "cf_action", "cf_valid", "cf_cars"].forEach(
    function (i) {
      var e = document.getElementById(i);
      if (e) e.value = "";
    },
  );
  save(function () {
    return store.set("users", "cpf_" + uid(), f);
  }, "فرم ثبت شد و امضای سرپرست تولید به نام شما ثبت شد");
}

// امضای واحدها (مهندسی، مهندسی تولید، کیفیت، واحد دیگر).
function cpfSign(id, k) {
  var f = (S.cpfs || []).filter(function (r) {
    return r.id === id;
  })[0];
  if (!f || !cpfCanSign(f, k)) return;
  var ch = {};
  ch["sig_" + k] = cpfSignature();
  save(function () {
    return store.update("users", id, ch);
  }, "امضا ثبت شد");
}

// بستن فرم با اقدام اصلاحی و درس آموخته.
function cpfClose(id) {
  var f = (S.cpfs || []).filter(function (r) {
      return r.id === id;
    })[0],
    corr = fieldValue("cc_corr_" + id);
  if (!f || f.closedAt || !corr) {
    toast("اقدام اصلاحی و علت ریشه‌ای را بنویسید");
    return;
  }
  save(function () {
    return store.update("users", id, {
      corrective: corr,
      opinion: fieldValue("cc_op_" + id),
      lesson: fieldValue("cc_lesson_" + id),
      closedAt: nowIso(),
      closedBy: S.user.name,
      closedById: S.user.id,
    });
  }, "فرم بسته شد");
}

function cpfRow(label, v) {
  return v ? '<div class="m"><b>' + label + ":</b> " + esc(v) + "</div>" : "";
}

function cpfSigRows(f) {
  return cpfSlots(f)
    .map(function (x) {
      var sg = cpfSigned(f, x.k),
        lbl = x.label + (x.k === "oth" ? " (" + f.otherUnit + ")" : "");
      if (sg)
        return (
          '<div class="it ok"><b>' +
          esc(lbl) +
          '</b><div class="m">' +
          whoWhen(sg.by, sg.at, "امضاکننده") +
          "</div></div>"
        );
      return (
        '<div class="it"><b>' +
        esc(lbl) +
        '</b><div class="m">در انتظار امضا</div>' +
        (cpfCanSign(f, x.k)
          ? '<button class="btn sm primary" data-act="cpfsign" data-id="' +
            esc(f.id) +
            '" data-k="' +
            x.k +
            '" style="margin-top:8px">امضا</button>'
          : "") +
        "</div>"
      );
    })
    .join("");
}

function cpfSummary(f) {
  var st = cpfStatus(f);
  return (
    '<div class="row"><b class="grow">فرم حفاظت از مشتری' +
    (f.no ? " — شماره " + esc(f.no) : "") +
    '</b><span class="chip ' +
    CPF_STATUS[st][1] +
    '">' +
    CPF_STATUS[st][0] +
    "</span></div>" +
    cpfRow("خط / سال تولید", f.line) +
    cpfRow("حوزه", f.area) +
    cpfRow("شماره پرونده QRCI", f.qrci) +
    cpfRow("شرح ایراد", f.defect) +
    cpfRow("علت ایجاد ایراد", f.cause) +
    cpfRow("اقدام حفاظت از مشتری", f.action) +
    '<div class="m"><b>معتبر تا:</b> <span class="num">' +
    esc(f.vtxt) +
    "</span></div>" +
    (f.informed ? '<div class="m">به اطلاع چکمن و اپراتورهای مرتبط رسیده است ✓</div>' : "")
  );
}

function cpfClosedInfo(f) {
  return (
    cpfRow("اقدام اصلاحی و علت ریشه‌ای", f.corrective) +
    cpfRow("نظر رییس تولید", f.opinion) +
    cpfRow("درس آموخته", f.lesson) +
    '<div class="m">' +
    whoWhen(f.closedBy, f.closedAt, "بسته‌کننده") +
    "</div>"
  );
}

function cpfCloseForm(f) {
  return (
    '<form data-form="cpfclose" data-id="' +
    esc(f.id) +
    '" class="mgform" style="margin-top:10px"><h3 style="margin:0">بستن فرم</h3>' +
    '<label class="f">اقدام اصلاحی و علت ریشه‌ای<textarea class="in" id="cc_corr_' +
    f.id +
    '"></textarea></label>' +
    '<label class="f">نظر رییس تولید (اختیاری)<textarea class="in" id="cc_op_' +
    f.id +
    '"></textarea></label>' +
    '<label class="f">درس آموخته (اختیاری)<textarea class="in" id="cc_lesson_' +
    f.id +
    '"></textarea></label>' +
    '<button class="btn primary" type="submit">بستن فرم</button></form>'
  );
}

function cpfDelBtns(f) {
  if (
    !(
      S.user &&
      (S.user.id === "owner" ||
        (canCpfCreate() && f.sig_sup && f.sig_sup.byId === S.user.id && cpfStatus(f) === "pending"))
    )
  )
    return "";
  if (S.cpfDel === f.id)
    return (
      '<div class="row" style="margin-top:8px"><button class="btn sm" data-act="cpfdelyes" data-id="' +
      esc(f.id) +
      '">تأیید حذف</button><button class="btn sm" data-act="cpfdelno">انصراف</button></div>'
    );
  return (
    '<div class="row" style="margin-top:8px"><button class="btn sm" data-act="cpfdelask" data-id="' +
    esc(f.id) +
    '">حذف فرم</button></div>'
  );
}

function cpfCard(f) {
  var st = cpfStatus(f);
  return (
    '<div class="it' +
    (st === "expired" ? " ng" : "") +
    '">' +
    cpfSummary(f) +
    cpfRow("خودروهای مشمول", f.cars.join("، ")) +
    '<div class="m">' +
    whoWhen(f.sig_sup && f.sig_sup.by, f.createdAt, "ثبت‌کننده") +
    '</div><div style="margin-top:8px">' +
    cpfSigRows(f) +
    "</div>" +
    (f.closedAt ? cpfClosedInfo(f) : canCpfCreate() && st !== "pending" ? cpfCloseForm(f) : "") +
    cpfDelBtns(f) +
    "</div>"
  );
}

function cpfAddForm() {
  return (
    '<div class="card"><h2>ثبت فرم حفاظت از مشتری</h2><form data-form="cpfadd" data-stp="1" class="mgform">' +
    '<div class="mgrow" data-step="شماره‌ها و خط"><label class="f">شماره‌ی فرم<input class="in" id="cf_no" autocomplete="off"></label><label class="f">شماره‌ی پرونده QRCI<input class="in" id="cf_qrci" autocomplete="off"></label></div>' +
    '<div class="mgrow" data-step="شماره‌ها و خط"><label class="f">خط / سال تولید<select class="in" id="cf_line">' +
    listOptions(listK("stopLines")) +
    "</select></label>" +
    '<label class="f">حوزه<select class="in" id="cf_area">' +
    Object.keys(AREAS)
      .filter(function (k) {
        return k !== "all";
      })
      .map(function (k) {
        return "<option>" + esc(AREAS[k].label) + "</option>";
      })
      .join("") +
    "</select></label></div>" +
    '<label class="f" data-step="شرح و علت ایراد">شرح ایراد<textarea class="in" id="cf_defect"></textarea></label>' +
    '<label class="f" data-step="شرح و علت ایراد">علت ایجاد ایراد<textarea class="in" id="cf_cause"></textarea></label>' +
    '<label class="chk" data-step="شرح و علت ایراد"><input type="checkbox" id="cf_informed"> ایراد به اطلاع چکمن و کلیه اپراتورهای مرتبط رسیده است</label>' +
    '<label class="f" data-step="اقدام و اعتبار">شرح اقدام حفاظت از مشتری<textarea class="in" id="cf_action"></textarea></label>' +
    '<label class="f" data-step="اقدام و اعتبار">معتبر تا تاریخ (مثلاً ۱۴۰۵/۰۸/۲۰)<input class="in num ltr" id="cf_valid" inputmode="numeric" autocomplete="off" placeholder="14050820"></label>' +
    '<label class="f" data-step="خودروها و امضا">شماره‌ی خودروهای مشمول (سریال، شاسی، موتور یا اتاق؛ با فاصله یا خط جدید جدا کنید)<textarea class="in num ltr" id="cf_cars"></textarea></label>' +
    '<label class="f" data-step="خودروها و امضا">امضای «سایر واحدهای ذیربط»<select class="in" id="cf_other"><option value="">ندارد</option>' +
    listOptions(mgrUnits()) +
    "</select></label>" +
    '<button class="btn primary" type="submit">ثبت فرم و امضا به‌عنوان سرپرست تولید</button></form></div>'
  );
}

function cpfSection(title, list) {
  return list.length
    ? '<div class="card"><h2>' +
        title +
        " (" +
        faDigits(list.length) +
        ")</h2>" +
        list.map(cpfCard).join("") +
        "</div>"
    : "";
}

function cpfView() {
  var all = (S.cpfs || []).slice().sort(function (a, b) {
      return (b.createdAt || "") < (a.createdAt || "") ? -1 : 1;
    }),
    by = { pending: [], active: [], expired: [], closed: [] };
  all.forEach(function (f) {
    by[cpfStatus(f)].push(f);
  });
  var mine = cpfWaiting();
  var h =
    (canCpfCreate() ? cpfAddForm() : "") +
    (mine.length
      ? '<div class="card" style="border:2px solid #d98e04"><h2>منتظر امضای شما (' +
        faDigits(mine.length) +
        ")</h2>" +
        mine.map(cpfCard).join("") +
        "</div>"
      : "");
  h +=
    cpfSection("منقضی‌شده و هنوز باز", by.expired) +
    cpfSection(
      "در انتظار امضا",
      by.pending.filter(function (f) {
        return mine.indexOf(f) < 0;
      }),
    ) +
    cpfSection(
      "معتبر",
      by.active.filter(function (f) {
        return mine.indexOf(f) < 0;
      }),
    ) +
    cpfSection("بسته‌شده‌ها", by.closed.slice(0, 10));
  return all.length || canCpfCreate()
    ? h
    : h + '<div class="card"><p class="hint" style="margin:0">فرمی ثبت نشده است.</p></div>';
}

/* فرم‌های مشمول یک خودرو (فعال و منقضی در نوار ویزارد؛ همه در پرونده‌ی خودرو) */
function cpfForCar(c, onlyLive) {
  var ids = [c.key, c.I.serial, c.I.chassis, c.I.engine, c.I.room].filter(Boolean);
  return (S.cpfs || []).filter(function (f) {
    if (
      !f.cars.some(function (n) {
        return ids.indexOf(n) >= 0;
      })
    )
      return false;
    var st = cpfStatus(f);
    return onlyLive ? st === "active" || st === "expired" : true;
  });
}

function cpfBrief(f) {
  return (
    '<div class="it' + (cpfStatus(f) === "expired" ? " ng" : "") + '">' + cpfSummary(f) + "</div>"
  );
}

function cpfWizBlock(d) {
  var live = cpfForCar(carRecords(d.key), true);
  if (!live.length) return "";
  var late = live.filter(function (f) {
    return cpfStatus(f) === "expired";
  }).length;
  var h =
    '<button type="button" class="histbar hot" data-act="cpftoggle" aria-expanded="' +
    !!S.cpfWizOpen +
    '"><b>حفاظت از مشتری</b><span>' +
    faDigits(live.length) +
    " فرم" +
    (late ? " — " + faDigits(late) + " منقضی" : "") +
    "</span><i>" +
    (S.cpfWizOpen ? "▴" : "▾") +
    "</i></button>";
  return (
    h + (S.cpfWizOpen ? '<div class="histlist">' + live.map(cpfBrief).join("") + "</div>" : "")
  );
}

function cpfCarCard(c) {
  var all = cpfForCar(c, false);
  return all.length
    ? '<div class="card"><h2>فرم‌های حفاظت از مشتری (' +
        faDigits(all.length) +
        ")</h2>" +
        all
          .map(function (f) {
            return (
              cpfBrief(f) + (f.closedAt ? '<div class="it">' + cpfClosedInfo(f) + "</div>" : "")
            );
          })
          .join("") +
        "</div>"
    : "";
}

function clickCpf(ev, el, a, id, d) {
  if (a === "cpftoggle") {
    S.cpfWizOpen = !S.cpfWizOpen;
    render();
    return true;
  }
  if (a === "cpfsign") {
    cpfSign(id, el.getAttribute("data-k"));
    return true;
  }
  if (a === "cpfdelask") {
    S.cpfDel = id;
    render();
    return true;
  }
  if (a === "cpfdelno") {
    S.cpfDel = "";
    render();
    return true;
  }
  if (a === "cpfdelyes") {
    S.cpfDel = "";
    save(function () {
      return store.del("users", id);
    }, "فرم حذف شد");
    return true;
  }
  return false;
}
