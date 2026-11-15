/* ════════════════════════════════════════════════════════════
   فصل 61 — مدیریت: کاربران
   فهرست کاربران، افزودن تکی و گروهی، سمت‌ها و بخش‌ها (مدیران).
   توابع اصلی: bulkRowHtml، secBtns، stationLabel، usersSummary، userRow، usersList، isMgrUser، listOptions و …
   ════════════════════════════════════════════════════════════ */

function bulkRowHtml(n) {
  var opts = [
      "chassis",
      "trim",
      "st4",
      "st5",
      "gas",
      "mech",
      "quality",
      "roll",
      "commercial",
      "planning",
    ]
      .map(function (k) {
        return (
          '<option value="' +
          k +
          '">' +
          esc(k === "chassis" ? "شاسی و موتور" : STATION_NAME[k]) +
          "</option>"
        );
      })
      .join(""),
    o = "";
  for (var i = 0; i < n; i++)
    o +=
      '<div class="row brow" style="gap:8px"><input class="in num ltr" data-bf="c" inputmode="numeric" autocomplete="off" placeholder="کد پرسنلی" aria-label="کد پرسنلی" style="flex:1 1 120px;min-width:100px"><input class="in" data-bf="n" autocomplete="off" placeholder="نام و نام خانوادگی" aria-label="نام" style="flex:2 1 170px;min-width:140px"><select class="in" data-bf="s" aria-label="ایستگاه" style="flex:1 1 140px;min-width:120px">' +
      opts +
      '</select><input class="in num ltr" data-bf="p" autocomplete="off" inputmode="numeric" placeholder="رمز" aria-label="رمز" style="flex:1 1 90px;min-width:80px"></div>';
  return o;
}

function secBtns(u) {
  var stn = u.station === "engine" ? "chassis" : u.station;
  if (["chassis", "trim", "st4", "st5"].indexOf(stn) < 0) return '<span class="hint">—</span>';
  return [
    ["", "هر دو"],
    ["ewt1", "EWT1"],
    ["ewt2", "EWT2"],
  ]
    .map(function (x) {
      return (
        '<button class="btn sm" data-act="usec" data-u="' +
        esc(u.id) +
        '" data-v="' +
        x[0] +
        '" aria-pressed="' +
        ((u.sec || "") === x[0]) +
        '">' +
        x[1] +
        "</button>"
      );
    })
    .join(" ");
}

function stationLabel(u) {
  if (isCustomRole(u)) return roleSheetsTxt(u);
  if (isMgrUser(u))
    return u.role === "mgr"
      ? (u.mgrTitle || "مدیریت") + (u.mgrUnit ? " " + u.mgrUnit : "")
      : "مدیر/معاون تولید و مهندسی";
  var k = u.station === "engine" ? "chassis" : u.station;
  return k === "chassis" ? "شاسی و موتور" : STATION_NAME[k] || k;
}

function usersSummary(us) {
  var by = {};
  us.forEach(function (u) {
    var l = stationLabel(u);
    by[l] = (by[l] || 0) + 1;
  });
  var chips = Object.keys(by)
    .map(function (l) {
      return '<span class="mgpill">' + esc(l) + " <b>" + faDigits(by[l]) + "</b></span>";
    })
    .join("");
  return (
    '<div class="mgstat"><div class="mgbig"><b>' +
    faDigits(us.length) +
    '</b><span>کاربر ثبت‌شده</span></div><div class="mgchips">' +
    (chips || '<span class="hint">هنوز کاربری اضافه نشده است.</span>') +
    "</div></div>"
  );
}

function userRow(u) {
  var open = S.uOpen === u.id,
    sb = secBtns(u),
    pw = pwCell(u);
  function row(label, body) {
    return body && body !== '<span class="hint">—</span>'
      ? '<div class="mgu-row"><span>' + label + "</span><div>" + body + "</div></div>"
      : "";
  }
  var del =
    S.confirmUser === u.id
      ? '<button class="btn sm" data-act="udelyes" data-id="' +
        esc(u.id) +
        '">تأیید حذف</button> <button class="btn sm" data-act="udelno">انصراف</button>'
      : '<button class="btn sm danger" data-act="udelask" data-id="' +
        esc(u.id) +
        '">حذف کاربر</button>';
  return (
    '<details class="mgu"' +
    (open ? " open" : "") +
    ' data-q="' +
    esc(u.name + " " + u.id) +
    '"><summary data-act="uopen" data-id="' +
    esc(u.id) +
    '"><span class="mgav">' +
    esc((u.name || "?").trim().charAt(0)) +
    '</span><span class="mgu-main"><b>' +
    esc(u.name) +
    '</b><small class="num">' +
    esc(u.id) +
    '</small></span><span class="mgpill">' +
    esc(stationLabel(u)) +
    "</span>" +
    '</summary><div class="mgu-body">' +
    row("بخش چکمن", sb) +
    row("رمز", pw) +
    row("", del) +
    "</div></details>"
  );
}

function usersList(us) {
  if (!us.length) return "";
  return (
    '<input class="in mgsearch" id="mguq" placeholder="جست‌وجوی نام یا کد پرسنلی" autocomplete="off"><div id="mgulist">' +
    us.map(userRow).join("") +
    "</div>"
  );
}

function isMgrUser(u) {
  return !!u && (u.role === "mgr" || u.role === "prodmgr");
}

function listOptions(list) {
  return list
    .map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(v) + "</option>";
    })
    .join("");
}

function stationFields() {
  var opts = [
    "chassis",
    "trim",
    "st4",
    "st5",
    "gas",
    "mech",
    "quality",
    "roll",
    "commercial",
    "planning",
  ]
    .map(function (k) {
      return (
        '<option value="' +
        k +
        '">' +
        esc(k === "chassis" ? "شاسی و موتور" : STATION_NAME[k]) +
        "</option>"
      );
    })
    .join("");
  return (
    '<div class="mgrow"><label class="f">ایستگاه<select class="in" id="us">' +
    opts +
    '</select></label><label class="f">رمز<input class="in" id="up" type="password" autocomplete="new-password"></label></div>'
  );
}

function roleFields() {
  return (
    '<div class="mgrow"><label class="f">نقش<select class="in" id="ur2">' +
    roleDefs()
      .map(function (r) {
        return '<option value="' + esc(r.id) + '">' + esc(r.name) + "</option>";
      })
      .join("") +
    '</select></label><label class="f">رمز<input class="in" id="up" type="password" autocomplete="new-password"></label></div>'
  );
}

// فرم افزودن کاربر.
function addUserForm() {
  var mgr = S.ukind === "mgr";
  return (
    '<form data-form="adduser" class="mgform"><label class="f">نوع حساب<select class="in" id="ukind"><option value="">چکمن / ایستگاه</option><option value="mgr"' +
    (mgr ? " selected" : "") +
    '>مدیریتی (داشبورد)</option><option value="role"' +
    (S.ukind === "role" ? " selected" : "") +
    '>نقش دلخواه (سرپرست و ...)</option></select></label><div class="mgrow"><label class="f">کد پرسنلی<input class="in num ltr" id="uc" inputmode="numeric" autocomplete="off"></label><label class="f">نام و نام خانوادگی<input class="in" id="un" autocomplete="off"></label></div>' +
    (mgr ? mgrFields() : S.ukind === "role" ? roleFields() : stationFields()) +
    (S.formErr ? '<p class="err">' + esc(S.formErr) + "</p>" : "") +
    '<button class="btn primary" type="submit">ذخیره کاربر</button></form>'
  );
}

function bulkUsersForm() {
  return (
    '<form data-form="bulkusers" class="mgform"><p class="hint">هر کاربر یک ردیف: کد پرسنلی، نام، ایستگاه و رمز. با «ردیف جدید» ردیف اضافه کنید. کد تکراری، جایگزین کاربر قبلی می‌شود.</p><div id="bulkrows">' +
    bulkRowHtml(5) +
    '</div><div class="row"><button type="button" class="btn sm" data-act="bulkrow">+ ردیف جدید</button></div>' +
    '<details><summary class="hint" style="cursor:pointer">یا از اکسل کپی کنید و اینجا بچسبانید</summary><p class="hint" style="margin:8px 0">هر خط: کد پرسنلی، نام، ایستگاه، رمز (با ویرگول یا Tab جدا).</p><textarea class="in" id="bulk" rows="5" dir="rtl" style="unicode-bidi:plaintext;text-align:right" placeholder="1234567, علی رضایی, رول تست, 4821"></textarea></details>' +
    (S.bulkMsg ? '<p class="hint">' + esc(S.bulkMsg) + "</p>" : "") +
    '<button class="btn primary" type="submit">افزودن همه</button></form>'
  );
}

// کارت کاربران در مدیریت.
function usersCard() {
  var us = S.data.users.slice().sort(function (a, b) {
      return a.id < b.id ? -1 : 1;
    }),
    open = S.uAdd || S.formErr || S.bulkMsg;
  var add =
    '<button class="btn mgadd" data-act="uadd" aria-expanded="' +
    !!open +
    '">' +
    mgIcon("userplus") +
    "<span>" +
    (open ? "بستن فرم افزودن" : "افزودن کاربر جدید") +
    "</span></button>" +
    (open
      ? addUserForm() +
        '<details class="mgbulk"' +
        (S.bulkMsg ? " open" : "") +
        "><summary>افزودن گروهی کاربران</summary>" +
        bulkUsersForm() +
        "</details>"
      : "");
  return (
    mgCard(
      "users",
      "کاربران و کد پرسنلی",
      "هر چکمن با کد پرسنلی و رمز خودش وارد می‌شود. برای تغییر رمز، «رمز تازه» را در جزئیات کاربر بزنید یا همان کد را دوباره با رمز جدید ذخیره کنید.",
      usersSummary(us) + usersList(us),
    ) + mgCard("userplus", "افزودن کاربر", "", add)
  );
}

// افزودن کاربر جدید توسط مالک.
function submitAddUser() {
  var uc = digits(fieldValue("uc")),
    un = fieldValue("un"),
    up = digits(fieldValue("up")),
    mgr = S.ukind === "mgr",
    cust = S.ukind === "role";
  var us = mgr || cust ? "planning" : fieldValue("us"),
    extra = mgr ? { mgrTitle: fieldValue("ut"), mgrUnit: fieldValue("uu") } : {};
  if (!/^[A-Za-z0-9]+$/.test(uc)) {
    S.formErr = "کد پرسنلی را (فقط حرف لاتین و عدد) وارد کنید.";
    render();
    return;
  }
  if (!un) {
    S.formErr = "نام را بنویسید.";
    render();
    return;
  }
  if (up.length < 4) {
    S.formErr = "رمز دست‌کم ۴ کاراکتر باشد.";
    render();
    return;
  }
  if (mgr && !extra.mgrTitle) {
    S.formErr = "سمت را انتخاب کنید.";
    render();
    return;
  }
  if (cust && !fieldValue("ur2")) {
    S.formErr = "نقش را انتخاب کنید.";
    render();
    return;
  }
  var ur = mgr ? "mgr" : cust ? "cr:" + fieldValue("ur2") : "";
  S.formErr = "";
  if (srvAdmin()) {
    save(function () {
      return adminCall("adduser", {
        users: [Object.assign({ id: uc, name: un, station: us, role: ur, password: up }, extra)],
      });
    }, "کاربر ذخیره شد").then(function (ok) {
      if (ok)
        ["uc", "un", "up"].forEach(function (i) {
          var e = document.getElementById(i);
          if (e) e.value = "";
        });
    });
    return;
  }
  var salt = uid();
  sha256Hex(salt + up)
    .then(function (hh) {
      return save(function () {
        return store.set(
          "users",
          uc,
          Object.assign(
            {
              name: un,
              station: us,
              role: ur,
              salt: salt,
              hash: hh,
              createdAt: nowIso(),
            },
            extra,
          ),
        );
      }, "کاربر ذخیره شد");
    })
    .then(function () {
      ["uc", "un", "up"].forEach(function (i) {
        var e = document.getElementById(i);
        if (e) e.value = "";
      });
    });
}

function submitBulkUsers() {
  var ok = [],
    bad = [],
    seenC = {};
  var addU = function (c, n, stn, pw, label) {
    c = digits(c);
    pw = digits(pw);
    n = String(n || "").trim();
    if (/^[A-Za-z0-9]+$/.test(c) && n && stn && pw && pw.length >= 4 && !seenC[c]) {
      seenC[c] = 1;
      ok.push({ c: c, n: n, st: stn, pw: pw });
    } else bad.push(label);
  };
  var byName = {};
  Object.keys(STATION_NAME).forEach(function (k) {
    if (k !== "owner") {
      byName[STATION_NAME[k]] = k;
      byName[k] = k;
    }
  });
  byName["شاسی"] = "chassis";
  byName[STATION_NAME.engine] = "chassis";
  byName.engine = "chassis";
  Array.prototype.forEach.call(document.querySelectorAll("#bulkrows .brow"), function (rw, i) {
    var g = function (k) {
      var e = rw.querySelector("[data-bf=" + k + "]");
      return e ? e.value : "";
    };
    if (!g("c").trim() && !g("n").trim() && !g("p").trim()) return;
    addU(g("c"), g("n"), g("s"), g("p"), "ردیف " + faDigits(i + 1));
  });
  fieldValue("bulk")
    .split(/\n+/)
    .map(function (x) {
      return x.trim();
    })
    .filter(Boolean)
    .forEach(function (ln, i) {
      var p = ln.split(/[,\t;،]/).map(function (x) {
        return x.trim();
      });
      addU(p[0], p[1], byName[p[2]], p[3], "خط چسبانده " + faDigits(i + 1));
    });
  if (!ok.length && !bad.length) {
    S.bulkMsg = "هیچ ردیفی پر نشده است.";
    render();
    return;
  }
  if (srvAdmin()) {
    adminCall("adduser", {
      users: ok.map(function (u) {
        return { id: u.c, name: u.n, station: u.st, password: u.pw };
      }),
    })
      .then(function () {
        S.bulkMsg =
          faDigits(ok.length) +
          " کاربر ذخیره شد." +
          (bad.length
            ? " ردشده (کد، نام، ایستگاه یا رمز درست نیست یا کد تکراری است): " + bad.join("، ")
            : "");
        render();
      })
      .catch(function (e) {
        S.bulkMsg = "ذخیره نشد. " + ((e && e.message) || "");
        render();
      });
    return;
  }
  Promise.all(
    ok.map(function (u) {
      var salt = uid();
      return sha256Hex(salt + u.pw).then(function (hh) {
        return store.set("users", u.c, {
          name: u.n,
          station: u.st,
          salt: salt,
          hash: hh,
          createdAt: nowIso(),
        });
      });
    }),
  )
    .then(function () {
      S.bulkMsg =
        faDigits(ok.length) +
        " کاربر ذخیره شد." +
        (bad.length
          ? " ردشده (کد، نام، ایستگاه یا رمز درست نیست یا کد تکراری است): " + bad.join("، ")
          : "");
      render();
    })
    .catch(function (e) {
      S.bulkMsg = "ذخیره نشد. " + ((e && e.message) || "");
      render();
    });
}
