/* ════════════════════════════════════════════════════════════
   فصل 31 — نمونه‌زنی
   ثبت نمونه‌ی قطعه (ویزارد ۶ مرحله‌ای)، مشخصات، تکراری‌ها، پاک‌سازی، خروجی PDF/Excel نمونه.
   توابع اصلی: smpTab، smpDef، smpSync، smpCanWrite، smpCanView، smpWizOn، smpParts، smpAtt و …
   ════════════════════════════════════════════════════════════ */

/* ---------- نمونه‌زنی (ثبت توسط کیفیت مونتاژ) ---------- */
function smpTab() {
  return smpCanView()
    ? '<button class="tab" role="tab" data-act="tab" data-t="smp" aria-selected="' +
        (S.tab === "smp" ? "true" : "false") +
        '">نمونه‌زنی</button>'
    : "";
}

function smpDef() {
  return { parts: [{ n: "", q: "" }], att: {} };
}

var SMPF = ["sm_sup", "sm_attx", "sm_desc", "sm_cars", "sm_allow", "sm_res"];

function smpSync() {
  var f = (S.sf = S.sf || smpDef());
  f.parts.forEach(function (p, i) {
    var n = document.getElementById("sp_n_" + i),
      q = document.getElementById("sp_q_" + i);
    if (n) p.n = n.value.trim();
    if (q) p.q = q.value.trim();
  });
  SMPF.forEach(function (k) {
    var e = document.getElementById(k);
    if (e) f[k] = e.value;
  });
}

/* ---------- ثبت نمونه‌زنی مرحله‌به‌مرحله (مثل ایستگاه‌های شاسی، نهایی و تزیینات) ---------- */
var SMP_STEPS = ["ایستگاه", "قطعه‌ها", "حاضرین", "شرح", "خودروها", "تأیید"];

function smpCanWrite() {
  return isQual() || (isCustomRole(S.user) && rolePerm("smp"));
}

function smpCanView() {
  return isQual() || isCom() || rolePerm("smp");
}

function smpWizOn() {
  return S.sw != null && S.tab === "smp" && smpCanWrite();
}

function smpParts(F) {
  return F.parts
    .filter(function (p) {
      return p.n.trim();
    })
    .map(function (p) {
      return { n: p.n.trim(), q: digits(p.q) };
    });
}

function smpAtt(F) {
  var typed = String(F.sm_attx || "")
    .split(/[,،\n]/)
    .map(function (x) {
      return x.trim();
    })
    .filter(Boolean);
  return Object.keys(F.att)
    .filter(function (k) {
      return F.att[k];
    })
    .concat(typed)
    .filter(function (v, i, a) {
      return a.indexOf(v) === i;
    });
}

function smpCarList(F) {
  return String(F.sm_cars || "")
    .split(/[,،\s]+/)
    .map(function (x) {
      return digits(x);
    })
    .filter(Boolean)
    .filter(function (v, i, a) {
      return a.indexOf(v) === i;
    });
}

function smpBadQty(p) {
  return !/^\d+$/.test(p.q) || +p.q < 1;
}

function smpStepErr(i, F) {
  if (i === 0)
    return !F.sm_st
      ? "ایستگاه خط را انتخاب کنید."
      : !F.sm_re
        ? "دلیل نمونه‌زنی را انتخاب کنید."
        : "";
  if (i === 1) {
    var ps = smpParts(F);
    return !ps.length
      ? "حداقل یک قطعه بنویسید."
      : ps.some(smpBadQty)
        ? "تعداد هر قطعه باید یک عدد درست باشد."
        : "";
  }
  if (i === 2) return smpAtt(F).length ? "" : "حاضرین را انتخاب کنید.";
  if (i === 3) return String(F.sm_desc || "").trim() ? "" : "شرح نمونه‌زنی الزامی است.";
  if (i === 4) return F.sm_status ? "" : "وضعیت نمونه‌زنی را انتخاب کنید.";
  return "";
}

function smpFirstBad(F) {
  for (var i = 0; i < SMP_STEPS.length - 1; i++) {
    var err = smpStepErr(i, F);
    if (err) return { step: i, err: err };
  }
  return null;
}

function smpDoc(F) {
  var at = nowIso();
  return {
    at: at,
    by: S.user.name,
    byId: S.user.id,
    line: F.sm_st,
    reason: F.sm_re,
    supplier: String(F.sm_sup || "").trim(),
    parts: smpParts(F),
    att: smpAtt(F),
    desc: String(F.sm_desc).trim(),
    cars: smpCarList(F),
    carsInfo: smpCarList(F).map(smpCarSpec),
    status: F.sm_status,
    allow: digits(F.sm_allow || ""),
    result: String(F.sm_res || "").trim(),
    hist: [{ at: at, by: S.user.name, status: F.sm_status, note: "ثبت اولیه" }],
  };
}

/* مشخصات خودرو را از سرور می‌گیرد ولی ثبت را بیش از ۲.۵ ثانیه معطل نمی‌کند */
function smpSpecsReady(F) {
  var cars = smpCarList(F);
  if (!cars.length || navigator.onLine === false) return Promise.resolve();
  return Promise.race([
    ensureCar(cars),
    new Promise(function (ok) {
      setTimeout(ok, 2500);
    }),
  ]);
}

/* شناسه‌ی نمونه‌زنی یک بار برای هر پیش‌نویس ساخته می‌شود؛ لمس چندباره همان یک رکورد را بازنویسی می‌کند */
// ثبت نمونه‌ی قطعه.
function smpSubmit() {
  if (S.smpBusy) return;
  smpSync();
  var F = S.sf,
    bad = smpFirstBad(F);
  if (bad) {
    S.sw = bad.step;
    S.smpErr = bad.err;
    render();
    return;
  }
  S.smpErr = "";
  S.smpBusy = true;
  F.docId = F.docId || "smp_" + uid();
  smpDraftSave();
  render();
  smpSpecsReady(F)
    .then(function () {
      var doc = smpDoc(F);
      return save(function () {
        return store.set("users", F.docId, doc);
      }, "نمونه‌زنی ثبت شد").then(function (ok) {
        S.smpBusy = false;
        if (ok) {
          S.sf = null;
          S.sw = null;
          S.smpDone = doc;
          smpDraftClear();
        }
        render();
      });
    })
    .then(null, function () {
      S.smpBusy = false;
      render();
    });
}

/* پیش‌نویس روی همین دستگاه می‌ماند تا با بازشدن دوباره‌ی صفحه نوشته‌ها و مرحله از بین نرود */
var SMP_DRAFT = "cm_smp",
  smpDraftTimer = 0;

function smpDraftSave() {
  try {
    if (S.user && S.sf)
      localStorage.setItem(
        SMP_DRAFT,
        JSON.stringify({
          u: S.user.id,
          sf: S.sf,
          sw: S.sw == null ? null : S.sw,
        }),
      );
  } catch (e) {}
}

function smpDraftClear() {
  try {
    localStorage.removeItem(SMP_DRAFT);
  } catch (e) {}
}

function smpDraftTyping() {
  clearTimeout(smpDraftTimer);
  smpDraftTimer = setTimeout(function () {
    if (smpWizOn()) {
      smpSync();
      smpDraftSave();
    }
  }, 500);
}

function smpResume() {
  if (S.smpChecked || !S.user) return;
  S.smpChecked = true;
  try {
    var d = JSON.parse(localStorage.getItem(SMP_DRAFT) || "null");
    if (!d || d.u !== S.user.id || !d.sf || !smpCanWrite()) return;
    S.sf = d.sf;
    S.sw = d.sw;
    if (d.sw != null) S.tab = "smp";
  } catch (e) {}
}

/* مشخصات خودرو از پرونده‌ها برداشته و هنگام ثبت در خود نمونه‌زنی هم نگه داشته می‌شود */
var SMP_SPEC = [
  ["serial", "سریال"],
  ["chassis", "شاسی"],
  ["engine", "موتور"],
  ["room", "اتاق"],
  ["product", "محصول"],
  ["fuel", "سوخت"],
];

function smpCarSpec(c) {
  var cr = carRecords(c);
  if (!cr.recs.length) return { car: c };
  var ch =
    cr.recs.filter(function (x) {
      return x.sheet === "chassis" && x.fuel;
    })[0] || cr.recs[0];
  return {
    car: c,
    serial: cr.I.serial || "",
    chassis: cr.I.chassis || "",
    engine: cr.I.engine || "",
    room: cr.I.room || "",
    product: productShort(ch),
    fuel: fuelRaw(ch) ? fuelTxt(fuelRaw(ch)) : "",
  };
}

function smpSpecOf(r, c) {
  return (
    (r.carsInfo || []).filter(function (x) {
      return x.car === c;
    })[0] || smpCarSpec(c)
  );
}

function smpSpecHtml(sp) {
  var parts = SMP_SPEC.filter(function (f) {
    return sp[f[0]];
  }).map(function (f) {
    return "<span><small>" + f[1] + ':</small> <bdi class="num">' + esc(sp[f[0]]) + "</bdi></span>";
  });
  return (
    '<div class="it smpcar"><b class="num">' +
    esc(sp.car) +
    "</b>" +
    (parts.length
      ? '<div class="smpspec">' + parts.join("") + "</div>"
      : '<div class="hint">مشخصات این خودرو در پرونده‌ها پیدا نشد.</div>') +
    "</div>"
  );
}

function smpCarsHtml(r) {
  return smpCars(r)
    .map(function (c) {
      return smpSpecHtml(smpSpecOf(r, c));
    })
    .join("");
}

function smpSpecRows(r) {
  return smpCars(r).map(function (c) {
    var sp = smpSpecOf(r, c);
    return [c].concat(
      SMP_SPEC.map(function (f) {
        return sp[f[0]] || "—";
      }),
    );
  });
}

function smpChips(key, opts, f, oneCol) {
  return (
    '<div class="chips' +
    (oneCol ? " col1" : "") +
    '">' +
    opts
      .map(function (o) {
        return (
          '<button type="button" class="pick" data-act="smppick" data-k="' +
          key +
          '" data-v="' +
          esc(o) +
          '" aria-pressed="' +
          (f[key] === o) +
          '">' +
          esc(o) +
          "</button>"
        );
      })
      .join("") +
    "</div>"
  );
}

function smpField(label, inner) {
  return '<div class="smpfld"><b>' + label + "</b>" + inner + "</div>";
}

function smpStep0(f) {
  return (
    smpField("ایستگاه خط", smpChips("sm_st", listK("smpStations"), f, false)) +
    smpField("دلیل نمونه‌زنی", smpChips("sm_re", listK("smpReasons"), f, true))
  );
}

function smpPartRow(p, i, many) {
  return (
    '<div class="smprow"><input class="in grow" id="sp_n_' +
    i +
    '" value="' +
    esc(p.n) +
    '" placeholder="نام یا کد قطعه" autocomplete="off"><input class="in num ltr" id="sp_q_' +
    i +
    '" value="' +
    esc(p.q) +
    '" inputmode="numeric" placeholder="تعداد" style="max-width:100px" autocomplete="off">' +
    (many
      ? '<button type="button" class="btn sm" data-act="smprm" data-i="' +
        i +
        '" aria-label="حذف قطعه">✕</button>'
      : "") +
    "</div>"
  );
}

function smpStep1(f) {
  var many = f.parts.length > 1;
  return (
    '<label class="f">نام سازنده (اختیاری)<input class="in" id="sm_sup" value="' +
    esc(f.sm_sup || "") +
    '" autocomplete="off"></label>' +
    '<div style="margin-top:14px"><b>قطعه‌ها و تعداد</b>' +
    f.parts
      .map(function (p, i) {
        return smpPartRow(p, i, many);
      })
      .join("") +
    '<button type="button" class="btn sm" data-act="smpadd" style="margin-top:10px">+ قطعه‌ی دیگر</button></div>'
  );
}

function smpStep2(f) {
  var chips = listK("smpAtt")
    .map(function (a) {
      return (
        '<button type="button" class="pick" data-act="smpatt" data-p="' +
        esc(a) +
        '" aria-pressed="' +
        !!f.att[a] +
        '">' +
        esc(a) +
        "</button>"
      );
    })
    .join("");
  return (
    smpField("حاضرین (چند مورد را انتخاب کنید)", '<div class="chips">' + chips + "</div>") +
    '<label class="f">حاضر دیگر (چند مورد را با ویرگول جدا کنید)<input class="in" id="sm_attx" value="' +
    esc(f.sm_attx || "") +
    '" autocomplete="off"></label>'
  );
}

function smpStep3(f) {
  return (
    '<label class="f">شرح نمونه‌زنی (الزامی)<textarea class="in" id="sm_desc" rows="5">' +
    esc(f.sm_desc || "") +
    '</textarea></label><div class="row" style="margin:8px 0 14px">' +
    micBtn("sm_desc") +
    "</div>" +
    '<label class="f">نتیجه و توضیحات (اختیاری)<textarea class="in" id="sm_res" rows="3">' +
    esc(f.sm_res || "") +
    "</textarea></label>"
  );
}

function smpStep4(f) {
  return (
    '<div class="row"><label class="f grow">شماره‌ی سریال خودروها (با ویرگول جدا کنید)<input class="in num ltr" id="sm_cars" value="' +
    esc(f.sm_cars || "") +
    '" autocomplete="off"></label><button type="button" class="btn" data-act="livescan" data-scan="sm_cars" style="align-self:flex-end">📷 اسکن</button></div>' +
    '<div style="margin-top:14px">' +
    smpField("وضعیت نمونه‌زنی", smpChips("sm_status", listK("smpStatus"), f, false)) +
    "</div>" +
    '<label class="f">تعداد مجاز خودرو (اختیاری، برای تأیید مشروط)<input class="in num ltr" id="sm_allow" value="' +
    esc(f.sm_allow || "") +
    '" inputmode="numeric" style="max-width:160px" autocomplete="off"></label>'
  );
}

function smpSummaryRows(r) {
  return [
    ["ایستگاه خط", r.line],
    ["دلیل", r.reason],
    ["سازنده", r.supplier || "—"],
    [
      "قطعه‌ها",
      r.parts
        .map(function (p) {
          return p.n + " × " + p.q;
        })
        .join("، "),
    ],
    ["حاضرین", r.att.join("، ")],
    ["شرح", r.desc],
    ["نتیجه", r.result || "—"],
    ["وضعیت", r.status],
    ["تعداد مجاز خودرو", r.allow || "—"],
  ];
}

function smpStep5(f) {
  var r = smpDoc(Object.assign({}, f, { sm_desc: f.sm_desc || "" }));
  return (
    '<p class="hint">همه‌ی موارد را بررسی کنید. با «ثبت» به نام شما ذخیره می‌شود.</p><div class="smpsum">' +
    smpSummaryRows(r)
      .map(function (x) {
        return '<div class="it"><small>' + x[0] + "</small><b>" + esc(x[1]) + "</b></div>";
      })
      .join("") +
    (r.cars.length
      ? '<div class="it"><small>خودروها و مشخصات</small></div>' + smpCarsHtml(r)
      : "") +
    "</div>"
  );
}

var SMP_BODY = [smpStep0, smpStep1, smpStep2, smpStep3, smpStep4, smpStep5];

function smpWizBar(i) {
  return (
    '<div class="wiz" role="list">' +
    SMP_STEPS.map(function (label, k) {
      var st = k < i ? "done" : k === i ? "cur" : "todo";
      return (
        '<button type="button" class="wst ' +
        st +
        '" role="listitem" data-act="smpgo" data-k="' +
        k +
        '"' +
        (k < i ? "" : ' tabindex="-1"') +
        "><i>" +
        (k < i ? "✓" : faDigits(k + 1)) +
        "</i><span>" +
        label +
        "</span></button>"
      );
    }).join("") +
    "</div>"
  );
}

// ویزارد نمونه‌زنی (۶ مرحله).
function smpWiz() {
  var f = (S.sf = S.sf || smpDef()),
    i = S.sw;
  return (
    '<div class="stepbar chs chsx nostick"><div class="sxh"><b>نمونه‌زنی جدید — ' +
    esc(SMP_STEPS[i]) +
    "</b></div>" +
    smpWizBar(i) +
    '<div class="stepcur">' +
    (S.smpErr ? '<p class="err">' + esc(S.smpErr) + "</p>" : "") +
    SMP_BODY[i](f) +
    "</div></div>"
  );
}

function smpBot() {
  var last = S.sw === SMP_STEPS.length - 1;
  return (
    '<div class="botspace"></div><div class="botbar chs"><button class="btn back" data-act="smpprev"' +
    (S.smpBusy ? " disabled" : "") +
    ">▶ " +
    (S.sw ? "برگشت" : "انصراف") +
    '</button><button class="btn ok confirm" data-act="' +
    (last ? "smpsave" : "smpnext") +
    '"' +
    (S.smpBusy ? " disabled" : "") +
    ">" +
    (S.smpBusy ? "در حال ثبت…" : last ? "✓ ثبت نمونه‌زنی به نام من" : "بعدی ◀") +
    "</button></div>"
  );
}

function smpStartCard() {
  return (
    '<div class="card"><button class="btn primary" data-act="smpnew" style="width:100%;min-height:56px;font-size:17px">+ ' +
    (S.sf ? "ادامه‌ی ثبت نمونه‌زنی" : "ثبت نمونه‌زنی جدید") +
    "</button></div>"
  );
}

function smpDoneOv() {
  var r = S.smpDone;
  return (
    '<div class="donescr" role="dialog"><div class="dtop"><div class="dchk">✓</div><div class="dt">نمونه‌زنی ثبت شد</div><div class="dm">' +
    esc(r.line) +
    '</div></div><div class="dscroll"><div class="dcard"><div class="dsub">' +
    whoWhen(r.by, r.at) +
    "</div></div>" +
    smpSummaryRows(r)
      .map(function (x) {
        return (
          '<div class="dcard"><div class="drow"><span>' +
          x[0] +
          "</span><b>" +
          esc(x[1]) +
          "</b></div></div>"
        );
      })
      .join("") +
    r.cars
      .map(function (c) {
        var sp = smpSpecOf(r, c);
        return (
          '<div class="dcard"><div class="drow"><span>خودرو</span><b class="num">' +
          esc(c) +
          '</b></div><div class="dsub">' +
          SMP_SPEC.filter(function (f) {
            return sp[f[0]];
          })
            .map(function (f) {
              return "<span>" + f[1] + ": <bdi>" + esc(sp[f[0]]) + "</bdi></span>";
            })
            .join(" · ") +
          "</div></div>"
        );
      })
      .join("") +
    '</div><div class="dfoot"><button type="button" class="btn dbtn" data-act="smpdoneclose">ادامه</button></div></div>'
  );
}

function smpCars(r) {
  return (r.cars || []).map(String);
}

function smpFollow(r) {
  var out = "";
  smpCars(r).forEach(function (c) {
    var recs = carRecords(c).recs,
      items = [];
    recs.forEach(function (x) {
      Object.keys(x.items || {}).forEach(function (id) {
        var it = x.items[id];
        if (it && !it.closedAt && (it.r === "ng" || it.r === "sample" || it.r === "shortage"))
          items.push({ x: x, id: id, it: it });
      });
    });
    out +=
      '<div class="it"><b class="num">' +
      esc(c) +
      "</b> · " +
      (recs.length
        ? items.length
          ? '<span class="chip open">' + faDigits(items.length) + " مورد باز</span>"
          : '<span class="chip done">بدون مورد باز</span>'
        : '<span class="hint">بازدیدی در دسترس نیست</span>');
    items.slice(0, 6).forEach(function (o) {
      out +=
        '<div class="hint">• ' +
        esc(SHORTN[o.x.sheet] || SHEETS[o.x.sheet].name) +
        " · " +
        esc(typeName(o.it.r)) +
        " · " +
        esc(itemLabel(o.x, o.id, o.it)) +
        (o.it.note ? " — " + esc(o.it.note) : "") +
        "</div>";
    });
    out += "</div>";
  });
  return out;
}

/* شمار نمونه‌زنی‌های با محتوای یکسان، برای نشان‌دادن موارد احتمالاً تکراری */
function smpSigOf(r) {
  return [
    r.line,
    r.reason,
    r.supplier,
    (r.parts || [])
      .map(function (p) {
        return p.n + "×" + p.q;
      })
      .join(","),
    r.desc,
    (r.cars || []).join(","),
  ].join("|");
}

/* v127: ثبت تکراری = همان محتوا، همان ثبت‌کننده، حداکثر ۱۰ دقیقه بعد از اولی (چند بار لمس). اولی دیده می‌شود، بقیه پنهان؛ ۳۰ روز بعد با تأیید مالک حذف نهایی */
var SMP_DUP_MS = 10 * 60 * 1000,
  SMP_PURGE_MS = 30 * 86400000;

function smpAt(r) {
  return Date.parse(r.at);
}

function smpSplitDups(list) {
  var asc = list.slice().sort(function (a, b) {
    return (a.at || "") < (b.at || "")
      ? -1
      : (a.at || "") > (b.at || "")
        ? 1
        : a.id < b.id
          ? -1
          : 1;
  });
  var first = {},
    shown = [],
    hidden = [];
  asc.forEach(function (r) {
    var k = smpSigOf(r) + "|" + (r.by || ""),
      p = first[k];
    if (!r.keep && p && smpAt(r) - smpAt(p) <= SMP_DUP_MS) hidden.push(r);
    else {
      shown.push(r);
      first[k] = r;
    }
  });
  return { shown: shown.reverse(), hidden: hidden };
}

function smpPurgeReady() {
  return (S.smpDup || []).filter(function (r) {
    return Date.now() - smpAt(r) >= SMP_PURGE_MS;
  });
}

function smpById(id) {
  return (S.smp || []).concat(S.smpDup || []).filter(function (x) {
    return x.id === id;
  })[0];
}

function smpDupItem(r) {
  var left = SMP_PURGE_MS - (Date.now() - smpAt(r)),
    ready = left <= 0;
  return (
    '<div class="items" style="margin-top:8px"><b>' +
    esc(r.line || "") +
    "</b> · " +
    esc(
      (r.parts || [])
        .map(function (p) {
          return p.n;
        })
        .join("، "),
    ) +
    whoWhen(r.by, r.at) +
    '<p class="hint" style="margin:6px 0 0">' +
    (ready ? "آماده‌ی حذف نهایی" : "تا امکان حذف نهایی: " + elapsedTxt(left)) +
    "</p>" +
    '<div class="row" style="margin-top:8px"><button class="btn sm" data-act="smpkeep" data-id="' +
    esc(r.id) +
    '">برگرداندن به لیست</button></div>' +
    (ready ? smpDelRow(r) : "") +
    "</div>"
  );
}

function smpPurgeRow(n) {
  if (!n) return "";
  if (S.smpPurge)
    return (
      '<div class="row" style="margin-top:10px"><span class="hint" style="color:var(--open)">اول یک فایل پشتیبان ذخیره می‌شود، بعد ' +
      faDigits(n) +
      ' ثبت تکراری برای همیشه حذف می‌شود. ادامه؟</span><button class="btn sm primary" data-act="smppurgeyes">بله، حذف شود</button><button class="btn sm" data-act="smppurgeno">نه</button></div>'
    );
  return (
    '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="smppurgeask">حذف نهایی همه‌ی آماده‌ها (' +
    faDigits(n) +
    ")</button></div>"
  );
}

function smpDupSection() {
  var L = S.smpDup || [];
  if (!S.isOwner || !L.length) return "";
  var head =
    '<button class="btn" data-act="smpduptoggle" aria-expanded="' +
    (S.smpDupOpen ? "true" : "false") +
    '">تکراری‌های پنهان‌شده (' +
    faDigits(L.length) +
    ")</button>";
  if (!S.smpDupOpen) return '<div class="card">' + head + "</div>";
  return (
    '<div class="card">' +
    head +
    '<p class="hint">این ثبت‌ها از لیست‌ها و گزارش‌ها پنهان هستند و بعد از ۳۰ روز با تأیید شما حذف می‌شوند.</p>' +
    L.map(smpDupItem).join("") +
    smpPurgeRow(smpPurgeReady().length) +
    "</div>"
  );
}

function smpPurgeNow() {
  var L = smpPurgeReady();
  if (!L.length) {
    S.smpPurge = false;
    render();
    return Promise.resolve();
  }
  var backup = new Blob([JSON.stringify({ at: nowIso(), by: S.user.name, records: L })], {
    type: "application/json",
  });
  return Promise.resolve(
    saveFile("smp-duplicates-" + nowIso().slice(0, 10) + ".json", backup),
  ).then(function () {
    S.smpPurge = false;
    return saveOnce(
      "smppurge",
      function () {
        return Promise.all(
          L.map(function (x) {
            return store.del("users", x.id);
          }),
        ).then(function () {
          return store.set("users", "lg_" + uid(), {
            at: nowIso(),
            by: S.user.name,
            byId: S.user.id,
            letter: "",
            what: "حذف نهایی " + L.length + " نمونه‌زنی تکراری (پشتیبان ذخیره شد)",
          });
        });
      },
      "تکراری‌ها حذف شدند",
    );
  });
}

function smpDelRow(r) {
  if (!S.isOwner) return "";
  if (S.smpDel === r.id)
    return (
      '<div class="row" style="margin-top:10px"><span class="hint" style="color:var(--open)">این نمونه‌زنی برای همیشه حذف شود؟</span><button class="btn sm primary" data-act="smpdelyes" data-id="' +
      esc(r.id) +
      '">بله، حذف شود</button><button class="btn sm" data-act="smpdelno">انصراف</button></div>'
    );
  return (
    '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="smpdelask" data-id="' +
    esc(r.id) +
    '">حذف (فقط مدیر)</button></div>'
  );
}

function smpCard(r, i) {
  var can = smpCanWrite(),
    st = r.status || "";
  var h =
    '<div class="card"><div class="row"><h2 class="grow" style="margin:0">' +
    esc(r.line || "") +
    '</h2><span class="chip ' +
    (st === "رد" ? "open" : st === "تأیید" ? "done" : "") +
    '">' +
    esc(st) +
    "</span></div>" +
    whoWhen(r.by, r.at);
  h +=
    '<div class="kvs" style="margin-top:8px"><div class="kv"><small>دلیل</small><b>' +
    esc(r.reason || "—") +
    '</b></div><div class="kv"><small>سازنده</small><b>' +
    esc(r.supplier || "—") +
    '</b></div><div class="kv"><small>ثبت‌کننده</small><b>' +
    esc(r.by || "") +
    "</b></div>" +
    (r.allow
      ? '<div class="kv"><small>تعداد مجاز خودرو</small><b class="num">' +
        esc(r.allow) +
        "</b></div>"
      : "") +
    "</div>";
  h +=
    '<p style="margin:8px 0 4px"><b>قطعه‌ها:</b> ' +
    (r.parts || [])
      .map(function (p) {
        return esc(p.n) + " × " + esc(p.q);
      })
      .join("، ") +
    "</p>";
  h += '<p style="margin:4px 0"><b>حاضرین:</b> ' + esc((r.att || []).join("، ")) + "</p>";
  h += '<p style="margin:4px 0"><b>شرح:</b> ' + esc(r.desc || "") + "</p>";
  if (r.result) h += '<p style="margin:4px 0"><b>نتیجه:</b> ' + esc(r.result) + "</p>";
  if (smpCars(r).length) h += '<div class="smpcars"><b>خودروها:</b>' + smpCarsHtml(r) + "</div>";
  if (smpCars(r).length)
    h +=
      '<details style="margin-top:8px"><summary><b>خودروها و پیگیری (' +
      faDigits(smpCars(r).length) +
      ')</b></summary><div class="items">' +
      smpFollow(r) +
      "</div></details>";
  if ((r.hist || []).length > 1)
    h +=
      '<details style="margin-top:6px"><summary class="hint">تاریخچه‌ی وضعیت</summary>' +
      r.hist
        .map(function (x) {
          return (
            '<div class="hint" style="margin:6px 0"><b>' +
            esc(x.status || "") +
            "</b>" +
            whoWhen(x.by, x.at) +
            (x.note ? "<div>توضیح: " + esc(x.note) + "</div>" : "") +
            "</div>"
          );
        })
        .join("") +
      "</details>";
  h +=
    '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="smppdf" data-id="' +
    esc(r.id) +
    '">ذخیره PDF</button><button class="btn sm" data-act="smpxlsx" data-id="' +
    esc(r.id) +
    '">ذخیره Excel</button></div>';
  h += smpDelRow(r);
  if (can)
    h +=
      '<div class="row" style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)"><label class="f">تغییر وضعیت<select class="in" id="ss_' +
      i +
      '">' +
      listK("smpStatus")
        .map(function (o) {
          return "<option" + (o === st ? " selected" : "") + ">" + esc(o) + "</option>";
        })
        .join("") +
      '</select></label><label class="f grow">توضیح<input class="in" id="sn_' +
      i +
      '" autocomplete="off"></label><button class="btn sm primary" data-act="smpstat" data-id="' +
      esc(r.id) +
      '" data-i="' +
      i +
      '" style="align-self:flex-end">ثبت وضعیت</button></div>';
  return h + "</div>";
}

function smpView() {
  var h = smpCanWrite() ? smpStartCard() : "";
  h +=
    '<div class="card"><h2>نمونه‌زنی‌های ثبت‌شده (' +
    faDigits((S.smp || []).length) +
    ')</h2><input class="in" id="smpq" placeholder="جست‌وجو: قطعه، سازنده، سریال، حاضر…" value="' +
    esc(S.smpQ || "") +
    '" autocomplete="off"></div><div id="smplist">' +
    smpRegistryList() +
    "</div>";
  return h;
}

var smpHay = new WeakMap();

function smpHaystack(r) {
  var v = smpHay.get(r);
  if (v === undefined) {
    v = norm(
      [
        r.line,
        r.reason,
        r.supplier,
        r.desc,
        (r.parts || [])
          .map(function (p) {
            return p.n;
          })
          .join(" "),
        (r.cars || []).join(" "),
        (r.att || []).join(" "),
      ].join(" "),
    );
    smpHay.set(r, v);
  }
  return v;
}

var smpQTimer = 0;

function smpRegistryList() {
  var q = norm(S.smpQ || ""),
    L = (S.smp || []).filter(function (r) {
      return !q || smpHaystack(r).indexOf(q) >= 0;
    }),
    h = "";
  if (!L.length)
    h +=
      '<div class="card"><p class="hint" style="margin:0">' +
      ((S.smp || []).length ? "موردی پیدا نشد." : "هنوز نمونه‌زنی ثبت نشده است.") +
      "</p></div>";
  L.slice(0, 40).forEach(function (r, i) {
    h += smpCard(r, i);
  });
  return h + smpDupSection();
}

function smpRowsOf(r) {
  return [
    ["تاریخ و ساعت ثبت", when(r.at)],
    ["ثبت‌کننده", r.by || ""],
    ["ایستگاه خط", r.line || ""],
    ["دلیل نمونه‌زنی", r.reason || ""],
    ["سازنده", r.supplier || "—"],
    ["وضعیت", r.status || ""],
    ["تعداد مجاز خودرو", r.allow || "—"],
    ["شماره‌ی خودروها", (r.cars || []).join("، ") || "—"],
  ];
}

function buildSmpXlsx(r) {
  var A = [["گزارش نمونه‌زنی قطعه · زامیاد", ""]].concat(smpRowsOf(r));
  A.push(["شرح نمونه‌زنی", r.desc || ""]);
  A.push(["نتیجه و توضیحات", r.result || ""]);
  var Pp = [["قطعه", "تعداد"]].concat(
    (r.parts || []).map(function (p) {
      return [p.n, p.q];
    }),
  );
  var H = [["حاضر", "امضا"]].concat(
    (r.att || []).map(function (a) {
      return [a, ""];
    }),
  );
  var Hs = [["تاریخ و ساعت", "ثبت‌کننده", "وضعیت", "توضیح"]].concat(
    (r.hist || []).map(function (x) {
      return [when(x.at), x.by || "", x.status || "", x.note || ""];
    }),
  );
  var Cx = [["شماره", "سریال", "شاسی", "موتور", "اتاق", "محصول", "سوخت"]].concat(smpSpecRows(r));
  var sh = [
    { n: "خلاصه", r: A, w: [28, 60], h: [0] },
    { n: "قطعه‌ها", r: Pp, w: [40, 12], h: [0] },
    { n: "خودروها", r: Cx, w: [14, 14, 14, 14, 14, 12, 14], h: [0] },
    { n: "حاضرین", r: H, w: [34, 34], h: [0] },
    { n: "تاریخچه", r: Hs, w: [22, 22, 18, 40], h: [0] },
  ];
  return packXlsx(sh);
}

function buildSmpPdf(r) {
  var title = "نمونه‌زنی · " + when(r.at),
    P = pdfPainter({
      fs: 22,
      lh: 32,
      keepLines: false,
      header: function (p) {
        var c = p.ctx,
          M = p.M,
          PW = p.PW;
        p.font(30, 1);
        c.fillStyle = "#14213d";
        c.fillText("فرم نمونه‌زنی قطعه - زامیاد", PW - M, M);
        p.font(22, 0);
        c.fillStyle = "#555";
        c.fillText(title, PW - M, M + 42);
        c.strokeStyle = "#14213d";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(M, M + 78);
        c.lineTo(PW - M, M + 78);
        c.stroke();
        return M + 98;
      },
    }),
    font = P.font,
    ensure = P.ensure,
    heading = P.heading,
    table = P.table,
    PW = P.PW,
    M = P.M;
  P.newPage();
  font(24, 0);
  table(
    [
      { t: "عنوان", w: 2 },
      { t: "مقدار", w: 5 },
    ],
    smpRowsOf(r),
  );
  heading("قطعه‌ها");
  table(
    [
      { t: "قطعه", w: 6 },
      { t: "تعداد", w: 1.5 },
    ],
    (r.parts || []).map(function (p) {
      return [p.n, String(p.q)];
    }),
  );
  if (smpCars(r).length) {
    heading("خودروها و مشخصات");
    table(
      [
        { t: "شماره", w: 2 },
        { t: "سریال", w: 2 },
        { t: "شاسی", w: 2 },
        { t: "موتور", w: 2 },
        { t: "اتاق", w: 2 },
        { t: "محصول", w: 1.6 },
        { t: "سوخت", w: 1.8 },
      ],
      smpSpecRows(r),
    );
  }
  heading("شرح نمونه‌زنی");
  table([{ t: "شرح", w: 1 }], [[r.desc || ""]]);
  if (r.result) {
    heading("نتیجه و توضیحات");
    table([{ t: "توضیح", w: 1 }], [[r.result]]);
  }
  heading("حاضرین و امضا");
  (function () {
    var W = PW - 2 * M,
      ws = [W * 0.1, W * 0.4, W * 0.5],
      H = 96,
      LH = 32,
      pad = 10,
      c = function () {
        return P.ctx;
      };
    function row(h, cells, bold, bg) {
      ensure(h);
      if (bg) {
        c().fillStyle = bg;
        c().fillRect(M, P.y, W, h);
      }
      c().strokeStyle = "#9aa5b8";
      c().lineWidth = 1;
      c().strokeRect(M, P.y, W, h);
      var x = PW - M;
      cells.forEach(function (t, i) {
        font(22, bold);
        c().fillStyle = "#14213d";
        c().textAlign = "right";
        c().fillText(t, x - pad, P.y + pad);
        x -= ws[i];
        c().beginPath();
        c().moveTo(x, P.y);
        c().lineTo(x, P.y + h);
        c().stroke();
      });
      P.y += h;
    }
    row(LH + 2 * pad, ["ردیف", "حاضر", "امضا"], 1, "#dce3f0");
    (r.att || []).forEach(function (n, i) {
      row(H, [faDigits(i + 1), n, ""], 0);
    });
    P.y += 10;
  })();
  return P.finish("گزارش نمونه‌زنی");
}

function smpExport(kind, id) {
  var r = (S.smp || []).filter(function (x) {
    return x.id === id;
  })[0];
  if (!r) return Promise.resolve();
  var base = "sampling-" + String(r.at || "").slice(0, 10);
  if (kind === "xlsx") return saveFile(base + ".xlsx", buildSmpXlsx(r));
  return loadPdfFonts().then(function () {
    return saveFile(base + ".pdf", buildSmpPdf(r));
  });
}

function clickSamples(ev, el, a, id, d) {
  if (a === "smppick" && smpCanWrite()) return samples_smppick(ev, el, a, id, d);
  if (a === "smpnew" && smpCanWrite()) return samples_smpnew(ev, el, a, id, d);
  if (a === "smpnext" && smpCanWrite()) return samples_smpnext(ev, el, a, id, d);
  if (a === "smpprev" && smpCanWrite() && !S.smpBusy) return samples_smpprev(ev, el, a, id, d);
  if (a === "smpgo" && smpCanWrite()) return samples_smpgo(ev, el, a, id, d);
  if (a === "smpsave" && smpCanWrite()) {
    smpSubmit();
    return true;
  }
  if (a === "smpdelask" && S.isOwner) {
    S.smpDel = id;
    render();
    return true;
  }
  if (a === "smpdelno") {
    S.smpDel = "";
    render();
    return true;
  }
  if (a === "smpduptoggle" && S.isOwner) {
    S.smpDupOpen = !S.smpDupOpen;
    render();
    return true;
  }
  if (a === "smpkeep" && S.isOwner) return samples_smpkeep(ev, el, a, id, d);
  if (a === "smppurgeask" && S.isOwner) {
    S.smpPurge = true;
    render();
    return true;
  }
  if (a === "smppurgeno") {
    S.smpPurge = false;
    render();
    return true;
  }
  if (a === "smppurgeyes" && S.isOwner) {
    smpPurgeNow();
    return true;
  }
  if (a === "smpdelyes" && S.isOwner) return samples_smpdelyes(ev, el, a, id, d);
  if (a === "smpdoneclose") {
    S.smpDone = null;
    render();
    return true;
  }
  if (a === "smpadd" && smpCanWrite()) return samples_smpadd(ev, el, a, id, d);
  if (a === "smprm" && smpCanWrite()) return samples_smprm(ev, el, a, id, d);
  if (a === "smpatt" && smpCanWrite()) return samples_smpatt(ev, el, a, id, d);
  if ((a === "smppdf" || a === "smpxlsx") && smpCanView()) return samples_smppdf(ev, el, a, id, d);
  if (a === "smpstat" && smpCanWrite()) return samples_smpstat(ev, el, a, id, d);
  return false;
}

// اقدام «smppick» از clickSamples
function samples_smppick(ev, el, a, id, d) {
  smpSync();
  S.sf[el.getAttribute("data-k")] = el.getAttribute("data-v");
  S.smpErr = "";
  smpDraftSave();
  render();
  return true;
}

// اقدام «smpnew» از clickSamples
function samples_smpnew(ev, el, a, id, d) {
  S.sf = S.sf || smpDef();
  if (S.sw == null) S.sw = 0;
  S.smpErr = "";
  smpDraftSave();
  render();
  window.scrollTo(0, 0);
  return true;
}

// اقدام «smpnext» از clickSamples
function samples_smpnext(ev, el, a, id, d) {
  smpSync();
  var se = smpStepErr(S.sw, S.sf);
  S.smpErr = se;
  if (!se) S.sw++;
  smpDraftSave();
  render();
  var sc0 = document.querySelector(".stepcur");
  if (sc0) sc0.scrollTop = 0;
  if (!se && S.sw === SMP_STEPS.length - 1) ensureCar(smpCarList(S.sf)).then(render);
  return true;
}

// اقدام «smpprev» از clickSamples
function samples_smpprev(ev, el, a, id, d) {
  smpSync();
  S.smpErr = "";
  S.sw = S.sw > 0 ? S.sw - 1 : null;
  smpDraftSave();
  render();
  return true;
}

// اقدام «smpgo» از clickSamples
function samples_smpgo(ev, el, a, id, d) {
  smpSync();
  var sk = +el.getAttribute("data-k");
  if (sk < S.sw) {
    S.sw = sk;
    S.smpErr = "";
    smpDraftSave();
    render();
  }
  return true;
}

// اقدام «smpkeep» از clickSamples
function samples_smpkeep(ev, el, a, id, d) {
  saveOnce(
    "smpkeep",
    function () {
      return store.update("users", id, { keep: true });
    },
    "به لیست برگشت",
  );
  return true;
}

// اقدام «smpdelyes» از clickSamples
function samples_smpdelyes(ev, el, a, id, d) {
  var dr = smpById(id);
  S.smpDel = "";
  if (!dr) {
    render();
    return true;
  }
  var what =
    "حذف نمونه‌زنی: " +
    (dr.line || "") +
    " · " +
    (dr.parts || [])
      .map(function (p) {
        return p.n;
      })
      .join("، ") +
    " · ثبت‌شده در " +
    when(dr.at);
  saveOnce(
    "smpdel",
    function () {
      return store.del("users", id).then(function () {
        return store.set("users", "lg_" + uid(), {
          at: nowIso(),
          by: S.user.name,
          byId: S.user.id,
          letter: "",
          what: what,
        });
      });
    },
    "نمونه‌زنی حذف شد",
  );
  return true;
}

// اقدام «smpadd» از clickSamples
function samples_smpadd(ev, el, a, id, d) {
  smpSync();
  S.sf.parts.push({ n: "", q: "" });
  smpDraftSave();
  render();
  return true;
}

// اقدام «smprm» از clickSamples
function samples_smprm(ev, el, a, id, d) {
  smpSync();
  var ri = +el.getAttribute("data-i");
  S.sf.parts.splice(ri, 1);
  if (!S.sf.parts.length) S.sf.parts = [{ n: "", q: "" }];
  for (var z = 0; z < 12; z++) {
    ["sp_n_", "sp_q_"].forEach(function (pp) {
      var ze = document.getElementById(pp + z);
      if (ze) ze.value = "";
    });
  }
  render();
  return true;
}

// اقدام «smpatt» از clickSamples
function samples_smpatt(ev, el, a, id, d) {
  smpSync();
  var ap = el.getAttribute("data-p");
  if (S.sf.att[ap]) delete S.sf.att[ap];
  else S.sf.att[ap] = 1;
  render();
  return true;
}

// اقدام «smppdf» از clickSamples
function samples_smppdf(ev, el, a, id, d) {
  toast("در حال ساخت فایل…");
  setTimeout(function () {
    smpExport(a === "smppdf" ? "pdf" : "xlsx", id).catch(function (e) {
      toast("ساخت فایل ناموفق بود: " + ((e && e.message) || ""));
    });
  }, 50);
  return true;
}

// اقدام «smpstat» از clickSamples
function samples_smpstat(ev, el, a, id, d) {
  var si = el.getAttribute("data-i"),
    ns = fieldValue("ss_" + si),
    nn = fieldValue("sn_" + si),
    rec0 = (S.smp || []).filter(function (x) {
      return x.id === id;
    })[0];
  if (!rec0 || !ns) {
    return true;
  }
  var hist = (rec0.hist || []).concat([{ at: nowIso(), by: S.user.name, status: ns, note: nn }]);
  save(function () {
    return store.update("users", id, { status: ns, hist: hist });
  }, "وضعیت ثبت شد");
  return true;
}
