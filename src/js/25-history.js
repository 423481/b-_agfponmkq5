/* ════════════════════════════════════════════════════════════
   فصل 25 — سوابق خودرو و پرونده‌ی خودرو
   سوابق هر مرحله، پرونده‌ی کامل خودرو، فهرست بازدیدها.
   توابع اصلی: stageDone، histStageBody، histStageCard، histSummaryLine، histPageView، carHistoryBlock، inspView، carRecords و …
   ════════════════════════════════════════════════════════════ */

/* نوار «سوابق خودرو» در صفحه‌ی شناسایی ایستگاه‌های ویزارد؛ با لمس، فهرست کامل باز می‌شود */
/* سوابق خودرو: صفحه‌ی جدا؛ به ترتیب ایستگاه‌های خط با نام تأییدکننده، ایراد/کسری/نمونه و حفاظت از مشتری. بستن موردها همان اختیار قبلی هر ایستگاه است */
function stageDone(r) {
  var st = r && stat(r);
  return !!r && st.signed === st.secs;
}

function histStageBody(r, H, tok) {
  var sg = Object.keys(r.signs || {}).map(function (i) {
    return r.signs[i];
  });
  var h = sg.length
    ? sg
        .map(function (x) {
          return whoWhen(x.by, x.at, "تأییدکننده");
        })
        .join("")
    : '<div class="hint">هنوز تأیید نشده</div>';
  var mine = function (L) {
      return L.filter(function (x) {
        return x.r === r;
      });
    },
    o = mine(H.open),
    c = mine(H.closed);
  if (!o.length && !c.length) return h + '<div class="hint">بدون ایراد، کسری یا نمونه</div>';
  h += o
    .map(function (x) {
      return openItemRow(x, "h" + tok.n++, canCloseItem(x.it.r, x.r.sheet));
    })
    .join("");
  return (
    h +
    (c.length
      ? '<details class="histclosed"><summary>بسته‌شده‌ها (' +
        faDigits(c.length) +
        ")</summary>" +
        c.map(closedItemRow).join("") +
        "</details>"
      : "")
  );
}

function histStageCard(k, r, H, tok, own) {
  var nOpen = r
    ? H.open.filter(function (x) {
        return x.r === r;
      }).length
    : 0;
  var state = !r ? "ثبت نشده" : stageDone(r) ? "تأیید شده" : "در حال بازدید";
  return (
    '<details class="card histstage"' +
    (own ? " open" : "") +
    "><summary><b>" +
    esc(stationTitle(k)) +
    '</b> <span class="chip' +
    (nOpen ? " open" : "") +
    '">' +
    state +
    (nOpen ? " · " + faDigits(nOpen) + " مورد باز" : "") +
    "</span></summary>" +
    (r ? histStageBody(r, H, tok) : '<div class="hint">هنوز ثبت نشده</div>') +
    "</details>"
  );
}

function histSummaryLine(c) {
  var st = stagesFor(c.recs),
    done = 0,
    cur = "";
  st.forEach(function (k) {
    var r = c.recs.filter(function (x) {
      return x.sheet === k;
    })[0];
    if (stageDone(r)) done++;
    else if (!cur) cur = stationTitle(k);
  });
  return (
    faDigits(done) +
    " از " +
    faDigits(st.length) +
    " مرحله تمام شد" +
    (cur ? " · الان در «" + esc(cur) + "»" : "")
  );
}

// صفحه‌ی «سوابق خودرو» به ترتیب ایستگاه‌ها.
function histPageView(d) {
  var H = carHistoryItems(d),
    c = carRecords(d.key),
    tok = { n: 0 },
    cpf = cpfForCar(c, false);
  var h =
    '<div class="card"><div class="row"><button class="btn sm" data-act="histback">▶ بازگشت</button><b class="grow">سوابق خودرو</b></div>' +
    carInfo(d) +
    '<p class="hint" style="margin:8px 0 0">' +
    histSummaryLine(c) +
    "</p></div>";
  h += stagesFor(c.recs)
    .map(function (k) {
      return histStageCard(
        k,
        c.recs.filter(function (x) {
          return x.sheet === k;
        })[0],
        H,
        tok,
        k === d.sheet,
      );
    })
    .join("");
  return (
    h +
    (cpf.length
      ? '<div class="card"><h2>فرم‌های حفاظت از مشتری (' +
        faDigits(cpf.length) +
        ")</h2>" +
        cpf.map(cpfBrief).join("") +
        "</div>"
      : "")
  );
}

function carHistoryBlock(d) {
  var H = memoFor("hist", d.id, function () {
      return carHistoryItems(d);
    }),
    no = H.open.length,
    nc = H.closed.length;
  var nSh = H.open.filter(function (x) {
      return x.it.r === "shortage";
    }).length,
    nNg = no - nSh;
  var sum = no
    ? (nNg ? faDigits(nNg) + " ایراد" : "") +
      (nNg && nSh ? " و " : "") +
      (nSh ? faDigits(nSh) + " کسری" : "") +
      " باز"
    : "بدون مورد باز";
  return (
    '<button type="button" class="histbar' +
    (no ? " hot" : "") +
    '" data-act="histtoggle"><b>سوابق خودرو</b><span>' +
    sum +
    (nc ? " — " + faDigits(nc) + " بسته‌شده" : "") +
    "</span><i>◂</i></button>"
  );
}

function inspView() {
  var d = insp(S.sheet, S.key),
    strip = stepCard(d, canEdit(S.sheet, S.key));
  if (!strip)
    return '<div class="card"><p class="hint" style="margin:0">برای این ایستگاه بخشی برای نمایش تعریف نشده است.</p></div>';
  return chIcons(strip) + inspWarns(d);
}

function carRecords(q) {
  var g = identGroup(q),
    I = g ? g.I : {};
  return { I: I, recs: g ? g.recs : [], key: I.serial || I.chassis || q };
}

function carIdents(d) {
  var c = carRecords(d.key),
    I = c.I;
  return [d.key, c.key, I.serial, I.chassis, I.engine, I.room].filter(Boolean);
}

function histRows(hist) {
  return hist.map(function (e) {
    return [
      ARCH_EVENT[e.type] || e.type,
      e.by || "—",
      dateOnly(e.at) || "—",
      timeHM(e.at) || "—",
      (e.pdiBy ? "بازرس PDI: " + e.pdiBy + (e.note ? " — " : "") : "") +
        (e.note || "") +
        (e.code745 ? "کد ۷۴" : ""),
    ];
  });
}

function inspectView() {
  var mine = S.user ? mySheets() : [];
  if (S.histPage) {
    var hd = S.key && insp(S.sheet, S.key);
    if (hd) return histPageView(hd);
    S.histPage = false;
  }
  if (S.user && S.user.station === "owner" && !(S.key && insp(S.sheet, S.key)))
    return '<div class="card"><h2>ورود مدیر برنامه</h2><p class="hint">برای ثبت بازدید با کد پرسنلی یک چکمن وارد شوید. از تب «مدیریت» کاربران را تعریف کنید و بازدیدها را ببینید.</p></div>';
  if (!mine.length && !insp(S.sheet, S.key)) {
    return (
      '<div class="card"><h2>برگه این ایستگاه هنوز اضافه نشده</h2><p class="hint">برای ایستگاه «' +
      esc(STATION_NAME[S.user.station]) +
      "» هنوز برگه‌ای تعریف نشده است. از تب «همه بازدیدها» می‌توانید بازدیدهای ایستگاه‌های دیگر را ببینید.</p></div>"
    );
  }
  var h = "";
  var tj = toJalali(nowIso());
  h += returnedCard() + (tj ? repeatCard(tj.y, tj.m, tj.d) : "");
  if (mine.length && isChs(S.sheet) && S.sheet !== "chassis" && canEdit(S.sheet, S.key || "0"))
    h += '<div class="card wizcard">' + wizBar(null) + "</div>";
  if (mine.length) h += searchCard();
  if (S.key) {
    if (
      S.sheet === "gas" &&
      !insp("gas", S.key) &&
      stagesFor(carRecords(S.key).recs).indexOf("gas") < 0
    )
      h +=
        '<div class="card"><h2>این خودرو تک‌سوز است</h2><p class="hint" style="margin:0">برای خودروی تک‌سوز تست نشتی گاز لازم نیست و برگه‌ای برایش باز نمی‌شود. نوع سوخت در برگه شاسی ثبت شده است.</p></div>';
    else if (insp(S.sheet, S.key)) h += inspView();
    else if (canEdit(S.sheet, S.key))
      h +=
        allOpenCard({ key: S.key, sheet: S.sheet }) +
        (S.sheet === "gas" && cngShortParts({ key: S.key }).open.length
          ? gasCard({ key: S.key, sheet: S.sheet })
          : S.fuelConfirm && S.fuelConfirm.sheet === S.sheet && S.fuelConfirm.key === S.key
            ? fuelCard()
            : S.linkConfirm && S.linkConfirm.sheet === S.sheet && S.linkConfirm.key === S.key
              ? linkCard()
              : createCard());
    else if (ownsSheet(S.sheet) && blockedBy(S.sheet, S.key))
      h += allOpenCard({ key: S.key, sheet: S.sheet }) + blockCard(S.sheet, S.key);
  }
  return h;
}

function listView() {
  var ds = S.data.insp
    .filter(function (d) {
      return SHEETS[d.sheet];
    })
    .sort(function (a, b) {
      return stat(b).open - stat(a).open;
    });
  var h = '<div class="card"><h2>همه بازدیدها</h2>';
  if (!ds.length) return h + '<div class="empty-note">هنوز بازدیدی ثبت نشده است.</div></div>';
  h +=
    '<div class="tbl"><table><thead><tr><th>برگه / کد فرم</th><th>شماره</th><th>شاسی: اتاق / موتور</th><th>بازدید شده</th><th>مورد باز</th><th>بخش تأییدشده</th><th>تاریخ و ساعت</th></tr></thead><tbody>';
  ds.forEach(function (d) {
    var s = stat(d);
    h +=
      '<tr class="link" data-act="open" data-sheet="' +
      esc(d.sheet) +
      '" data-key="' +
      esc(d.key) +
      '"><td>' +
      esc(SHEETS[d.sheet].name) +
      (prodOf(d) === "ex" ? " <small>· اکستند</small>" : "") +
      (d.test ? ' <span class="tchip">TEST</span>' : "") +
      ' <small class="num">' +
      esc(d.formCode || FORM_CODE) +
      '</small></td><td><b class="num">' +
      esc(d.key) +
      '</b></td><td><span class="num">' +
      (d.sheet === "chassis" ? esc(d.room || "—") + " / " + esc(d.engine || "—") : "—") +
      "</span></td><td>" +
      faDigits(s.ans) +
      " از " +
      faDigits(s.total) +
      "</td><td>" +
      (s.open ? '<span class="chip open">' + faDigits(s.open) + "</span>" : "0") +
      "</td><td>" +
      faDigits(s.signed) +
      " از " +
      faDigits(s.secs) +
      "</td><td>" +
      esc(when(d.createdAt)) +
      "</td></tr>";
  });
  return h + "</tbody></table></div></div>";
}
