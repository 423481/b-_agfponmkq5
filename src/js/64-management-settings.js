/* ════════════════════════════════════════════════════════════
   فصل 64 — مدیریت: تنظیمات، امنیت و داده‌ها
   طول شماره‌ها، رمز مالک، پشتیبان، پاک‌کردن داده، ساعت شیفت و هدف روزانه.
   توابع اصلی: cfgCard، markCard، ownerCodeCard، securityCards، settingsCards، dataCards، wipeTargets، wipeBackup و …
   ════════════════════════════════════════════════════════════ */

function cfgCard() {
  var body = '<form data-form="cfglen" class="mgform">';
  [
    ["padra", "پادرا", "cl_"],
    ["ex", "اکستند", "cx_"],
  ].forEach(function (g) {
    body += '<div class="mgprod"><span class="mgpill">' + g[1] + '</span></div><div class="mglen">';
    ["serial", "chassis", "engine", "room"].forEach(function (k) {
      var r = withP(g[0], function () {
        return lenOf(k);
      });
      body +=
        '<div class="mglrow"><b>' +
        NUM_LABEL[k] +
        '</b><label>حداقل<input class="in num ltr" id="' +
        g[2] +
        k +
        '_a" inputmode="numeric" value="' +
        r[0] +
        '"></label><label>حداکثر<input class="in num ltr" id="' +
        g[2] +
        k +
        '_b" inputmode="numeric" value="' +
        r[1] +
        '"></label></div>';
    });
    body += "</div>";
  });
  return mgCard(
    "hash",
    "طول مجاز شماره‌ها",
    "شماره فقط رقم و در همین بازه پذیرفته می‌شود. برای اکستند بازهٔ جدا قابل تنظیم است؛ اگر مثل پادرا است همان مقدار را بنویسید.",
    body + '<button class="btn primary" type="submit">ذخیره بازه‌ها</button></form>',
  );
}

function markCard() {
  if (!S.supa) return "";
  return mgCard(
    "bolt",
    "نشانهٔ کسری باز (بارگذاری سبک)",
    "یک بار بعد از به‌روزرسانی برنامه بزنید تا رکوردهای قدیمی که کسری باز دارند همیشه در «کسری‌های باز» بمانند. از این به بعد خودکار انجام می‌شود.",
    '<button class="btn" data-act="markall">نشانه‌گذاری رکوردها</button>',
  );
}

function ownerCodeCard() {
  if (!S.supa || !S.ownerRec) return "";
  var c = S.ownerRec.code;
  return mgCard(
    "key",
    "کد پرسنلی مدیر",
    "با این کد و رمز مدیر از همان فرم ورود عادی وارد می‌شوید." +
      (c ? ' کد فعلی: <b class="num">' + esc(c) + "</b>" : " هنوز تعیین نشده است."),
    '<form data-form="ownercode" class="mgform"><label class="f">کد پرسنلی (حرف لاتین و عدد)<input class="in num ltr" id="oc" inputmode="numeric" autocomplete="off"></label><button class="btn primary" type="submit">ذخیره</button>' +
      (S.formErr ? '<p class="err">' + esc(S.formErr) + "</p>" : "") +
      "</form>",
  );
}

function securityCards() {
  return (
    ownerCodeCard() + ownerPwCard() ||
    '<div class="card"><h2>امنیت</h2><p class="hint">کد پرسنلی و رمز مدیر فقط در نسخهٔ متصل به سرور (Supabase) تنظیم می‌شود.</p></div>'
  );
}

function settingsCards() {
  var p = SET_PAGES.filter(function (x) {
    return x[0] === S.setPg;
  })[0];
  if (p)
    return (
      '<div class="mgpt"><button type="button" class="mgback" data-act="setpg" data-id="">→ تنظیمات</button><h2>' +
      p[2] +
      "</h2></div>" +
      p[4]()
    );
  return (
    '<div class="mgrows">' +
    SET_PAGES.map(function (x) {
      return mgRow(x[1], x[2], x[3], 'data-act="setpg" data-id="' + x[0] + '"');
    }).join("") +
    "</div>"
  );
}

function dataCards() {
  var ds = S.data.insp
    .filter(function (d) {
      return SHEETS[d.sheet];
    })
    .sort(function (a, b) {
      return (b.createdAt || "") < (a.createdAt || "") ? -1 : 1;
    });
  var wipe = S.confirmWipe
    ? '<p class="err">' +
      faDigits(wipeTargets().insp.length) +
      ' بازدید پاک می‌شود. برگه‌ها و پرونده‌ی خودروهای بایگانی‌شده پاک نمی‌شوند. قبل از پاک‌شدن یک نسخه‌ی پشتیبان دانلود می‌شود. کاربران می‌مانند.</p><label class="f">برای ادامه عبارت «پاک شود» را بنویسید<input class="in" id="wipe_word" autocomplete="off"></label><div class="row"><button class="btn sm danger" data-act="wipeyes">تأیید پاک‌کردن همه</button><button class="btn sm" data-act="wipeno">انصراف</button></div>'
    : '<button class="btn danger" data-act="wipeask">پاک‌کردن همه پرونده‌ها (شروع تازه)</button>';
  var h = mgCard(
    "alert",
    "منطقهٔ خطر",
    "حذف برگشت‌پذیر نیست و برای پاک‌کردن ثبت‌های آزمایشی است.",
    wipe,
    "mgdanger",
  );
  if (!ds.length)
    return (
      h +
      mgCard(
        "database",
        "بازدیدهای ثبت‌شده",
        "",
        '<div class="empty-note">بازدیدی ثبت نشده است.</div>',
      )
    );
  var t =
    '<div class="tbl"><table><thead><tr><th>برگه</th><th>شماره</th><th>ثبت‌کننده</th><th>تاریخ و ساعت</th><th></th></tr></thead><tbody>';
  ds.forEach(function (d) {
    t +=
      "<tr><td>" +
      esc(SHEETS[d.sheet].name) +
      '</td><td><b class="num">' +
      esc(d.key) +
      "</b></td><td>" +
      esc(d.createdBy || "") +
      "</td><td>" +
      esc(when(d.createdAt)) +
      "</td><td>" +
      (isArchivedCar(d)
        ? '<span class="hint">بایگانی‌شده؛ حذف نمی‌شود</span>'
        : S.confirmDel === d.id
          ? '<button class="btn sm" data-act="delyes" data-id="' +
            esc(d.id) +
            '">تأیید حذف</button> <button class="btn sm" data-act="delno">انصراف</button>'
          : '<button class="btn sm" data-act="delask" data-id="' + esc(d.id) + '">حذف</button>') +
      "</td></tr>";
  });
  return (
    h +
    mgCard(
      "database",
      "بازدیدهای ثبت‌شده (" + faDigits(ds.length) + ")",
      "",
      t + "</tbody></table></div>",
    )
  );
}

var WIPE_WORD = "پاک شود";

function wipeTargets() {
  return {
    insp: S.data.insp.filter(function (d) {
      return !isArchivedCar(d);
    }),
    arch: S.data.arch.filter(function (a) {
      return a.test;
    }),
  };
}

function wipeBackup(insp, arch) {
  var blob = new Blob(
    [
      JSON.stringify({
        at: nowIso(),
        by: S.user.name,
        inspections: insp,
        archives: arch,
      }),
    ],
    { type: "application/json" },
  );
  return saveFile("backup-before-wipe-" + nowIso().slice(0, 10) + ".json", blob);
}

// پاک‌کردن همه‌ی داده (نیاز به نوشتن «پاک شود» و پشتیبان؛ خودروهای بایگانی‌شده پاک نمی‌شوند).
function wipeAll() {
  if (fieldValue("wipe_word") !== WIPE_WORD) {
    toast("برای پاک‌کردن، عبارت «" + WIPE_WORD + "» را دقیق بنویسید.");
    return;
  }
  S.confirmWipe = false;
  toast("در حال گرفتن پشتیبان از همه‌ی رکوردها…");
  var load =
    store && store.fetchAll
      ? store.fetchAll()
      : store && store.fetchSince
        ? store.fetchSince(3650)
        : Promise.resolve();
  load.then(function () {
    var t = wipeTargets(),
      kept = S.data.insp.length - t.insp.length;
    return wipeBackup(t.insp, t.arch).then(function () {
      var dels = t.insp
        .map(function (x) {
          return store.del("inspections", x.id);
        })
        .concat(
          t.arch.map(function (x) {
            return store.del("archives", x.id);
          }),
        );
      return save(
        function () {
          return Promise.all(dels);
        },
        "پاک شد" +
          (kept ? "؛ " + faDigits(kept) + " برگه‌ی خودروهای بایگانی‌شده نگه داشته شد" : ""),
      );
    });
  });
}

function clickOwnerData(ev, el, a, id, d) {
  if (a === "wipeask" && S.isOwner) {
    S.confirmWipe = true;
    render();
    return true;
  }
  if (a === "wipeno") {
    S.confirmWipe = false;
    render();
    return true;
  }
  if (a === "wipeyes" && S.isOwner) {
    wipeAll();
    return true;
  }
  if (a === "rolerestoreask" && S.isOwner) {
    S.roleRestore = true;
    render();
    return true;
  }
  if (a === "rolerestoreno") {
    S.roleRestore = false;
    render();
    return true;
  }
  if (a === "rolerestoreyes" && S.isOwner) {
    rolesRestore();
    return true;
  }
  if (a === "roledelask" && S.isOwner) {
    S.roleDel = el.getAttribute("data-id");
    render();
    return true;
  }
  if (a === "roledelno") {
    S.roleDel = "";
    render();
    return true;
  }
  if (a === "roledelyes" && S.isOwner) {
    roleDelete(el.getAttribute("data-id"));
    return true;
  }
  if (a === "mgrdel" && S.isOwner) {
    var mk = el.getAttribute("data-k");
    mgrRemove(mk, mk === "mgrTitles" ? MGR_TITLES_DEF : MGR_UNITS_DEF, el.getAttribute("data-v"));
    return true;
  }
  return false;
}

function clickOffline(ev, el, a, id, d) {
  if (a === "offtoggle") {
    S.offOpen = !S.offOpen;
    render();
    return true;
  }
  if (a === "offretry") {
    OFFLINE.busy = false;
    OFFLINE.lastErr = "";
    offFlush();
    toast("در حال ارسال…");
    setTimeout(render, 3000);
    return true;
  }
  if (a === "offbackup") {
    offBackup().then(render);
    return true;
  }
  if (a === "offskipask" && S.offBacked) {
    S.offSkip = true;
    render();
    return true;
  }
  if (a === "offskipno") {
    S.offSkip = false;
    render();
    return true;
  }
  if (a === "offskipyes" && S.offBacked) {
    offSkipFirst();
    return true;
  }
  return false;
}

function submitMgrTitle() {
  mgrAdd("mgrTitles", MGR_TITLES_DEF, "mgt_in");
}

function submitMgrUnit() {
  mgrAdd("mgrUnits", MGR_UNITS_DEF, "mgu_in");
}

function submitNumberLengths() {
  var lenObj = {},
    lenX = {},
    bad3 = "";
  ["serial", "chassis", "engine", "room"].forEach(function (k) {
    var a = parseInt(digits(fieldValue("cl_" + k + "_a")), 10),
      b2 = parseInt(digits(fieldValue("cl_" + k + "_b")), 10);
    if (!(a >= 1 && b2 >= a && b2 <= 20)) bad3 = NUM_LABEL[k];
    lenObj[k] = [a, b2];
    var a4 = parseInt(digits(fieldValue("cx_" + k + "_a")), 10),
      b4 = parseInt(digits(fieldValue("cx_" + k + "_b")), 10);
    if (!(a4 >= 1 && b4 >= a4 && b4 <= 20)) bad3 = NUM_LABEL[k] + " (اکستند)";
    lenX[k] = [a4, b4];
  });
  if (bad3) {
    toast("بازه‌ی " + bad3 + " درست نیست (حداقل ۱ و حداکثر ۲۰، و حداکثر کمتر از حداقل نباشد).");
    return;
  }
  save(function () {
    return store.set("users", "__cfg", {
      len: lenObj,
      lenX: lenX,
      updatedAt: nowIso(),
      by: S.user.name,
    });
  }, "بازه‌ها ذخیره شد");
}
