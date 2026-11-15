/* ════════════════════════════════════════════════════════════
   فصل 62 — مدیریت: فهرست‌ها
   ویرایش فهرست‌های برنامه (ایرادها، کسری‌ها، دلیل توقف، …) با ثبت تغییرات.
   توابع اصلی: lsDa، lsPid، lsPick، listsParts، lsTitle، lsIndex، hidCard، listsView و …
   ════════════════════════════════════════════════════════════ */

function lsDa(sh, sec, i) {
  return 'data-sh="' + esc(sh) + '" data-sec="' + esc(sec) + '" data-i="' + i + '"';
}

function lsPid(sh, sec, i) {
  return "lsl_" + (S.lsProd || "padra") + "_" + sh + "_" + sec + "_" + i;
}

function lsPick(withProd) {
  var sh = S.lsSheet && SHEETS[S.lsSheet] ? S.lsSheet : "chassis",
    h = "";
  if (withProd)
    h +=
      '<div class="card"><b>محصول</b><div class="mgchips">' +
      [
        ["padra", "پادرا"],
        ["ex", "اکستند"],
        ["both", "هر دو"],
      ]
        .map(function (x) {
          return (
            '<button type="button" class="pick" data-act="lsprod" data-id="' +
            x[0] +
            '" aria-pressed="' +
            ((S.lsProd || "padra") === x[0]) +
            '">' +
            x[1] +
            "</button>"
          );
        })
        .join("") +
      '</div><p class="hint" style="margin-top:8px">' +
      (S.lsProd === "both"
        ? "«هر دو»: افزودن آیتم، تغییر نام و حذف روی هر دو فهرست اعمال می‌شود (آیتم‌های هم‌نام). جابه‌جایی و گزینه‌ها فقط روی پادرا."
        : S.lsProd === "ex"
          ? "در حال ویرایش فهرست اکستند. پادرا تغییر نمی‌کند."
          : "در حال ویرایش فهرست پادرا. اکستند تغییر نمی‌کند.") +
      "</p></div>";
  h += '<div class="card"><b>برگه</b><div class="mgchips">';
  STAGES.forEach(function (k) {
    if (SHEETS[k])
      h +=
        '<button type="button" class="pick" data-act="lssheet" data-id="' +
        k +
        '" aria-pressed="' +
        (k === sh) +
        '">' +
        esc(SHEETS[k].name) +
        "</button>";
  });
  return h + "</div></div>";
}

function lsCheck(pid, suf, checked, label) {
  return (
    '<label><input type="checkbox" id="' +
    pid +
    "_" +
    suf +
    '" ' +
    (checked ? "checked" : "") +
    "> " +
    label +
    "</label>"
  );
}

// انتخاب اندازه (متن/آیکون): معمولی، کوچک، بزرگ، خیلی بزرگ
function lsSizeSelect(pid, suf, label, cur) {
  var opt = function (v, name) {
    return '<option value="' + v + '"' + (cur === v ? " selected" : "") + ">" + name + "</option>";
  };
  return (
    '<label class="f">' +
    label +
    '<select class="in" id="' +
    pid +
    "_" +
    suf +
    '"><option value="">معمولی</option>' +
    opt("s", "کوچک") +
    opt("l", "بزرگ") +
    opt("xl", "خیلی بزرگ") +
    "</select></label>"
  );
}

function lsOptionsHtml(pid, da, e) {
  var p = e.p;
  return (
    '<details style="margin-top:6px"><summary class="hint">گزینه‌ها: میکروفون، عکس، بارکد، اندازه' +
    (e.custom ? " · آیتم افزوده‌شده" : "") +
    '</summary><div class="row" style="margin-top:8px;gap:14px">' +
    lsCheck(pid, "mic", p.mic !== 0, "میکروفون در توضیح") +
    lsCheck(pid, "ph", p.ph !== 0, "عکس هنگام ثبت ایراد") +
    lsCheck(pid, "phr", p.phr, "دکمه‌ی عکس روی همین ردیف") +
    lsCheck(pid, "bc", p.bc, "اسکن بارکد روی همین ردیف") +
    '</div><div class="row" style="margin-top:8px">' +
    lsSizeSelect(pid, "ts", "اندازه‌ی متن", p.ts) +
    lsSizeSelect(pid, "is", "اندازه‌ی آیکون و دکمه‌ها", p.is) +
    '<button class="btn sm primary" data-act="lsflags" ' +
    da +
    ' style="align-self:flex-end">ذخیره‌ی گزینه‌ها</button></div></details>'
  );
}

function lsItemRow(sh, sec, e, pos, count) {
  var pid = lsPid(sh, sec.id, e.i),
    da = lsDa(sh, sec.id, e.i),
    hidden = !!e.p.x;
  return (
    '<div class="it" style="' +
    (hidden ? "opacity:.55" : "") +
    '"><div class="row"><input class="in grow" id="' +
    pid +
    '" value="' +
    esc(entryLabel(e)) +
    '" style="min-width:200px"><button class="btn sm" data-act="lsrename" ' +
    da +
    ">ذخیره نام</button>" +
    '<button class="btn sm" data-act="lsmove" data-dir="-1" ' +
    da +
    (pos === 0 ? " disabled" : "") +
    ' aria-label="بالا">▲</button><button class="btn sm" data-act="lsmove" data-dir="1" ' +
    da +
    (pos === count - 1 ? " disabled" : "") +
    ' aria-label="پایین">▼</button>' +
    '<button class="btn sm" data-act="lshide" ' +
    da +
    ">" +
    (hidden ? "بازگرداندن به برگه" : "حذف از برگه") +
    "</button></div>" +
    lsOptionsHtml(pid, da, e) +
    "</div>"
  );
}

function lsSectionCard(sh, sec) {
  var open = S.lsSec === sec.id,
    h =
      '<div class="card"><button type="button" class="lssech" data-act="lssec" data-id="' +
      esc(sec.id) +
      '" aria-expanded="' +
      open +
      '"><h2>بخش ' +
      esc(sec.name) +
      '</h2><span class="hint">' +
      (open ? "بستن ▴" : "باز کردن ▾") +
      "</span></button>";
  if (!open) return h + "</div>";
  var ents = secEntries(sh, sec);
  h += '<div class="items" style="margin-top:8px">';
  ents.forEach(function (e, pos) {
    h += lsItemRow(sh, sec, e, pos, ents.length);
  });
  return (
    h +
    '</div><div class="row" style="margin-top:10px"><input class="in grow" id="lsadd_' +
    sh +
    "_" +
    sec.id +
    '" placeholder="آیتم جدید در این بخش" autocomplete="off"><button class="btn sm primary" data-act="lsadd" data-sh="' +
    sh +
    '" data-sec="' +
    esc(sec.id) +
    '">افزودن آیتم</button></div></div>'
  );
}

function lsSheetPart(sh) {
  var h =
    '<div class="card"><h2>مدیریت فهرست‌ها</h2><p class="hint">فقط مدیر برنامه این بخش را می‌بیند. تغییر آیتم‌های برگه باید با نامه‌ی واحد مربوطه باشد؛ شماره نامه یا دلیل را بنویسید (برای فهرست کسری و ایراد رایج الزامی نیست). تغییر برای همه‌ی چکمن‌ها فوری اعمال و با نام و زمان ثبت می‌شود. سوابق قبلی خودروها پاک نمی‌شود؛ آیتم حذف‌شده فقط از برگه‌های بعدی برداشته می‌شود.</p><label class="f" style="margin-top:10px">شماره نامه / دلیل تغییر<input class="in" id="ls_letter" autocomplete="off" placeholder="مثلاً: نامه‌ی واحد تولید، شماره …"></label></div>';
  h += lsPick(true);
  secsOf(sh, listProduct()).forEach(function (sec) {
    h += lsSectionCard(sh, sec);
  });
  return h;
}

// یک «چیپ» قابل حذف؛ attrs صفت‌های داده‌ی دکمه‌ی حذف است
function lsChip(text, act, attrs) {
  return (
    '<span class="chip">' +
    esc(text) +
    ' <button type="button" class="btn sm" data-act="' +
    act +
    '" ' +
    attrs +
    ' aria-label="حذف ' +
    esc(text) +
    '">✕</button></span>'
  );
}

function lsShortPart(sh) {
  var g = shortGroup(sh),
    sl = shortList(sh),
    h =
      lsPick(false) +
      '<div class="card"><h2>فهرست قطعات کسری · ' +
      esc(g === "chassis" ? "شاسی و موتور" : SHEETS[g].name) +
      '</h2><p class="hint" style="margin-bottom:8px">چکمن این ایستگاه فقط این قطعه‌ها را در دکمه‌ها می‌بیند. قطعه‌ی دیگر را هم می‌تواند تایپ کند.</p><div class="chips">';
  if (!sl.length) h += '<span class="hint">فهرستی تعریف نشده است.</span>';
  sl.forEach(function (p, i) {
    h += lsChip(p, "lsshdel", 'data-sh="' + sh + '" data-i="' + i + '"');
  });
  return (
    h +
    '</div><div class="row" style="margin-top:10px"><input class="in grow" id="lsshadd" placeholder="قطعه‌ی جدید (چند قطعه را با ویرگول جدا کنید)" autocomplete="off"><button class="btn sm primary" data-act="lsshadd" data-sh="' +
    sh +
    '">افزودن قطعه</button></div></div>'
  );
}

function lsNgPart() {
  var h = '<div class="card"><h2>نوع ایرادهای آماده</h2><div class="chips">';
  ngPresets().forEach(function (p, i) {
    h += lsChip(p, "lsngdel", 'data-i="' + i + '"');
  });
  return (
    h +
    '</div><div class="row" style="margin-top:10px"><input class="in grow" id="lsngadd" placeholder="نوع ایراد جدید" autocomplete="off"><button class="btn sm primary" data-act="lsngadd">افزودن</button></div></div>'
  );
}

function lsClosePart() {
  return (
    '<div class="card"><h2>دسترسی بستن در پرونده‌ی خودرو</h2><p class="hint" style="margin-bottom:8px">همه‌ی ایستگاه‌ها سوابق خودرو را می‌بینند. برای ایراد (و نمونه) و برای کسری جدا انتخاب کنید کدام ایستگاه‌ها می‌توانند ببندند. واحد تجاری در پرونده‌ی خودرو همیشه هر دو را می‌بندد.</p>' +
    closePermGroup("close", "بستن ایراد و نمونه") +
    closePermGroup("closeSh", "بستن کسری") +
    "</div>"
  );
}

function lsCheckPart(k) {
  var h = '<div class="card"><h2>' + esc(LISTK[k].title) + '</h2><div class="chips">';
  listK(k).forEach(function (p, i) {
    h += lsChip(p, "lsckdel", 'data-k="' + k + '" data-i="' + i + '"');
  });
  return (
    h +
    '</div><div class="row" style="margin-top:10px"><input class="in grow" id="lsck_' +
    k +
    '" placeholder="مورد جدید" autocomplete="off"><button class="btn sm primary" data-act="lsckadd" data-k="' +
    k +
    '">افزودن</button></div></div>'
  );
}

function lsWinPart() {
  if (!S.supa) return "";
  var win = (S.lists && S.lists.win) || {};
  return (
    '<div class="card"><h2>بازه‌ی بارگذاری (برای سرعت)</h2><p class="hint" style="margin-bottom:8px">برنامه روی هر دستگاه فقط بازدیدهای این چند روز اخیر و همه‌ی تأیید نهایی‌نشده‌ها را می‌خواند. خودروی قدیمی‌تر با جستجوی شماره از سرور می‌آید.</p><div class="row"><label class="f">چکمن‌ها (روز)<input class="in num ltr" id="lsw_chk" value="' +
    +(win.chk || 2) +
    '" inputmode="numeric" style="max-width:100px"></label><label class="f">تجاری، کیفیت، برنامه‌ریزی، مدیر (روز)<input class="in num ltr" id="lsw_mgr" value="' +
    +(win.mgr || 7) +
    '" inputmode="numeric" style="max-width:100px"></label><button class="btn sm primary" data-act="lswin" style="align-self:flex-end">ذخیره</button></div></div>'
  );
}

function lsLogPart() {
  var h = '<div class="card"><h2>تاریخچه‌ی تغییرها</h2>',
    lg = (S.lg || []).slice(0, 30);
  if (!lg.length) h += '<p class="hint" style="margin:0">هنوز تغییری ثبت نشده است.</p>';
  lg.forEach(function (x) {
    h +=
      '<div class="it"><b>' +
      esc(x.what || "") +
      '</b><div class="hint">' +
      whoWhen(x.by, x.at) +
      (x.letter ? "<div>نامه/دلیل: " + esc(x.letter) + "</div>" : "") +
      "</div></div>";
  });
  return h + "</div>";
}

// بخش‌های صفحه‌ی «فهرست‌ها»؛ هر کلید یک ویرایشگر جدا برای صفحه‌ی خودش است.
function listsParts() {
  var sh = S.lsSheet && SHEETS[S.lsSheet] ? S.lsSheet : "chassis",
    P = {
      sheet: lsSheetPart(sh),
      short: lsShortPart(sh),
      ng: lsNgPart(),
      close: lsClosePart(),
      win: lsWinPart(),
      log: lsLogPart(),
    };
  Object.keys(LISTK).forEach(function (k) {
    P["ck_" + k] = lsCheckPart(k);
  });
  return P;
}

/* v167.11: «فهرست‌ها» = یک صفحه‌ی ایندکس + ویرایشگر تک‌فهرست (به‌جای یک صفحه‌ی بلند) */
var LS_MAIN = [
  ["sheet", "list", "آیتم‌های برگه‌ی بازدید", "افزودن، تغییر نام، ترتیب و حذف بندها"],
  ["short", "alert", "قطعات کسری", "دکمه‌های کسری هر ایستگاه"],
  ["ng", "flask", "نوع ایرادهای آماده", "انتخاب‌های آماده هنگام ثبت ایراد"],
  ["close", "key", "دسترسی بستن در پرونده", "کدام ایستگاه ایراد و کسری را ببندد"],
];

function lsTitle(pg) {
  var m = LS_MAIN.filter(function (x) {
    return x[0] === pg;
  })[0];
  if (m) return m[2];
  if (pg === "win") return "بازه‌ی بارگذاری";
  if (pg === "log") return "تاریخچه‌ی تغییرها";
  if (pg === "hid") return "مواردِ پنهان‌شده توسط چکمن‌ها";
  return LISTK[pg.slice(3)] ? LISTK[pg.slice(3)].title : "فهرست";
}

function lsIndex() {
  var h =
    '<div class="mgrows">' +
    LS_MAIN.map(function (x) {
      return mgRow(x[1], x[2], x[3], 'data-act="lspg" data-id="' + x[0] + '"');
    }).join("") +
    "</div>";
  h +=
    '<details class="mgmore"><summary>فهرست‌های دیگر (' +
    faDigits(Object.keys(LISTK).length) +
    ')</summary><div class="mgrows">' +
    Object.keys(LISTK)
      .map(function (k) {
        return mgRow("list", esc(LISTK[k].title), "", 'data-act="lspg" data-id="ck_' + k + '"');
      })
      .join("") +
    "</div></details>";
  var hn = Object.keys(S.hid || {}).filter(isHid).length;
  h +=
    '<div class="mgrows">' +
    (S.supa
      ? mgRow(
          "database",
          "بازه‌ی بارگذاری",
          "سرعت برنامه روی دستگاه‌ها",
          'data-act="lspg" data-id="win"',
        )
      : "") +
    (hn
      ? mgRow(
          "alert",
          "مواردِ پنهان‌شده توسط چکمن‌ها",
          faDigits(hn) + " مورد",
          'data-act="lspg" data-id="hid"',
        )
      : "") +
    mgRow("archive", "تاریخچه‌ی تغییرها", "", 'data-act="lspg" data-id="log"') +
    "</div>";
  return h;
}

function hidCard() {
  var ks = Object.keys(S.hid || {}).filter(isHid);
  if (!ks.length)
    return '<div class="card"><p class="hint" style="margin:0">موردی پنهان نشده است.</p></div>';
  return (
    '<div class="card"><p class="hint">چکمن‌ها این موارد را از «ایرادهای پرتکرار» برداشته‌اند. با «بازگردانی» دوباره نمایش داده می‌شود.</p>' +
    ks
      .map(function (p) {
        var x = S.hid[p];
        return (
          '<div class="it"><div class="row"><b class="grow">' +
          esc(p) +
          '</b><button class="btn sm" data-act="hidrestore" data-p="' +
          esc(p) +
          '">بازگردانی</button></div><div class="hint">' +
          whoWhen(x.by, x.at) +
          "</div></div>"
        );
      })
      .join("") +
    "</div>"
  );
}

// صفحه‌ی ویرایش فهرست‌ها.
function listsView() {
  var pg = S.lsPg || "";
  if (!pg) return lsIndex();
  var P = listsParts();
  P.hid = hidCard();
  return (
    '<div class="mgpt"><button type="button" class="mgback" data-act="lspg" data-id="">→ فهرست‌ها</button><h2>' +
    esc(lsTitle(pg)) +
    "</h2></div>" +
    (P[pg] || lsIndex())
  );
}

function listProduct() {
  return S.lsProd === "ex" ? "ex" : "padra";
}

function itemsRef(c, so) {
  return so.p === "ex" ? (c.itemsX = c.itemsX || {}) : c.items;
}

function lsMirror(c, sh, so, label, fn) {
  if (S.lsProd !== "both") return;
  var xo = secsOf(sh, "ex").filter(function (x) {
    return x.id === so.id;
  })[0];
  if (!xo) return;
  var m = secEntries(sh, xo).filter(function (e) {
    return entryLabel(e) === label;
  })[0];
  if (m) fn(lsProp(c, sh, xo, m.i));
}

function lsClone() {
  var c = JSON.parse(JSON.stringify(S.lists || {}));
  delete c.id;
  c.items = c.items || {};
  c.short = c.short || {};
  if (!c.ng) c.ng = null;
  return c;
}

/* اگر بین باز کردن صفحه و ذخیره، دستگاه دیگری فهرست‌ها را عوض کرده باشد، روی تغییر او نمی‌نویسیم. آفلاین: ادامه می‌دهد و در صف می‌ماند */
function listsUnchanged(base) {
  if (!store.get) return Promise.resolve();
  return store.get("users", "__lists").then(
    function (cur) {
      if (cur && (cur.updatedAt || "") !== base) {
        if (store.kick) store.kick();
        throw new Error(
          "فهرست‌ها را دستگاه دیگری تازه تغییر داده است؛ صفحه تازه شد. دوباره انجام دهید.",
        );
      }
    },
    function () {},
  );
}

// ذخیره‌ی تغییرات فهرست (با ثبت تغییر؛ اگر دستگاه دیگری فهرست را عوض کرده بود متوقف می‌شود).
function lsSave(mut, what, needLetter) {
  if (!S.isOwner) return false;
  var letter = fieldValue("ls_letter");
  if (needLetter && !letter) {
    toast("شماره نامه یا دلیل تغییر را بنویسید.");
    return false;
  }
  var c = lsClone(),
    err = mut(c);
  if (err) {
    toast(err);
    return false;
  }
  if (c.ng === null) delete c.ng;
  c.updatedAt = nowIso();
  c.updatedBy = S.user ? S.user.name : "";
  var lid = "lg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  var base = S.lists ? S.lists.updatedAt || "" : "";
  save(function () {
    return listsUnchanged(base)
      .then(function () {
        return store.set("users", "__lists", c);
      })
      .then(function () {
        return store.set("users", lid, {
          at: nowIso(),
          by: S.user ? S.user.name : "",
          byId: S.user ? S.user.id : "",
          letter: letter,
          what: what,
        });
      });
  }, "ذخیره شد");
  return true;
}

function lsProp(c, sh, secObj, i) {
  var R0 = itemsRef(c, secObj),
    a = (R0[sh] = R0[sh] || {}),
    s = (a[secObj.id] = a[secObj.id] || {}),
    n = secObj.items.length;
  if (i < n) {
    s.ov = s.ov || {};
    return (s.ov[i] = s.ov[i] || {});
  }
  s.add = s.add || [];
  return (s.add[i - n] = s.add[i - n] || {});
}

function listK(k) {
  var c = S.lists && S.lists[k];
  return c && c.length ? c.slice() : LISTK[k].def.slice();
}

/* ویرایش فهرست‌ها در «فهرست‌ها» (فقط مدیر)؛ هر گروه اگر عمل را رسیدگی کرد true برمی‌گرداند */
function lsAction(a, el) {
  if (!S.isOwner) return false;
  return lsListEdit(a, el) || lsSettingEdit(a, el) || lsItemEdit(a, el) || lsShortageEdit(a, el);
}

function lsListEdit(a, el) {
  var i = +el.getAttribute("data-i");
  if (a === "lsckadd" || a === "lsckdel") {
    var ck = el.getAttribute("data-k");
    if (!LISTK[ck]) return true;
    if (a === "lsckadd") {
      var cv = fieldValue("lsck_" + ck);
      if (!cv) {
        toast("مقدار را بنویسید.");
        return true;
      }
      lsSave(
        function (c) {
          var l = c[ck] && c[ck].length ? c[ck] : LISTK[ck].def.slice();
          if (l.indexOf(cv) < 0) l.push(cv);
          c[ck] = l;
        },
        "افزودن «" + cv + "» به «" + LISTK[ck].title + "»",
        false,
      );
      var ce = document.getElementById("lsck_" + ck);
      if (ce) ce.value = "";
      return true;
    }
    var ci = +el.getAttribute("data-i"),
      cl = listK(ck),
      cn = cl[ci];
    if (cn === undefined) return true;
    lsSave(
      function (c) {
        var l = listK(ck);
        l.splice(ci, 1);
        c[ck] = l;
      },
      "حذف «" + cn + "» از «" + LISTK[ck].title + "»",
      false,
    );
    return true;
  }
  if (a === "lsngadd") {
    var nn = fieldValue("lsngadd");
    if (!nn) {
      toast("نوع ایراد را بنویسید.");
      return true;
    }
    lsSave(
      function (c) {
        var l = c.ng && c.ng.length ? c.ng : NG_PRESETS.slice();
        if (l.indexOf(nn) < 0) l.push(nn);
        c.ng = l;
      },
      "افزودن نوع ایراد «" + nn + "»",
      false,
    );
    var ne = document.getElementById("lsngadd");
    if (ne) ne.value = "";
    return true;
  }
  if (a === "lsngdel") {
    var l3 = ngPresets(),
      nm3 = l3[i];
    if (nm3 === undefined) return true;
    lsSave(
      function (c) {
        var l = ngPresets();
        l.splice(i, 1);
        c.ng = l.length ? l : null;
      },
      "حذف نوع ایراد «" + nm3 + "»",
      false,
    );
    return true;
  }
  return false;
}

function lsSettingEdit(a, el) {
  if (a === "lsperm") return lsSettingEdit_lsperm(a, el);
  if (a === "lswin") return lsSettingEdit_lswin(a, el);
  if (a === "lssheet") {
    S.lsSheet = el.getAttribute("data-id");
    S.lsSec = "";
    render();
    return true;
  }
  if (a === "lssec") {
    var lsi = el.getAttribute("data-id");
    S.lsSec = S.lsSec === lsi ? "" : lsi;
    render();
    return true;
  }
  if (a === "lsprod") {
    S.lsProd = el.getAttribute("data-id");
    render();
    return true;
  }
  return false;
}

// اقدام «lsperm» از lsSettingEdit
function lsSettingEdit_lsperm(a, el) {
  var pst = el.getAttribute("data-st");
  var pk = el.getAttribute("data-k") === "closeSh" ? "closeSh" : "close";
  lsSave(
    function (c) {
      var m = closeMapOf(pk);
      m[pst] = !m[pst];
      c.perm = c.perm || {};
      c.perm[pk] = m;
    },
    "تغییر دسترسی " + (pk === "close" ? "بستن ایراد" : "بستن کسری") + " · " + STATION_NAME[pst],
    false,
  );
  return true;
}

// اقدام «lswin» از lsSettingEdit
function lsSettingEdit_lswin(a, el) {
  var w1 = +digits(fieldValue("lsw_chk")),
    w2 = +digits(fieldValue("lsw_mgr"));
  if (!(w1 >= 1 && w1 <= 60 && w2 >= 1 && w2 <= 60)) {
    toast("بازه باید بین ۱ تا ۶۰ روز باشد.");
    return true;
  }
  lsSave(
    function (c) {
      c.win = { chk: w1, mgr: w2 };
    },
    "تغییر بازه‌ی بارگذاری: چکمن " + w1 + " روز، مدیران " + w2 + " روز",
    false,
  );
  return true;
}

function lsItemCtx(el) {
  var sh = el.getAttribute("data-sh"),
    secId = el.getAttribute("data-sec");
  return {
    sh: sh,
    secId: secId,
    i: +el.getAttribute("data-i"),
    el: el,
    shn: sh && SHEETS[sh] ? SHEETS[sh].name : "",
    secObj:
      sh && secId && SHEETS[sh]
        ? secsOf(sh, listProduct()).filter(function (x) {
            return x.id === secId;
          })[0]
        : null,
  };
}

function lsEntry(k) {
  return secEntries(k.sh, k.secObj).filter(function (x) {
    return x.i === k.i;
  })[0];
}

// فرمان‌های ویرایش آیتم؛ هر کدام true برمی‌گرداند (رویداد مصرف شد)
function lsRenameItem(k) {
  var nv = fieldValue(lsPid(k.sh, k.secId, k.i));
  if (!nv) {
    toast("نام آیتم خالی است.");
    return true;
  }
  var e0 = lsEntry(k),
    old = entryLabel(e0);
  if (nv === old) {
    toast("تغییری نکرده است.");
    return true;
  }
  lsSave(
    function (c) {
      var p = lsProp(c, k.sh, k.secObj, k.i);
      if (e0.orig && nv === e0.orig) delete p.t;
      else p.t = nv;
      lsMirror(c, k.sh, k.secObj, old, function (q) {
        q.t = nv;
      });
    },
    "تغییر نام آیتم «" + old + "» به «" + nv + "» · برگه " + k.shn,
    true,
  );
  return true;
}

function lsMoveItem(k) {
  var dir = +k.el.getAttribute("data-dir"),
    ord = secEntries(k.sh, k.secObj).map(function (x) {
      return x.i;
    }),
    pos = ord.indexOf(k.i),
    q = pos + dir;
  if (pos < 0 || q < 0 || q >= ord.length) return true;
  var lbm = entryLabel(secEntries(k.sh, k.secObj)[pos]);
  lsSave(
    function (c) {
      var t = ord[pos];
      ord[pos] = ord[q];
      ord[q] = t;
      var R2 = itemsRef(c, k.secObj),
        a2 = (R2[k.sh] = R2[k.sh] || {}),
        s2 = (a2[k.secId] = a2[k.secId] || {});
      s2.ord = ord;
    },
    "جابه‌جایی آیتم «" + lbm + "» · برگه " + k.shn,
    true,
  );
  return true;
}

function lsHideItem(k) {
  var e1 = lsEntry(k),
    hidNow = !!e1.p.x,
    lb1 = entryLabel(e1);
  if (
    !hidNow &&
    openOnItem(k.sh, secItemId(k.secObj, k.i), k.secObj.p === "ex" ? "ex" : "padra")
  ) {
    toast("این آیتم ایراد، نمونه یا کسری باز دارد؛ ابتدا آن را ببندید.");
    return true;
  }
  lsSave(
    function (c) {
      var p = lsProp(c, k.sh, k.secObj, k.i);
      if (hidNow) delete p.x;
      else p.x = 1;
      lsMirror(c, k.sh, k.secObj, lb1, function (q) {
        if (hidNow) delete q.x;
        else q.x = 1;
      });
    },
    (hidNow ? "بازگرداندن آیتم «" : "حذف آیتم «") + lb1 + "» · برگه " + k.shn,
    true,
  );
  return true;
}

function lsItemFlags(k) {
  var pid = lsPid(k.sh, k.secId, k.i),
    chk = function (key) {
      var x = document.getElementById(pid + "_" + key);
      return x && x.checked;
    },
    vts = fieldValue(pid + "_ts"),
    vis = fieldValue(pid + "_is"),
    e2 = lsEntry(k);
  lsSave(
    function (c) {
      var p = lsProp(c, k.sh, k.secObj, k.i);
      if (chk("mic")) delete p.mic;
      else p.mic = 0;
      if (chk("ph")) delete p.ph;
      else p.ph = 0;
      if (chk("phr")) p.phr = 1;
      else delete p.phr;
      if (chk("bc")) p.bc = 1;
      else delete p.bc;
      if (vts) p.ts = vts;
      else delete p.ts;
      if (vis) p.is = vis;
      else delete p.is;
    },
    "تغییر گزینه‌های آیتم «" + entryLabel(e2) + "» · برگه " + k.shn,
    true,
  );
  return true;
}

// آیتم تازه را به فهرست بخش اضافه می‌کند
function pushAddedItem(c, secObj, sh, secId, name) {
  var R = itemsRef(c, secObj),
    a = (R[sh] = R[sh] || {}),
    s = (a[secId] = a[secId] || {});
  s.add = s.add || [];
  s.add.push({ t: name });
}

function lsAddItem(k) {
  var an = fieldValue("lsadd_" + k.sh + "_" + k.secId);
  if (!an) {
    toast("نام آیتم جدید را بنویسید.");
    return true;
  }
  lsSave(
    function (c) {
      pushAddedItem(c, k.secObj, k.sh, k.secId, an);
      if (S.lsProd === "both") {
        var xo = secsOf(k.sh, "ex").filter(function (x) {
          return x.id === k.secId;
        })[0];
        if (xo) pushAddedItem(c, xo, k.sh, k.secId, an);
      }
    },
    "افزودن آیتم «" + an + "» · برگه " + k.shn + " · بخش " + k.secObj.name,
    true,
  );
  var ie = document.getElementById("lsadd_" + k.sh + "_" + k.secId);
  if (ie) ie.value = "";
  return true;
}

var LS_ITEM_ACTS = {
  lsrename: lsRenameItem,
  lsmove: lsMoveItem,
  lshide: lsHideItem,
  lsflags: lsItemFlags,
  lsadd: lsAddItem,
};

function lsItemEdit(a, el) {
  var k = lsItemCtx(el);
  return k.secObj && LS_ITEM_ACTS[a] ? LS_ITEM_ACTS[a](k) : false;
}

function lsShortageEdit(a, el) {
  var sh = el.getAttribute("data-sh"),
    i = +el.getAttribute("data-i");
  if (a === "lsshadd") {
    var parts = fieldValue("lsshadd")
      .split(/[,،\n]/)
      .map(function (x) {
        return x.trim();
      })
      .filter(Boolean);
    if (!parts.length) {
      toast("نام قطعه را بنویسید.");
      return true;
    }
    var g = shortGroup(sh);
    lsSave(
      function (c) {
        var l = shortList(sh);
        parts.forEach(function (p) {
          if (l.indexOf(p) < 0) l.push(p);
        });
        c.short[g] = l;
      },
      "افزودن قطعه‌ی کسری «" +
        parts.join("، ") +
        "» · " +
        (g === "chassis" ? "شاسی و موتور" : SHEETS[g].name),
      false,
    );
    var se = document.getElementById("lsshadd");
    if (se) se.value = "";
    return true;
  }
  if (a === "lsshdel") {
    var g2 = shortGroup(sh),
      l2 = shortList(sh),
      pn = l2[i];
    if (pn === undefined) return true;
    lsSave(
      function (c) {
        var l = shortList(sh);
        l.splice(i, 1);
        c.short[g2] = l;
      },
      "حذف قطعه‌ی کسری «" + pn + "» · " + (g2 === "chassis" ? "شاسی و موتور" : SHEETS[g2].name),
      false,
    );
    return true;
  }
  return false;
}

function clickListsEditor(ev, el, a, id, d) {
  if (a.indexOf("ls") === 0 && lsAction(a, el)) return true;
  return false;
}
