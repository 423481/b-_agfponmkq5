/* ════════════════════════════════════════════════════════════
   فصل 23 — ایرادها و کسری‌ها
   ثبت و بستن ایراد و کسری، گروه‌بندی کسری، فهرست کسری‌های باز، ویرایش آیتم.
   توابع اصلی: entryLabel، entryShown، entryText، allDefItems، computeAllDefItems، findEntry، labelOf، origOf و …
   ════════════════════════════════════════════════════════════ */

// یک نشانه‌ی بازرسی (سالم/انجام‌شده/...) با نام و زمان کاربر فعلی می‌سازد.
function itemMark(result, note, at) {
  return {
    r: result,
    note: note,
    by: S.user.name,
    byId: S.user.id,
    at: arguments.length > 2 ? at : nowIso(),
    closedAt: "",
    closedBy: "",
  };
}

function entryLabel(e) {
  return e.p.t || e.orig || "";
}

function entryShown(e, d, hid) {
  return !(e.p.x || (e.orig && hid && hid.indexOf(e.orig) >= 0));
}

function entryText(e, d) {
  return e.p.t || (d && e.orig ? fuelLabel(d, e.orig) : entryLabel(e));
}

function allDefItems(sheet, d) {
  if (!d || !d.id) return computeAllDefItems(sheet, d);
  return memoFor("allDef", sheet + "|" + d.id, function () {
    return computeAllDefItems(sheet, d);
  });
}

function computeAllDefItems(sheet, d) {
  var out = [],
    hid = d ? hiddenItems(d) : [];
  secsOf(sheet, d ? prodOf(d) : "padra").forEach(function (sec) {
    secEntries(sheet, sec).forEach(function (e) {
      if (entryShown(e, d, hid))
        out.push({
          id: secItemId(sec, e.i),
          label: entryText(e, d),
          sec: sec.id,
        });
    });
  });
  return out;
}

function findEntry(sheet, id, p) {
  var f = null;
  secsOf(sheet, p || "padra").forEach(function (sec) {
    secEntries(sheet, sec).forEach(function (e) {
      if (secItemId(sec, e.i) === id) f = e;
    });
  });
  return f;
}

function labelOf(sheet, id, d) {
  var e = findEntry(sheet, id, d ? prodOf(d) : "padra");
  return e ? entryText(e, d) : "توضیح دستی";
}

function origOf(sheet, id, d) {
  var e = findEntry(sheet, id, d ? prodOf(d) : "padra");
  return e && e.orig ? e.orig : "";
}

function stat(d) {
  var sh = SHEETS[d.sheet],
    items = d.items || {},
    vis = allDefItems(d.sheet, d),
    total = vis.length,
    ans = 0,
    open = 0,
    signed = 0;
  vis.forEach(function (x) {
    if (items[x.id] && items[x.id].r) ans++;
  });
  Object.keys(items).forEach(function (id) {
    var it = items[id];
    if ((it.r === "ng" || it.r === "sample" || it.r === "shortage") && !it.closedAt) open++;
  });
  sh.sections.forEach(function (s) {
    if (d.signs && d.signs[s.id]) signed++;
  });
  return {
    total: total,
    ans: ans,
    open: open,
    signed: signed,
    secs: sh.sections.length,
  };
}

function stagesFor(recs) {
  var sg = (recs || []).some(function (x) {
    return x.sheet === "chassis" && x.fuel === "single";
  });
  return sg
    ? STAGES.filter(function (k) {
        return k !== "gas";
      })
    : STAGES;
}

function hiddenItems(d) {
  return fuelOf(d) === "single"
    ? (prodOf(d) === "ex" ? SINGLE_HIDE_X : SINGLE_HIDE)[d.sheet] || []
    : [];
}

function visItems(d, sec) {
  if (!d || !d.id) return computeVisItems(d, sec);
  return memoFor("vis", d.id + "|" + sec.id, function () {
    return computeVisItems(d, sec);
  });
}

function computeVisItems(d, sec) {
  var hid = hiddenItems(d),
    out = [];
  secEntries(d.sheet, sec).forEach(function (e) {
    if (entryShown(e, d, hid)) out.push({ l: entryText(e, d), i: e.i, p: e.p });
  });
  return out;
}

function shortGroup(sheet) {
  return sheet === "engine" ? "chassis" : sheet;
}

function shortList(sheet) {
  var g = shortGroup(sheet),
    c = S.lists && S.lists.short;
  return c && c[g] ? c[g].slice() : (SHORT_DEFAULT[g] || []).slice();
}

function ngPresets() {
  return S.lists && S.lists.ng && S.lists.ng.length ? S.lists.ng.slice() : NG_PRESETS.slice();
}

function shortStep(d) {
  var have = {},
    sel = S.shSel || {},
    shl = [],
    shi = [],
    smp = [];
  Object.keys(d.items || {}).forEach(function (id) {
    var it = d.items[id];
    if (!it || it.closedAt) return;
    if (it.r === "shortage") {
      var p = (it.part || it.note || "").trim();
      have[p] = 1;
      shl.push(p);
      shi.push(id);
    } else if (it.r === "sample" && it.custom) smp.push((it.note || "").trim());
  });
  var opts = shortParts(d.sheet);
  Object.keys(sel).forEach(function (p) {
    if (opts.indexOf(p) < 0) opts.push(p);
  });
  opts = opts.filter(function (p) {
    return !have[p] && !(fuelOf(d) === "single" && cngPartOf(p));
  });
  if (isChs(d.sheet) && opts.length > 12) {
    var fq9 = phrasesOf("shortage");
    opts.sort(function (a, b) {
      var ia = fq9.indexOf(a),
        ib = fq9.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  }
  var h = '<div class="stepcur' + (isChs(d.sheet) ? " fillc shs" : "") + '">';
  if (shl.length)
    h +=
      '<ul class="stepdef">' +
      shl
        .map(function (p, ix) {
          return rmLi(d, shi[ix], "⚠ کسری: " + esc(p));
        })
        .join("") +
      "</ul>";
  h +=
    '<button type="button" class="btn sm" data-act="shprev" style="margin:4px 0 8px">⟲ کسری‌های خودروی قبلی</button><div class="chipsbox"><div class="chips">' +
    opts
      .map(function (p) {
        return (
          '<button type="button" class="pick" data-act="shtoggle" data-p="' +
          esc(p) +
          '" aria-pressed="' +
          !!sel[p] +
          '">' +
          esc(p) +
          "</button>"
        );
      })
      .join("") +
    '</div></div><div class="shbtm">';
  var n = Object.keys(sel).length;
  if (n)
    h +=
      '<button class="btn primary stepok2" data-act="shsel">ثبت ' +
      faDigits(n) +
      " کسری انتخاب‌شده</button>";
  if (S.sxOpen === "short") h += sxEditBox("short");
  else
    h +=
      '<button class="btn stepng sh" data-act="sxopen" data-t="shortage" data-sec="short" style="margin-top:8px">＋ قطعه‌ی دیگر' +
      (isChs(d.sheet) ? "" : " (بنویس یا بگو)") +
      "</button>";
  return h + "</div></div>";
}

function canShort() {
  return !!S.user;
}

function shortScope(d) {
  if (!S.user) return false;
  var st = S.user.station;
  if (S.user.id === "owner" || st === "commercial" || st === "planning") return true;
  return SHEETS[d.sheet].station === st;
}

function shortGroups() {
  var g = {},
    qs = null;
  if (S.shQ) {
    qs = {};
    carRecords(S.shQ).recs.forEach(function (r) {
      qs[r.id] = 1;
    });
  }
  S.data.insp.forEach(function (d) {
    if (!SHEETS[d.sheet] || !shortScope(d)) return;
    if (qs && !qs[d.id]) return;
    Object.keys(d.items || {}).forEach(function (id) {
      var it = d.items[id];
      if (it.r === "shortage" && !it.closedAt) {
        var p = (it.part || it.note || "—").trim();
        (g[p] = g[p] || []).push({ d: d, id: id, it: it });
      }
    });
  });
  return Object.keys(g)
    .map(function (p) {
      return {
        p: p,
        list: g[p].sort(function (a, b) {
          return (a.it.at || "") < (b.it.at || "") ? -1 : 1;
        }),
      };
    })
    .sort(function (a, b) {
      return b.list.length - a.list.length;
    });
}

function shortOpenCount() {
  return cachedByRows(
    "shortCount",
    (S.user ? S.user.id + "|" + S.user.station : "") + "|" + (S.shQ || ""),
    function () {
      return shortGroups().reduce(function (n, g) {
        return n + g.list.length;
      }, 0);
    },
  );
}

// فهرست کسری‌های باز و بسته‌ی یک خودرو.
function shortView() {
  var gs = shortGroups(),
    chk = S.shChk || {},
    scopeTxt =
      S.user.id === "owner" || S.user.station === "commercial" || S.user.station === "planning"
        ? "همه‌ی خودروها"
        : "فقط کسری‌های برگه‌های ایستگاه «" + STATION_NAME[S.user.station] + "»";
  var h =
    '<div class="card"><h2>کسری‌های باز بر اساس قطعه</h2><p class="hint">نمایش: ' +
    esc(scopeTxt) +
    ". وقتی قطعه‌ای تأمین و نصب شد، خودروها را انتخاب کنید، اقدام انجام‌شده را بنویسید و یک‌جا ببندید.</p>" +
    '<form data-form="shsearch" class="row" style="margin-top:10px"><label class="f grow">پیدا کردن خودرو با سریال، شاسی، موتور یا اتاق<input class="in num ltr" id="sq" inputmode="numeric" autocomplete="off" value="' +
    esc(S.shQ || "") +
    '"></label><button type="button" class="btn" data-act="livescan" data-scan="" style="align-self:flex-end">اسکن بارکد</button><button class="btn primary" type="submit" style="align-self:flex-end">جست‌وجو</button>' +
    (S.shQ
      ? '<button type="button" class="btn" data-act="shqclear" style="align-self:flex-end">نمایش همه</button>'
      : "") +
    "</form></div>";
  if (!gs.length)
    return (
      h +
      '<div class="card"><p class="hint" style="margin:0">' +
      (S.shQ ? "برای این شماره کسری بازی پیدا نشد." : "کسری بازی نیست.") +
      "</p></div>"
    );
  gs.forEach(function (g, i) {
    var nsel = g.list.filter(function (x) {
      return chk[x.d.id + "|" + x.id];
    }).length;
    h +=
      '<div class="card"><div class="row"><h2 class="grow" style="margin:0">' +
      esc(g.p) +
      ' <span class="chip open">' +
      faDigits(g.list.length) +
      ' خودرو</span></h2><button class="btn sm" data-act="shall" data-i="' +
      i +
      '">' +
      (nsel === g.list.length ? "برداشتن انتخاب" : "انتخاب همه") +
      '</button></div><div class="items" style="margin-top:10px">';
    g.list.forEach(function (x) {
      var k = x.d.id + "|" + x.id,
        ser = identOf(x.d).serial || x.d.key;
      h +=
        '<div class="it"><div class="row"><input type="checkbox" data-act="shchk" data-k="' +
        esc(k) +
        '" ' +
        (chk[k] ? "checked" : "") +
        ' style="width:24px;height:24px" aria-label="انتخاب"><span class="grow"><b class="num">' +
        esc(ser) +
        '</b><small style="display:block">ایستگاه: ' +
        esc(stationTitle(x.d.sheet)) +
        '</small><span class="m">' +
        whoWhen(x.it.by, x.it.at, "ثبت‌کننده") +
        "</span></span>" +
        (isCom()
          ? '<button type="button" class="btn sm" data-act="opencar" data-q="' +
            esc(ser) +
            '">پرونده</button>'
          : "") +
        "</div></div>";
    });
    h +=
      '</div><label class="f" style="margin-top:10px">اقدام انجام‌شده برای ' +
      faDigits(nsel) +
      ' خودروی انتخاب‌شده<textarea class="in" id="sgn_' +
      i +
      '" placeholder="مثلاً: قطعه تأمین و نصب شد"></textarea></label><div class="row" style="margin-top:8px"><button class="btn primary sm" data-act="shclose" data-i="' +
      i +
      '">ثبت اقدام و بستن انتخاب‌شده‌ها</button></div></div>';
  });
  return h;
}

function openOnItem(sheet, id, p) {
  return S.data.insp.some(function (d) {
    if (p && prodOf(d) !== p) return false;
    var it = d.sheet === sheet && d.items && d.items[id];
    return it && (it.r === "ng" || it.r === "sample" || it.r === "shortage") && !it.closedAt;
  });
}

function closePermGroup(kind, title) {
  var cm = closeMapOf(kind);
  return (
    "<b>" +
    title +
    '</b><div class="mgchips">' +
    Object.keys(cm)
      .map(function (k) {
        return (
          '<button type="button" class="pick" data-act="lsperm" data-k="' +
          kind +
          '" data-st="' +
          k +
          '" aria-pressed="' +
          !!cm[k] +
          '">' +
          esc(STATION_NAME[k] || k) +
          "</button>"
        );
      })
      .join("") +
    "</div>"
  );
}

function blockCard(sheet, key) {
  var b = blockedBy(sheet, key);
  return (
    '<div class="card"><h2>مرحله قبل هنوز تأیید نشده است</h2><p class="hint">این برگه برای شماره <span class="num">' +
    esc(key) +
    "</span> وقتی باز می‌شود که برگه «" +
    esc(SHEETS[b].name) +
    "» کامل و تأیید شده باشد.</p></div>"
  );
}

/* kind: close = ایراد و نمونه، closeSh = کسری؛ تا مدیر تنظیم نکرده پیش‌فرض اعمال می‌شود */
function closeMapOf(kind) {
  var m = {},
    base = (S.lists && S.lists.perm && S.lists.perm[kind]) || null;
  CLOSE_STATIONS.forEach(function (k) {
    m[k] = base ? !!base[k] : !!CLOSE_DEFAULT[kind][k];
  });
  return m;
}

function permClose(st, type) {
  return !!closeMapOf(type === "shortage" ? "closeSh" : "close")[st === "engine" ? "chassis" : st];
}

// ایستگاه‌هایی که برگه‌های هم را می‌بینند و می‌بندند: شاسی با موتور، نهایی بالا با نهایی پایین
var STATION_GROUP = { engine: "chassis", st4: "final", st5: "final" };

function stationGroup(st) {
  return STATION_GROUP[st] || st;
}

// چکمن هر بخش ایراد و کسری برگه‌های همان بخش را می‌بندد
function ownsItemSheet(sheet) {
  var sh = SHEETS[sheet];
  return !!(S.user && sh && stationGroup(sh.station) === stationGroup(S.user.station));
}

// تعیین می‌کند چه کسی اجازه‌ی بستن ایراد/کسری را دارد (حساس: دسترسی).
function canCloseItem(type, sheet) {
  return !!S.user && (S.user.id === "owner" || permClose(S.user.station, type) || ownsItemSheet(sheet));
}

function sheetOfDoc(docId) {
  var r = S.data.insp.filter(function (x) {
    return x.id === docId;
  })[0];
  return r ? r.sheet : "";
}

function itemTypeOf(docId, itemId) {
  var r = S.data.insp.filter(function (x) {
      return x.id === docId;
    })[0],
    it = r && r.items && r.items[itemId];
  return it ? it.r : "";
}

/* همه‌ی ایراد/نمونه/کسری‌های یک خودرو در همه‌ی ایستگاه‌ها؛ باز: قدیمی‌تر اول، بسته: تازه‌تر اول */
function carHistoryItems(d) {
  var open = [],
    closed = [],
    ord = { ng: 0, sample: 1, shortage: 2 };
  carRecords(d.key).recs.forEach(function (r) {
    Object.keys(r.items || {}).forEach(function (id) {
      var it = r.items[id];
      if (!it || !ITEM_TYPES[it.r]) return;
      (it.closedAt ? closed : open).push({ r: r, id: id, it: it });
    });
  });
  open.sort(function (a, b) {
    return ord[a.it.r] - ord[b.it.r] || ((a.it.at || "") < (b.it.at || "") ? -1 : 1);
  });
  closed.sort(function (a, b) {
    return (b.it.closedAt || "") < (a.it.closedAt || "") ? -1 : 1;
  });
  return { open: open, closed: closed };
}

function openOnCar(d) {
  return carHistoryItems(d).open;
}

function itemHead(x) {
  return (
    '<div><span class="chip ' +
    (x.it.r === "ng" ? "open" : x.it.r) +
    '">' +
    typeName(x.it.r) +
    "</span>" +
    (x.it.pdi ? ' <span class="chip">برگشتی از PDI</span>' : "") +
    " <b>" +
    esc(stationTitle(x.r.sheet)) +
    "</b> · " +
    esc(itemLabel(x.r, x.id, x.it)) +
    "</div>"
  );
}

function itemBody(x) {
  return (
    (x.it.note ? '<p style="margin:4px 0">' + esc(x.it.note) + "</p>" : "") +
    (x.it.pdiBy ? '<div class="hint">بازرس PDI: ' + esc(x.it.pdiBy) + "</div>" : "") +
    (x.it.photo
      ? '<img src="' +
        x.it.photo +
        '" alt="عکس ایراد" style="max-width:100%;max-height:160px;border-radius:8px;margin:6px 0;display:block">'
      : "") +
    '<div class="hint">' +
    whoWhen(x.it.by, x.it.at, "ثبت‌کننده") +
    "</div>"
  );
}

/* token: بخش یکتای شناسه‌ی ورودی «اقدام انجام‌شده» (xcn_token) */
function openItemRow(x, token, can) {
  return (
    '<div class="it">' +
    itemHead(x) +
    itemBody(x) +
    (can
      ? '<div class="row" style="margin-top:6px"><input class="in grow" id="xcn_' +
        token +
        '" placeholder="اقدام انجام‌شده" autocomplete="off"><button class="btn sm primary" data-act="xclose" data-doc="' +
        esc(x.r.id) +
        '" data-id="' +
        esc(x.id) +
        '" data-i="' +
        token +
        '">بستن</button></div>'
      : "") +
    "</div>"
  );
}

function closedItemRow(x) {
  return (
    '<div class="it">' +
    itemHead(x) +
    itemBody(x) +
    '<div class="hint">' +
    whoWhen(x.it.closedBy, x.it.closedAt, "بسته‌کننده") +
    "</div>" +
    (x.it.closeNote ? '<div class="hint">اقدام انجام‌شده: ' + esc(x.it.closeNote) + "</div>" : "") +
    "</div>"
  );
}

function allOpenCard(d) {
  var L = openOnCar(d);
  if (!L.length) return "";
  var can = L.some(function (x) {
    return canCloseItem(x.it.r, x.r.sheet);
  });
  return (
    '<div class="card" style="border:2px solid #c0392b"><h2>ایرادها و کسری‌های باز این خودرو (' +
    faDigits(L.length) +
    ')</h2><p class="hint" style="margin-bottom:8px">از همه‌ی ایستگاه‌ها' +
    (can ? ". برای بستن هر مورد، اقدام انجام‌شده را بنویسید." : ". فقط برای اطلاع است.") +
    '</p><div class="items">' +
    L.map(function (x, i) {
      return openItemRow(x, String(i), canCloseItem(x.it.r, x.r.sheet));
    }).join("") +
    "</div></div>"
  );
}

function defectsOf(rep, t) {
  return rep.defects
    .filter(function (d) {
      return d.r === t;
    })
    .sort(function (a, b) {
      return !!a.closedAt - !!b.closedAt;
    });
}

function isProblem(d) {
  return d.r === "ng" || d.r === "sample" || d.r === "shortage";
}

// چند کسری هم‌گروه را با هم می‌بندد.
function closeShortageGroup(el) {
  var ix = +el.getAttribute("data-i"),
    g2 = shortGroups()[ix];
  if (!g2) return;
  var note2 = fieldValue("sgn_" + ix);
  if (!note2) {
    toast("اقدام انجام‌شده را بنویسید.");
    return;
  }
  var sl = g2.list.filter(function (x) {
    return (S.shChk || {})[x.d.id + "|" + x.id];
  });
  if (!sl.length) {
    toast("هیچ خودرویی انتخاب نشده است.");
    return;
  }
  var byDoc = {},
    t5 = nowIso();
  sl.forEach(function (x) {
    (byDoc[x.d.id] = byDoc[x.d.id] || {})[x.id] = {
      closedAt: t5,
      closedBy: S.user.name,
      closedById: S.user.id,
      closeNote: note2,
    };
    delete S.shChk[x.d.id + "|" + x.id];
  });
  save(
    function () {
      return Promise.all(
        Object.keys(byDoc).map(function (doc) {
          return store.update("inspections", doc, { items: byDoc[doc] });
        }),
      );
    },
    faDigits(sl.length) + " کسری بسته شد",
  );
  return;
}

function clickShortageStep(ev, el, a, id, d) {
  if (a === "shsel" && d && canEdit(S.sheet, S.key)) {
    var hv = {};
    Object.keys(d.items || {}).forEach(function (i) {
      var it = d.items[i];
      if (it && it.r === "shortage" && !it.closedAt) hv[(it.part || it.note || "").trim()] = 1;
    });
    var ps2 = Object.keys(S.shSel || {}).filter(function (p) {
      return !hv[p];
    });
    if (!ps2.length) return true;
    var m5 = {},
      t7 = nowIso();
    ps2.forEach(function (p, i5) {
      m5["x" + uid() + i5] = {
        r: "shortage",
        custom: true,
        part: p,
        note: p,
        by: S.user.name,
        byId: S.user.id,
        at: t7,
        closedAt: "",
        closedBy: "",
      };
    });
    S.shSel = {};
    writeItems(m5, faDigits(ps2.length) + " کسری ثبت شد");
    return true;
  }
  if (a === "shdone" && d && canEdit(S.sheet, S.key)) {
    var t9 = nowIso(),
      sd = { shDone: { by: S.user.name, byId: S.user.id, at: t9 } },
      hv9 = {};
    Object.keys(d.items || {}).forEach(function (i) {
      var it = d.items[i];
      if (it && it.r === "shortage" && !it.closedAt) hv9[(it.part || it.note || "").trim()] = 1;
    });
    var pend9 = Object.keys(S.shSel || {}).filter(function (p) {
      return !hv9[p];
    });
    if (pend9.length) {
      var m9 = {};
      pend9.forEach(function (p, i9) {
        m9["x" + uid() + i9] = {
          r: "shortage",
          custom: true,
          part: p,
          note: p,
          by: S.user.name,
          byId: S.user.id,
          at: t9,
          closedAt: "",
          closedBy: "",
        };
      });
      sd.items = m9;
    }
    S.shEdit = "";
    S.sxOpen = "";
    S.shSel = {};
    save(function () {
      return store.update("inspections", docId(S.sheet, S.key), sd);
    }, "مرحله‌ی کسری ثبت شد");
    return true;
  }
  return false;
}

function clickShortageList(ev, el, a, id, d) {
  if (a === "shtoggle") return shortageList_shtoggle(ev, el, a, id, d);
  if (a === "shclear") {
    S.shSel = {};
    render();
    return true;
  }
  if (a === "shprev") return shortageList_shprev(ev, el, a, id, d);
  if (a === "shchk") return shortageList_shchk(ev, el, a, id, d);
  if (a === "shall" && canShort()) return shortageList_shall(ev, el, a, id, d);
  if (a === "shclose" && canShort()) {
    closeShortageGroup(el);
    return true;
  }
  if (a === "shqclear") {
    S.shQ = "";
    render();
    return true;
  }
  return false;
}

// اقدام «shtoggle» از clickShortageList
function shortageList_shtoggle(ev, el, a, id, d) {
  S.shSel = S.shSel || {};
  var pp = el.getAttribute("data-p");
  if (S.shSel[pp]) delete S.shSel[pp];
  else S.shSel[pp] = 1;
  if (!chipPartial(el, "sh")) render();
  return true;
}

// اقدام «shprev» از clickShortageList
function shortageList_shprev(ev, el, a, id, d) {
  var best = null;
  S.data.insp.forEach(function (x) {
    if (!SHEETS[x.sheet] || x.key === S.key || (isChs(S.sheet) && x.sheet !== S.sheet)) return;
    Object.keys(x.items || {}).forEach(function (i2) {
      var it = x.items[i2];
      if (it.r === "shortage" && (!best || (it.at || "") > (best.at || "")))
        best = { at: it.at, key: x.key };
    });
  });
  if (!best) {
    toast("کسری ثبت‌شده‌ای از خودروی دیگر پیدا نشد.");
    return true;
  }
  var sel = {};
  S.data.insp.forEach(function (x) {
    if (x.key !== best.key || (isChs(S.sheet) && x.sheet !== S.sheet)) return;
    Object.keys(x.items || {}).forEach(function (i2) {
      var it = x.items[i2];
      if (it.r === "shortage") {
        var p2 = (it.part || it.note || "").trim();
        if (p2 && !isHid(p2)) sel[p2] = 1;
      }
    });
  });
  S.shSel = sel;
  render();
  toast("کسری‌های خودروی قبلی انتخاب شد؛ مواردی که تأمین شده را بردارید.");
  return true;
}

// اقدام «shchk» از clickShortageList
function shortageList_shchk(ev, el, a, id, d) {
  S.shChk = S.shChk || {};
  var kk3 = el.getAttribute("data-k");
  if (el.checked) S.shChk[kk3] = 1;
  else delete S.shChk[kk3];
  render();
  return true;
}

// اقدام «shall» از clickShortageList
function shortageList_shall(ev, el, a, id, d) {
  var g1 = shortGroups()[+el.getAttribute("data-i")];
  if (!g1) return true;
  S.shChk = S.shChk || {};
  var allOn = g1.list.every(function (x) {
    return S.shChk[x.d.id + "|" + x.id];
  });
  g1.list.forEach(function (x) {
    var k4 = x.d.id + "|" + x.id;
    if (allOn) delete S.shChk[k4];
    else S.shChk[k4] = 1;
  });
  render();
  return true;
}

// ثبت کسری‌های انتخاب‌شده یا تایپ‌شده.
function submitShortages() {
  var dd2 = insp(S.sheet, S.key),
    have2 = {};
  Object.keys((dd2 && dd2.items) || {}).forEach(function (id) {
    var it = dd2.items[id];
    if (it.r === "shortage" && !it.closedAt) have2[(it.part || it.note || "").trim()] = 1;
  });
  var parts = Object.keys(S.shSel || {});
  fieldValue("sn")
    .split(/[,،\n]+/)
    .map(function (x) {
      return x.trim();
    })
    .filter(Boolean)
    .forEach(function (p) {
      if (parts.indexOf(p) < 0) parts.push(p);
    });
  parts = parts.filter(function (p) {
    return !have2[p];
  });
  if (!parts.length) {
    S.formErr2 = "دست‌کم یک قطعه انتخاب کنید یا بنویسید.";
    render();
    return;
  }
  S.formErr2 = "";
  var m2 = {},
    t6 = nowIso();
  parts.forEach(function (p, i3) {
    m2["x" + uid() + i3] = {
      r: "shortage",
      custom: true,
      part: p,
      note: p,
      by: S.user.name,
      byId: S.user.id,
      at: t6,
      closedAt: "",
      closedBy: "",
    };
  });
  S.shSel = {};
  writeItems(m2, faDigits(parts.length) + " کسری ثبت شد").then(function () {
    var e = document.getElementById("sn");
    if (e) e.value = "";
  });
}

// ثبت یک ایراد اضافه با شرح.
function submitExtraDefect() {
  var n = fieldValue("xn"),
    ty = fieldValue("xt");
  if (!n) {
    S.formErr =
      "برای ثبت ایراد، شرح را بنویسید. اگر ایرادی نیست، از «تأیید نهایی بازدید» پایین صفحه استفاده کنید.";
    render();
    return;
  }
  S.formErr = "";
  var m = {};
  m["x" + uid()] = {
    r: ty,
    custom: true,
    note: n,
    by: S.user.name,
    byId: S.user.id,
    at: nowIso(),
    closedAt: "",
    closedBy: "",
  };
  writeItems(m, "در پرونده ثبت شد").then(function () {
    var e = document.getElementById("xn");
    if (e) e.value = "";
  });
}
