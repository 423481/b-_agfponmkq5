/* ════════════════════════════════════════════════════════════
   فصل 22 — ایستگاه تست نشتی گاز
   وضعیت تست گاز خودروهای دوگانه، قطعات CNG، کارت گاز.
   توابع اصلی: cngPartOf، cngShortParts، gasTestState، gasCard
   ════════════════════════════════════════════════════════════ */

/* تشخیص قطعه‌ی گاز مستقل از املا: ی/ک عربی، نیم‌فاصله، فاصله‌ی اضافه، حروف بزرگ و کوچک CNG و «رگولاتور» */
function cngPartOf(p) {
  var t = String(p || "")
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f\u200e\u0640]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (/رگ ?(و)?لاتور/.test(t)) return CNG_PARTS[2];
  if (/مخزن/.test(t) && /cng|گاز/.test(t)) return /پالت/.test(t) ? CNG_PARTS[0] : CNG_PARTS[1];
  return "";
}

function cngShortParts(d) {
  var open = {},
    any = false;
  carRecords(d.key).recs.forEach(function (r) {
    Object.keys(r.items || {}).forEach(function (id) {
      var it = r.items[id];
      if (!it || it.r !== "shortage") return;
      var p = cngPartOf(it.part || it.note);
      if (!p) return;
      any = true;
      if (!it.closedAt) open[p] = 1;
    });
  });
  return { open: Object.keys(open), any: any };
}

// وضعیت تست نشتی گاز یک خودرو را مشخص می‌کند (انجام‌نشده / قطعه تأمین شد / ثبت شد).
function gasTestState(d) {
  var recs = carRecords(d.key).recs,
    g = recs.filter(function (x) {
      return x.sheet === "gas";
    })[0],
    c = cngShortParts(d);
  return {
    blockers: c.open,
    supplied: c.any && !c.open.length,
    done: !!(g && g.final),
    waived: (
      recs.filter(function (x) {
        return x.sheet === GAS_FINAL_SHEET && x.gasWaive;
      })[0] || {}
    ).gasWaive,
  };
}

function gasCard(d) {
  if (fuelOf(d) === "single") return "";
  var g = gasTestState(d);
  if (g.done && !g.blockers.length) return "";
  var isFinal = d.sheet === GAS_FINAL_SHEET,
    h = "";
  if (g.blockers.length)
    h =
      '<b>⏳ تست نشتی گاز انجام نشده (کسری قطعه)</b><p class="hint" style="margin:6px 0 0">منتظر تأمین: ' +
      g.blockers.map(esc).join("، ") +
      "</p>";
  else if (!g.done && (g.supplied || isFinal))
    h =
      '<b>تست نشتی گاز ۱۰ و ۲۰۰ بار انجام نشده است</b><p class="hint" style="margin:6px 0 0">قطعه تأمین شده؛ برگه‌ی تست گاز باز است و باید تست ثبت شود.</p>';
  else return "";
  if (g.waived)
    h +=
      '<p class="hint" style="margin:8px 0 2px">عبور بدون تست ثبت شده — دلیل: ' +
      esc(g.waived.reason) +
      "</p>" +
      whoWhen(g.waived.by, g.waived.at);
  return '<div class="card"><div class="err" style="margin:0">' + h + "</div></div>";
}
