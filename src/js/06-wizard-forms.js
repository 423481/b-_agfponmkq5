/* ════════════════════════════════════════════════════════════
   فصل 06 — ویزارد: فرم‌های شروع (جست‌وجو و ثبت خودرو)
   صفحه‌ی جست‌وجوی شماره، فرم ثبت خودروی جدید (مرحله‌ای)، ثبت مشخصات و بارکد.
   توابع اصلی: searchCard، autoOpen، attrSteps، stepForms، formSteps، createSteps، stepInputs، stepDone و …
   ════════════════════════════════════════════════════════════ */

// شماره‌ی نمونه‌ی داخل کادر جست‌وجو (بسته به برگه)
function keyPlaceholder() {
  if (S.sheet === "engine") return "1081513";
  if (S.sheet === "trim") return "1009537";
  return SHEETS[S.sheet].keyKind === "serial" ? "5032668" : "0865751";
}

function searchHeader(sh, mine) {
  var h =
    '<div class="card"><div class="row" style="margin-bottom:10px"><b>برگه: ' +
    esc(sh.name) +
    "</b>";
  if (mine.length > 1 && S.user.station !== "chassis")
    mine.forEach(function (k) {
      h +=
        '<button class="btn sm" data-act="sheet" data-id="' +
        k +
        '" aria-pressed="' +
        (k === S.sheet) +
        '">' +
        esc(SHEETS[k].name) +
        "</button>";
    });
  return h + "</div>";
}

function searchForm(sh) {
  return (
    '<form data-form="search" class="row"><label class="f grow">' +
    esc(sh.keyLabel) +
    ' (یا سریال / موتور / اتاق)<input class="in num ltr" id="key" inputmode="numeric" autocomplete="off" autofocus placeholder="مثلاً ' +
    keyPlaceholder() +
    '" value="' +
    esc(S.key) +
    '"></label><button type="button" class="btn" data-act="livescan" data-scan="" style="align-self:flex-end">اسکن بارکد</button><button class="btn primary" type="submit" style="align-self:flex-end">باز کردن برگه</button></form>'
  );
}

// بازدیدهای من در این برگه (همه + امروز)؛ با کلید روز و کاربر حافظه می‌شود
function myInspections(tj0, dayKey) {
  return cachedByRows("searchMine", S.sheet + "|" + dayKey + "|" + S.user.id, function () {
    var all = S.data.insp
      .filter(function (d) {
        return d.sheet === S.sheet && isMine(d);
      })
      .sort(function (a, b) {
        return (b.createdAt || "") < (a.createdAt || "") ? -1 : 1;
      });
    return {
      all: all,
      today: all.filter(function (d) {
        var j = toJalali(d.createdAt);
        return tj0 && j && j.y === tj0.y && j.m === tj0.m && j.d === tj0.d;
      }),
    };
  });
}

function openKeyButton(d, tail, withK) {
  return (
    '<button class="btn sm" ' +
    (withK ? 'data-k="' + esc(d.key) + '" ' : "") +
    'data-act="open" data-sheet="' +
    esc(d.sheet) +
    '" data-key="' +
    esc(d.key) +
    '"><span class="num">' +
    esc(d.key) +
    "</span>" +
    tail +
    "</button>"
  );
}

function inProgressRow(prog) {
  if (!prog.length) return "";
  return (
    '<div class="row" style="margin-top:12px"><span class="hint">در جریان:</span>' +
    prog
      .map(function (d) {
        return openKeyButton(d, "", false);
      })
      .join("") +
    "</div>"
  );
}

function todayToggleRow(today) {
  var nProg = today.filter(function (d) {
    return !d.final;
  }).length;
  return (
    '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="todaylist" aria-pressed="' +
    !!S.todayOpen +
    '">امروز ' +
    faDigits(today.length) +
    " خودرو بازدید کردید" +
    (nProg ? " · " + faDigits(nProg) + " در جریان" : "") +
    (S.todayOpen ? " ▴" : " ▾") +
    "</button></div>"
  );
}

function todayListBox(today) {
  var h =
    '<div style="margin-top:10px"><input class="in num ltr" id="tq" inputmode="numeric" autocomplete="off" placeholder="جست‌وجو در بازدیدهای امروز من" style="max-width:320px"><div class="row" id="todaylist" style="margin-top:8px">';
  today.slice(0, 60).forEach(function (d) {
    h += openKeyButton(d, d.final ? " ✓" : "", true);
  });
  if (!today.length) h += '<span class="hint">امروز هنوز بازدیدی ثبت نکرده‌اید.</span>';
  return h + "</div></div>";
}

function searchCard() {
  var sh = SHEETS[S.sheet],
    h = searchHeader(sh, mySheets()) + searchForm(sh);
  if (S.searchErr) h += '<p class="err">' + esc(S.searchErr) + "</p>";
  var tj0 = toJalali(nowIso()),
    mine = myInspections(tj0, tj0 ? tj0.y + "/" + tj0.m + "/" + tj0.d : ""),
    prog = mine.all
      .filter(function (d) {
        return !d.final;
      })
      .slice(0, 8);
  h += inProgressRow(prog);
  if (mine.all.length) {
    h += todayToggleRow(mine.today);
    if (S.todayOpen) h += todayListBox(mine.today);
  }
  return h + "</div>" + (S.sheet === "final2" && !S.key ? awaitingFinal2Card() : "");
}

/* #33: برگه‌ی بعدی بدون صفحه‌ی «تأیید مشخصات» خودکار باز می‌شود، وقتی چیزی برای پرسیدن نیست */
function autoOpen() {
  if (!S.user || S.tab !== "inspect" || !S.key || S.fuelConfirm || S.linkConfirm) return false;
  var sheet = S.sheet,
    sh = SHEETS[sheet];
  if (!sh || sheet === "chassis" || insp(sheet, S.key) || !canEdit(sheet, S.key)) return false;
  if (sheet === "gas" && stagesFor(carRecords(S.key).recs).indexOf("gas") < 0) return false;
  var kk = sh.keyKind,
    I = identity(S.key),
    m = mergedFor(sheet, S.key, {}),
    prod = carProd(S.key),
    hid = HIDE[sheet] || [];
  if (PSHEETS.indexOf(sheet) >= 0 && !prod) return false;
  if (kk === "serial" && !(I.chassis && I.room)) return false;
  var rec = {
    sheet: sheet,
    key: S.key,
    createdBy: S.user.name,
    createdAt: nowIso(),
    formCode: FORM_CODE,
    formPage: sh.page,
    items: {},
    signs: {},
  };
  if (kk !== "serial" && m.serial) rec.serial = m.serial;
  if (kk !== "chassis" && m.chassisNo && hid.indexOf("chassisNo") < 0) rec.chassisNo = m.chassisNo;
  if (kk !== "room" && m.room && hid.indexOf("room") < 0) rec.room = m.room;
  if (kk !== "engine" && m.engine && hid.indexOf("engine") < 0) rec.engine = m.engine;
  if (m.color && hid.indexOf("color") < 0) rec.color = m.color;
  if (prod) rec.product = prod;
  if (
    isTestMode() ||
    carRecords(S.key).recs.some(function (r) {
      return r.test;
    })
  )
    rec.test = true;
  if (!isTestMode()) {
    if (
      withP(prod || "", function () {
        return numErr(kk, S.key);
      })
    )
      return false;
    if (conflictFor(sheet, S.key, rec)) return false;
  }
  var k0 = S.key;
  saveOnce(
    "open_" + docId(sheet, k0),
    function () {
      return store.create("inspections", docId(sheet, k0), rec);
    },
    "برگه باز شد",
    true,
  );
  return true;
}

/* v167.17: فرم «بازدید جدید» مرحله‌ای (بدون تغییر منطق ثبت؛ فقط نمایش گام‌به‌گام همان فیلدها) */
/* فرم‌های مرحله‌ای: «بازدید جدید» (تشخیص خودکار) و هر فرمی که فرزندانش data-step دارند */
// هر فرمی که data-stp دارد را مرحله‌ای می‌کند (توقف خط، کسری برنامه‌ریزی، فرم حفاظت).
function attrSteps(form) {
  var steps = [],
    by = {};
  Array.prototype.forEach.call(form.children, function (e) {
    var k = e.getAttribute("data-step");
    if (!k && e.tagName === "BUTTON" && e.type === "submit" && steps.length) {
      steps[steps.length - 1].submit = e;
      return;
    }
    if (!k || /\bcsteps\b|\bcnav\b/.test(e.className)) return;
    var st = by[k] || (by[k] = { els: [], req: false, label: k });
    if (steps.indexOf(st) < 0) steps.push(st);
    st.els.push(e);
    if (e.hasAttribute("data-req")) st.req = true;
  });
  return steps;
}

function stepForms() {
  return document.querySelector("form[data-form=create],form[data-stp]");
}

function formSteps(form) {
  return form.getAttribute("data-form") === "create" ? createSteps(form) : attrSteps(form);
}

// فرم ثبت را به مرحله‌های کوچک (شماره‌ها، سوخت، محصول) تقسیم می‌کند.
function createSteps(form) {
  var kids = Array.prototype.slice.call(form.children).filter(function (e) {
    return !/\bcsteps\b|\bcnav\b/.test(e.className);
  });
  var submit = kids.filter(function (e) {
    return e.tagName === "BUTTON" && e.type === "submit";
  })[0];
  var steps = [],
    opt = { els: [], req: false, label: "اطلاعات تکمیلی (اختیاری)" },
    pk = null;
  kids.forEach(function (e) {
    if (e === submit) return;
    if (e.querySelector("#c_lk_eng")) {
      steps.push({ els: [e], req: true, label: "تأیید با برچسب شیشه" });
      pk = null;
      return;
    }
    if (e.querySelector(".fuelpick")) {
      if (!pk) {
        pk = { els: [], req: true, label: "محصول و نوع سوخت" };
        steps.push(pk);
      }
      pk.els.push(e);
      return;
    }
    if (e.tagName === "P") {
      (steps.length ? steps[steps.length - 1] : opt).els.push(e);
      return;
    }
    var t = e.textContent || "";
    if (/الزامی|لازم|تأیید با برچسب/.test(t)) {
      steps.push({
        els: [e],
        req: true,
        label: t.split("(")[0].trim().slice(0, 32),
      });
      pk = null;
      return;
    }
    opt.els.push(e);
  });
  if (opt.els.length) steps.push(opt);
  if (steps.length) steps[steps.length - 1].submit = submit;
  return steps;
}

function stepInputs(st) {
  var o = [];
  st.els.forEach(function (e) {
    Array.prototype.forEach.call(e.querySelectorAll("input"), function (i) {
      o.push(i);
    });
  });
  return o;
}

function stepDone(st) {
  return (
    !st.req ||
    stepInputs(st).every(function (i) {
      return String(i.value || "").trim() !== "";
    })
  );
}

// بعد از هر رندر، مرحله‌ی جاری فرم مرحله‌ای را نشان می‌دهد و بقیه را پنهان می‌کند.
function stepCreate() {
  var form = stepForms();
  if (!form) return;
  var steps = formSteps(form);
  if (steps.length < 2) return;
  var isC = form.getAttribute("data-form") === "create",
    nm = form.getAttribute("data-form"),
    key = isC ? S.sheet + "|" + S.key : nm,
    n = steps.length,
    i;
  if (S.stpSent === nm) {
    S.stpSent = "";
    if (!isC) S.cstep = 0;
  }
  if (S.cstepFor !== key) {
    S.cstepFor = key;
    S.cstep = isC ? n - 1 : 0;
    if (isC)
      for (i = 0; i < n; i++)
        if (!stepDone(steps[i])) {
          S.cstep = i;
          break;
        }
  }
  var cur = Math.min(S.cstep || 0, n - 1),
    last = steps[n - 1];
  steps.forEach(function (st, k) {
    st.els.forEach(function (e) {
      e.hidden = k !== cur;
    });
  });
  var sc = document.querySelector("form[data-form=search]");
  if (isC && sc && sc.closest(".card")) sc.closest(".card").hidden = true;
  var lkc = document.querySelector(".lkpick");
  if (lkc) lkc.hidden = !/شماره (شاسی|اتاق)/.test(steps[cur].label);
  if (last.submit) last.submit.hidden = cur !== n - 1;
  Array.prototype.forEach.call(form.querySelectorAll(".csteps,.cnav"), function (e) {
    e.remove();
  });
  var bar = document.createElement("div");
  bar.className = "csteps";
  bar.innerHTML =
    '<div class="dots">' +
    steps
      .map(function (_, k) {
        return '<i class="' + (k < cur ? "done" : k === cur ? "cur" : "") + '"></i>';
      })
      .join("") +
    "</div><b>مرحله " +
    faDigits(cur + 1) +
    " از " +
    faDigits(n) +
    " · " +
    esc(steps[cur].label) +
    "</b>";
  form.insertBefore(bar, form.firstChild);
  var nav = document.createElement("div");
  nav.className = "cnav";
  nav.innerHTML =
    (cur ? '<button type="button" class="btn" data-act="cprev">قبلی</button>' : "") +
    (cur < n - 1 ? '<button type="button" class="btn primary" data-act="cnext">بعدی</button>' : "");
  form.insertBefore(nav, last.submit && cur === n - 1 ? last.submit : null);
}

function createGo(d) {
  var form = stepForms();
  if (!form) return false;
  var steps = formSteps(form),
    cur = S.cstep || 0;
  if (d > 0 && !stepDone(steps[cur])) {
    toast("این مرحله را کامل کنید");
    var e = stepInputs(steps[cur]).filter(function (i) {
      return !String(i.value || "").trim();
    })[0];
    if (e && e.type !== "hidden") e.focus();
    return true;
  }
  S.cstep = Math.max(0, Math.min(steps.length - 1, cur + d));
  render();
  return true;
}

// فرم ثبت خودروی جدید در ایستگاه.
function createCard() {
  var sh = SHEETS[S.sheet];
  if (waitsForEwt1())
    return (
      '<div class="card"><h2>این شاسی هنوز باز نشده است</h2><p class="hint" style="font-size:17px">شاسی <span class="num">' +
      esc(S.key) +
      "</span> هنوز توسط چکمن EWT1 باز نشده است. بعد از باز شدن، دوباره جست‌وجو کنید.</p></div>"
    );
  var pick = sh.keyKind === "serial" && !identity(S.key).chassis ? linkPickers() : "";
  return (
    pick +
    '<div class="card"><div class="row"><h2 class="grow" style="margin:0">بازدید جدید · ' +
    esc(sh.keyLabel) +
    ' <span class="num">' +
    esc(S.key) +
    '</span></h2><button type="button" class="btn sm" data-act="cclear">تغییر شماره</button></div><details class="info"><summary>ⓘ راهنما</summary><p class="hint">برگه‌ای با این شماره هنوز باز نشده است. مشخصات خودرو در صورت ثبت‌شدن در برگه‌های دیگر خودکار پر شده است؛ در غیر این صورت اگر می‌دانید بنویسید.</p></details>' +
    '<form data-form="create" class="row" style="margin-top:12px">' +
    idFields(S.sheet, "c_", mergedFor(S.sheet, S.key)) +
    (pick && labelCheckNeeded(S.sheet)
      ? '<div class="f grow" style="flex:1 1 100%;padding:10px 12px;border:1.5px dashed var(--line);border-radius:12px"><b>تأیید با برچسب شیشه (در همین صفحه)</b><span class="hint" style="font-weight:600">سه رقم آخر موتور و نوع سوخت را از روی خود برچسب وارد کنید؛ اگر با ثبت شاسی نخواند، اتصال ثبت نمی‌شود.</span><label class="f">سه رقم آخر شماره موتور روی برچسب<input class="in num ltr" id="c_lk_eng" inputmode="numeric" maxlength="3" autocomplete="off" style="max-width:160px"></label>' +
        fuelPicker("c_lk_fuel", "", "نوع سوخت از روی برچسب (تک‌سوز «بنزینی» / دوگانه‌سوز)") +
        "</div>"
      : "") +
    '<button class="btn primary" type="submit" style="align-self:flex-end">شروع بازدید</button></form>' +
    (S.formErr ? '<p class="err">' + esc(S.formErr) + "</p>" : "") +
    "</div>"
  );
}

function rowExtras(d, id, it, p, can) {
  var h = '<div class="row rowx">';
  if (p.bc) {
    h +=
      '<form data-form="rowbc" data-id="' +
      esc(id) +
      '" class="row" style="gap:6px;flex:1 1 260px">';
    if (it.bc)
      h +=
        '<span class="bcv">بارکد: <b class="num">' +
        esc(it.bc) +
        "</b> ✓</span>" +
        (can
          ? '<button type="button" class="btn sm" data-act="rowbcdel" data-id="' +
            esc(id) +
            '">پاک کردن</button>'
          : "");
    else if (can)
      h +=
        '<input class="in num ltr" id="rb-' +
        esc(id) +
        '" autocomplete="off" placeholder="بارکد قطعه" style="max-width:220px"><button type="button" class="btn sm" data-act="livescan" data-scan="rb-' +
        esc(id) +
        '">📷 اسکن</button><button class="btn sm primary" type="submit">ثبت بارکد</button>';
    else h += '<span class="hint">بارکد ثبت نشده</span>';
    h += "</form>";
  }
  if (p.phr) {
    h += '<div class="row" style="gap:6px">';
    if (it.rowPhoto)
      h +=
        '<img src="' +
        it.rowPhoto +
        '" alt="عکس" style="height:56px;border-radius:6px">' +
        (can
          ? '<button type="button" class="btn sm" data-act="rowphdel" data-id="' +
            esc(id) +
            '">حذف عکس</button>'
          : "");
    else if (can)
      h +=
        '<label class="btn sm" style="cursor:pointer">📷 عکس<input type="file" accept="image/*" capture="environment" data-rowph="' +
        esc(id) +
        '" style="display:none"></label>';
    else h += '<span class="hint">عکسی ثبت نشده</span>';
    h += "</div>";
  }
  return h + "</div>";
}

function bcUsed(v, d, id) {
  if (
    Object.keys(d.items || {}).some(function (i) {
      return i !== id && d.items[i] && d.items[i].bc === v;
    })
  )
    return true;
  return S.data.insp.some(function (x) {
    return (
      x.id !== d.id &&
      Object.keys(x.items || {}).some(function (i) {
        return x.items[i] && x.items[i].bc === v;
      })
    );
  });
}

function saveRowBc(id, v) {
  v = String(v || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  var d = S.key ? insp(S.sheet, S.key) : null;
  if (!d || !v) {
    toast("بارکد را اسکن یا وارد کنید.");
    return;
  }
  if (bcUsed(v, d, id)) {
    toast("این بارکد قبلاً ثبت شده است (روی همین خودرو یا خودروی دیگر). دوباره بررسی کنید.");
    return;
  }
  var m = {};
  m[id] = { bc: v, bcBy: S.user.name, bcById: S.user.id, bcAt: nowIso() };
  writeItems(m, "بارکد ثبت شد");
}

function clickCarOpen(ev, el, a, id, d) {
  if (a === "linkyes" && S.linkConfirm) return carOpen_linkyes(ev, el, a, id, d);
  if (a === "linkno") {
    S.linkConfirm = null;
    render();
    return true;
  }
  if (a === "undofuel") return carOpen_undofuel(ev, el, a, id, d);
  if (a === "fuelyes" && S.fuelConfirm) return carOpen_fuelyes(ev, el, a, id, d);
  if (a === "fuelno") {
    S.fuelConfirm = null;
    render();
    return true;
  }
  return false;
}

// اقدام «linkyes» از clickCarOpen
function carOpen_linkyes(ev, el, a, id, d) {
  var L2 = S.linkConfirm,
    le = linkCheck(L2, fieldValue("lk_eng"), fieldValue("lk_fuel"));
  if (le) {
    S.linkErr = le;
    render();
    return true;
  }
  S.linkConfirm = null;
  S.linkErr = "";
  saveOnce(
    "open_" + docId(L2.sheet, L2.key),
    function () {
      return store.create("inspections", docId(L2.sheet, L2.key), L2.rec);
    },
    "برگه باز شد",
  );
  return true;
}

// اقدام «undofuel» از clickCarOpen
function carOpen_undofuel(ev, el, a, id, d) {
  var ud = S.undo;
  S.undo = null;
  if (!ud || !d || d.id !== ud.id || Date.now() > ud.until + 500) {
    render();
    return true;
  }
  if (Object.keys(d.items || {}).length || Object.keys(d.signs || {}).length) {
    toast("برگه شروع شده است و برگرداندن ممکن نیست.");
    return true;
  }
  fuelRemember("");
  var ed = ud.eng ? insp("engine", String(ud.eng).replace(/^engine_/, "")) : null,
    delEng = ed && !Object.keys(ed.items || {}).length && !Object.keys(ed.signs || {}).length;
  save(function () {
    return Promise.resolve(store.del("inspections", ud.id)).then(function () {
      return delEng ? store.del("inspections", ed.id) : 0;
    });
  }, "برگه برگردانده شد؛ نوع سوخت را دوباره انتخاب کنید.");

  return true;
}

// اقدام «fuelyes» از clickCarOpen
function carOpen_fuelyes(ev, el, a, id, d) {
  var FC = S.fuelConfirm;
  S.fuelConfirm = null;
  saveOnce(
    "open_" + docId(FC.sheet, FC.key),
    function () {
      return store.create("inspections", docId(FC.sheet, FC.key), FC.rec);
    },
    "برگه باز شد",
  );
  return true;
}

function clickFormPickers(ev, el, a, id, d) {
  if (a === "bulkrow") {
    var bx = document.getElementById("bulkrows");
    if (bx) bx.insertAdjacentHTML("beforeend", bulkRowHtml(1));
    return true;
  }
  if (a === "livescan") {
    openScanner(el.getAttribute("data-scan") || "");
    return true;
  }
  if (a === "fuelpick") return formPickers_fuelpick(ev, el, a, id, d);
  if (a === "pickfill") return formPickers_pickfill(ev, el, a, id, d);
  if (a === "sugg") return formPickers_sugg(ev, el, a, id, d);
  return false;
}

// اقدام «fuelpick» از clickFormPickers
function formPickers_fuelpick(ev, el, a, id, d) {
  var fi = document.getElementById(el.getAttribute("data-f"));
  if (fi) fi.value = el.getAttribute("data-v");
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-act=fuelpick][data-f="' + el.getAttribute("data-f") + '"]'),
    function (b) {
      b.setAttribute(
        "aria-pressed",
        b.getAttribute("data-v") === el.getAttribute("data-v") ? "true" : "false",
      );
    },
  );
  var fcs = document.getElementById("fuelcons");
  if (fcs && el.getAttribute("data-f") === "c_fuel")
    fcs.textContent = fuelCons(el.getAttribute("data-v"));
  if (el.closest("form[data-form=create]")) {
    var cf = stepForms(),
      cs = createSteps(cf),
      cc = S.cstep || 0;
    if (
      cs[cc] &&
      cs[cc].pick !== false &&
      cs[cc].label === "محصول و نوع سوخت" &&
      stepDone(cs[cc]) &&
      cc < cs.length - 1
    )
      createGo(1);
  }
  return true;
}

// اقدام «pickfill» از clickFormPickers
function formPickers_pickfill(ev, el, a, id, d) {
  var pf2 = document.getElementById(el.getAttribute("data-f"));
  if (pf2) pf2.value = el.getAttribute("data-v");
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-act=pickfill][data-f="' + el.getAttribute("data-f") + '"]'),
    function (b) {
      b.setAttribute("aria-pressed", b === el ? "true" : "false");
    },
  );

  return true;
}

// اقدام «sugg» از clickFormPickers
function formPickers_sugg(ev, el, a, id, d) {
  var fid = el.getAttribute("data-f"),
    fe = document.getElementById(fid),
    pv = el.getAttribute("data-v");
  if (fe) {
    var m = fe.value.match(/^([\s\S]*?)([^,،\n]*)$/),
      pre = m ? m[1] : "";
    fe.value = pre + (pre && !/\s$/.test(pre) ? " " : "") + pv;
    var sgb = document.getElementById("sg-" + fid);
    if (sgb) sgb.innerHTML = "";
    fe.focus();
  }
  return true;
}

function submitRowBarcode(ev) {
  var rbid = ev.target.getAttribute("data-id");
  saveRowBc(rbid, fieldValue("rb-" + rbid));
  return;
}

function submitShortSearch() {
  var sq0 = digits(fieldValue("sq"));
  ensureCar([sq0]).then(function () {
    S.shQ = sq0;
    render();
  });
}

function submitCarSearch() {
  var cq0 = digits(fieldValue("cq"));
  ensureCar([cq0]).then(function () {
    S.carq = cq0;
    render();
  });
}

// جست‌وجوی شماره و باز کردن برگه‌ی خودرو.
function submitSearch() {
  var k = digits(fieldValue("key"));
  if (!k) {
    S.searchErr = "شماره را وارد کنید.";
    render();
    return;
  }
  if (!/^[A-Za-z0-9]+$/.test(k)) {
    S.searchErr = "شماره فقط حرف لاتین و عدد دارد.";
    render();
    return;
  }
  ensureCar([k]).then(function () {
    S.key = resolveKey(S.sheet, k);
    S.searchErr = "";
    S.formErr = "";
    S.editing = null;
    render();
    autoOpen();
  });
}

/* اولین خطای شماره‌های فرم باز کردن برگه؛ اگر خطایی نبود رشته‌ی خالی */
function createFormError(rec, tmc) {
  var vKey = tmc
    ? ""
    : withP(rec.product || "", function () {
        return numErr(SHEETS[S.sheet].keyKind, S.key);
      });
  if (vKey) return vKey;
  var vTyped = tmc
    ? ""
    : withP(rec.product || "", function () {
        return typedErr(S.sheet, rec);
      });
  if (vTyped) return vTyped;
  var vDup = conflictFor(S.sheet, S.key, rec);
  return vDup ? vDup + " اگر اشتباه ثبت شده، با کیفیت یا مدیر برنامه تماس بگیرید." : "";
}

/* برگه‌ی تازه را می‌سازد؛ بعد از بررسی شماره‌ها و اتصال سریال صدا زده می‌شود */
function openNewRecord(rec, tmc) {
  if (PSHEETS.indexOf(S.sheet) < 0 && !rec.product) {
    var pp0 = carProd(S.key);
    if (pp0) rec.product = pp0;
  }
  S.formErr = "";
  var isCh = S.sheet === "chassis" && !tmc,
    uid3 = docId(S.sheet, S.key);
  saveOnce(
    "open_" + uid3,
    function () {
      return store.create("inspections", uid3, rec);
    },
    isCh ? "برگه باز شد · " + fuelTxt(rec.fuel) : "برگه باز شد",
  ).then(function (ok) {
    if (!ok) return;
    if (isCh) fuelRemember(rec.fuel);
    if (!tmc && rec.product) productRemember(rec.product);
    var engId = S.sheet === "chassis" ? createEngineSheet(rec) : "";
    if (isCh) {
      S.undo = {
        id: uid3,
        until: Date.now() + 6000,
        fuel: rec.fuel,
        eng: engId,
      };
      setTimeout(render, 6200);
      render();
    }
  });
}

// ثبت خودروی جدید: بررسی شماره‌ها (تکراری نباشد)، ساخت برگه.
function submitCreate() {
  if (waitsForEwt1()) {
    S.formErr = "این شاسی هنوز توسط چکمن EWT1 باز نشده است.";
    render();
    return;
  }
  var rec = Object.assign(idVals(S.sheet, "c_"), {
    sheet: S.sheet,
    key: S.key,
    createdBy: S.user.name,
    createdAt: nowIso(),
    formCode: FORM_CODE,
    formPage: SHEETS[S.sheet].page,
    items: {},
    signs: {},
  });
  var tmc = isTestMode();
  if (tmc) rec.test = true;
  ensureCar([S.key, rec.engine, rec.chassisNo, rec.room, rec.serial]).then(function () {
    var err = createFormError(rec, tmc);
    if (err) {
      S.formErr = err;
      render();
      return;
    }
    if (SHEETS[S.sheet].keyKind === "serial" && !tmc && serialLinkStep(rec, identity(S.key)))
      return;
    openNewRecord(rec, tmc);
  });
}

function submitIdentity() {
  var dI = insp(S.sheet, S.key);
  if (dI && dI.final) {
    toast("شماره‌ها بعد از تأیید نهایی قفل است؛ درخواست اصلاح بدهید.");
    return;
  }
  var iv = idVals(S.sheet, "i_"),
    idDoc = docId(S.sheet, S.key);
  ensureCar([iv.serial, iv.chassisNo, iv.engine, iv.room]).then(function () {
    var ie = typedErr(S.sheet, iv) || conflictFor(S.sheet, S.key, iv);
    if (ie) {
      toast(ie);
      return;
    }
    saveOnce(
      "ids",
      function () {
        return store.update("inspections", idDoc, iv);
      },
      "مشخصات ذخیره شد",
    );
  });
}
