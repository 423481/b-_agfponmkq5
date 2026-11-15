/* ════════════════════════════════════════════════════════════
   فصل 08 — ویزارد: کارت آیتم‌ها و ثبت ایراد
   آیتم‌های بازرسی، علامت سالم/ایراد، یادداشت و عکس، ایرادهای پرتکرار، گفتار به نوشتار.
   توابع اصلی: noteBlock، learnPhrases، ngChips، micBtn، originOpts، itemLabel، repeatsFor، repeatCard و …
   ════════════════════════════════════════════════════════════ */

function noteBlock(d, id, it, edit) {
  var lab = it.r === "ng" ? "ایراد" : it.r === "shortage" ? "کسری" : "قطعه نمونه",
    cls = it.closedAt ? "done" : it.r;
  var h =
    '<div class="nt ' +
    cls +
    '"><div><span class="chip ' +
    (it.closedAt ? "closed" : it.r === "ng" ? "open" : it.r) +
    '">' +
    (it.closedAt ? "بسته شد" : lab + " · باز") +
    "</span></div>";
  if (it.note) h += "<p>" + esc(it.note) + "</p>";
  if (it.origin && SHEETS[it.origin])
    h += '<div class="m">ایستگاه سازنده: ' + esc(SHEETS[it.origin].name) + "</div>";
  if (it.photo)
    h +=
      '<img src="' +
      it.photo +
      '" alt="عکس ایراد" style="max-width:100%;max-height:200px;border-radius:8px;margin:6px 0;display:block">';
  h += '<div class="m">' + whoWhen(it.by, it.at) + "</div>";
  if (it.closedAt)
    h += '<div class="m">' + whoWhen(it.closedBy, it.closedAt, "بسته‌کننده") + "</div>";
  if (it.closeNote) h += '<div class="m">اقدام انجام‌شده: ' + esc(it.closeNote) + "</div>";
  if (!it.closedAt && edit) {
    var rm = !d.final && (it.custom || !(d.signs && d.signs[String(id).split("-")[0]]));
    h +=
      '<div class="row"><button class="btn sm ok" data-act="close" data-id="' +
      esc(id) +
      '">رفع شد / بسته شد</button>';
    if (rm)
      h +=
        S.rmItem === id
          ? '<button class="btn sm" data-act="rmyes" data-id="' +
            esc(id) +
            '">تأیید حذف</button><button class="btn sm" data-act="rmno">انصراف</button>'
          : '<button class="btn sm" data-act="rmask" data-id="' + esc(id) + '">حذف</button>';
    h += "</div>";
  }
  return h + "</div>";
}

function learnPhrases(sheet, id, all) {
  var c = {};
  S.data.insp.forEach(function (x) {
    if (x.sheet !== sheet) return;
    var it = x.items && x.items[id];
    if (!it || it.r !== "ng") return;
    (it.picks || []).concat(it.free ? [it.free] : []).forEach(function (p) {
      p = String(p).trim();
      if (p && p.length <= 30 && (all || ngPresets().indexOf(p) < 0)) c[p] = (c[p] || 0) + 1;
    });
  });
  return Object.keys(c)
    .sort(function (a, b) {
      return c[b] - c[a];
    })
    .slice(0, all ? 10 : 4);
}

function ngChips(d, id) {
  var sel = S.edPick || {},
    chs = isChs(d.sheet),
    learned = learnPhrases(d.sheet, id, chs),
    list = chs ? learned : learned.concat(ngPresets());
  Object.keys(sel).forEach(function (p) {
    if (list.indexOf(p) < 0) list.push(p);
  });
  var h = '<div class="chips" style="margin:8px 0">';
  list.forEach(function (p) {
    h +=
      '<button type="button" class="pick" data-act="edpick" data-p="' +
      esc(p) +
      '" aria-pressed="' +
      !!sel[p] +
      '">' +
      esc(p) +
      "</button>";
  });
  return h + "</div>";
}

function micBtn(t) {
  return (
    '<button type="button" class="btn sm" data-act="mic" data-t="' +
    t +
    '" aria-pressed="' +
    (S.micT === t) +
    '">' +
    (S.micT === t ? "در حال گوش دادن…" : "🎤 گفتن") +
    "</button>"
  );
}

function originOpts(sheet) {
  var i = STAGES.indexOf(sheet);
  return STAGES.slice(0, Math.max(i, 0)).filter(function (k) {
    return ASSEMBLY.indexOf(k) >= 0 && SHEETS[k];
  });
}

function itemLabel(r, id, it) {
  return it.custom ? it.part || it.free || it.note || "توضیح دستی" : labelOf(r.sheet, id, r);
}

function repeatsFor(y, m, d) {
  var c = {};
  S.data.insp.forEach(function (r) {
    if (!SHEETS[r.sheet]) return;
    Object.keys(r.items || {}).forEach(function (id) {
      var it = r.items[id];
      if (it.r !== "ng") return;
      var j = toJalali(it.at);
      if (!(j && j.y === y && j.m === m && j.d === d)) return;
      var k = SHEETS[r.sheet].name + " - " + itemLabel(r, id, it);
      c[k] = (c[k] || 0) + 1;
    });
  });
  return Object.keys(c)
    .filter(function (k) {
      return c[k] >= 3;
    })
    .map(function (k) {
      return { k: k, n: c[k] };
    })
    .sort(function (a, b) {
      return b.n - a.n;
    });
}

function repeatCard(y, m, d) {
  var R = repeatsFor(y, m, d);
  if (!R.length) return "";
  return (
    '<div class="card" style="border:2px solid #c0392b"><h2>⚠ هشدار ایراد تکراری</h2><p class="hint" style="margin-bottom:8px">این ایرادها در همین روز سه بار یا بیشتر ثبت شده‌اند:</p>' +
    R.map(function (x) {
      return '<p style="margin:4px 0"><b>' + esc(x.k) + "</b> · " + faDigits(x.n) + " بار</p>";
    }).join("") +
    "</div>"
  );
}

function returnedCard() {
  if (!S.user) return "";
  var out = [];
  S.data.insp.forEach(function (r) {
    if (!SHEETS[r.sheet]) return;
    Object.keys(r.items || {}).forEach(function (id) {
      var it = r.items[id];
      if (
        it.r !== "ng" ||
        it.closedAt ||
        !it.origin ||
        it.origin === r.sheet ||
        !SHEETS[it.origin] ||
        SHEETS[it.origin].station !== S.user.station
      )
        return;
      out.push({ r: r, id: id, it: it });
    });
  });
  if (!out.length) return "";
  out.sort(function (a, b) {
    return (b.it.at || "") < (a.it.at || "") ? -1 : 1;
  });
  var h =
    '<div class="card" style="border:2px solid #c0392b"><h2>ایرادهای برگشتی به ایستگاه شما (' +
    faDigits(out.length) +
    ')</h2><p class="hint" style="margin-bottom:8px">این ایرادها در ایستگاه‌های بعدی پیدا شده و منشأ آن‌ها ایستگاه شماست.</p>';
  out.slice(0, 15).forEach(function (x) {
    h +=
      '<div class="nt ng" style="margin:6px 0"><b class="num">' +
      esc(identOf(x.r).serial || x.r.key) +
      "</b> · پیدا شده در «" +
      esc(SHEETS[x.r.sheet].name) +
      "»<p>" +
      esc(x.it.note || itemLabel(x.r, x.id, x.it)) +
      '</p><div class="m">' +
      whoWhen(x.it.by, x.it.at) +
      "</div></div>";
  });
  return h + "</div>";
}

function photoResize(file, cb) {
  var fr = new FileReader();
  fr.onload = function () {
    var im = new Image();
    im.onload = function () {
      var sc = Math.min(1, 560 / Math.max(im.width, im.height)),
        c = document.createElement("canvas");
      c.width = Math.round(im.width * sc);
      c.height = Math.round(im.height * sc);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", 0.55));
    };
    im.onerror = function () {
      cb("");
    };
    im.src = fr.result;
  };
  fr.onerror = function () {
    cb("");
  };
  fr.readAsDataURL(file);
}

function originBlock(d) {
  var opts = S.editType === "ng" ? originOpts(d.sheet) : [];
  if (!opts.length) return "";
  var cur = S.edOrigin && SHEETS[S.edOrigin] ? SHEETS[S.edOrigin].name : "";
  return (
    '<details class="orig"' +
    (cur ? " open" : "") +
    "><summary>ایستگاه سازنده" +
    (cur ? ": <b>" + esc(cur) + "</b>" : " ◀") +
    '</summary><div class="chips">' +
    opts
      .map(function (k) {
        return (
          '<button type="button" class="pick" data-act="edorigin" data-o="' +
          k +
          '" aria-pressed="' +
          (S.edOrigin === k) +
          '">' +
          esc(SHEETS[k].name) +
          "</button>"
        );
      })
      .join("") +
    "</div></details>"
  );
}

function editBox(d, id, it, p) {
  return (
    '<div class="editbox">' +
    (S.editType === "ng"
      ? '<b style="font-size:13px">نوع ایراد را انتخاب کنید (چند مورد ممکن است)</b>' +
        ngChips(d, id)
      : "") +
    '<label class="f">' +
    (S.editType === "sample"
      ? "نام یا شماره قطعه نمونه و توضیح"
      : S.editType === "shortage"
        ? "نام قطعه کسری و توضیح"
        : "توضیح بیشتر (اختیاری)") +
    '<textarea class="in" id="nt-' +
    id +
    '" placeholder="' +
    (S.editType === "sample"
      ? "مثلاً: بست شلنگ نمونه، شماره قطعه…"
      : S.editType === "shortage"
        ? "مثلاً: قطعه در شرکت نبود و خودرو بدون آن مونتاژ شد…"
        : "مثلاً: بست نصب نشده، رفع نشده در ایستگاه…") +
    '">' +
    esc(S.edDraft != null ? S.edDraft : it.note || "") +
    "</textarea></label>" +
    sugBox("nt-" + id) +
    originBlock(d) +
    (S.editType === "ng" && !(p && p.ph === 0)
      ? '<div class="row" style="margin-top:6px"><label class="btn sm" style="cursor:pointer">📷 عکس ایراد<input type="file" id="phfile" accept="image/*" capture="environment" style="display:none"></label>' +
        (S.edPhoto
          ? '<img src="' +
            S.edPhoto +
            '" alt="عکس ایراد" style="height:56px;border-radius:6px"><button type="button" class="btn sm" data-act="phdel">حذف عکس</button>'
          : "") +
        "</div>"
      : "") +
    (S.editErr ? '<p class="err">' + esc(S.editErr) + "</p>" : "") +
    '<div class="row"><button class="btn primary sm" data-act="savenote" data-id="' +
    id +
    '">ثبت در پرونده</button>' +
    (p && p.mic === 0 ? "" : micBtn("nt-" + id)) +
    '<button class="btn sm" data-act="cancel">انصراف</button></div></div>'
  );
}

function sxEditBox(secKey) {
  var T = S.sxType === "shortage" ? "shortage" : S.sxType === "sample" ? "sample" : "ng";
  var lab = T === "shortage" ? "قطعه‌ی کسری" : T === "sample" ? "قطعه‌ی نمونه" : "ایراد";
  var ph =
    T === "shortage"
      ? "مثلاً: سنسور اکسیژن…"
      : T === "sample"
        ? "مثلاً: بست شلنگ نمونه…"
        : "مثلاً: بست نصب نشده…";
  var pv =
    T === "shortage"
      ? "کسری‌های خودروی قبلی"
      : T === "sample"
        ? "نمونه‌های خودروی قبلی"
        : "ایرادهای خودروی قبلی";
  return (
    '<div class="editbox"><div class="row sxtop">' +
    micBtn("sx").replace("btn sm", "btn sxmic") +
    '<button type="button" class="btn sm" data-act="sxprev" data-sec="' +
    esc(secKey) +
    '">⟲ ' +
    pv +
    '</button></div><label class="f">' +
    lab +
    '<textarea class="in" id="sx" rows="3" placeholder="' +
    ph +
    '"></textarea></label>' +
    (S.sxErr ? '<p class="err">' + esc(S.sxErr) + "</p>" : "") +
    '<div class="row sxbtns"><button class="btn primary" data-act="sxadd" data-sec="' +
    esc(secKey) +
    '">' +
    (T === "shortage" ? "ثبت کسری" : T === "sample" ? "ثبت نمونه" : "ثبت ایراد") +
    '</button><button class="btn" data-act="sxcancel">انصراف</button></div><p class="hint" style="margin:0 0 6px">هر مورد در یک خط، یا با 🎤 بگویید و بین موارد «بعدی» بگویید.</p>' +
    sugBox("sx") +
    "</div>"
  );
}

function kvProduct(d) {
  return '<div class="kv"><small>محصول</small><b>' + esc(productShort(d)) + "</b></div>";
}

function kvFuel(txt) {
  return '<div class="kv"><small>سوخت</small><b>' + esc(txt) + "</b></div>";
}

// قاب «شناسایی»: عنوان، ردیف مشخصه‌ها، «باز شده توسط» و دکمه‌ی اصلاح
function idBlock(title, kvs, d) {
  return (
    '<div class="steplb">' + title + '</div><div class="kvs">' + kvs + "</div>" + openedHtml(d) + corrBtn(d)
  );
}

function idPanel(d) {
  var mm = mergedFor(d.sheet, d.key, d),
    raw = fuelRaw(d);
  if (d.sheet === "engine")
    return idBlock(
      "شناسایی موتور",
      '<div class="kv"><small>شماره موتور</small><b class="num">' +
        esc(d.key) +
        "</b></div>" +
        kvProduct(d),
      d,
    );
  if (d.sheet === "gas")
    return idBlock(
      "شناسایی خودرو",
      kvNum("شماره سریال", d.key) +
        kvNum("شماره موتور", mm.engine) +
        kvProduct(d) +
        kvFuel(fuelTxt(fuelOf(d))),
      d,
    );
  if (fullIdSheet(d.sheet))
    return idBlock(
      "شناسایی خودرو",
      kvNum("شماره سریال", d.key) +
        kvNum("شماره شاسی", mm.chassisNo) +
        kvNum("شماره موتور", mm.engine) +
        kvNum("شماره اتاق", mm.room) +
        kvProduct(d) +
        (raw ? kvFuel(fuelTxt(raw)) : ""),
      d,
    );
  if (d.sheet === "trim")
    return idBlock(
      "شناسایی خودرو",
      '<div class="kv"><small>شماره اتاق</small><b class="num">' +
        esc(d.key) +
        "</b></div>" +
        (mm.chassisNo
          ? '<div class="kv"><small>شماره شاسی</small><b class="num">' +
            esc(mm.chassisNo) +
            "</b></div>"
          : "") +
        kvProduct(d) +
        (raw ? kvFuel(fuelTxt(raw)) : ""),
      d,
    );
  return idBlock(
    "شناسایی خودرو",
    '<div class="kv"><small>شماره شاسی</small><b class="num">' +
      esc(d.key) +
      '</b></div><div class="kv"><small>شماره موتور</small><b class="num">' +
      esc(mm.engine || "—") +
      "</b></div>" +
      kvProduct(d) +
      kvFuel(fuelTxt(fuelOf(d))),
    d,
  );
}

function shortageLi(d, i) {
  var t = d.items[i];
  if (isChs(d.sheet))
    return rmLi(d, i, "⚠ " + esc(t.part || t.note || "")).replace('class="rmli', 'class="shli rmli');
  return "<li>⚠ " + esc(t.part || t.note || "") + (t.closedAt ? " <small>(بسته شد)</small>" : "") + "</li>";
}

function shortPanel(d) {
  var ids = Object.keys(d.items || {}).filter(function (i) {
    var t = d.items[i];
    return t && t.r === "shortage";
  });
  return (
    '<div class="steplb">کسری</div>' +
    (ids.length
      ? '<ul class="stepdef">' +
        ids
          .map(function (i) {
            return shortageLi(d, i);
          })
          .join("") +
        "</ul>"
      : '<p class="hint" style="color:var(--ok);font-weight:700">این خودرو کسری ندارد.</p>')
  );
}

// بخش تأییدشده: ایرادهای ثبت‌شده و دکمه‌ی ثبت ایراد تازه؛ رشته‌ی خالی اگر بخش یا امضا نیست
function sectionPanel(d, k) {
  var sc = secsOf(d.sheet, prodOf(d)).filter(function (x) {
      return x.id === k;
    })[0],
    sg = d.signs && d.signs[k];
  if (!sc || !sg) return "";
  var df = secDefects(d, sc),
    h =
      '<div class="steplb">بخش ' +
      esc(sc.name) +
      ' <small style="font-size:15px;color:var(--ok)">✓ تأیید شده</small></div><div class="hint" style="margin:0 0 8px">' +
      (isChs(d.sheet) ? whoWhen(sg.by, sg.at) : "تأیید: " + esc(sg.by) + " · " + esc(when(sg.at))) +
      "</div>";
  h += df.length
    ? '<ul class="stepdef">' +
      df
        .map(function (e) {
          return rmLi(
            d,
            e.id,
            (isChs(d.sheet) ? "" : "✗ ") +
              esc(e.l) +
              (e.it.custom ? "" : e.it.note ? " — " + esc(e.it.note) : ""),
          );
        })
        .join("") +
      "</ul>"
    : '<p class="hint" style="color:var(--ok);font-weight:700">همه‌ی بندها سالم ثبت شده است.</p>';
  if (S.sxOpen === k) {
    S.sxType = "ng";
    return h + sxEditBox(k);
  }
  return (
    h +
    '<button class="btn stepng" data-act="sxopen" data-t="ng" data-sec="' +
    esc(k) +
    '">' +
    (d.final ? "✎ نیاز به اصلاح — ثبت ایراد جدید" : "＋ ایراد جدید به این بخش") +
    "</button>"
  );
}

function viewPanel(d, k) {
  var body = k === "id" ? idPanel(d) : k === "short" ? shortPanel(d) : sectionPanel(d, k);
  if (!body) return "";
  var h =
    '<div class="stepcur' +
    (isChs(d.sheet) && k === "id" ? " idpage" : "") +
    (isChs(d.sheet) ? " viewpg" : "") +
    '">' +
    body;
  if (!d.final && k !== "id" && k !== "short")
    h +=
      '<button class="btn stepfix" data-act="reopensec" data-sec="' +
      esc(k) +
      '">✎ نیاز به اصلاح — بازگشایی این بخش</button>';
  if (isChs(d.sheet)) return h + "</div>";
  return (
    h +
    '<button class="btn sm" data-act="wizback" style="margin-top:10px">▶ ' +
    (d.final ? "بازگشت به خلاصه" : "بازگشت به مرحله‌ی فعلی") +
    "</button></div>"
  );
}

/* v107: واژه‌ی دکمه‌ی رفع بر حسب نوع؛ ✕ برای ایراد/کسری شاسی حذف شد */
function fixWords(it) {
  if (it && it.r === "shortage") return { btn: "✓ تأمین شد", done: "✓ تأمین شد" };
  if (it && it.r === "ng") return { btn: "✓ برطرف شد", done: "✓ برطرف شد" };
  return { btn: "✓ رفع", done: "✓ رفع شد" };
}

function rmLi(d, id, txt) {
  var it = (d.items || {})[id];
  var fw = fixWords(it);
  if (it && it.post) txt += ' <small class="postb">اصلاحیه</small>';
  if (it && it.closedAt) {
    if (isChs(d.sheet))
      return (
        '<li class="fixedli"><span>' +
        fw.done +
        " — " +
        txt +
        "</span>" +
        whoWhen(it.closedBy, it.closedAt) +
        "</li>"
      );
    return (
      '<li class="fixedli"><span>' +
      fw.done +
      " — " +
      txt +
      "</span>" +
      whoWhen(it.closedBy, it.closedAt) +
      "</li>"
    );
  }
  if (!it) return "<li>" + txt + "</li>";
  if (isChs(d.sheet) && (it.r === "ng" || it.r === "shortage"))
    return (
      '<li class="rmli"><span>' +
      txt +
      '</span><span class="rmbtns"><button type="button" class="fixb" data-act="close" data-id="' +
      esc(id) +
      '">' +
      fw.btn +
      "</button></span></li>"
    );
  if (!canRm(d, id, it)) {
    /* v92 (شاسی): «رفع» کنار هر ایراد/کسری باز، حتی بعد از تأیید بخش؛ ✕ فقط برای مواردی که قبلاً مجاز بود */
    if (isChs(d.sheet) && (it.r === "ng" || it.r === "shortage"))
      return (
        '<li class="rmli"><span>' +
        txt +
        '</span><span class="rmbtns"><button type="button" class="fixb" data-act="close" data-id="' +
        esc(id) +
        '">✓ رفع</button></span></li>'
      );
    return "<li>" + txt + "</li>";
  }
  if (S.rmItem === id)
    return (
      '<li class="rmli rmask"><span>' +
      txt +
      '</span><span class="rmq">حذف شود؟ <button type="button" class="btn sm" data-act="rmyes" data-id="' +
      esc(id) +
      '">بله</button> <button type="button" class="btn sm" data-act="rmno">نه</button></span></li>'
    );
  return (
    '<li class="rmli"><span>' +
    txt +
    '</span><span class="rmbtns"><button type="button" class="fixb" data-act="close" data-id="' +
    esc(id) +
    '">✓ رفع</button><button type="button" class="rmx" data-act="rmask" data-id="' +
    esc(id) +
    '" aria-label="حذف">✕</button></span></li>'
  );
}

/* v94 (شاسی): ایرادهای پرتکرار هر بخش (از ثبت‌های قبلی + فهرست مالک) به‌صورت انتخاب‌وثبت؛ نوار ایراد کوچک پایین صفحه */
// ایرادهای پرتکرار را (از رکوردهای قبلی) برای انتخاب سریع پیشنهاد می‌دهد.
function frequentDefects(sheet, secId) {
  return memoFor("frequent", sheet + "|" + secId, function () {
    var count = {};
    S.data.insp.forEach(function (x) {
      if (x.sheet !== sheet) return;
      Object.keys(x.items || {}).forEach(function (id) {
        var it = x.items[id];
        if (!it || it.r !== "ng" || !it.custom || it.sec !== secId) return;
        var note = String(it.note || "").trim();
        if (note && note.length <= 40) count[note] = (count[note] || 0) + 1;
      });
    });
    return Object.keys(count)
      .sort(function (a, b) {
        return count[b] - count[a];
      })
      .slice(0, 12);
  });
}

/* v167.11: پنهان‌کردن چیپ آماده (اشتباه تایپی) — هر چکمن؛ مشترک برای همه؛ مالک در مدیریت بازمی‌گرداند */
function isHid(p) {
  var x = (S.hid || {})[p];
  return !!x;
}

function hidBar() {
  return (
    '<div class="hidbar"><button type="button" class="btn sm" data-act="hidedit" aria-pressed="' +
    !!S.hidEdit +
    '">' +
    (S.hidEdit ? "✓ پایان ویرایش" : "✎ ویرایش") +
    "</button>" +
    (S.hidEdit ? '<span class="hint">روی ✕ بزنید تا آن مورد برای همه پنهان شود</span>' : "") +
    "</div>"
  );
}

// چیپ‌های ایراد؛ هر چکمن می‌تواند چیپ اشتباه را برای همه پنهان کند.
function hidChips(list, act) {
  return (
    '<div class="chips">' +
    list
      .map(function (p) {
        return (
          '<span class="chip hidc">' +
          esc(p) +
          ' <button type="button" class="btn sm" data-act="' +
          act +
          '" data-p="' +
          esc(p) +
          '" aria-label="پنهان کردن ' +
          esc(p) +
          '">✕</button></span>'
        );
      })
      .join("") +
    "</div>"
  );
}

function fqPool(d, sec) {
  var have = {},
    out = [];
  Object.keys(d.items || {}).forEach(function (id) {
    var it = d.items[id];
    if (it && it.r === "ng" && it.custom && !it.closedAt && it.sec === sec.id)
      have[String(it.note || "").trim()] = 1;
  });
  frequentDefects(d.sheet, sec.id).forEach(function (p) {
    if (!have[p] && !isHid(p) && out.indexOf(p) < 0) out.push(p);
  });
  Object.keys(S.fqSel || {}).forEach(function (p) {
    if (out.indexOf(p) < 0) out.push(p);
  });
  return out.slice(0, 12);
}

function fqBlock(d, cur) {
  var kk = d.id + "|" + cur.id;
  if (S.fqKey !== kk) {
    S.fqKey = kk;
    S.fqSel = {};
  }
  var pool = fqPool(d, cur),
    sel = S.fqSel || {},
    n = Object.keys(sel).length;
  return (
    '<div class="chipsbox fq">' +
    (pool.length
      ? hidBar() +
        (S.hidEdit
          ? hidChips(pool, "fqhide")
          : '<div class="chips">' +
            pool
              .map(function (p) {
                return (
                  '<button type="button" class="pick" data-act="fqtoggle" data-p="' +
                  esc(p) +
                  '" aria-pressed="' +
                  !!sel[p] +
                  '">' +
                  esc(p) +
                  "</button>"
                );
              })
              .join("") +
            "</div>")
      : '<p class="hint">ایراد پرتکراری هنوز ثبت نشده است.</p>') +
    '</div><div class="fqbtm">' +
    (n
      ? '<button type="button" class="btn ok fqreg" data-act="fqreg" data-sec="' +
        esc(cur.id) +
        '">✓ ثبت ' +
        faDigits(n) +
        " ایراد انتخاب‌شده</button>"
      : "") +
    '<button type="button" class="ngbar" data-act="sxopen" data-t="ng" data-sec="' +
    esc(cur.id) +
    '">＋ ایراد</button></div>'
  );
}

/* v98: بروزرسانی موضعی تاچ چیپ‌ها (فقط شاسی)؛ در هر حالت غیرعادی false => رندر کامل */
function chipPartial(el, kind) {
  try {
    var d = S.key ? insp(S.sheet, S.key) : null;
    if (
      !d ||
      !isChs(d.sheet) ||
      d.final ||
      S.sxOpen ||
      S.corrOpen ||
      S.doneScr ||
      S.editing ||
      S.sitem ||
      S.wizView
    )
      return false;
    var sel = kind === "fq" ? S.fqSel : S.shSel,
      p = el.getAttribute("data-p"),
      on = !!(sel && sel[p]);
    var cont = el.closest(kind === "fq" ? ".stepcur" : ".stepcur.shs");
    if (!cont) return false;
    var n = Object.keys(sel || {}).length;
    if (kind === "sh") {
      var have = {};
      Object.keys(d.items || {}).forEach(function (i) {
        var t = d.items[i];
        if (t && t.r === "shortage" && !t.closedAt) have[(t.part || t.note || "").trim()] = 1;
      });
      n = Object.keys(sel || {}).length;
    }
    var btn = cont.querySelector(kind === "fq" ? ".fqreg" : "[data-act=shsel]");
    var box = kind === "fq" ? cont.querySelector(".fqbtm") : cont.querySelector(".shbtm");
    if (!box) return false;
    var c = stepConfirm(d),
      cb = document.querySelector(".botbar .confirm");
    if (kind === "sh" && (!c || c.act !== "shdone" || !cb)) return false;
    el.setAttribute("aria-pressed", on);
    var txt =
      kind === "fq"
        ? "✓ ثبت " + faDigits(n) + " ایراد انتخاب‌شده"
        : "ثبت " + faDigits(n) + " کسری انتخاب‌شده";
    if (n) {
      if (btn) btn.innerHTML = chIcons(txt);
      else {
        var b = document.createElement("button");
        if (kind === "fq") {
          b.type = "button";
          b.className = "btn ok fqreg";
          b.setAttribute("data-act", "fqreg");
          b.setAttribute("data-sec", (stepSec(d, true) || {}).id || "");
        } else {
          b.className = "btn primary stepok2";
          b.setAttribute("data-act", "shsel");
        }
        b.innerHTML = chIcons(txt);
        box.insertBefore(b, box.firstChild);
      }
    } else if (btn) btn.parentNode.removeChild(btn);
    if (kind === "sh" && cb && c) cb.innerHTML = chIcons(c.label);
    return true;
  } catch (e) {
    return false;
  }
}

// وقتی چکمن به خودروی دیگری می‌رود، وضعیت صفحه‌ی ویزارد (بازبودن‌ها و انتخاب‌ها) را پاک می‌کند.
function resetWizardState(d) {
  S.wizFor = d.id;
  S.histPage = false;
  S.acOpen = false;
  S.corrOpen = "";
  S.wizView = "";
  S.more = false;
  S.shEdit = "";
  S.sxOpen = "";
  S.sitem = "";
  S.itemsOpen = false;
  S.shTab = "";
  S.sxErr = "";
}

// شناسه‌ی کسری‌های بازِ این برگه.
function openShortageIds(d) {
  return Object.keys(d.items || {}).filter(function (i) {
    var t = d.items[i];
    return t && t.r === "shortage" && !t.closedAt;
  });
}

// فهرست کسری‌های بازِ این برگه (برای نمایش بالای مرحله‌ی تأیید نهایی).
function openShortagesHtml(d, openIds) {
  if (!openIds.length) return "";
  return (
    '<ul class="stepdef">' +
    openIds
      .map(function (i) {
        return rmLi(d, i, "⚠ کسری: " + esc(d.items[i].part || d.items[i].note || ""));
      })
      .join("") +
    "</ul>"
  );
}

// کارت «تأیید نهایی»: تعداد موارد باز و یادداشت انتظار برای بخش دیگر.
function finalConfirmCard(d, openShortagesHtmlText) {
  var openCount = stat(d).open;
  return (
    '<div class="stepcur"><div class="steplb">تأیید نهایی</div>' +
    openShortagesHtmlText +
    '<p class="hint" style="margin:8px 0">' +
    (openCount
      ? faDigits(openCount) + " مورد باز در پرونده هست و همراه تأیید ثبت می‌شود."
      : "ایرادی ثبت نشده است.") +
    "</p>" +
    waitNote(d) +
    "</div>"
  );
}

// قاب بالای ویزارد؛ وقتی فهرست بندها یا یک کار تک‌صفحه‌ای باز است چسبان نیست.
function stepBarOpen() {
  var busy = S.itemsOpen || S.sitem || S.editing || S.sxOpen || S.pwFor || S.shTab || S.more || S.wizView;
  return '<div class="stepbar chs chsx' + (busy ? " nostick" : "") + '">';
}

function stepInfoBlocks(d) {
  return carInfo(d) + wizBar(d) + undoBar(d) + carHistoryBlock(d) + pshWizBlock(d) + cpfWizBlock(d);
}

// وقتی هیچ بخشی باز نیست: مرحله‌ی کسری یا تأیید نهایی
function stepNoSection(d) {
  if (hasShortStep(d.sheet) && (!d.shDone || S.shEdit === d.id)) return shortStep(d);
  return finalConfirmCard(d, openShortagesHtml(d, openShortageIds(d)));
}

function stepCurOpen(cur, d, vi, df2) {
  var pgI = !!S.itemsOpen,
    open = df2.filter(function (e) {
      return !e.it.closedAt;
    });
  return (
    '<div class="stepcur' +
    (pgI ? "" : " fillc") +
    '">' +
    (pgI
      ? '<div class="sxh"><b>بندهای ' + esc(cur.name) + '</b><span class="num">' + esc(d.key) + "</span></div>"
      : '<div class="steplb">بخش ' + esc(cur.name) + "</div>") +
    (pgI
      ? ""
      : '<div class="secsum">' +
        faDigits(vi.length) +
        " بند · " +
        (open.length ? faDigits(open.length) + " ایراد ثبت‌شده" : "ایرادی ثبت نشده") +
        "</div>")
  );
}

// بند انتخاب‌شده: ثبت ایراد یا ویرایش؛ بدون بند انتخابی رشته‌ی خالی
function itemPickHtml(d, cur, vi) {
  var sid = S.sitem,
    sit =
      sid &&
      vi.filter(function (x) {
        return secItemId(cur, x.i) === sid;
      })[0];
  if (!sit) return "";
  if (S.editing === sid) {
    STRIP_ID = sid;
    return (
      '<div class="itempick"><b>' +
      esc(sit.l) +
      "</b>" +
      editBox(d, sid, (d.items || {})[sid] || {}, sit.p) +
      "</div>"
    );
  }
  return (
    '<div class="itempick"><b>' +
    esc(sit.l) +
    '</b><div class="row stepbtns"><button class="btn stepng" data-act="mark" data-id="' +
    sid +
    '" data-r="ng">✗ ایراد</button></div><button class="btn sm" data-act="sitemx">انصراف</button></div>'
  );
}

function itemListHtml(d, cur, vi) {
  return (
    '<div class="itemlist">' +
    vi
      .map(function (x) {
        var iid = secItemId(cur, x.i),
          t = (d.items || {})[iid],
          r = t && t.r;
        return (
          '<button type="button" class="irow' +
          (r === "ng" ? " ng" : r === "sample" ? " wip" : "") +
          '" data-act="sitem" data-id="' +
          iid +
          '"><span>' +
          esc(x.l) +
          "</span><b>" +
          (r === "ng" ? "✗ ایراد" : r === "sample" ? "نمونه" : "") +
          "</b></button>"
        );
      })
      .join("") +
    "</div>"
  );
}

function sectionDefectsHtml(d, defects) {
  return (
    '<ul class="stepdef">' +
    defects
      .map(function (e) {
        return rmLi(d, e.id, esc(e.l) + (e.it.custom ? "" : e.it.note ? " — " + esc(e.it.note) : ""));
      })
      .join("") +
    "</ul>"
  );
}

// بخش جاری: یا صفحه‌ی بندها (itemsOpen) یا کارت اصلی بخش
function stepCurCard(d, cur, head) {
  var df2 = secDefects(d, cur),
    vi = visItems(d, cur),
    pgI = !!S.itemsOpen,
    pick = itemPickHtml(d, cur, vi);
  if (pgI && pick)
    return (
      '<div class="stepbar nostick">' +
      head +
      '<div class="stepcur"><div class="sxh"><b>' +
      esc(cur.name) +
      '</b><span class="num">' +
      esc(d.key) +
      "</span></div>" +
      pick +
      "</div></div>"
    );
  var h = head + stepCurOpen(cur, d, vi, df2) + pick;
  if (!pgI)
    h +=
      '<button class="btn stepitemsbtn" data-act="sitems">بندهای این بخش (' +
      faDigits(vi.length) +
      ") ◀</button>" +
      acButton(d);
  else h += itemListHtml(d, cur, vi);
  if (df2.length) h += sectionDefectsHtml(d, df2);
  if (!pgI) h += S.sxOpen === cur.id ? sxEditBox(cur.id) : fqBlock(d, cur);
  return h + "</div></div>";
}

// تا قبل از اولین تأیید بخش، چکمن شاسی/تزیینات می‌تواند انتخاب کند یک چکمن همه را بازدید می‌کند یا دو چکمن هستند
function wizPickBar(d) {
  var started = d.final || Object.keys(d.signs || {}).length;
  return !started && (d.sheet === "chassis" || d.sheet === "trim") && S.user && hasPick(S.user.station)
    ? '<div class="scopebar">' + pickBar(S.user) + "</div>"
    : "";
}

// کارت آیتم‌های بازرسی یک مرحله.
function stepCard(d, edit) {
  STRIP_ID = "";
  if (!d || !isChs(d.sheet)) return "";
  if (S.wizFor !== d.id) resetWizardState(d);
  var all = secsOf(d.sheet, prodOf(d)).filter(function (x) {
    return !x.choice && secOK(x.id);
  });
  if (!all.length) return "";
  if (!edit) return viewOnlyCard(d);
  if (S.acOpen && d.sheet === "final1" && !d.final) return acPage(d);
  var cur = stepSec(d, true),
    head = stepBarOpen() + wizPickBar(d) + (S.itemsOpen && cur ? "" : stepInfoBlocks(d));
  if (S.wizView && wizDone(d, S.wizView)) {
    var vp = viewPanel(d, S.wizView);
    if (vp) return head + vp + "</div>";
    S.wizView = "";
  }
  if (d.final) return head + finalSummary(d) + "</div>";
  if (!cur) return head + stepNoSection(d) + "</div>";
  return stepCurCard(d, cur, head);
}

// یک ردیف آیتم: دکمه‌ی سالم، ایراد، کسری و توضیح.
function itemRow(d, id, label, edit, locked, p) {
  var it = (d.items && d.items[id]) || {},
    r = it.r || "";
  var dis = !edit || locked ? " disabled" : "";
  var pc = p ? (p.ts ? " ts-" + p.ts : "") + (p.is ? " is-" + p.is : "") : "";
  if (id.indexOf("ac-") === 0 && d.sheet === "final1") {
    return (
      '<div class="it' +
      pc +
      " " +
      (r === "done" ? "done" : "") +
      '"><div class="top2"><span class="lb">' +
      esc(label) +
      '</span><div class="seg"><button class="k-ok" data-act="toggle" data-id="' +
      id +
      '" aria-pressed="' +
      (r === "done") +
      '"' +
      dis +
      ">" +
      (r === "done" ? "✓ انجام شد" : "انجام شد") +
      "</button></div></div></div>"
    );
  }
  var h =
    '<div class="it' +
    pc +
    " " +
    r +
    '"><div class="top2"><span class="lb">' +
    esc(label) +
    '</span><div class="seg">' +
    '<button class="k-ok" data-act="mark" data-id="' +
    id +
    '" data-r="ok" aria-pressed="' +
    (r === "ok") +
    '"' +
    dis +
    ">سالم</button>" +
    '<button class="k-ng" data-act="mark" data-id="' +
    id +
    '" data-r="ng" aria-pressed="' +
    (r === "ng") +
    '"' +
    dis +
    ">ایراد</button></div></div>";
  if (p && (p.bc || p.phr)) h += rowExtras(d, id, it, p, edit && !locked);
  if (S.editing === id) {
    if (STRIP_ID !== id) h += editBox(d, id, it, p);
  } else if ((r === "ng" || r === "sample" || r === "shortage") && it.note !== undefined) {
    h += noteBlock(d, id, it, edit);
  }
  return h + "</div>";
}

function shortParts(sheet) {
  return shortList(sheet || S.sheet);
}

function canRm(d, id, it) {
  return (
    (isChs(d.sheet) && !!it.custom) ||
    (!d.final && (it.custom || !(d.signs && d.signs[String(id).split("-")[0]])))
  );
}

function phrasesOf(r) {
  return cachedByRows("phrases", r, function () {
    return phrasesCompute(r);
  });
}

function phrasesCompute(r) {
  var c = {};
  S.data.insp.forEach(function (x) {
    Object.keys(x.items || {}).forEach(function (id) {
      var it = x.items[id];
      if (it.r !== r) return;
      var ph = (it.picks || []).concat(it.free ? [it.free] : []);
      if (!ph.length && it.note) ph = [it.note];
      if (r === "shortage" && it.part) ph = [it.part];
      ph.forEach(function (p) {
        p = String(p).trim();
        if (p && p.length <= 60) c[p] = (c[p] || 0) + 1;
      });
    });
  });
  return Object.keys(c).sort(function (a, b) {
    return c[b] - c[a];
  });
}

function suggPool(fid) {
  var type,
    first = [];
  if (fid === "sn") type = "shortage";
  else if (fid === "sx")
    type = S.sxType === "shortage" ? "shortage" : S.sxType === "sample" ? "sample" : "ng";
  else if (fid === "xn") type = fieldValue("xt") || "ng";
  else if (fid.indexOf("nt-") === 0) {
    type = S.editType;
    if (type === "ng") first = learnPhrases(S.sheet, fid.slice(3));
  } else return [];
  var pool =
    type === "shortage"
      ? shortParts(S.sheet)
      : type === "ng"
        ? isChs(S.sheet)
          ? first.concat(phrasesOf("ng"))
          : first.concat(ngPresets(), phrasesOf("ng"))
        : phrasesOf(type);
  return pool.filter(function (v, i, a) {
    return a.indexOf(v) === i;
  });
}

function sugBox(fid) {
  return '<div class="sugg" id="sg-' + fid + '"></div>';
}

function dfOk(d, id) {
  var it = (d.items && d.items[id]) || {};
  return !(it.r === "ng" && !it.closedAt) && !(d.signs && d.signs[String(id).split("-")[0]]);
}

function templateAction(el, a) {
  if (!isOwnerU() || !S.isOwner) return;
  if (a === "tmtoggle") return templateAction_tmtoggle(el, a);
  if (!isTestMode() && a !== "tcdelask" && a !== "tcdelyes" && a !== "tcdelno") return;
  if (a === "tcnew") return templateAction_tcnew(el, a);
  if (a === "tcfuel") {
    S.tcar.fuel = el.getAttribute("data-v");
    render();
    return;
  }
  if (a === "tcprod") {
    S.tcar.product = el.getAttribute("data-v");
    render();
    return;
  }
  if (a === "tcfill") {
    tcFillAll();
    return;
  }
  if (a === "tccar") {
    S.carq = S.tcar.serial;
    S.tab = "car";
    render();
    return;
  }
  if (a === "tcopen") return templateAction_tcopen(el, a);
  if (a === "tcdelask") {
    S.tcDel = true;
    render();
    return;
  }
  if (a === "tcdelno") {
    S.tcDel = false;
    render();
    return;
  }
  if (a === "tcdelyes") return templateAction_tcdelyes(el, a);
  return;
}

// اقدام «tmtoggle» از templateAction
function templateAction_tmtoggle(el, a) {
  S.tm = !S.tm;
  S.tcDel = false;
  if (S.tm && !S.tcar) S.tcar = newTestCar();
  render();
  return;
}

// اقدام «tcnew» از templateAction
function templateAction_tcnew(el, a) {
  S.tcar = Object.assign(newTestCar(), {
    fuel: (S.tcar || {}).fuel || "dual",
    product: (S.tcar || {}).product || "padra",
  });
  S.key = "";
  render();
  return;
}

// اقدام «tcopen» از templateAction
function templateAction_tcopen(el, a) {
  var sh0 = S.sheet;
  if (!SHEETS[sh0] || !mySheets().length) return;
  var c0 = S.tcar,
    tk = SHEETS[sh0].keyKind,
    k0 =
      tk === "serial"
        ? c0.serial
        : tk === "chassis"
          ? c0.chassis
          : tk === "engine"
            ? c0.engine
            : c0.room;
  var rs = [];
  if (!insp(sh0, k0) && !(sh0 === "gas" && c0.fuel === "single")) rs.push(tcRec(sh0));
  if (sh0 === "chassis" && !insp("engine", c0.engine)) rs.push(tcRec("engine"));
  if (c0.fuel === "single" && sh0 !== "chassis" && !insp("chassis", c0.chassis))
    rs.push(tcRec("chassis"));
  save(function () {
    return Promise.all(
      rs.map(function (r) {
        return store.set("inspections", docId(r.sheet, r.key), r);
      }),
    );
  }).then(function (ok) {
    if (ok) open_(sh0, k0);
  });
  return;
}

// اقدام «tcdelyes» از templateAction
function templateAction_tcdelyes(el, a) {
  S.tcDel = false;
  var dl2 = S.data.insp
    .filter(function (x) {
      return x.test;
    })
    .map(function (x) {
      return function () {
        return store.del("inspections", x.id);
      };
    })
    .concat(
      S.data.arch
        .filter(function (x) {
          return x.test;
        })
        .map(function (x) {
          return function () {
            return store.del("archives", x.id);
          };
        }),
    );
  S.key = "";
  save(function () {
    return Promise.all(
      dl2.map(function (f) {
        return f();
      }),
    );
  }, "همه‌ی داده‌های آزمایشی پاک شد");
  return;
}

function markAllRecords() {
  toast("در حال بررسی همه‌ی رکوردها…");
  var pr = store && store.fetchSince ? store.fetchSince(3650) : Promise.resolve();
  pr.then(function () {
    var ops = [];
    S.data.insp.forEach(function (x) {
      var op = 0;
      Object.keys(x.items || {}).forEach(function (k) {
        var it = x.items[k];
        if (it && it.r === "shortage" && !it.closedAt) op = 1;
      });
      if ((x.openS ? 1 : 0) !== op) ops.push({ id: x.id, f: op });
    });
    if (!ops.length) {
      toast("همه‌ی رکوردها از قبل درست نشانه‌گذاری شده‌اند.");
      return;
    }
    save(
      function () {
        return Promise.all(
          ops.map(function (o) {
            return store.update("inspections", o.id, { openS: o.f });
          }),
        );
      },
      faDigits(ops.length) + " رکورد نشانه‌گذاری شد",
    );
  });
  return;
}

function copyPrevDefects(d) {
  var bd = null;
  S.data.insp.forEach(function (x) {
    if (x.sheet !== d.sheet || x.key === d.key) return;
    Object.keys(x.items || {}).forEach(function (i2) {
      var it = x.items[i2];
      if (it.r === "ng" && !it.custom && (!bd || (it.at || "") > (bd.at || "")))
        bd = { at: it.at, key: x.key };
    });
  });
  if (!bd) {
    toast("ایرادی از خودروی دیگر در این برگه پیدا نشد.");
    return;
  }
  var sl = {};
  S.data.insp.forEach(function (x) {
    if (x.sheet !== d.sheet || x.key !== bd.key) return;
    Object.keys(x.items || {}).forEach(function (i2) {
      var it = x.items[i2];
      if (it.r !== "ng" || it.custom) return;
      var ph = (it.picks || []).concat(it.free ? [it.free] : []);
      if (!ph.length && it.note) ph = [it.note];
      ph.forEach(function (p2) {
        p2 = String(p2).trim();
        if (p2 && dfOk(d, i2)) sl[i2 + "|" + p2] = { id: i2, p: p2 };
      });
    });
  });
  S.dfSel = sl;
  render();
  toast("ایرادهای خودروی قبلی انتخاب شد؛ مواردی که لازم نیست را بردارید.");
  return;
}

function toggleDictation(el) {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition,
    tid = el.getAttribute("data-t");
  if (!SR) {
    toast("دیکته صوتی در این مرورگر نیست؛ از میکروفون کیبورد استفاده کنید.");
    return;
  }
  if (S.micT) {
    try {
      S.micRec && S.micRec.stop();
    } catch (e) {}
    S.micT = null;
    render();
    return;
  }
  var multi = tid === "sx",
    rc = new SR();
  rc.lang = "fa-IR";
  rc.interimResults = false;
  rc.continuous = multi;
  S.micRec = rc;
  S.micT = tid;
  rc.onresult = function (e) {
    var t = document.getElementById(tid),
      tx;
    if (multi) {
      var parts = [];
      for (var q = e.resultIndex; q < e.results.length; q++) {
        if (e.results[q].isFinal) parts.push(e.results[q][0].transcript);
      }
      tx = parts
        .join(" ")
        .trim()
        .replace(/\s*(?:^|\s)بعدی(?=\s|$)\s*/g, "\n")
        .replace(/\n{2,}/g, "\n");
      if (t && tx) {
        var cur = t.value.replace(/\s+$/, "");
        t.value =
          (cur ? (/\n$/.test(t.value) || /^\n/.test(tx) ? cur + "\n" : cur + " ") : "") +
          tx.replace(/^\n/, "");
      }
      return;
    }
    tx = Array.prototype.map
      .call(e.results, function (r) {
        return r[0].transcript;
      })
      .join(" ")
      .trim();
    if (t && tx) {
      var sep = t.tagName === "INPUT" ? "، " : " ";
      t.value = (t.value ? t.value.trim() + sep : "") + tx;
    }
  };
  rc.onerror = function (e) {
    var m = {
      "not-allowed": "اجازه‌ی میکروفون داده نشده است.",
      "service-not-allowed": "اجازه‌ی میکروفون داده نشده است.",
      network: "برای تبدیل صدا به متن اتصال اینترنت لازم است.",
      "no-speech": "صدایی شنیده نشد.",
    };
    S.micT = null;
    toast(m[e.error] || "دیکته صوتی ناموفق بود.");
  };
  rc.onend = function () {
    if (S.micT) {
      S.micT = null;
      render();
    }
  };
  try {
    rc.start();
    render();
  } catch (err) {
    S.micT = null;
    toast("شروع دیکته ممکن نشد.");
  }
}

function clickItemPanels(ev, el, a, id, d) {
  if (a === "setpg") {
    S.setPg = el.getAttribute("data-id") || "";
    window.scrollTo(0, 0);
    render();
    return true;
  }
  if (a === "lspg") {
    S.lsPg = el.getAttribute("data-id") || "";
    window.scrollTo(0, 0);
    render();
    return true;
  }
  if (a === "hidrestore") return itemPanels_hidrestore(ev, el, a, id, d);
  if (a === "hidedit") {
    S.hidEdit = !S.hidEdit;
    render();
    return true;
  }
  if (a === "fqhide") return itemPanels_fqhide(ev, el, a, id, d);
  if (a === "fqtoggle") return itemPanels_fqtoggle(ev, el, a, id, d);
  if (a === "fqreg" && d && canEdit(S.sheet, S.key)) return itemPanels_fqreg(ev, el, a, id, d);
  if (a === "corropen") return itemPanels_corropen(ev, el, a, id, d);
  if (a === "corrsel") return itemPanels_corrsel(ev, el, a, id, d);
  if (a === "corrback") return itemPanels_corrback(ev, el, a, id, d);
  if (a === "corrrsn") return itemPanels_corrrsn(ev, el, a, id, d);
  if (a === "sview") {
    S.sview = S.sview === el.getAttribute("data-sec") ? "" : el.getAttribute("data-sec");
    render();
    return true;
  }
  if (a === "acopen") {
    S.acOpen = true;
    render();
    window.scrollTo(0, 0);
    return true;
  }
  if (a === "sitems") {
    S.itemsOpen = !S.itemsOpen;
    render();
    window.scrollTo(0, 0);
    return true;
  }
  if (a === "sitem") return itemPanels_sitem(ev, el, a, id, d);
  if (a === "sitemx") {
    S.sitem = "";
    render();
    return true;
  }
  return false;
}

// اقدام «hidrestore» از clickItemPanels
function itemPanels_hidrestore(ev, el, a, id, d) {
  var rp = el.getAttribute("data-p"),
    ro = {};
  ro[rp] = null;
  S.hid = Object.assign({}, S.hid);
  delete S.hid[rp];
  save(function () {
    return store.update("users", "__hide", { h: ro });
  }, "بازگردانده شد");
  render();
  return true;
}

// اقدام «fqhide» از clickItemPanels
function itemPanels_fqhide(ev, el, a, id, d) {
  var hp = el.getAttribute("data-p"),
    ho = {};
  ho[hp] = { by: S.user ? S.user.name : "", at: nowIso() };
  S.hid = Object.assign({}, S.hid, ho);
  if (S.fqSel) delete S.fqSel[hp];
  save(function () {
    return store.update("users", "__hide", { h: ho });
  }, "");
  toast("«" + hp + "» پنهان شد.");
  render();
  return true;
}

// اقدام «fqtoggle» از clickItemPanels
function itemPanels_fqtoggle(ev, el, a, id, d) {
  var fp = el.getAttribute("data-p");
  S.fqSel = S.fqSel || {};
  if (S.fqSel[fp]) delete S.fqSel[fp];
  else S.fqSel[fp] = 1;
  if (!chipPartial(el, "fq")) render();
  return true;
}

// اقدام «fqreg» از clickItemPanels
function itemPanels_fqreg(ev, el, a, id, d) {
  var fps = Object.keys(S.fqSel || {});
  if (!fps.length) return true;
  var fmx = {},
    ftt = nowIso(),
    fsec = el.getAttribute("data-sec");
  fps.forEach(function (tn, i4) {
    fmx["x" + uid() + i4] = {
      r: "ng",
      custom: true,
      note: tn,
      sec: fsec,
      by: S.user.name,
      byId: S.user.id,
      at: ftt,
      closedAt: "",
      closedBy: "",
    };
  });
  S.fqSel = {};
  writeItems(fmx, faDigits(fps.length) + " ایراد ثبت شد");
  return true;
}

// اقدام «corropen» از clickItemPanels
function itemPanels_corropen(ev, el, a, id, d) {
  S.corrOpen = "pick";
  S.corrErr = "";
  render();
  window.scrollTo(0, 0);
  return true;
}

// اقدام «corrsel» از clickItemPanels
function itemPanels_corrsel(ev, el, a, id, d) {
  S.corrOpen = el.getAttribute("data-f");
  S.corrErr = "";
  render();
  window.scrollTo(0, 0);
  return true;
}

// اقدام «corrback» از clickItemPanels
function itemPanels_corrback(ev, el, a, id, d) {
  S.corrErr = "";
  S.corrOpen = S.corrOpen && S.corrOpen !== "pick" ? "pick" : "";
  render();
  window.scrollTo(0, 0);
  return true;
}

// اقدام «corrrsn» از clickItemPanels
function itemPanels_corrrsn(ev, el, a, id, d) {
  var crt = document.getElementById(el.getAttribute("data-t"));
  if (crt) crt.value = el.getAttribute("data-v");
  Array.prototype.forEach.call(document.querySelectorAll("[data-act=corrrsn]"), function (b) {
    b.setAttribute("aria-pressed", b === el ? "true" : "false");
  });
  return true;
}

// اقدام «sitem» از clickItemPanels
function itemPanels_sitem(ev, el, a, id, d) {
  S.sitem = id;
  S.editing = id;
  S.editType = "ng";
  S.editErr = "";
  S.edPick = {};
  S.edOrigin = "";
  S.edPhoto = "";
  S.edDraft = null;
  render();
  window.scrollTo(0, 0);
  return true;
}

function clickQuickAdd(ev, el, a, id, d) {
  if (a === "sxopen") {
    S.sxOpen = el.getAttribute("data-sec");
    S.sxType = el.getAttribute("data-t") || "ng";
    S.sxErr = "";
    render();
    window.scrollTo(0, 0);
    return true;
  }
  if (a === "sxcancel") {
    S.sxOpen = "";
    S.sxErr = "";
    render();
    window.scrollTo(0, 0);
    return true;
  }
  if (a === "sxadd" && d && canEdit(S.sheet, S.key)) {
    var raw = fieldValue("sx"),
      ps = raw
        .split(/\n+|\s+بعدی\s+|^بعدی\s+|\s+بعدی$/)
        .map(function (z) {
          return z.trim();
        })
        .filter(Boolean)
        .slice(0, 12);
    if (!ps.length) {
      S.sxErr = "ایراد را بنویسید یا با میکروفن بگویید.";
      render();
      return true;
    }
    S.sxErr = "";
    S.sxOpen = "";
    var mx = {},
      shT2 = S.sxType === "shortage",
      smT = S.sxType === "sample",
      tt = nowIso(),
      secx = el.getAttribute("data-sec");
    ps.forEach(function (tn, i4) {
      mx["x" + uid() + i4] = Object.assign(
        {
          r: shT2 ? "shortage" : smT ? "sample" : "ng",
          custom: true,
          note: tn,
          sec: secx === "short" || secx === "sample" ? "" : secx,
          by: S.user.name,
          byId: S.user.id,
          at: tt,
          closedAt: "",
          closedBy: "",
        },
        shT2 ? { part: tn } : {},
      );
    });
    var tb = document.getElementById("sx");
    if (tb) tb.value = "";
    var nm = shT2 ? "کسری" : smT ? "نمونه" : "ایراد";
    writeItems(
      mx,
      ps.length > 1 ? faDigits(ps.length) + " " + nm + " جداگانه ثبت شد" : nm + " ثبت شد",
    );
    setTimeout(function () {
      window.scrollTo(0, 0);
    }, 350);
    return true;
  }
  return false;
}

function clickTemplates(ev, el, a, id, d) {
  if (a.indexOf("tm") === 0 || a.indexOf("tc") === 0) {
    templateAction(el, a);
    return true;
  }
  return false;
}

function clickItemMark(ev, el, a, id, d) {
  if (a === "fback") return itemMark_fback(ev, el, a, id, d);
  if (a === "reopensec" && d && !d.final && canEdit(S.sheet, S.key))
    return itemMark_reopensec(ev, el, a, id, d);
  if (a === "mark" && d) return itemMark_mark(ev, el, a, id, d);
  if (a === "toggle" && d) return itemMark_toggle(ev, el, a, id, d);
  if (a === "edorigin") return itemMark_edorigin(ev, el, a, id, d);
  if (a === "phdel") {
    S.edDraft = fieldValue("nt-" + S.editing);
    S.edPhoto = "";
    render();
    return true;
  }
  if (a === "edpick") return itemMark_edpick(ev, el, a, id, d);
  if (a === "cancel") return itemMark_cancel(ev, el, a, id, d);
  if (a === "savenote" && d) return itemMark_savenote(ev, el, a, id, d);
  if (a === "relsave" && d) return itemMark_relsave(ev, el, a, id, d);
  if (a === "relcancel" && d) return itemMark_relcancel(ev, el, a, id, d);
  if (a === "close" && d) {
    var m3 = {};
    m3[id] = { closedAt: nowIso(), closedBy: S.user.name };
    writeItems(m3, "مورد بسته شد");
    return true;
  }
  if (a === "allok" && d) return itemMark_allok(ev, el, a, id, d);
  return false;
}

// اقدام «fback» از clickItemMark
function itemMark_fback(ev, el, a, id, d) {
  S.key = "";
  S.editing = null;
  S.sxOpen = "";
  S.searchErr = "";
  render();
  var kf = document.getElementById("key");
  if (kf) kf.focus();
  window.scrollTo(0, 0);
  return true;
}

// اقدام «reopensec» از clickItemMark
function itemMark_reopensec(ev, el, a, id, d) {
  var rk = el.getAttribute("data-sec"),
    rs = {},
    rl = {};
  rs[rk] = null;
  rl["x" + uid()] = {
    sec: rk,
    by: S.user.name,
    byId: S.user.id,
    at: nowIso(),
  };
  S.wizView = "";
  S.sxOpen = "";
  save(function () {
    return store.update("inspections", docId(S.sheet, S.key), {
      signs: rs,
      reopenLog: rl,
    });
  }, "بخش برای اصلاح باز شد");

  return true;
}

// اقدام «mark» از clickItemMark
function itemMark_mark(ev, el, a, id, d) {
  var r = el.getAttribute("data-r");
  if (r === "ok") {
    var m = {};
    m[id] = itemMark("ok", "");
    S.editing = null;
    stepAdvance(d, id);
    writeItems(m);
  } else {
    S.editing = id;
    S.editType = r;
    S.editErr = "";
    S.edPick = {};
    S.edOrigin = "";
    S.edPhoto = "";
    S.edDraft = null;
    render();
    window.scrollTo(0, 0);
  }

  return true;
}

// اقدام «toggle» از clickItemMark
function itemMark_toggle(ev, el, a, id, d) {
  var cur = (d.items && d.items[id] && d.items[id].r) || "",
    tm = {};
  tm[id] = itemMark(cur === "done" ? "" : "done", "");
  writeItems(tm);

  return true;
}

// اقدام «edorigin» از clickItemMark
function itemMark_edorigin(ev, el, a, id, d) {
  S.edDraft = fieldValue("nt-" + S.editing);
  var og = el.getAttribute("data-o");
  S.edOrigin = S.edOrigin === og ? "" : og;
  render();
  return true;
}

// اقدام «edpick» از clickItemMark
function itemMark_edpick(ev, el, a, id, d) {
  S.edDraft = fieldValue("nt-" + S.editing);
  S.edPick = S.edPick || {};
  var pk = el.getAttribute("data-p");
  if (S.edPick[pk]) delete S.edPick[pk];
  else S.edPick[pk] = 1;
  render();
  return true;
}

// اقدام «cancel» از clickItemMark
function itemMark_cancel(ev, el, a, id, d) {
  S.sitem = "";
  S.editing = null;
  S.editErr = "";
  S.edPick = {};
  S.edOrigin = "";
  S.edPhoto = "";
  S.edDraft = null;
  render();
  return true;
}

// اقدام «savenote» از clickItemMark
function itemMark_savenote(ev, el, a, id, d) {
  var free = fieldValue("nt-" + id),
    picks = S.editType === "ng" ? Object.keys(S.edPick || {}) : [];
  var note = picks.join("، ") + (picks.length && free ? " — " : "") + free;
  if (!note) {
    S.editErr =
      S.editType === "ng" ? "نوع ایراد را انتخاب کنید یا توضیح بنویسید." : "شرح را بنویسید.";
    render();
    return true;
  }
  var m2 = {};
  m2[id] = {
    r: S.editType,
    note: note,
    picks: picks,
    free: free,
    by: S.user.name,
    byId: S.user.id,
    at: nowIso(),
    closedAt: "",
    closedBy: "",
  };
  if (S.editType === "ng") {
    m2[id].origin = S.edOrigin || "";
    m2[id].photo = S.edPhoto || "";
  }
  S.editing = null;
  S.sitem = "";
  S.editErr = "";
  S.edPick = {};
  S.edOrigin = "";
  S.edPhoto = "";
  S.edDraft = null;
  stepAdvance(d, id);
  writeItems(m2, "در پرونده ثبت شد");

  return true;
}

// اقدام «relsave» از clickItemMark
function itemMark_relsave(ev, el, a, id, d) {
  var rc = Array.prototype.map.call(document.querySelectorAll(".relcb:checked"), function (e) {
    return e.value;
  });
  if (!rc.length) {
    toast("حداقل یک کد را انتخاب کنید");
    return true;
  }
  save(function () {
    return store.update("inspections", d.id, {
      release: {
        codes: rc,
        note: fieldValue("rel_note"),
        by: S.user.name,
        at: nowIso(),
      },
    });
  }, "تحویل با کسری ثبت شد");
  return true;
}

// اقدام «relcancel» از clickItemMark
function itemMark_relcancel(ev, el, a, id, d) {
  save(function () {
    return store.update("inspections", d.id, {
      release: { codes: [], note: "", by: S.user.name, at: nowIso() },
    });
  }, "تحویل با کسری لغو شد");
  return true;
}

// اقدام «allok» از clickItemMark
function itemMark_allok(ev, el, a, id, d) {
  var sec = secsOf(S.sheet, prodOf(d)).filter(function (s) {
      return s.id === el.getAttribute("data-sec");
    })[0],
    m4 = {},
    t0 = nowIso();
  visItems(d, sec).forEach(function (x) {
    var iid = secItemId(sec, x.i);
    if (!(d.items && d.items[iid] && d.items[iid].r)) m4[iid] = itemMark("ok", "", t0);
  });
  writeItems(m4, "همه موارد باقی‌مانده سالم ثبت شد");

  return true;
}

function clickDefectPick(ev, el, a, id, d) {
  if (a === "dftoggle") return defectPick_dftoggle(ev, el, a, id, d);
  if (a === "dfclear") {
    S.dfSel = {};
    render();
    return true;
  }
  if (a === "dfprev" && d) {
    copyPrevDefects(d);
    return true;
  }
  if (a === "dfsave" && d) return defectPick_dfsave(ev, el, a, id, d);
  return false;
}

// اقدام «dftoggle» از clickDefectPick
function defectPick_dftoggle(ev, el, a, id, d) {
  S.dfSel = S.dfSel || {};
  var dk = id + "|" + el.getAttribute("data-p");
  if (S.dfSel[dk]) delete S.dfSel[dk];
  else S.dfSel[dk] = { id: id, p: el.getAttribute("data-p") };
  render();
  return true;
}

// اقدام «dfsave» از clickDefectPick
function defectPick_dfsave(ev, el, a, id, d) {
  var g = {};
  Object.keys(S.dfSel || {}).forEach(function (k) {
    var x = S.dfSel[k];
    if (dfOk(d, x.id)) (g[x.id] = g[x.id] || []).push(x.p);
  });
  var ids2 = Object.keys(g);
  if (!ids2.length) {
    toast("ایرادی انتخاب نشده است.");
    return true;
  }
  var md = {},
    t7 = nowIso();
  ids2.forEach(function (i2) {
    md[i2] = {
      r: "ng",
      note: g[i2].join("، "),
      picks: g[i2],
      free: "",
      by: S.user.name,
      byId: S.user.id,
      at: t7,
      closedAt: "",
      closedBy: "",
    };
  });
  S.dfSel = {};
  writeItems(md, faDigits(ids2.length) + " ایراد ثبت شد");
  return true;
}

function clickRemove(ev, el, a, id, d) {
  if (a === "rmchk") return remove_rmchk(ev, el, a, id, d);
  if (a === "rmbulk") {
    S.rmBulk = true;
    render();
    return true;
  }
  if (a === "rmbulkno") {
    S.rmBulk = false;
    render();
    return true;
  }
  if (a === "rmbulkyes" && d) return remove_rmbulkyes(ev, el, a, id, d);
  if (a === "rmask" && d) {
    S.rmItem = id;
    render();
    return true;
  }
  if (a === "rmno") {
    S.rmItem = null;
    render();
    return true;
  }
  if (a === "rmyes" && d) return remove_rmyes(ev, el, a, id, d);
  return false;
}

// اقدام «rmchk» از clickRemove
function remove_rmchk(ev, el, a, id, d) {
  S.rmSel = S.rmSel || {};
  if (el.checked) S.rmSel[id] = 1;
  else delete S.rmSel[id];
  S.rmBulk = false;
  render();
  return true;
}

// اقدام «rmbulkyes» از clickRemove
function remove_rmbulkyes(ev, el, a, id, d) {
  var mb = {},
    t8 = nowIso(),
    cnt = 0;
  Object.keys(S.rmSel || {}).forEach(function (i2) {
    var it = d.items && d.items[i2];
    if (it && canRm(d, i2, it) && !it.closedAt) {
      mb[i2] = {
        r: "",
        note: "",
        part: "",
        picks: [],
        free: "",
        removed: true,
        removedBy: S.user.name,
        removedAt: t8,
        closedAt: "",
        closedBy: "",
      };
      cnt++;
    }
  });
  S.rmSel = {};
  S.rmBulk = false;
  if (!cnt) {
    render();
    return true;
  }
  writeItems(mb, faDigits(cnt) + " مورد حذف شد");
  return true;
}

// اقدام «rmyes» از clickRemove
function remove_rmyes(ev, el, a, id, d) {
  var mr = {};
  mr[id] = {
    r: "",
    note: "",
    part: "",
    picks: [],
    free: "",
    removed: true,
    removedBy: S.user.name,
    removedAt: nowIso(),
    closedAt: "",
    closedBy: "",
  };
  S.rmItem = null;
  S.editing = null;
  writeItems(mr, "مورد حذف شد");

  return true;
}

function clickDelete(ev, el, a, id, d) {
  if (a === "delask" && S.isOwner) {
    S.confirmDel = id;
    render();
    return true;
  }
  if (a === "delno") {
    S.confirmDel = null;
    render();
    return true;
  }
  if (a === "delyes" && S.isOwner) {
    S.confirmDel = null;
    var dd = S.data.insp.filter(function (x) {
      return x.id === id;
    })[0];
    save(function () {
      return assertNotArchived(dd).then(function () {
        return store.del("inspections", id);
      });
    }, "بازدید حذف شد");
    return true;
  }
  return false;
}

function clickDictation(ev, el, a, id, d) {
  if (a === "mic") {
    toggleDictation(el);
    return true;
  }
  return false;
}
