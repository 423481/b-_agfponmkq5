/* ════════════════════════════════════════════════════════════
   فصل 99 — راه‌اندازی برنامه
   شنونده‌های رویداد و دستورهای شروع. این فصل باید همیشه آخر باشد.
   ════════════════════════════════════════════════════════════ */

try {
  THEME = localStorage.getItem("thm") || "";
} catch (e) {}

applyTheme();

prefApplyLater();

try {
  soundOn = localStorage.getItem("snd") !== "0";
} catch (e) {}

document.addEventListener(
  "click",
  function () {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) {}
  },
  true,
);

authLoad();

try {
  OFFLINE.q = JSON.parse(localStorage.getItem("zq-offq") || "[]");
} catch (e) {
  OFFLINE.q = [];
}

try {
  var ssq = JSON.parse(sessionStorage.getItem(OFF_SS) || "null");
  if (ssq && ssq.length) OFFLINE.q = ssq;
} catch (e) {}

document.addEventListener("input", function (ev) {
  var id = ev.target && ev.target.id;
  if (id === "sx" || id === "cr_new" || id === "cr_reason" || id === "cf_reason") viewSave();
});

["click", "touchend", "pointerup", "keydown"].forEach(function (ev) {
  document.addEventListener(ev, navGesture, true);
});

window.addEventListener("popstate", function () {
  S.navArmed = false;
  S.navStrong = false;
  if (!navOK()) return;
  if (navBack() !== false) navArm();
  else {
    try {
      history.back();
    } catch (e) {}
  }
});

setInterval(sessCheck, 60000);

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) sessCheck();
});

window.addEventListener("online", function () {
  offFlush();
  render();
});

window.addEventListener("offline", function () {
  render();
});

setInterval(offFlush, 6000);

window.addEventListener("error", function (ev) {
  var r = document.getElementById("app");
  if (r && !r.firstElementChild) showFatal(ev.error || ev.message);
});

window.addEventListener("unhandledrejection", function (ev) {
  var r = document.getElementById("app");
  if (r && !r.firstElementChild) showFatal(ev.reason);
});

setTimeout(function () {
  var b = document.getElementById("boot");
  if (b)
    b.innerHTML +=
      '<p class="hint" style="margin:12px 0 8px">اتصال کند است؛ چند ثانیه‌ی دیگر صبر کنید یا دوباره بارگذاری کنید.</p><button class="btn" onclick="location.reload()">بارگذاری دوباره</button>';
}, 9000);

window.addEventListener("resize", fitLogin);

document.addEventListener("input", function (ev) {
  var t = ev.target,
    id = t && t.id;
  if (!id) return;
  if (id === "smpq") {
    S.smpQ = t.value;
    clearTimeout(smpQTimer);
    smpQTimer = setTimeout(function () {
      var box = document.getElementById("smplist");
      if (box) box.innerHTML = smpRegistryList();
      else render();
    }, 150);
    return;
  }
  if (id === "psq") {
    S.psQ = t.value;
    pshFilterDom(t.value);
    return;
  }
  if (id === "psf") {
    pshFindDom(t.value);
    return;
  }
  if (id === "mguq") {
    var mq = norm(t.value);
    Array.prototype.forEach.call(document.querySelectorAll("#mgulist .mgu"), function (e) {
      e.style.display = !mq || norm(e.getAttribute("data-q")).indexOf(mq) >= 0 ? "" : "none";
    });
    return;
  }
  if (id === "tq") {
    var q0 = digits(t.value);
    Array.prototype.forEach.call(document.querySelectorAll("#todaylist [data-k]"), function (b) {
      b.style.display = !q0 || b.getAttribute("data-k").indexOf(q0) >= 0 ? "" : "none";
    });
    return;
  }
  var box = document.getElementById("sg-" + id);
  if (!box) return;
  var seg = t.value.split(/[,،\n]/).pop(),
    q = norm(seg);
  if (!q) {
    box.innerHTML = "";
    return;
  }
  var out = [];
  suggPool(id).forEach(function (c) {
    var n = norm(c);
    if (n !== q && n.indexOf(q) >= 0 && out.indexOf(c) < 0) out.push(c);
  });
  box.innerHTML = out
    .slice(0, 6)
    .map(function (c) {
      return (
        '<button type="button" class="pick" data-act="sugg" data-f="' +
        esc(id) +
        '" data-v="' +
        esc(c) +
        '">' +
        esc(c) +
        "</button>"
      );
    })
    .join("");
});

document.addEventListener("change", function (ev) {
  var t = ev.target;
  if (t && t.id === "ukind" && S.isOwner) {
    S.ukind = t.value;
    S.formErr = "";
    render();
    return;
  }
  if (t && t.id === "dash_station" && dashAllowed()) {
    var ds = dashF();
    ds.station = t.value;
    ds.more = DASH_PAGE;
    render();
    return;
  }
  if (t && /^rd_[ymd]$/.test(t.id)) {
    S.rd = { y: +fieldValue("rd_y"), m: +fieldValue("rd_m"), d: +fieldValue("rd_d") };
    render();
    return;
  }
  if (t && t.getAttribute && t.getAttribute("data-rowph")) {
    var rid = t.getAttribute("data-rowph"),
      rf = t.files && t.files[0];
    t.value = "";
    if (rf)
      photoResize(rf, function (u) {
        if (!u) {
          toast("خواندن عکس ناموفق بود");
          return;
        }
        var mp = {};
        mp[rid] = {
          rowPhoto: u,
          rowPhotoBy: S.user.name,
          rowPhotoAt: nowIso(),
        };
        writeItems(mp, "عکس ثبت شد");
      });
    return;
  }
  if (t && t.id === "phfile") {
    var pf = t.files && t.files[0];
    t.value = "";
    if (pf) {
      S.edDraft = fieldValue("nt-" + S.editing);
      photoResize(pf, function (u) {
        S.edPhoto = u;
        if (!u) toast("خواندن عکس ناموفق بود");
        render();
      });
    }
    return;
  }
});

document.addEventListener(
  "pointerdown",
  function (e) {
    pointerDown = { x: e.clientX, y: e.clientY };
  },
  true,
);

document.addEventListener("click", function (ev) {
  var el = ev.target.closest("[data-act]");
  if (S.menu && !ev.target.closest(".menu,.menubtn")) {
    S.menu = false;
    if (!el) render();
  }
  if (S.moreOpen && !ev.target.closest(".moresheet,.tab-more")) {
    S.moreOpen = false;
    if (!el) render();
  }
  if (!el || el.disabled) return;
  var a = el.getAttribute("data-act");
  if (el.closest(".menu") && !/^(tsz|glove|snd)$/.test(a)) S.menu = false;
  if (a === "menu") {
    S.menu = !S.menu;
    render();
    return;
  }
  if (a === "cclear") {
    S.key = "";
    S.formErr = "";
    S.cstepFor = "";
    render();
    return;
  }
  if (a === "cnext" || a === "cprev") {
    createGo(a === "cnext" ? 1 : -1);
    return;
  }
  if (a === "tsz" || a === "glove") {
    try {
      localStorage.setItem(
        a === "tsz" ? "cm_tsz" : "cm_glove",
        a === "tsz" ? el.getAttribute("data-v") : prefGet("cm_glove", "0") === "1" ? "0" : "1",
      );
    } catch (e) {}
    prefApply();
    render();
    return;
  }
  var id = el.getAttribute("data-id"),
    d = S.key ? insp(S.sheet, S.key) : null;
  CLICK_GROUPS.some(function (group) {
    return group(ev, el, a, id, d);
  });
});

document.addEventListener("input", function () {
  if (smpWizOn()) smpDraftTyping();
});

window.addEventListener(
  "scroll",
  function () {
    document.body.classList.toggle("scrolled", window.scrollY > 500);
  },
  { passive: true },
);

document.addEventListener("submit", function (ev) {
  var f = ev.target.getAttribute("data-form");
  if (!f) return;
  ev.preventDefault();
  var cf2 = stepForms(),
    cs2 = cf2 && cf2.getAttribute("data-form") === f ? formSteps(cf2) : [];
  if (cs2.length > 1) {
    if ((S.cstep || 0) < cs2.length - 1) return createGo(1);
    if (f !== "create") S.stpSent = f;
  }
  if (f === "ownercode" && S.isOwner) return submitOwnerCode();
  if (f === "ownerchg" && S.isOwner) return submitOwnerChange();
  if (f === "rowbc") return submitRowBarcode(ev);
  if (f === "ownerpw") return submitOwnerPassword();
  if (f === "pwnewsave") return submitNewPassword(ev);
  if (f === "forgot") return submitForgot();
  if (f === "chpw") return submitChangePassword();
  if (f === "login") return submitLogin();
  if (f === "adduser" && S.isOwner) return submitAddUser();
  if (f === "bulkusers" && S.isOwner) return submitBulkUsers();
  if (f === "dashq" && dashAllowed()) return submitDashSearch();
  if (f === "dashcar" && dashAllowed()) return submitDashCar();
  if (f === "rolesave" && S.isOwner) return submitRoleSave(ev);
  if (f === "roleadd" && S.isOwner) return submitRoleAdd();
  if (f === "mgraddt" && S.isOwner) return submitMgrTitle();
  if (f === "mgraddu" && S.isOwner) return submitMgrUnit();
  if (f === "cfgshift" && S.isOwner) return submitShiftHours();
  if (f === "cfgtarget" && S.isOwner) return submitDailyTarget();
  if (f === "stopadd" && canStop()) return submitStopAdd();
  if (f === "pshadd" && canPlanShort()) return pshAdd();
  if (f === "cpfadd" && canCpfCreate()) return cpfAdd();
  if (f === "cpfclose" && canCpfCreate()) return cpfClose(ev.target.getAttribute("data-id"));
  if (f === "stopedit" && canStop()) return submitStopEdit(ev);
  if (f === "cfglen" && S.isOwner) return submitNumberLengths();
  if (f === "shsearch") return submitShortSearch();
  if (f === "carsearch") return submitCarSearch();
  if (f === "search") return submitSearch();
  if (f === "create") return submitCreate();
  if (f === "corrfuel") return submitFuelCorrection();
  if (f === "corrreq") return submitCorrRequest();
  if (f === "ids") return submitIdentity();
  if (f === "short") return submitShortages();
  if (f === "extra") return submitExtraDefect();
});

render();

connect();

/* v128: ذخیره‌ی صفحه برای باز شدن بدون اینترنت (نیازمند فایل sw.js کنار این صفحه) */
try {
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol))
    navigator.serviceWorker.register("sw.js").catch(function () {});
} catch (e) {}
