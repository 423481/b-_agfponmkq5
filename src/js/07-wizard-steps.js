/* ════════════════════════════════════════════════════════════
   فصل 07 — ویزارد: مراحل، نوار پایین و تأیید
   نوار مراحل، دکمه‌های پایین صفحه، تأیید بخش، تأیید نهایی، صفحه‌ی سبز، نمای فقط‌خواندنی.
   توابع اصلی: stepSec، stepAdvance، secDefects، hasShortStep، wizSteps، baseSteps، wizBar، wizDone و …
   ════════════════════════════════════════════════════════════ */

function stepSec(d, edit) {
  if (!edit || !d || d.final || !isChs(d.sheet)) return null;
  var secs = secsOf(d.sheet, prodOf(d));
  for (var i = 0; i < secs.length; i++) {
    var sc = secs[i];
    if (sc.choice || (d.signs && d.signs[sc.id]) || !secOK(sc.id)) continue;
    return sc;
  }
  return null;
}

function stepAdvance(d, id) {
  var sc = stepSec(d, true);
  if (!sc || String(id).indexOf(sc.id + "-") !== 0) return;
  var vi = visItems(d, sc),
    items = d.items || {},
    pos = -1,
    i,
    nx = vi.length;
  vi.forEach(function (x, j) {
    if (secItemId(sc, x.i) === id) pos = j;
  });
  var un = function (j) {
    var iid = secItemId(sc, vi[j].i);
    return iid !== id && !(items[iid] && items[iid].r);
  };
  for (i = pos + 1; i < vi.length; i++)
    if (un(i)) {
      nx = i;
      break;
    }
  if (nx === vi.length)
    for (i = 0; i <= pos && i < vi.length; i++)
      if (un(i)) {
        nx = i;
        break;
      }
  S.step = S.step || {};
  S.step[d.id + "|" + sc.id] = nx;
  S.fresh = id;
}

function secDefects(d, sc) {
  var out = [],
    items = d.items || {};
  Object.keys(items).forEach(function (id) {
    var it = items[id];
    if (!it || (it.r !== "ng" && it.r !== "sample")) return;
    if (it.custom ? it.sec === sc.id : id.indexOf(sc.id + "-") === 0)
      out.push({
        id: id,
        it: it,
        l:
          (it.r === "sample" ? "نمونه: " : "") +
          (it.custom ? it.note || "ایراد" : labelOf(d.sheet, id, d)),
      });
  });
  return out;
}

function hasShortStep(sheet) {
  return NO_SHORT_SHEETS.indexOf(sheet) < 0;
}

// مراحل ویزارد ایستگاه را می‌سازد (شناسایی، بخش‌ها، کسری، تأیید نهایی).
function wizSteps(d) {
  var pr = chassisPair(d),
    st = baseSteps(pr ? pr.c : d),
    at = -1;
  if (!pr) return st;
  st.forEach(function (x, i) {
    if (x.k === "ewt1") at = i;
  });
  if (at < 0) return baseSteps(d);
  var es = engineStepState(pr.e);
  st.splice(at + 1, 0, { k: "eng", label: "موتور", state: es });
  st.forEach(function (x) {
    if (x.state === "cur") x.state = "todo";
  });
  var ci = -1;
  st.forEach(function (x, i) {
    if (ci < 0 && x.state === "todo") ci = i;
  });
  if (d.sheet === "engine" && es === "todo") ci = at + 1;
  if (ci >= 0) st[ci].state = "cur";
  return st;
}

function baseSteps(d) {
  var secs = secsOf(d ? d.sheet : S.sheet, d ? prodOf(d) : "padra").filter(function (x) {
      return !x.choice && secOK(x.id);
    }),
    st = [];
  st.push({ k: "id", label: "شناسایی", state: d ? "done" : "cur" });
  secs.forEach(function (x) {
    var sg = d && d.signs && d.signs[x.id];
    st.push({
      k: x.id,
      label: x.name,
      state: sg
        ? secDefects(d, x).some(function (e) {
            return e.it.r === "ng" && !e.it.closedAt;
          })
          ? "ng"
          : "done"
        : "todo",
    });
  });
  if (hasShortStep(d ? d.sheet : S.sheet))
    st.push({
      k: "short",
      label: "کسری",
      state:
        d && (d.shDone || d.final)
          ? Object.keys(d.items || {}).some(function (i) {
              var t = d.items[i];
              return t && t.r === "shortage" && !t.closedAt;
            })
            ? "sh"
            : "done"
          : "todo",
    });
  st.push({
    k: "final",
    label: "تأیید نهایی",
    state: d && d.final ? "done" : "todo",
  });
  var ci = -1;
  st.forEach(function (x, i) {
    if (ci < 0 && x.state === "todo") ci = i;
  });
  if (!d) ci = 0;
  if (ci >= 0) st[ci].state = "cur";
  return st;
}

// نوار مراحل بالای ویزارد.
function wizBar(d) {
  var st = wizSteps(d);
  return (
    '<div class="wiz" role="list">' +
    st
      .map(function (x, i) {
        var ic =
          x.state === "done"
            ? "✓"
            : x.state === "ng"
              ? d && isChs(d.sheet)
                ? "✓"
                : "✗"
              : x.state === "sh"
                ? "⚠"
                : faDigits(i + 1);
        return (
          '<button type="button" class="wst ' +
          x.state +
          (S.wizView === x.k ? " view" : "") +
          '" role="listitem" data-act="wizgo" data-k="' +
          esc(x.k) +
          '"' +
          (x.state === "done" || x.state === "ng" || x.state === "sh" ? "" : ' tabindex="-1"') +
          "><i>" +
          ic +
          "</i><span>" +
          esc(x.label) +
          "</span></button>"
        );
      })
      .join("") +
    "</div>"
  );
}

function wizDone(d, k) {
  if (k === "id") return true;
  if (k === "short") return !!d.final;
  return !!(d.signs && d.signs[k]);
}

/* بخش‌هایی که چکمنِ دیگری باید تأیید کند (خارج از انتخاب این چکمن و هنوز تأییدنشده)؛ تأیید نهایی پرونده با تأیید آن‌ها ثبت می‌شود */
function waitNote(d) {
  var po = pendingOthers(d);
  return po.length
    ? '<p class="hint" style="margin:8px 0">بخش ' +
        esc(po.join("، ")) +
        " را چکمن دیگر تأیید می‌کند؛ تأیید نهایی پرونده با تأیید او ثبت می‌شود.</p>"
    : "";
}

function pendingOthers(d) {
  return secsOf(d.sheet, prodOf(d))
    .filter(function (x) {
      return !x.choice && !secOK(x.id) && !(d.signs && d.signs[x.id]);
    })
    .map(function (x) {
      return x.name;
    });
}

// صفحه‌ی تأیید هر بخش با نام، تاریخ و ساعت تأییدکننده.
function stepConfirm(d) {
  if (
    !d ||
    d.final ||
    (S.wizView && wizDone(d, S.wizView)) ||
    S.sxOpen ||
    S.editing ||
    S.sitem ||
    S.acOpen
  )
    return null;
  var cur = stepSec(d, true);
  if (cur) {
    var n = secDefects(d, cur).filter(function (e) {
      return !e.it.closedAt;
    }).length;
    return {
      act: "sign",
      sec: cur.id,
      label: n ? "✓ تأیید بخش با " + faDigits(n) + " ایراد" : "✓ تأیید کلی — همه سالم",
    };
  }
  if (hasShortStep(d.sheet) && (!d.shDone || S.shEdit === d.id)) {
    var any = Object.keys(d.items || {}).some(function (i) {
      var t = d.items[i];
      return t && t.r === "shortage" && !t.closedAt;
    });
    var pn = Object.keys(S.shSel || {}).filter(function (p) {
      return !Object.keys(d.items || {}).some(function (i) {
        var t = d.items[i];
        return t && t.r === "shortage" && !t.closedAt && (t.part || t.note || "").trim() === p;
      });
    }).length;
    return {
      act: "shdone",
      label: pn
        ? "✓ ثبت " + faDigits(pn) + " کسری و ادامه"
        : any
          ? "✓ ادامه"
          : "✓ کسری ندارد — ادامه",
    };
  }
  return {
    act: "final",
    label: pendingOthers(d).length ? "✓ پایان بازدید بخش من" : "✓ تأیید نهایی به نام من",
  };
}

// نوار ثابت پایین ویزارد: برگشت و دکمه‌ی سبز تأیید.
function botBar(d) {
  var c = stepConfirm(d);
  if (!c && d && !d.final && S.wizView && wizDone(d, S.wizView))
    c = { act: "wizback", label: "ادامه — مرحله‌ی فعلی ◀" };
  if (!c && d && d.sheet === "engine" && chassisPair(d)) c = { act: "wizback", label: "ادامه ◀" };
  var ch = d && isChs(d.sheet),
    bar =
      '<div class="botspace"></div><div class="botbar' +
      (ch ? " chs" : "") +
      (d && isChs(d.sheet) ? " chsx" : "") +
      '"><button class="btn back" data-act="wizprev">▶ برگشت</button>' +
      (d ? sampleBtn(d) : "") +
      (c
        ? '<button class="btn ok confirm" data-act="' +
          c.act +
          '"' +
          (c.sec ? ' data-sec="' + esc(c.sec) + '"' : "") +
          ">" +
          c.label +
          "</button>"
        : "") +
      "</div>";
  return ch ? chIcons(bar) : bar;
}

function finalInfoRows(f) {
  return (
    '<dl class="finfo"><div><dt>تأییدکننده</dt><dd>' +
    esc(f.by) +
    "</dd></div><div><dt>تاریخ</dt><dd><bdi>" +
    esc(dateOnly(f.at)) +
    "</bdi></dd></div><div><dt>ساعت</dt><dd><bdi>" +
    esc(timeHM(f.at)) +
    "</bdi></dd></div></dl>"
  );
}

function openGroups(d) {
  var g = [],
    items = d.items || {},
    ids = Object.keys(items);
  function open(i, r) {
    var t = items[i];
    return t && t.r === r && !t.closedAt;
  }
  secsOf(d.sheet, prodOf(d))
    .filter(function (x) {
      return !x.choice && secOK(x.id);
    })
    .forEach(function (sc) {
      var rows = secDefects(d, sc)
        .filter(function (e) {
          return e.it.r === "ng" && !e.it.closedAt;
        })
        .map(function (e) {
          return rmLi(
            d,
            e.id,
            esc(e.l) + (e.it.custom ? "" : e.it.note ? " — " + esc(e.it.note) : ""),
          );
        });
      if (rows.length) g.push({ title: sc.name, rows: rows });
    });
  var sh = ids
    .filter(function (i) {
      return open(i, "shortage");
    })
    .map(function (i) {
      return rmLi(d, i, "⚠ " + esc(items[i].part || items[i].note || "")).replace(
        'class="rmli',
        'class="shli rmli',
      );
    });
  if (sh.length) g.push({ title: "کسری", rows: sh });
  var sm = ids
    .filter(function (i) {
      return open(i, "sample") && items[i].custom;
    })
    .map(function (i) {
      return rmLi(d, i, esc(items[i].note || "")).replace('class="rmli', 'class="smli rmli');
    });
  if (sm.length) g.push({ title: "نمونه", rows: sm });
  return g;
}

function finalSummaryWiz(d) {
  var groups = openGroups(d),
    total = groups.reduce(function (n, x) {
      return n + x.rows.length;
    }, 0);
  var h =
    '<div class="stepcur fsum"><div class="steplb" style="color:var(--ok)">✓ تأیید نهایی شد</div>' +
    finalInfoRows(d.final);
  h +=
    '<p class="fsumcnt">' +
    (total ? faDigits(total) + " مورد باز در پرونده" : "بدون ایراد و کسری باز") +
    "</p>";
  h += groups
    .map(function (x) {
      return (
        '<section class="fgrp"><h4><bdi>' +
        esc(x.title) +
        "</bdi><small>" +
        faDigits(x.rows.length) +
        '</small></h4><ul class="stepdef">' +
        x.rows.join("") +
        "</ul></section>"
      );
    })
    .join("");
  if (S.sxOpen === "short") {
    S.sxType = "shortage";
    h += sxEditBox("short");
  } else
    h +=
      '<button class="btn stepfix" data-act="sxopen" data-t="shortage" data-sec="short">✎ نیاز به اصلاح — کسری جدید</button>';
  return h + amendHtml(d) + exportCard(d) + "</div>";
}

function finalSummary(d) {
  if (isChs(d.sheet)) return finalSummaryWiz(d);
  var f = d.final,
    st = stat(d),
    shl = Object.keys(d.items || {}).filter(function (i) {
      var t = d.items[i];
      return t && t.r === "shortage" && !t.closedAt;
    });
  var h =
    '<div class="stepcur"><div class="steplb" style="color:var(--ok)">✓ تأیید نهایی شد</div><div class="hint" style="margin:0 0 8px">' +
    whoWhen(f.by, f.at, "تأییدکننده") +
    "</div>";
  h +=
    '<p style="font-weight:800;font-size:18px;margin:6px 0">' +
    (st.open ? faDigits(st.open) + " مورد باز در پرونده" : "بدون ایراد و کسری باز") +
    "</p>";
  if (shl.length)
    h +=
      '<ul class="stepdef">' +
      shl
        .map(function (i) {
          var t = d.items[i];
          return rmLi(d, i, "⚠ کسری: " + esc(t.part || t.note || ""));
        })
        .join("") +
      "</ul>";
  if (S.sxOpen === "short") {
    S.sxType = "shortage";
    h += sxEditBox("short");
  } else
    h +=
      '<button class="btn stepng sh" data-act="sxopen" data-t="shortage" data-sec="short" style="margin-top:8px">✎ نیاز به اصلاح — کسری جدید</button>';
  if (!isChs(d.sheet)) h += smpMini(d);
  h += amendHtml(d);
  return (
    h +
    (isChs(d.sheet)
      ? ""
      : '<p class="hint" style="margin-top:10px">پرونده تأیید شده است ولی هر وقت لازم شد می‌توانید اصلاحیه ثبت کنید؛ تأیید اصلی می‌ماند و اصلاحیه با نام و زمان ثبت می‌شود. برای هر بخش روی دایره‌اش بزنید. اصلاح شماره‌ها در «شناسایی» است.</p>') +
    exportCard(d) +
    "</div>"
  );
}

function acPage(d) {
  var ac = secsOf(d.sheet, prodOf(d)).filter(function (x) {
    return x.choice;
  })[0];
  var edit = canEdit(d.sheet, d.key) && secOK(ac.id);
  return (
    '<div class="stepbar chs chsx nostick"><div class="stepcur"><div class="sxh"><b>' +
    esc(ac.name) +
    '</b><span class="num">' +
    esc(d.key) +
    '</span></div><p class="hint">هر کدام را که انجام شد بزنید تا سبز شود. برای برداشتن دوباره بزنید.</p><div class="items">' +
    visItems(d, ac)
      .map(function (x) {
        return itemRow(d, secItemId(ac, x.i), x.l, edit, false, x.p);
      })
      .join("") +
    "</div></div></div>"
  );
}

function acButton(d) {
  if (d.sheet !== "final1" || S.itemsOpen || d.final) return "";
  return '<button class="btn stepitemsbtn" data-act="acopen">گاز کولر ◀</button>';
}

/* نمای فقط‌خواندنی برای کسی که چکمن این ایستگاه نیست: همان قالب ویزارد، بدون دکمه‌ی ثبت */
function viewOnlyCard(d) {
  var k = S.wizView || (d.final ? "final" : "id");
  return (
    '<div class="stepbar chs chsx viewonly">' +
    carInfo(d) +
    wizBar(d) +
    carHistoryBlock(d) +
    pshWizBlock(d) +
    cpfWizBlock(d) +
    viewOnlyPanel(d, k) +
    exportCard(d) +
    '<button type="button" class="btn corrbtn" data-act="roback">▶ بازگشت</button></div>'
  );
}

function roItems(d, list) {
  return list
    .map(function (e) {
      return (
        '<p class="hint" style="margin:10px 0 2px"><b>' +
        esc(e.l) +
        "</b></p>" +
        noteBlock(d, e.id, e.it, false)
      );
    })
    .join("");
}

function viewOnlyPanel(d, k) {
  if (k === "id") return viewPanel(d, "id");
  var h = '<div class="stepcur viewpg">',
    ok = '<small style="font-size:15px;color:var(--ok)">✓ تأیید شده</small>';
  if (k === "short") {
    var sh = Object.keys(d.items || {})
      .filter(function (i) {
        var t = d.items[i];
        return t && t.r === "shortage";
      })
      .map(function (i) {
        var t = d.items[i];
        return { id: i, it: t, l: t.part || t.note || "" };
      });
    return (
      h +
      '<div class="steplb">کسری</div>' +
      (sh.length
        ? roItems(d, sh)
        : '<p class="hint" style="color:var(--ok);font-weight:700">کسری ثبت نشده است.</p>') +
      "</div>"
    );
  }
  if (k === "final") {
    var f = d.final,
      st = stat(d);
    if (!f)
      return (
        h +
        '<div class="steplb">تأیید نهایی</div><p class="hint">هنوز تأیید نهایی نشده است.</p></div>'
      );
    return (
      h +
      '<div class="steplb" style="color:var(--ok)">✓ تأیید نهایی شد</div><div class="hint" style="margin:0 0 8px">' +
      whoWhen(f.by, f.at, "تأییدکننده") +
      "</div>" +
      '<p style="font-weight:800;font-size:18px;margin:6px 0">' +
      (st.open ? faDigits(st.open) + " مورد باز در پرونده" : "بدون ایراد و کسری باز") +
      "</p>" +
      amendHtml(d) +
      "</div>"
    );
  }
  var sc = secsOf(d.sheet, prodOf(d)).filter(function (x) {
      return x.id === k;
    })[0],
    sg = d.signs && d.signs[k];
  if (!sc) return "";
  var df = secDefects(d, sc);
  h +=
    '<div class="steplb">بخش ' +
    esc(sc.name) +
    " " +
    (sg ? ok : "") +
    "</div>" +
    (sg
      ? '<div class="hint" style="margin:0 0 8px">' + whoWhen(sg.by, sg.at, "تأییدکننده") + "</div>"
      : '<p class="hint">هنوز تأیید نشده است.</p>');
  return (
    h +
    (df.length
      ? roItems(d, df)
      : sg
        ? '<p class="hint" style="color:var(--ok);font-weight:700">همه‌ی بندها سالم ثبت شده است.</p>'
        : "") +
    "</div>"
  );
}

function isChs(x) {
  return WIZ_SHEETS.indexOf(x) >= 0;
}

function fullIdSheet(x) {
  return FULL_ID_SHEETS.indexOf(x) >= 0;
}

/* ایستگاه‌هایی که کش، ماندن در صفحه بعد از رفرش و اصلاح فوری شماره دارند */
function wizStation() {
  return !!S.user && WIZ_STATIONS.indexOf(S.user.station) >= 0;
}

function sxPage(d) {
  var k = S.sxOpen,
    T = S.sxType === "shortage" ? "ثبت کسری" : S.sxType === "sample" ? "ثبت نمونه" : "ثبت ایراد",
    sc =
      k !== "short" && k !== "sample"
        ? secsOf(d.sheet, prodOf(d)).filter(function (x) {
            return x.id === k;
          })[0]
        : null;
  return (
    '<div class="sxpage"><div class="sxh"><b>' +
    T +
    (sc ? " — " + esc(sc.name) : "") +
    '</b><span class="num">' +
    esc(d.key) +
    "</span></div>" +
    (k === "sample" && isChs(d.sheet)
      ? smpList(d) +
        (d.final
          ? '<p class="hint" style="margin:0 0 8px">پرونده تأیید نهایی شده است؛ نمونه‌ی تازه با برچسب «اصلاحیه» و نام و زمان ثبت می‌شود.</p>'
          : "")
      : "") +
    sxEditBox(k) +
    "</div>"
  );
}

// صفحه‌ی سبز پایان بازدید.
function doneFuelLabel(v, d) {
  if ((v.sheet === "trim" || v.sheet === "engine") && !(d && fuelRaw(d))) return "";
  return v.fuel === "single" ? "تک‌سوز" : v.fuel === "dual" ? "دوگانه‌سوز" : "";
}

function doneHeader(v, fu, nb) {
  return (
    '<div class="donescr' +
    (nb ? " nobtn" : "") +
    '" role="dialog"' +
    (nb ? ' data-act="donecl"' : "") +
    '><div class="dtop"><div class="dchk">✓</div><div class="dt">' +
    (v.wait ? "بخش شما تأیید شد" : "تأیید نهایی شد") +
    '</div><div class="dk num">' +
    esc(v.key) +
    '</div><div class="dm">' +
    esc(fu) +
    "</div>" +
    (v.wait ? '<div class="dm">منتظر تأیید ' + esc(v.wait) + "</div>" : "") +
    '</div><div class="dscroll">'
  );
}

function doneIdentCard(d) {
  var mm = mergedFor(d.sheet, d.key, d),
    dt = "";
  try {
    dt = d.createdAt ? fmtD.format(new Date(d.createdAt)) : "";
  } catch (e) {}
  return (
    '<div class="dcard">' +
    (d.sheet === "chassis"
      ? '<div class="drow"><span>شماره موتور</span><b class="num">' +
        esc(mm.engine || "—") +
        "</b></div>"
      : "") +
    '<div class="drow"><span>محصول</span><b>' +
    esc(productShort(d)) +
    '</b></div><div class="drow"><span>تاریخ ثبت</span><b>' +
    esc(dt) +
    "</b></div></div>"
  );
}

function doneSectionCard(d, sc) {
  var sg = d.signs && d.signs[sc.id],
    df = secDefects(d, sc),
    nOpen = df.filter(function (e) {
      return !e.it.closedAt;
    }).length;
  return (
    '<div class="dcard' +
    (nOpen ? " dng" : "") +
    '"><div class="drow"><b>بخش ' +
    esc(sc.name) +
    "</b><span>" +
    (nOpen ? "✗ " + faDigits(nOpen) + " ایراد" : "✓ سالم") +
    "</span></div>" +
    (sg ? dsub(d, sg.by, sg.at) : "") +
    (df.length
      ? "<ul>" +
        df
          .map(function (e) {
            return (
              "<li>" + esc(e.l) + (e.it.custom ? "" : e.it.note ? " — " + esc(e.it.note) : "") + "</li>"
            );
          })
          .join("") +
        "</ul>"
      : "") +
    "</div>"
  );
}

function doneSectionCards(d) {
  return secsOf(d.sheet, prodOf(d))
    .filter(function (x) {
      return !x.choice && secOK(x.id);
    })
    .map(function (sc) {
      return doneSectionCard(d, sc);
    })
    .join("");
}

// فهرست قطعه‌های کسری و نمونه‌ی باز؛ هر کدام فقط متن
function openShortSample(d) {
  var shl = [],
    smp = [];
  Object.keys(d.items || {}).forEach(function (i) {
    var t = d.items[i];
    if (!t || t.closedAt) return;
    if (t.r === "shortage") shl.push(t.part || t.note || "");
    else if (t.r === "sample" && t.custom) smp.push(t.note || "");
  });
  return { shl: shl, smp: smp };
}

function doneBulletList(list, mark) {
  return (
    "<ul>" +
    list
      .map(function (p) {
        return "<li>" + mark + esc(p) + "</li>";
      })
      .join("") +
    "</ul>"
  );
}

function doneShortSampleCards(d) {
  var o = openShortSample(d),
    h =
      '<div class="dcard' +
      (o.shl.length ? " dsh" : "") +
      '"><div class="drow"><b>کسری</b><span>' +
      (o.shl.length ? faDigits(o.shl.length) + " مورد" : "ندارد") +
      "</span></div>" +
      (o.shl.length ? doneBulletList(o.shl, "⚠ ") : "") +
      "</div>";
  if (o.smp.length)
    h +=
      '<div class="dcard dsm"><div class="drow"><b>نمونه</b><span>' +
      faDigits(o.smp.length) +
      " مورد</span></div>" +
      doneBulletList(o.smp, "◇ ") +
      "</div>";
  return h;
}

function doneCards(d) {
  return (
    doneIdentCard(d) +
    doneSectionCards(d) +
    doneShortSampleCards(d) +
    (d.final
      ? '<div class="dcard"><div class="drow"><b>تأیید نهایی</b></div>' +
        dsub(d, d.final.by, d.final.at) +
        "</div>"
      : "")
  );
}

// خروجی PDF و Excel آخر صفحه‌ی تأیید نهایی
function doneExportCard(d) {
  var bar = exportCard(d);
  return bar ? '<div class="dcard dexp"><b>خروجی برگه</b>' + bar + "</div>" : "";
}

function doneOv() {
  var v = S.doneScr,
    d = insp(v.sheet || "chassis", v.key),
    nb = v.sheet === "trim" || isChs(v.sheet);
  return (
    doneHeader(v, doneFuelLabel(v, d), nb) +
    (d ? doneCards(d) + doneExportCard(d) : "") +
    "</div>" +
    (nb
      ? ""
      : '<div class="dfoot"><button type="button" class="btn dbtn" data-act="donecl">ادامه</button></div>') +
    "</div>"
  );
}

function dsub(d, by, iso) {
  return '<div class="dsub">' + whoWhen(by, iso) + "</div>";
}

function wizardStepBack(d) {
  if (S.more) {
    S.more = false;
    render();
    return;
  }
  if (S.acOpen) {
    S.acOpen = false;
    render();
    return;
  }
  if (S.sitem || S.editing) {
    S.sitem = "";
    S.editing = null;
    S.editErr = "";
    render();
    return;
  }
  if (S.itemsOpen) {
    S.itemsOpen = false;
    render();
    window.scrollTo(0, 0);
    return;
  }
  S.sxOpen = "";
  S.sxErr = "";
  S.sitem = "";
  S.itemsOpen = false;
  S.editing = null;
  var pr = chassisPair(d);
  if (pr && d.sheet === "engine") {
    openChassisStep(pr, pr.c.signs && pr.c.signs.ewt1 ? "ewt1" : "");
    return;
  }
  if (d.final) {
    if (S.wizView) {
      S.wizView = "";
      render();
      return;
    }
    S.key = "";
    S.wizFor = "";
    render();
    var kf0 = document.getElementById("key");
    if (kf0) kf0.focus();
    window.scrollTo(0, 0);
    return;
  }
  var st0 = wizSteps(d),
    ix = -1;
  st0.forEach(function (x, i) {
    if (S.wizView ? x.k === S.wizView : S.shEdit === d.id ? x.k === "short" : x.state === "cur")
      ix = i;
  });
  if (ix <= 0) {
    S.key = "";
    S.wizFor = "";
    S.wizView = "";
    S.shEdit = "";
    render();
    var kf1 = document.getElementById("key");
    if (kf1) kf1.focus();
    window.scrollTo(0, 0);
    return;
  }
  var pk = st0[ix - 1].k;
  if (pr && pk === "eng") {
    openEngineStep(pr);
    return;
  }
  S.shEdit = "";
  S.wizView = "";
  if (pk === "short") S.shEdit = d.id;
  else S.wizView = pk;
  render();
  window.scrollTo(0, 0);
  return;
}

// تأیید نهایی بازدید؛ فقط وقتی همه‌ی بخش‌ها امضا شده باشد.
// بندهای «گاز کولر» نهایی بالا که هنوز نه سالم و نه ایراد خورده‌اند
function acPending(d) {
  var ac =
    d.sheet === "final1" &&
    secsOf(d.sheet, prodOf(d)).filter(function (x) {
      return x.choice;
    })[0];
  return (
    !!ac &&
    visItems(d, ac).some(function (x) {
      var it = d.items && d.items[secItemId(ac, x.i)];
      return !(it && it.r);
    })
  );
}

function confirmFinal(d) {
  if (S.editing) {
    toast("یک ایراد در حال ثبت است؛ ابتدا «ثبت در پرونده» یا «انصراف» را بزنید");
    return;
  }
  if (acPending(d)) {
    toast("گاز کولر انجام نشده است؛ ابتدا بندهای «گاز کولر» را بزنید");
    return;
  }
  var shx = secsOf(S.sheet, prodOf(d)),
    mm2 = {},
    sg2 = {},
    t2 = nowIso(),
    fc = d.formCode || FORM_CODE,
    op2 = stat(d).open,
    lim = !!activeSec();
  shx.forEach(function (sc2) {
    if (!secOK(sc2.id)) return;
    visItems(d, sc2).forEach(function (x) {
      var iid = secItemId(sc2, x.i);
      if (!(d.items && d.items[iid] && d.items[iid].r)) mm2[iid] = itemMark("ok", "", t2);
    });
    if (!(d.signs && d.signs[sc2.id]))
      sg2[sc2.id] = {
        by: S.user.name,
        byId: S.user.id,
        at: t2,
        open: op2,
        formCode: fc,
      };
  });
  var allS = shx.every(function (sc2) {
      return (d.signs && d.signs[sc2.id]) || sg2[sc2.id];
    }),
    upd = { items: mm2, signs: sg2 };
  if (!lim || allS)
    upd.final = {
      by: S.user.name,
      byId: S.user.id,
      at: t2,
      open: op2,
      formCode: fc,
    };
  S.editing = null;
  var dv0 = {
    sheet: S.sheet,
    key: S.key,
    fuel: fuelOf(d),
    open: op2,
    shorts: Object.keys(d.items || {}).filter(function (i) {
      var t = d.items[i];
      return t && t.r === "shortage" && !t.closedAt;
    }).length,
    by: S.user.name,
    wait: upd.final ? "" : pendingOthers(d).join("، "),
  };
  save(
    function () {
      return store.fill("inspections", docId(S.sheet, S.key), upd);
    },
    upd.final
      ? op2
        ? "تأیید نهایی ثبت شد"
        : "تأیید نهایی ثبت شد؛ بدون ایراد"
      : "بخش شما تأیید شد؛ تأیید نهایی پرونده پس از تأیید بخش دیگر ثبت می‌شود",
  ).then(function (ok) {
    if (!ok) return;
    if (!upd.final && !isChs(dv0.sheet)) {
      render();
      return;
    }
    if (isChs(dv0.sheet)) S.doneScr = dv0;
    S.key = "";
    S.searchErr = "";
    S.formErr = "";
    S.editing = null;
    render();
    var ke = document.getElementById("key");
    if (ke && !S.doneScr) {
      ke.value = "";
      ke.focus();
    }
    window.scrollTo(0, 0);
  });
}

// امضای یک بخش (EWT1/EWT2) — اگر همکار قبلاً امضا کرده، امضای او نگه داشته می‌شود.
function signSection(el, d) {
  if (S.editing) {
    toast("یک ایراد در حال ثبت است؛ ابتدا «ثبت در پرونده» یا «انصراف» را بزنید");
    return;
  }
  var sid = el.getAttribute("data-sec"),
    sg = {},
    mm = {},
    t1 = nowIso(),
    sheet0 = S.sheet,
    key0 = S.key;
  S.fresh = sid;
  S.sxOpen = "";
  S.itemsOpen = false;
  S.sitem = "";
  var sc = secsOf(S.sheet, prodOf(d)).filter(function (s) {
    return s.id === sid;
  })[0];
  if (!sc.choice)
    visItems(d, sc).forEach(function (x) {
      var iid = secItemId(sc, x.i);
      if (!(d.items && d.items[iid] && d.items[iid].r)) mm[iid] = itemMark("ok", "", t1);
    });
  var stamp = {
    by: S.user.name,
    byId: S.user.id,
    at: t1,
    open: stat(d).open,
    formCode: d.formCode || FORM_CODE,
  };
  sg[sid] = stamp;
  S.editing = null;
  var updS = { items: mm, signs: sg },
    inFlow = d.sheet === "engine" && !!chassisPair(d);
  if (inFlow) {
    updS.shDone = { by: S.user.name, byId: S.user.id, at: t1 };
    updS.final = stamp;
  } else if (
    activeSec() &&
    secsOf(S.sheet, prodOf(d)).every(function (x) {
      return x.id === sid || (d.signs && d.signs[x.id]);
    })
  )
    updS.final = stamp;
  save(
    function () {
      return store.fill("inspections", docId(S.sheet, S.key), updS);
    },
    "بخش " + sc.name + " به نام " + S.user.name + " تأیید شد",
  ).then(function (ok) {
    if (ok) afterSectionSigned(sheet0, key0, sid);
  });
}

function clickWizardNav(ev, el, a, id, d) {
  if (a === "wizgo" && d) return wizardNav_wizgo(ev, el, a, id, d);
  if (
    a === "donecl" &&
    pointerDown &&
    ev.detail > 0 &&
    typeof ev.clientX === "number" &&
    (Math.abs(ev.clientX - pointerDown.x) > 12 || Math.abs(ev.clientY - pointerDown.y) > 12)
  )
    return true;
  if (a === "donecl" && S.doneScr && S.doneScr.re) {
    S.doneScr = null;
    render();
    return true;
  }
  if (a === "donecl") return wizardNav_donecl(ev, el, a, id, d);
  if (a === "sxprev" && d) return wizardNav_sxprev(ev, el, a, id, d);
  if (a === "wizprev" && d) {
    wizardStepBack(d);
    return true;
  }
  if (a === "wizback") return wizardNav_wizback(ev, el, a, id, d);
  return false;
}

// اقدام «wizgo» از clickWizardNav
function wizardNav_wizgo(ev, el, a, id, d) {
  var wk = el.getAttribute("data-k"),
    pr = chassisPair(d);
  if (pr && d.sheet === "chassis" && wk === "eng") {
    openEngineStep(pr);
    return true;
  }
  if (pr && d.sheet === "engine") {
    if (wk === "eng") {
      if (!(d.signs && d.signs.ewt1)) return true;
      wk = "ewt1";
    } else {
      openChassisStep(pr, "");
      d = pr.c;
    }
  }
  if (!canEdit(S.sheet, S.key)) {
    S.wizView = S.wizView === wk ? "" : wk;
    render();
    return true;
  }
  if (wk === "short" && !d.final) {
    S.shEdit = d.id;
    S.wizView = "";
    S.sxOpen = "";
    render();
    return true;
  }
  if (wk === "final") {
    if (d.final) {
      if (isChs(d.sheet)) {
        S.doneScr = { sheet: d.sheet, key: d.key, fuel: fuelOf(d), re: true };
        S.wizView = "";
      } else S.wizView = "";
      render();
    }
    return true;
  }
  S.wizView = S.wizView === wk ? "" : wk;
  S.sxOpen = "";
  S.sxErr = "";
  render();
  return true;
}

// اقدام «donecl» از clickWizardNav
function wizardNav_donecl(ev, el, a, id, d) {
  S.doneScr = null;
  render();
  var kd = document.getElementById("key");
  if (kd) {
    kd.value = "";
    kd.focus();
  }
  window.scrollTo(0, 0);
  return true;
}

// اقدام «sxprev» از clickWizardNav
function wizardNav_sxprev(ev, el, a, id, d) {
  var ty0 = S.sxType,
    sc0 = el.getAttribute("data-sec"),
    bk = null;
  var okT = function (it) {
    return (
      it &&
      it.custom &&
      !it.closedAt &&
      (ty0 === "shortage"
        ? it.r === "shortage"
        : ty0 === "sample"
          ? it.r === "sample"
          : it.r === "ng" && it.sec === sc0)
    );
  };
  S.data.insp.forEach(function (x) {
    if (x.sheet !== d.sheet || x.key === d.key) return;
    Object.keys(x.items || {}).forEach(function (i) {
      var it = x.items[i];
      if (okT(it) && (!bk || (it.at || "") > (bk.at || ""))) bk = { at: it.at, key: x.key };
    });
  });
  if (!bk) {
    toast("مورد مشابهی از خودروی دیگر پیدا نشد.");
    return true;
  }
  var ln = [];
  S.data.insp.forEach(function (x) {
    if (x.sheet !== d.sheet || x.key !== bk.key) return;
    Object.keys(x.items || {}).forEach(function (i) {
      var it = x.items[i];
      if (okT(it)) ln.push((it.part || it.note || "").trim());
    });
  });
  var tb0 = document.getElementById("sx");
  if (tb0) {
    tb0.value = (tb0.value.trim() ? tb0.value.trim() + "\n" : "") + ln.filter(Boolean).join("\n");
  }
  return true;
}

// اقدام «wizback» از clickWizardNav
function wizardNav_wizback(ev, el, a, id, d) {
  var pb = d && d.sheet === "engine" ? chassisPair(d) : null;
  if (pb) {
    openChassisStep(pb, "");
    return true;
  }
  S.wizView = "";
  S.sxOpen = "";
  S.sxErr = "";
  render();
  return true;
}

function clickCloseAndFiles(ev, el, a, id, d) {
  if (
    a === "xclose" &&
    canCloseItem(itemTypeOf(el.getAttribute("data-doc"), id), sheetOfDoc(el.getAttribute("data-doc")))
  )
    return closeAndFiles_xclose(ev, el, a, id, d);
  if (a === "markall" && S.isOwner) {
    markAllRecords();
    return true;
  }
  if (a === "loadrep" && store && store.fetchSince) return closeAndFiles_loadrep(ev, el, a, id, d);
  if (a === "rowbcdel" && d) {
    var mb = {};
    mb[id] = { bc: "", bcBy: "", bcById: "", bcAt: "" };
    writeItems(mb, "بارکد پاک شد");
    return true;
  }
  if (a === "rowphdel" && d) {
    var mq = {};
    mq[id] = { rowPhoto: "", rowPhotoBy: "", rowPhotoAt: "" };
    writeItems(mq, "عکس حذف شد");
    return true;
  }
  if ((a === "xlsx" || a === "pdf") && S.user) return closeAndFiles_xlsx(ev, el, a, id, d);
  return false;
}

// اقدام «xclose» از clickCloseAndFiles
function closeAndFiles_xclose(ev, el, a, id, d) {
  var xi = el.getAttribute("data-i"),
    xn = fieldValue("xcn_" + xi),
    xdoc = el.getAttribute("data-doc");
  if (!xn) {
    toast("اقدام انجام‌شده را بنویسید.");
    return true;
  }
  var xm = {};
  xm[id] = {
    closedAt: nowIso(),
    closedBy: S.user.name,
    closedById: S.user.id,
    closeNote: xn,
  };
  save(function () {
    return store.update("inspections", xdoc, { items: xm });
  }, "مورد بسته شد");
  return true;
}

// اقدام «loadrep» از clickCloseAndFiles
function closeAndFiles_loadrep(ev, el, a, id, d) {
  toast("در حال بارگذاری…");
  store.fetchSince(60).then(
    function () {
      toast("۶۰ روز اخیر بارگذاری شد");
    },
    function () {
      toast("بارگذاری ناموفق بود");
    },
  );
  return true;
}

// اقدام «xlsx» از clickCloseAndFiles
function closeAndFiles_xlsx(ev, el, a, id, d) {
  toast("در حال ساخت فایل…");
  var qq = el.getAttribute("data-q"),
    qs = el.getAttribute("data-sh") || "";
  setTimeout(function () {
    doExport(a, qq, qs).catch(function (e) {
      toast("ساخت فایل ناموفق بود: " + ((e && e.message) || ""));
    });
  }, 50);
  return true;
}

function clickConfirm(ev, el, a, id, d) {
  if (a === "final" && d) {
    confirmFinal(d);
    return true;
  }
  if (a === "sign" && d) {
    signSection(el, d);
    return true;
  }
  return false;
}
