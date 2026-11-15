/* ════════════════════════════════════════════════════════════
   فصل 09 — ویزارد: اطلاعات و خلاصه‌ها
   اطلاعات خودرو بالای صفحه، نام/تاریخ/ساعت ثبت‌کننده، اصلاحیه‌ها، خلاصه‌ها.
   توابع اصلی: smpList، smpMini، sampleCount، sampleBtn، carInfo، openedHtml، kvNum، whoWhen و …
   ════════════════════════════════════════════════════════════ */

function smpList(d) {
  var ids = Object.keys(d.items || {}).filter(function (id) {
    var it = d.items[id];
    return it && it.r === "sample" && it.custom && !it.closedAt;
  });
  if (!ids.length) return '<p class="hint" style="margin:0 0 8px">نمونه‌ای ثبت نشده است.</p>';
  return (
    '<ul class="stepdef smp">' +
    ids
      .map(function (id) {
        return rmLi(d, id, "◇ نمونه: " + esc((d.items[id].note || "").trim()));
      })
      .join("") +
    "</ul>"
  );
}

function smpMini(d) {
  var ids = Object.keys(d.items || {}).filter(function (id) {
    var it = d.items[id];
    return it && it.r === "sample" && it.custom && !it.closedAt;
  });
  var h = '<div class="smpmini">';
  if (ids.length)
    h +=
      '<ul class="stepdef smp">' +
      ids
        .map(function (id) {
          return rmLi(d, id, "◇ نمونه: " + esc((d.items[id].note || "").trim()));
        })
        .join("") +
      "</ul>";
  if (S.sxOpen === "sample") {
    S.sxType = "sample";
    h += sxEditBox("sample");
  } else
    h +=
      '<button class="btn sm smpbtn" data-act="sxopen" data-t="sample" data-sec="sample">◇ ثبت نمونه' +
      (ids.length ? " (" + faDigits(ids.length) + ")" : "") +
      "</button>";
  return h + "</div>";
}

function sampleCount(d) {
  return Object.keys(d.items || {}).filter(function (i) {
    var t = d.items[i];
    return t && t.r === "sample" && t.custom && !t.closedAt;
  }).length;
}

function sampleBtn(d) {
  if (!isChs(d.sheet) || S.sxOpen || S.acOpen || !canEdit(d.sheet, d.key)) return "";
  var n = sampleCount(d);
  return (
    '<button type="button" class="btn smpbtn" data-act="sxopen" data-t="sample" data-sec="sample" aria-label="نمونه">◇' +
    (n ? '<span class="cnt">' + faDigits(n) + "</span>" : "") +
    "</button>"
  );
}

// اطلاعات خودرو بالای صفحه (سریال، شاسی، موتور، اتاق).
function carInfo(d) {
  var fu =
      (d.sheet === "trim" || d.sheet === "engine") && !fuelRaw(d)
        ? ""
        : fuelOf(d) === "single"
          ? "تک‌سوز"
          : fuelOf(d) === "dual"
            ? "دوگانه‌سوز"
            : fuelTxt(fuelOf(d)),
    dt = "";
  try {
    dt = d.createdAt ? fmtD.format(new Date(d.createdAt)) : "";
  } catch (e) {}
  var smn = sampleCount(d);
  if (isChs(d.sheet))
    return (
      '<div class="carinfo ch"><div class="ci1"><div class="cnum"><small>' +
      ({
        engine: "شماره موتور",
        trim: "شماره اتاق",
        final1: "شماره سریال",
        final2: "شماره سریال",
        mech: "شماره سریال",
        mech2: "شماره سریال",
        roll: "شماره سریال",
        road: "شماره سریال",
        comm: "شماره سریال",
      }[d.sheet] || "شماره شاسی") +
      (isChs(d.sheet) && d.test ? ' <span class="tchip">TEST</span>' : "") +
      '</small><b class="num">' +
      esc(d.key) +
      '</b></div><div class="cside">' +
      (fu ? '<span class="cfuel">' + esc(fu) + "</span>" : "") +
      (d.test && !isChs(d.sheet) ? '<span class="tchip">TEST</span>' : "") +
      (canEdit(d.sheet, d.key) && !isChs(d.sheet)
        ? '<button type="button" class="smppill" data-act="sxopen" data-t="sample" data-sec="sample">◇ نمونه' +
          (smn ? " (" + faDigits(smn) + ")" : "") +
          "</button>"
        : "") +
      '</div></div><div class="ci2"><span>' +
      esc(productShort(d)) +
      '</span><span>کد فرم: <bdi dir="ltr">' +
      esc(d.formCode || FORM_CODE) +
      "</bdi></span><span>" +
      esc(dt) +
      "</span></div></div>"
    );
  return (
    '<div class="carinfo"><div class="ci1"><b class="num">' +
    esc(d.key) +
    '</b><span class="cfuel">' +
    esc(fu) +
    "</span>" +
    (d.test ? '<span class="tchip">TEST</span>' : "") +
    '</div><div class="ci2"><span>' +
    esc(productShort(d)) +
    "</span><span>" +
    esc(dt) +
    "</span></div></div>"
  );
}

function openedHtml(d) {
  return '<div class="opened"><small>باز شد</small>' + whoWhen(d.createdBy, d.createdAt) + "</div>";
}

function kvNum(label, v) {
  return v
    ? '<div class="kv"><small>' + label + '</small><b class="num">' + esc(v) + "</b></div>"
    : "";
}

// نام، تاریخ و ساعت ثبت‌کننده را در سه خط جدا نشان می‌دهد.
function whoWhen(by, iso, nameLabel) {
  return (
    '<span class="fxmeta"><span>' +
    (nameLabel || "نام") +
    ": <bdi>" +
    esc(by || "") +
    "</bdi></span><span>تاریخ: <bdi>" +
    esc(dateOnly(iso)) +
    "</bdi></span><span>ساعت: <bdi>" +
    esc(timeHM(iso)) +
    "</bdi></span></span>"
  );
}

function whoWhenTxt(d, by, iso) {
  return whoWhen(by, iso);
}

/* v109: نام/تاریخ/ساعت برای همهٔ برگه‌ها جدا */
function amendHtml(d) {
  var am = [];
  Object.keys(d.items || {}).forEach(function (i) {
    var t = d.items[i];
    if (!t) return;
    if (t.removedPost)
      am.push({
        at: t.removedAt,
        l: "✕ حذف شد: " + esc(t.wasNote || "") + whoWhenTxt(d, t.removedBy, t.removedAt),
      });
    else if (t.post && t.r && !t.closedAt)
      am.push({
        at: t.at,
        l:
          "✎ " +
          esc(typeName(t.r)) +
          ": " +
          esc(t.note || t.part || "") +
          whoWhenTxt(d, t.by, t.at),
      });
  });
  if (!am.length) return "";
  am.sort(function (x, y) {
    return String(x.at) < String(y.at) ? -1 : 1;
  });
  return (
    '<div class="amend"><b>اصلاحیه‌های بعد از تأیید نهایی</b><ul class="stepdef">' +
    am
      .map(function (x) {
        return "<li>" + x.l + "</li>";
      })
      .join("") +
    "</ul></div>"
  );
}

function exportCard(d) {
  var st = stat(d);
  if (st.signed < st.secs) return "";
  var pr = d.sheet === "engine" ? chassisPair(d) : null,
    sh = pr ? "chassis" : d.sheet,
    q = 'data-q="' + esc(pr ? pr.c.key : d.key) + '" data-sh="' + esc(sh) + '"',
    t = ' title="خروجی ایستگاه ' + esc(stationTitle(sh)) + '"';
  return (
    '<div class="exportbar"><button class="btn sm" data-act="pdf" ' +
    q +
    t +
    '>PDF</button><button class="btn sm" data-act="xlsx" ' +
    q +
    t +
    ">Excel</button></div>"
  );
}

/* v161: نوار «برگردان» داخل قاب بالای صفحه می‌آید؛ بیرون از قاب زیر نوار پایین می‌افتاد */
function undoBar(d) {
  if (
    d.sheet !== "chassis" ||
    !S.undo ||
    S.undo.id !== d.id ||
    Date.now() >= S.undo.until ||
    Object.keys(d.signs || {}).length
  )
    return "";
  return (
    '<div class="undobar"><span>نوع سوخت «' +
    fuelTxt(S.undo.fuel) +
    '» ثبت شد.</span><button class="btn sm" data-act="undofuel">برگردان (اشتباه بود)</button></div>'
  );
}

function inspWarns(d) {
  var W = "";
  if (ownsSheet(S.sheet) && blockedBy(S.sheet, S.key)) W += blockCard(S.sheet, S.key);
  fuelWarns(d).forEach(function (m) {
    W +=
      '<div class="card"><p class="err" style="margin:0">هشدار: ' +
      esc(m) +
      " نوع سوخت درست ثبت شده؟ در صورت اشتباه، از «اصلاح شماره‌ی اشتباه» درخواست اصلاح سوخت بدهید.</p></div>";
  });
  return W + gasCard(d) + releaseCard(d);
}

/* ---------- پرونده‌ی سریع خودرو ---------- */
function stageStatus(d) {
  if (!d) return "ثبتی وجود ندارد (بازرسی تأیید نشده)";
  var s = stat(d),
    made = Object.keys(d.items || {}).filter(function (id) {
      return DEF_R[d.items[id].r];
    }).length;
  if (s.open) return faDigits(s.open) + " مورد باز";
  if (!s.ans) return "برگه باز شده، هنوز بازرسی نشده";
  if (s.ans < s.total)
    return "در حال بازرسی (" + faDigits(s.ans) + " از " + faDigits(s.total) + ")";
  return made
    ? "بازرسی کامل؛ " + faDigits(made) + " مورد ثبت و بسته شده"
    : "بازرسی کامل، بدون ایراد";
}
