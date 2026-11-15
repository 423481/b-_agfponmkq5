/* ════════════════════════════════════════════════════════════
   فصل 03 — ورود، نشست و دسترسی
   ورود با کد پرسنلی، نشست ۱۲ ساعته، مالک، رمز عبور، بازیابی و دکمه‌ی برگشت گوشی.
   توابع اصلی: isOwnerU، authSet، authClear، authLoad، kickData، authBearer، serverLogin، srvAdmin و …
   ════════════════════════════════════════════════════════════ */

/* ---------- #34 حالت آزمایشی مالک ---------- */
function isOwnerU() {
  return !!(S.user && S.user.id === "owner");
}

var AUTH = { token: "", exp: 0 };

function authSet(t, exp) {
  AUTH.token = t;
  AUTH.exp = exp;
  try {
    localStorage.setItem("cm_tok", JSON.stringify({ t: t, exp: exp }));
  } catch (e) {}
}

function authClear() {
  AUTH.token = "";
  AUTH.exp = 0;
  try {
    localStorage.removeItem("cm_tok");
  } catch (e) {}
}

function authLoad() {
  try {
    if (!localStorage.getItem("cm_sess")) return;
    var q = JSON.parse(localStorage.getItem("cm_tok") || "null");
    if (q && q.t && q.exp * 1000 > Date.now()) {
      AUTH.token = q.t;
      AUTH.exp = q.exp;
    }
  } catch (e) {}
}

function kickData() {
  try {
    if (store && store.kick) store.kick();
  } catch (e) {}
}

function authBearer() {
  return AUTH.token && AUTH.exp * 1000 > Date.now() ? AUTH.token : API_URL ? "" : SUPA_KEY;
}

/* نتیجه: {ok:true,token,exp} | {ok:false,locked} | {skip:true} | {net:true} (قطع اتصال یا خطای تابع => بررسی محلی) */
function serverLogin(code, rawPw) {
  if (!AUTH_FN) return Promise.resolve({ skip: true });
  return fetch(SUPA_URL + "/functions/v1/" + AUTH_FN, {
    method: "POST",
    headers: {
      apikey: SUPA_KEY,
      Authorization: "Bearer " + SUPA_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: code, password: rawPw }),
  })
    .then(
      function (r) {
        return r
          .json()
          .catch(function () {
            return {};
          })
          .then(function (j) {
            return { status: r.status, j: j };
          });
      },
      function () {
        return { net: true };
      },
    )
    .then(function (r) {
      if (r.net) return r;
      if (r.j && r.j.ok && r.j.token)
        return {
          ok: true,
          token: r.j.token,
          exp: r.j.exp,
          verifier: r.j.verifier,
          user: r.j.user || null,
          owner: !!(r.j.user && r.j.user.id === "owner"),
        };
      if (r.status === 400 || r.status === 401 || r.status === 429)
        return { ok: false, locked: r.status === 429 };
      return { net: true };
    });
}

function srvAdmin() {
  return !!AUTH_FN && !!ADMIN_FN;
}

function adminCall(action, body) {
  return fetch(SUPA_URL + "/functions/v1/" + ADMIN_FN, {
    method: "POST",
    headers: {
      apikey: SUPA_KEY,
      Authorization: "Bearer " + authBearer(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(Object.assign({ action: action }, body || {})),
  }).then(
    function (r) {
      return r
        .json()
        .catch(function () {
          return {};
        })
        .then(function (j) {
          if (!r.ok || !j.ok) {
            var e = new Error(j.msg || "خطای سرور " + r.status);
            e.msg = j.msg || "";
            e.status = r.status;
            throw e;
          }
          return j;
        });
    },
    function () {
      throw new Error("اتصال به سرور برقرار نیست");
    },
  );
}

/* اولین تب بعد از ورود (تازه یا ماندگار) */
function landingTab(u) {
  return u.station === "commercial"
    ? "car"
    : isCustomRole(u)
      ? firstRoleTab()
      : isMgrUser(u)
        ? "dash"
        : u.station === "planning"
          ? "short"
          : "inspect";
}

function sessGet() {
  try {
    return JSON.parse(localStorage.getItem("cm_sess") || "null");
  } catch (e) {
    return null;
  }
}

function sessClear(why) {
  if (why) S.sessWhy = why;
  authClear();
  try {
    localStorage.removeItem("cm_sess");
    localStorage.removeItem("cm_view");
  } catch (e) {}
  S.sessAt = 0;
}

function sessFp(u) {
  return AUTH.token && AUTH.exp * 1000 > Date.now()
    ? Promise.resolve("t" + AUTH.token.slice(-16))
    : sha256Hex("s|" + (u.hash || ""));
}

// نشست ورود را برای ۱۲ ساعت در مرورگر نگه می‌دارد.
function sessSave(u) {
  if (SESS_ST.indexOf(u.station) < 0) return;
  var at = Date.now();
  S.sessAt = at;
  var su = AUTH.token
    ? {
        name: u.name,
        station: u.station,
        role: u.role || "",
        sec: u.sec || "",
        mgrUnit: u.mgrUnit || "",
      }
    : null;
  sessFp(u).then(function (fp) {
    try {
      localStorage.setItem("cm_sess", JSON.stringify({ id: u.id, at: at, fp: fp, u: su }));
    } catch (e) {}
  });
}

function tokClaims() {
  try {
    return JSON.parse(atob(AUTH.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch (e) {
    return null;
  }
}

function sessEnter(u, at, vv0) {
  S.sessAt = at;
  S.user = makeUser(u);
  S.loginErr = "";
  S.forgot = false;
  var ms = mySheets();
  S.sheet = ms[0] || "chassis";
  S.key = "";
  S.tab = landingTab(S.user);
  S.tm = false;
  reapply();
  navArm();
  if (vv0 && vv0.u === u.id && wizStation() && vv0.key && vv0.at && Date.now() - vv0.at < SESS_MS)
    viewRestore(vv0);
}

// بعد از رفرش، ورود قبلی را (در صورت معتبر بودن) برمی‌گرداند.
function sessRestore() {
  if (S.user || S.sessTried) return;
  var q = sessGet();
  if (!q) return;
  var srvSess = !!(q.u && AUTH.token && AUTH.exp * 1000 > Date.now());
  if (!srvSess && !S.data.users.length) return;
  S.sessTried = true;
  var vv0 = viewGet();
  if (!q.at || Date.now() - q.at > SESS_MS) {
    sessClear("گذشتن ۱۲ ساعت از ورود قبلی");
    return;
  }
  if (srvSess) {
    var cl = tokClaims();
    if (!cl || cl.mohr_id !== q.id || SESS_ST.indexOf(q.u.station) < 0) {
      sessClear("نامعتبر بودن توکن ورود");
      return;
    }
    sessEnter(
      {
        id: q.id,
        name: q.u.name,
        station: q.u.station,
        role: q.u.role,
        sec: q.u.sec,
        mgrUnit: q.u.mgrUnit,
      },
      q.at,
      vv0,
    );
    return;
  }
  var u = S.data.users.filter(function (x) {
    return x.id === q.id;
  })[0];
  if (!u || SESS_ST.indexOf(u.station) < 0) {
    sessClear(
      !u ? "پیدا نشدن کاربر در فهرست کاربران" : "ایستگاه کاربر برای ورود ماندگار مجاز نیست",
    );
    return;
  }
  sessFp(u).then(function (fp) {
    if (fp !== q.fp || S.user) {
      if (fp !== q.fp) sessClear("تغییر رمز یا اعتبار ورود");
      return;
    }
    sessEnter(u, q.at, vv0);
  });
}

function sessOffline() {
  return navigator.onLine === false || !!S.offStart || OFFLINE.q.length > 0;
}

function sessCheck() {
  if (S.user && S.sessAt && Date.now() - S.sessAt > SESS_MS && !sessOffline()) {
    sessClear();
    S.user = null;
    S.key = "";
    S.pick = null;
    S.tm = false;
    S.tcar = null;
    reapply();
  }
}

function viewGet() {
  try {
    return JSON.parse(localStorage.getItem(VIEW_K) || "null");
  } catch (e) {
    return null;
  }
}

function viewSnapshot() {
  var text = function (id) {
    var e = document.getElementById(id);
    return e ? e.value : "";
  };
  return {
    u: S.user.id,
    sh: S.sheet,
    key: S.key,
    wv: S.wizView || "",
    se: S.shEdit || "",
    io: !!S.itemsOpen,
    si: S.sitem || "",
    sx: S.sxOpen || "",
    st: S.sxType || "",
    co: S.corrOpen || "",
    tx: text("sx"),
    cn: text("cr_new"),
    cr: text("cr_reason"),
    cf: text("cf_reason"),
  };
}

var viewLastJson = null,
  viewLastAt = 0;

function viewWrite(snapshot) {
  var json = snapshot ? JSON.stringify(snapshot) : "";
  if (json === viewLastJson && Date.now() - viewLastAt < 60000) return;
  viewLastJson = json;
  viewLastAt = Date.now();
  try {
    if (!snapshot) localStorage.removeItem(VIEW_K);
    else {
      snapshot.at = viewLastAt;
      localStorage.setItem(VIEW_K, JSON.stringify(snapshot));
    }
  } catch (e) {}
}

function viewSave() {
  if (!S.user) return;
  if (inChassisCar()) viewWrite(viewSnapshot());
  else if (!S.key || S.doneScr) viewWrite(null);
}

function viewRestore(v) {
  ensureCar([v.key]).then(function () {
    var sh = isChs(v.sh) ? v.sh : "chassis",
      d = insp(sh, v.key);
    if (!d || !S.user || S.key) return;
    S.sheet = sh;
    S.key = v.key;
    S.tab = "inspect";
    S.wizFor = d.id;
    S.wizView = v.wv || "";
    S.shEdit = v.se || "";
    S.itemsOpen = !!v.io;
    S.sitem = v.si || "";
    S.sxOpen = v.sx || "";
    S.sxType = v.st || "ng";
    S.corrOpen = v.co || "";
    S.sxDraft = v.tx || "";
    S.drafts = {
      cr_new: v.cn || "",
      cr_reason: v.cr || "",
      cf_reason: v.cf || "",
    };
    render();
  });
}

function navOK() {
  return !!S.user && SESS_ST.indexOf(S.user.station) >= 0;
}

function navArm() {
  if (S.navArmed) return;
  try {
    history.pushState({ cm: 1 }, "");
    S.navArmed = true;
  } catch (e) {}
}

/* کروم ورودی‌های تاریخچه‌ای را که بدون لمس کاربر ساخته شوند نادیده می‌گیرد؛ پس با هر لمس یکی تازه می‌گذاریم */
function navGesture() {
  if (!navOK() || S.navStrong) return;
  try {
    if (S.navArmed) history.replaceState({ cm: 1 }, "");
    else history.pushState({ cm: 1 }, "");
    S.navStrong = true;
    S.navArmed = true;
  } catch (e) {}
}

// دکمه‌ی برگشت گوشی را به «برگشت در برنامه» تبدیل می‌کند.
function navBack() {
  var c;
  if (S.doneScr && (c = document.querySelector("[data-act=donecl]"))) {
    c.click();
    return true;
  }
  if (S.corrOpen && (c = document.querySelector("[data-act=corrback]"))) {
    c.click();
    return true;
  }
  if ((c = document.querySelector("[data-act=sxcancel]"))) {
    var tx = document.getElementById("sx");
    if (tx && tx.value.trim() && !window.confirm("این مورد هنوز ثبت نشده است. رها شود؟"))
      return true;
    c.click();
    return true;
  }
  if ((c = document.querySelector(".botbar .back"))) {
    c.click();
    return true;
  }
  if (S.key) {
    S.key = "";
    S.wizFor = "";
    S.wizView = "";
    S.sxOpen = "";
    S.corrOpen = "";
    S.editing = null;
    render();
    window.scrollTo(0, 0);
    return true;
  }
  if (Date.now() - NAV_T < 2500) {
    NAV_T = 0;
    return false;
  }
  NAV_T = Date.now();
  toast("برای خروج از برنامه یک بار دیگر برگشت را بزنید");
  return true;
}

var LG_SEAL =
  '<svg role="img" aria-label="مُهر زامیاد" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs><path id="sealT" d="M37,120 A83,83 0 0 1 203,120"/><path id="sealB" d="M30,120 A90,90 0 0 0 210,120"/><radialGradient id="sealD" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#1c4aa8"/><stop offset="1" stop-color="#0d2f7a"/></radialGradient></defs><path d="M227.0,121.9 L235.9,125.7 L234.2,140.2 L224.7,141.9 L223.9,145.7 L231.7,151.4 L226.9,165.1 L217.2,164.7 L215.6,168.1 L221.9,175.4 L214.2,187.8 L204.8,185.2 L202.4,188.2 L207.0,196.7 L196.7,207.0 L188.2,202.4 L185.2,204.8 L187.8,214.2 L175.4,221.9 L168.1,215.6 L164.7,217.2 L165.1,226.9 L151.4,231.7 L145.7,223.9 L141.9,224.7 L140.2,234.2 L125.7,235.9 L121.9,227.0 L118.1,227.0 L114.3,235.9 L99.8,234.2 L98.1,224.7 L94.3,223.9 L88.6,231.7 L74.9,226.9 L75.3,217.2 L71.9,215.6 L64.6,221.9 L52.2,214.2 L54.8,204.8 L51.8,202.4 L43.3,207.0 L33.0,196.7 L37.6,188.2 L35.2,185.2 L25.8,187.8 L18.1,175.4 L24.4,168.1 L22.8,164.7 L13.1,165.1 L8.3,151.4 L16.1,145.7 L15.3,141.9 L5.8,140.2 L4.1,125.7 L13.0,121.9 L13.0,118.1 L4.1,114.3 L5.8,99.8 L15.3,98.1 L16.1,94.3 L8.3,88.6 L13.1,74.9 L22.8,75.3 L24.4,71.9 L18.1,64.6 L25.8,52.2 L35.2,54.8 L37.6,51.8 L33.0,43.3 L43.3,33.0 L51.8,37.6 L54.8,35.2 L52.2,25.8 L64.6,18.1 L71.9,24.4 L75.3,22.8 L74.9,13.1 L88.6,8.3 L94.3,16.1 L98.1,15.3 L99.8,5.8 L114.3,4.1 L118.1,13.0 L121.9,13.0 L125.7,4.1 L140.2,5.8 L141.9,15.3 L145.7,16.1 L151.4,8.3 L165.1,13.1 L164.7,22.8 L168.1,24.4 L175.4,18.1 L187.8,25.8 L185.2,35.2 L188.2,37.6 L196.7,33.0 L207.0,43.3 L202.4,51.8 L204.8,54.8 L214.2,52.2 L221.9,64.6 L215.6,71.9 L217.2,75.3 L226.9,74.9 L231.7,88.6 L223.9,94.3 L224.7,98.1 L234.2,99.8 L235.9,114.3 L227.0,118.1Z" fill="#0d2f7a"/><circle cx="120" cy="120" r="104" fill="#ffffff"/><circle cx="120" cy="120" r="100" fill="none" stroke="#0d2f7a" stroke-width="1.6"/><circle cx="120" cy="120" r="70" fill="none" stroke="#0d2f7a" stroke-width="1.6"/><text font-family="Arial Black,Impact,sans-serif" font-size="19" font-weight="900" fill="#0d2f7a"><textPath href="#sealT" startOffset="50%" text-anchor="middle" textLength="118" lengthAdjust="spacing">ZAMYAD</textPath></text><text font-family="Arial,sans-serif" font-size="12.5" font-weight="800" fill="#0d2f7a" dy="-1"><textPath href="#sealB" startOffset="50%" text-anchor="middle" textLength="150" lengthAdjust="spacing">QUALITY AT SOURCE</textPath></text><g fill="#f2b01e"><path d="M26 114l6 6-6 6-6-6z"/><path d="M214 114l6 6-6 6-6-6z"/></g><circle cx="120" cy="120" r="67" fill="url(#sealD)"/><text x="120" y="100" text-anchor="middle" font-family="Vazirmatn,Tahoma,sans-serif" font-size="24" font-weight="900" fill="#f2b01e">زامیاد</text><text x="120" y="139" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-size="31" font-weight="900" fill="#fff" textLength="96" lengthAdjust="spacingAndGlyphs">MOHR</text><rect x="82" y="156" width="30" height="2.4" rx="1.2" fill="#f2b01e"/><rect x="128" y="156" width="30" height="2.4" rx="1.2" fill="#f2b01e"/><path d="M113.5 157l4.5 4.5 9-10" fill="none" stroke="#f2b01e" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function lgTheme() {
  return (
    '<div class="thm" role="group" aria-label="حالت نمایش">' +
    [
      ["", "🌓"],
      ["light", "☀"],
      ["dark", "🌙"],
    ]
      .map(function (o) {
        return (
          '<button type="button" data-act="thmset" data-v="' +
          o[0] +
          '" aria-label="حالت نمایش" aria-pressed="' +
          (THEME === o[0]) +
          '">' +
          o[1] +
          "</button>"
        );
      })
      .join("") +
    "</div>"
  );
}

var LOGIN_VERSION_TEXT = "نسخه آزمایشی · " + APP_VER;

function lgLast() {
  try {
    return localStorage.getItem("lastCode") || "";
  } catch (e) {
    return "";
  }
}

function ownerSetupOpen() {
  return (
    !!S.supa && location.hash === "#admin" && (srvAdmin() ? !S.user : !!S.usersReady && !S.ownerRec)
  );
}

function ownerSetupForm() {
  return (
    '<div class="own"><form data-form="ownerpw" style="display:flex;flex-direction:column;gap:10px"><label class="f">تعیین رمز مدیر (حداقل ۶ نویسه)<input class="in" id="opw" type="password" autocomplete="new-password"></label><button class="btn primary" type="submit">ذخیره و ورود</button>' +
    (S.ownerErr ? '<p class="err">' + esc(S.ownerErr) + "</p>" : "") +
    "</form></div>"
  );
}

function isOwnerLogin(code) {
  var rec = S.ownerRec;
  if (!rec) return false;
  if (rec.code) return code === rec.code;
  return !S.data.users.some(function (x) {
    return x.id === code;
  });
}

function enterOwner() {
  S.isOwner = true;
  S.ownerErr = "";
  S.loginErr = "";
  S.user = { id: "owner", name: "علی بابایی", station: "owner" };
  S.tab = "admin";
  S.key = "";
  reapply();
}

function ownerPwOk(pw) {
  var rec = S.ownerRec;
  if (rec && !rec.hash) {
    var v = verGet("owner");
    if (!v) return Promise.resolve(false);
    rec = { salt: v.salt, hash: v.hash };
  }
  if (!rec) return Promise.resolve(false);
  return Promise.all(
    [pw, fnum(pw)]
      .filter(function (x, i, a) {
        return a.indexOf(x) === i;
      })
      .map(function (c) {
        return sha256Hex(rec.salt + c);
      }),
  ).then(function (hs) {
    return hs.indexOf(rec.hash) >= 0;
  });
}

/* trusted=true یعنی سرور رمز را تأیید کرده؛ فقط ساخت نشست محلی انجام می‌شود */
function enterUser(u) {
  S.user = makeUser(u);
  S.loginErr = "";
  S.forgot = false;
  var ms = mySheets();
  S.sheet = ms[0] || "chassis";
  S.key = "";
  S.tab = landingTab(S.user);
  S.tm = false;
  sessSave(u);
  reapply();
  if (navOK()) navArm();
}

/* su: مشخصات کاربر از پاسخ تابع ورود (v113)؛ در این حالت فهرست کاربران لازم نیست */
function loginLocal(code, pw, rawPw, trusted, su) {
  if (trusted && su) {
    if (su.id === "owner") enterOwner();
    else enterUser(su);
    return;
  }
  if (isOwnerLogin(code)) {
    (trusted ? Promise.resolve(true) : ownerPwOk(rawPw)).then(function (ok) {
      if (!ok) {
        S.loginErr = "کد پرسنلی یا رمز درست نیست.";
        render();
        return;
      }
      var needCode = !S.ownerRec.code;
      enterOwner();
      if (needCode) toast("کد پرسنلی مدیر را در کارت بالای این صفحه ثبت کنید");
    });
    return;
  }
  var u = S.data.users.filter(function (x) {
    return x.id === code;
  })[0];
  if (!u) {
    S.loginErr = trusted
      ? "اطلاعات کاربران هنوز بارگیری نشده؛ چند ثانیه بعد دوباره امتحان کنید."
      : "کد پرسنلی یا رمز درست نیست.";
    render();
    return;
  }
  var vf = u.hash ? { salt: u.salt, hash: u.hash } : verGet(u.id);
  if (!vf) {
    S.loginErr = "برای اولین ورود روی این دستگاه باید اینترنت وصل باشد.";
    render();
    return;
  }
  (trusted ? Promise.resolve(vf.hash) : sha256Hex(vf.salt + pw)).then(function (hh) {
    if (hh !== vf.hash) {
      S.loginErr = "کد پرسنلی یا رمز درست نیست.";
      render();
      return;
    }
    enterUser(u);
  });
}

function loginView() {
  var h =
    '<div class="lgc">' +
    (S.forgot
      ? ""
      : '<span class="lgn-seal">' +
        LG_SEAL +
        '</span><div class="lgn-head"><h2>سامانه مُهر</h2></div>');
  if (!S.data.users.length && !AUTH_FN)
    h +=
      '<p class="hint" style="margin-bottom:10px;color:var(--wait)">هنوز کاربری تعریف نشده است. مدیر برنامه باید کاربران را اضافه کند.</p>';
  if (S.forgot) {
    h +=
      '<h3 style="margin:6px 0">رمزم را فراموش کردم</h3><p class="hint" style="margin-bottom:8px">به مدیر یا سرپرست شاسی بگویید «کد بازیابی» بدهد. کد را اینجا بنویسید و رمز جدید خودتان را بگذارید.</p><form data-form="forgot" style="display:flex;flex-direction:column;gap:12px"><label class="f">کد پرسنلی<input class="in num ltr" id="fc" inputmode="numeric" autocomplete="username"></label><label class="f">کد بازیابی (۶ رقم)<input class="in num ltr" id="fr" inputmode="numeric" autocomplete="off"></label><label class="f">رمز جدید (دست‌کم ۴ کاراکتر)<input class="in" id="fp1" type="password" autocomplete="new-password"></label><label class="f">تکرار رمز جدید<input class="in" id="fp2" type="password" autocomplete="new-password"></label><button class="btn primary" type="submit">ذخیره‌ی رمز جدید</button><button class="btn" type="button" data-act="forgotback">بازگشت به ورود</button></form>' +
      (S.loginErr ? '<p class="err">' + esc(S.loginErr) + "</p>" : "") +
      "</div>";
    return h;
  }
  h +=
    '<div class="lgt"><p>هر بازدید و تأیید با نام، کد پرسنلی و زمان ورود شما ثبت می‌شود.</p></div><form data-form="login" style="display:flex;flex-direction:column;gap:14px"><label class="fld"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg><span class="tx"><small>کد پرسنلی</small><input class="num ltr" id="ucode" inputmode="numeric" autocomplete="username" placeholder="کد پرسنلی خود را وارد کنید" value="' +
    esc(lgLast()) +
    '"></span></label><label class="fld"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z"/></svg><span class="tx"><small>رمز عبور</small><input id="upw" type="password" autocomplete="current-password" placeholder="رمز عبور خود را وارد کنید"></span><button type="button" class="eye" data-act="pweye" aria-label="نمایش رمز">نمایش</button></label><button class="lnk" type="button" data-act="forgot"><i>?</i>فراموشی رمز عبور؟</button><button class="btn primary go" type="submit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></svg>ورود به سامانه</button></form>';
  if (S.loginErr) h += '<p class="err">' + esc(S.loginErr) + "</p>";
  if (S.sessWhy)
    h +=
      '<p class="hint" style="color:var(--wait)">ورود قبلی پاک شد؛ دلیل: ' +
      esc(S.sessWhy) +
      "</p>";
  if (S.connErr)
    h +=
      '<p class="err">اتصال به سرور برقرار نیست. اگر قبلاً روی همین گوشی با اینترنت وارد شده‌اید، یک‌بار با اینترنت وارد شوید تا ورود بدون اینترنت فعال شود. برنامه هر ۸ ثانیه دوباره تلاش می‌کند.</p>';
  if (ownerSetupOpen()) h += ownerSetupForm();
  return h + "</div>";
}

function lgMsgs() {
  var m = [];
  if (!S.data.users.length && !AUTH_FN)
    m.push("هنوز کاربری تعریف نشده است. مدیر برنامه باید کاربران را اضافه کند.");
  if (S.sessWhy) m.push("ورود قبلی پاک شد؛ دلیل: " + S.sessWhy);
  if (S.connErr) m.push("اتصال به سرور برقرار نیست؛ برنامه هر ۸ ثانیه دوباره تلاش می‌کند.");
  if (S.loginErr) m.push(S.loginErr);
  return m.length ? '<div class="lgb-msg" role="alert">' + m.map(esc).join("<br>") + "</div>" : "";
}

/* کارت ورود داخل خود عکس است؛ فیلدها و دکمه‌ی واقعی شفاف روی آن قرار می‌گیرند */
function lgPicPage() {
  return (
    '<div class="lgs lgb">' +
    lgTheme() +
    '<div class="lgb-sky"></div><div class="lgb-b"><form data-form="login" class="lgb-f"><input class="lgb-u num" id="ucode" inputmode="numeric" autocomplete="username" aria-label="کد پرسنلی" placeholder="کد پرسنلی خود را وارد کنید" value="' +
    esc(lgLast()) +
    '"><input class="lgb-p" id="upw" type="password" autocomplete="current-password" aria-label="رمز عبور" placeholder="رمز عبور"><button type="button" class="lgb-e" data-act="pweye">نمایش</button><button type="button" class="lgb-l" data-act="forgot" aria-label="فراموشی رمز عبور"></button><button type="submit" class="lgb-go" aria-label="ورود به سامانه"></button></form>' +
    '</div><div class="lgb-foot">' +
    lgMsgs() +
    '<div class="lgf">A.B · ' +
    LOGIN_VERSION_TEXT +
    "</div></div></div>"
  );
}

function lgPage() {
  if (!S.forgot && !ownerSetupOpen()) return lgPicPage();
  var f = '<div class="lgf">A.B · ' + LOGIN_VERSION_TEXT + "</div>";
  return (
    '<div class="lgs"><div class="lgs-top">' +
    lgTheme() +
    '</div><div class="lgside">' +
    loginView() +
    f +
    "</div></div>"
  );
}

function ownerPwCard() {
  if (!S.supa || !S.ownerRec) return "";
  return mgCard(
    "shield",
    "تغییر رمز مدیر",
    "",
    '<form data-form="ownerchg" class="mgform"><label class="f">رمز فعلی<input class="in" id="ocp0" type="password" autocomplete="current-password"></label><label class="f">رمز تازه (حداقل ۶ نویسه)<input class="in" id="ocp1" type="password" autocomplete="new-password"></label><label class="f">تکرار رمز تازه<input class="in" id="ocp2" type="password" autocomplete="new-password"></label><button class="btn primary" type="submit">تغییر رمز</button>' +
      (S.opwErr ? '<p class="err">' + esc(S.opwErr) + "</p>" : "") +
      "</form>",
  );
}

function isOwnerNow() {
  return !!S.isOwner && !!S.user && S.user.id === "owner";
}

function canReset(u) {
  if (!u) return false;
  if (isOwnerNow()) return true;
  return false;
}

function pwCell(u) {
  if (!canReset(u)) return "";
  var h =
    '<div class="row" style="gap:6px"><button class="btn sm" data-act="rcgen" data-id="' +
    esc(u.id) +
    '">کد بازیابی</button><button class="btn sm" data-act="pwnew" data-id="' +
    esc(u.id) +
    '">رمز تازه</button></div>';
  if (S.rcShown && S.rcShown.id === u.id && Date.now() < S.rcShown.until)
    h +=
      '<div class="rcbox">کد بازیابی: <b class="num">' +
      esc(S.rcShown.code) +
      "</b><br><small>به " +
      esc(u.name) +
      " بگویید. ۳۰ دقیقه و یک‌بار مصرف. این کد فقط همین‌جا دیده می‌شود.</small></div>";
  if (S.pwFor === u.id)
    h +=
      '<form data-form="pwnewsave" data-id="' +
      esc(u.id) +
      '" class="row" style="margin-top:8px"><input class="in num ltr" id="pwn" type="text" autocomplete="off" placeholder="رمز تازه (دست‌کم ۴ کاراکتر)" style="flex:1;min-width:140px"><button class="btn primary sm" type="submit">ذخیره</button><button class="btn sm" type="button" data-act="pwcancel">انصراف</button></form>' +
      (S.pwForErr ? '<p class="err">' + esc(S.pwForErr) + "</p>" : "");
  return h;
}

function pwCard() {
  return (
    '<div class="card"><h2>تغییر رمز من</h2><form data-form="chpw" style="display:flex;flex-direction:column;gap:10px"><label class="f">رمز فعلی<input class="in num ltr" id="pw0" type="password" autocomplete="current-password"></label><label class="f">رمز جدید (دست‌کم ۴ کاراکتر)<input class="in num ltr" id="pw1" type="password" autocomplete="new-password"></label><label class="f">تکرار رمز جدید<input class="in num ltr" id="pw2" type="password" autocomplete="new-password"></label>' +
    (S.pwErr ? '<p class="err">' + esc(S.pwErr) + "</p>" : "") +
    '<div class="row"><button class="btn primary" type="submit">ذخیره‌ی رمز جدید</button><button class="btn" type="button" data-act="pwclose">انصراف</button></div><p class="hint">اگر رمزتان را فراموش کردید، مدیر برنامه برایتان رمز تازه می‌گذارد.</p></form></div>'
  );
}

/* صفحه‌ی ورود روی صفحه‌ی کوتاه کامپیوتر: کل تصویر در یک نما جا می‌شود (فقط ≥۷۰۰px؛ گوشی دست‌نخورده) */
// صفحه‌ی ورود را در دسکتاپ به اندازه‌ی پنجره می‌کند.
function fitLogin() {
  var lg = document.querySelector(".lgs");
  if (!lg) return;
  lg.style.zoom = "";
  if (!window.matchMedia("(min-width:700px)").matches) return;
  var z = 1,
    need,
    i;
  for (i = 0; i < 3; i++) {
    need = document.documentElement.scrollHeight;
    if (need <= innerHeight) break;
    z = Math.max(0.5, (z * innerHeight) / need);
    lg.style.zoom = z.toFixed(3);
  }
}

function makeRecoveryCode(id) {
  var cu = S.data.users.filter(function (x) {
    return x.id === id;
  })[0];
  if (!canReset(cu)) return;
  var arr = new Uint32Array(1);
  (window.crypto || window.msCrypto).getRandomValues(arr);
  var code = String(100000 + (arr[0] % 900000)),
    rs = uid();
  if (srvAdmin()) {
    adminCall("rc_create", { id: id }).then(
      function (j) {
        S.rcShown = { id: id, code: j.code, until: j.until };
        S.pwFor = "";
        beep();
        toast("کد بازیابی ساخته شد");
        render();
      },
      function (e) {
        toast("ساخته نشد. " + e.message);
      },
    );
    return;
  }
  sha256Hex(rs + code).then(function (hh) {
    return save(function () {
      return store.update("users", id, {
        rc: {
          salt: rs,
          h: hh,
          until: Date.now() + 1800000,
          by: S.user.name,
          tries: 0,
        },
      });
    }, "کد بازیابی ساخته شد").then(function (ok) {
      if (ok) {
        S.rcShown = { id: id, code: code, until: Date.now() + 1800000 };
        S.pwFor = "";
        render();
      }
    });
  });
  return;
}

function clickPassword(ev, el, a, id, d) {
  if (a === "pweye") return password_pweye(ev, el, a, id, d);
  if (a === "forgot") {
    S.forgot = true;
    S.loginErr = "";
    render();
    return true;
  }
  if (a === "forgotback") {
    S.forgot = false;
    S.loginErr = "";
    render();
    return true;
  }
  if (a === "urole" && isOwnerNow()) return password_urole(ev, el, a, id, d);
  if (a === "pwnew") return password_pwnew(ev, el, a, id, d);
  if (a === "pwcancel") {
    S.pwFor = "";
    S.pwForErr = "";
    render();
    return true;
  }
  if (a === "rcgen") {
    makeRecoveryCode(id);
    return true;
  }
  return false;
}

// اقدام «pweye» از clickPassword
function password_pweye(ev, el, a, id, d) {
  var pi = document.getElementById("upw");
  if (pi) {
    var sh = pi.type === "password";
    pi.type = sh ? "text" : "password";
    el.textContent = sh ? "پنهان" : "نمایش";
  }
  return true;
}

// اقدام «urole» از clickPassword
function password_urole(ev, el, a, id, d) {
  var ru = el.getAttribute("data-u"),
    rv = el.getAttribute("data-v") || "";
  save(function () {
    return srvAdmin()
      ? adminCall("setuser", { id: ru, role: rv }).then(function () {
          return store.update("users", ru, { role: rv });
        })
      : store.update("users", ru, { role: rv });
  }, "نقش کاربر تغییر کرد");
  return true;
}

// اقدام «pwnew» از clickPassword
function password_pwnew(ev, el, a, id, d) {
  var tu = S.data.users.filter(function (x) {
    return x.id === id;
  })[0];
  if (!canReset(tu)) return true;
  S.pwFor = id;
  S.pwForErr = "";
  render();
  return true;
}

function clickUsersAndSession(ev, el, a, id, d) {
  if (a === "pick" && S.user && hasPick(S.user.station)) {
    changePick(el.getAttribute("data-v"));
    return true;
  }
  if (a === "testsec" && S.isOwner && S.user && S.user.id === "owner")
    return usersAndSession_testsec(ev, el, a, id, d);
  if (a === "usec" && S.isOwner) return usersAndSession_usec(ev, el, a, id, d);
  if (a === "teststation" && S.isOwner && S.user && S.user.id === "owner")
    return usersAndSession_teststation(ev, el, a, id, d);
  if (a === "udelask" && S.isOwner) {
    S.confirmUser = id;
    render();
    return true;
  }
  if (a === "udelno") {
    S.confirmUser = null;
    render();
    return true;
  }
  if (a === "udelyes" && S.isOwner) return usersAndSession_udelyes(ev, el, a, id, d);
  if (a === "logout") return usersAndSession_logout(ev, el, a, id, d);
  return false;
}

// اقدام «testsec» از clickUsersAndSession
function usersAndSession_testsec(ev, el, a, id, d) {
  S.user.sec = el.getAttribute("data-v") || "";
  S.user.pick = S.user.sec === "ewt1" ? "e1" : S.user.sec === "ewt2" ? "e2" : "all";
  S.editing = null;
  render();
  return true;
}

// اقدام «usec» از clickUsersAndSession
function usersAndSession_usec(ev, el, a, id, d) {
  var us2 = el.getAttribute("data-u"),
    sv = el.getAttribute("data-v") || "";
  save(function () {
    return srvAdmin()
      ? adminCall("setuser", { id: us2, sec: sv }).then(function () {
          return store.update("users", us2, { sec: sv });
        })
      : store.update("users", us2, { sec: sv });
  }, "بخش چکمن تغییر کرد");
  return true;
}

// اقدام «teststation» از clickUsersAndSession
function usersAndSession_teststation(ev, el, a, id, d) {
  S.user = { id: "owner", name: "علی بابایی (آزمایشی)", station: id };
  var ms2 = mySheets();
  S.sheet = ms2[0] || S.sheet;
  S.key = "";
  S.tab = id === "commercial" ? "car" : id === "planning" ? "stop" : "inspect";
  S.searchErr = "";
  S.formErr = "";
  S.editing = null;
  render();

  return true;
}

// اقدام «udelyes» از clickUsersAndSession
function usersAndSession_udelyes(ev, el, a, id, d) {
  S.confirmUser = null;
  save(function () {
    return srvAdmin()
      ? adminCall("deluser", { id: id }).then(function () {
          return store.del("users", id);
        })
      : store.del("users", id);
  }, "کاربر حذف شد");
  return true;
}

// اقدام «logout» از clickUsersAndSession
function usersAndSession_logout(ev, el, a, id, d) {
  sessClear();
  S.user = null;
  S.key = "";
  S.pick = null;
  S.tm = false;
  S.tcar = null;
  if (S.supa) S.isOwner = false;
  reapply();
  return true;
}

function submitOwnerCode() {
  var oc2 = digits(fieldValue("oc"));
  if (!/^[A-Za-z0-9]+$/.test(oc2)) {
    S.formErr = "کد پرسنلی را (فقط حرف لاتین و عدد) وارد کنید.";
    render();
    return;
  }
  if (
    S.data.users.some(function (x) {
      return x.id === oc2;
    })
  ) {
    S.formErr = "این کد برای یک کاربر دیگر ثبت شده است.";
    render();
    return;
  }
  S.formErr = "";
  save(function () {
    return srvAdmin()
      ? adminCall("owner_code", { code: oc2 })
      : store.update("users", "__owner", { code: oc2 });
  }, "کد پرسنلی مدیر ذخیره شد");
  return;
}

function submitOwnerChange() {
  var cur = fieldValue("ocp0"),
    n1 = fieldValue("ocp1"),
    n2 = fieldValue("ocp2");
  var fail = function (m) {
    S.opwErr = m;
    render();
  };
  if (n1.length < 6) return fail("رمز تازه باید حداقل ۶ نویسه باشد.");
  if (n1 !== n2) return fail("تکرار رمز با رمز تازه یکی نیست.");
  if (srvAdmin()) {
    adminCall("owner_chpw", { old: cur, new: n1 }).then(
      function () {
        S.opwErr = "";
        toast("رمز مدیر تغییر کرد");
        render();
      },
      function (e) {
        fail(e.msg === "bad_old" ? "رمز فعلی درست نیست." : "ذخیره نشد. " + e.message);
      },
    );
    return;
  }
  ownerPwOk(cur).then(function (ok) {
    if (!ok) return fail("رمز فعلی درست نیست.");
    var ns = uid();
    return sha256Hex(ns + fnum(n1))
      .then(function (hh) {
        return save(function () {
          return store.update("users", "__owner", {
            salt: ns,
            hash: hh,
            pwChangedAt: nowIso(),
          });
        }, "رمز مدیر تغییر کرد");
      })
      .then(function (saved) {
        if (saved) {
          S.opwErr = "";
          render();
        }
      });
  });
  return;
}

function submitOwnerPassword() {
  var op = (document.getElementById("opw") || {}).value || "";
  if (!ownerSetupOpen()) return;
  if (op.length < 6) {
    S.ownerErr = "رمز باید حداقل ۶ نویسه باشد.";
    render();
    return;
  }
  if (srvAdmin()) {
    adminCall("owner_setup", { password: op }).then(
      function (j) {
        authSet(j.token, j.exp);
        enterOwner();
      },
      function (e) {
        S.ownerErr = e.msg === "exists" ? "مدیر قبلاً تعریف شده است." : "ذخیره نشد. " + e.message;
        render();
      },
    );
    return;
  }
  var sl = uid();
  sha256Hex(sl + fnum(op))
    .then(function (hh) {
      return store.set("users", "__owner", {
        name: "owner",
        salt: sl,
        hash: hh,
        createdAt: nowIso(),
      });
    })
    .then(enterOwner, function (e) {
      S.ownerErr = "ذخیره نشد. " + ((e && e.message) || "");
      render();
    });
  return;
}

function submitNewPassword(ev) {
  var tid = ev.target.getAttribute("data-id"),
    tu2 = S.data.users.filter(function (x) {
      return x.id === tid;
    })[0],
    np = digits(fieldValue("pwn"));
  if (!canReset(tu2)) return;
  if (np.length < 4) {
    S.pwForErr = "رمز دست‌کم ۴ کاراکتر باشد.";
    render();
    return;
  }
  if (srvAdmin()) {
    adminCall("setpw", { id: tid, password: np }).then(
      function () {
        S.pwFor = "";
        S.pwForErr = "";
        S.rcShown = null;
        toast("رمز تازه ذخیره شد");
        render();
      },
      function (e) {
        S.pwForErr = "ذخیره نشد. " + e.message;
        render();
      },
    );
    return;
  }
  var ns2 = uid();
  sha256Hex(ns2 + np).then(function (h1) {
    return save(function () {
      return store.update("users", tid, {
        salt: ns2,
        hash: h1,
        pwChangedAt: nowIso(),
        rc: null,
      });
    }, "رمز تازه ذخیره شد").then(function (ok) {
      if (ok) {
        S.pwFor = "";
        S.pwForErr = "";
        S.rcShown = null;
        render();
      }
    });
  });
  return;
}

function submitForgot() {
  var fc = digits(fieldValue("fc")),
    fr = digits(fieldValue("fr")),
    f1 = digits(fieldValue("fp1")),
    f2 = digits(fieldValue("fp2")),
    fu = S.data.users.filter(function (x) {
      return x.id === fc;
    })[0],
    bad = "کد پرسنلی یا کد بازیابی درست نیست یا منقضی شده است.";
  if (f1.length < 4) {
    S.loginErr = "رمز جدید دست‌کم ۴ کاراکتر باشد.";
    render();
    return;
  }
  if (f1 !== f2) {
    S.loginErr = "تکرار رمز با رمز جدید یکی نیست.";
    render();
    return;
  }
  if (srvAdmin()) {
    adminCall("rc_use", { id: fc, code: fr, password: f1 }).then(
      function () {
        S.forgot = false;
        S.loginErr = "";
        toast("رمز جدید ذخیره شد؛ با آن وارد شوید.");
        render();
      },
      function (e) {
        S.loginErr = e.msg === "bad_code" || e.status === 401 ? bad : "ذخیره نشد. " + e.message;
        render();
      },
    );
    return;
  }
  if (!fu || !fu.rc || !fu.rc.h || Date.now() > fu.rc.until || (fu.rc.tries || 0) >= 5) {
    S.loginErr = bad;
    render();
    return;
  }
  sha256Hex(fu.rc.salt + fr).then(function (hr) {
    if (hr !== fu.rc.h) {
      S.loginErr = bad;
      store.update("users", fu.id, { rc: { tries: (fu.rc.tries || 0) + 1 } });
      render();
      return;
    }
    var ns3 = uid();
    return sha256Hex(ns3 + f1)
      .then(function (h3) {
        return store.update("users", fu.id, {
          salt: ns3,
          hash: h3,
          pwChangedAt: nowIso(),
          rc: null,
        });
      })
      .then(function () {
        S.forgot = false;
        S.loginErr = "";
        toast("رمز جدید ذخیره شد؛ با آن وارد شوید.");
        render();
      });
  });
  return;
}

function submitChangePassword() {
  if (!S.user || S.user.id === "owner") return;
  var p0 = digits(fieldValue("pw0")),
    p1 = digits(fieldValue("pw1")),
    p2 = digits(fieldValue("pw2")),
    uu = S.data.users.filter(function (x) {
      return x.id === S.user.id;
    })[0];
  if (!uu) {
    S.pwErr = "کاربر پیدا نشد.";
    render();
    return;
  }
  if (p1.length < 4) {
    S.pwErr = "رمز جدید دست‌کم ۴ کاراکتر باشد.";
    render();
    return;
  }
  if (p1 !== p2) {
    S.pwErr = "تکرار رمز با رمز جدید یکی نیست.";
    render();
    return;
  }
  if (p1 === p0) {
    S.pwErr = "رمز جدید باید با رمز فعلی فرق کند.";
    render();
    return;
  }
  if (srvAdmin()) {
    adminCall("chpw", { old: p0, new: p1 }).then(
      function () {
        S.pwOpen = false;
        S.pwErr = "";
        toast("رمز شما تغییر کرد");
        render();
      },
      function (e) {
        S.pwErr =
          e.msg === "bad_old"
            ? "رمز فعلی درست نیست."
            : e.status === 401
              ? "برای تغییر رمز دوباره با اینترنت وارد شوید."
              : "ذخیره نشد. " + e.message;
        render();
      },
    );
    return;
  }
  sha256Hex(uu.salt + p0).then(function (h0) {
    if (h0 !== uu.hash) {
      S.pwErr = "رمز فعلی درست نیست.";
      render();
      return;
    }
    var ns = uid();
    return sha256Hex(ns + p1).then(function (h1) {
      return save(function () {
        return store.update("users", uu.id, {
          salt: ns,
          hash: h1,
          pwChangedAt: nowIso(),
        });
      }, "رمز شما تغییر کرد").then(function (ok) {
        if (ok) {
          S.pwOpen = false;
          S.pwErr = "";
          render();
        }
      });
    });
  });
  return;
}

// ورود با کد پرسنلی و رمز؛ نقش کاربر را مشخص می‌کند.
function submitLogin() {
  var code = digits(fieldValue("ucode")),
    pw = digits(fieldValue("upw")),
    rawPw = fieldValue("upw");
  try {
    if (code) localStorage.setItem("lastCode", code);
  } catch (e) {}
  serverLogin(code, rawPw).then(function (sr) {
    if (sr.ok === false) {
      S.loginErr = sr.locked
        ? "تلاش ناموفق زیاد بود؛ چند دقیقه بعد دوباره امتحان کنید."
        : "کد پرسنلی یا رمز درست نیست.";
      render();
      return;
    }
    if (sr.ok) {
      authSet(sr.token, sr.exp);
      if (sr.verifier) verPut(sr.owner ? "owner" : code, sr.verifier);
      kickData();
    }
    loginLocal(code, pw, rawPw, !!sr.ok, sr.user);
  });
}
