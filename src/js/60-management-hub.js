/* ════════════════════════════════════════════════════════════
   فصل 60 — مدیریت: صفحه‌ی اصلی و ناوبری
   مرکز مدیریت مالک: گروه‌ها، کاشی‌ها، نوار بالا، رنگ‌ها.
   توابع اصلی: mgIcon، mgCard، mgCur، mgmtBar، hubView، mgRow، mgrList، mgrTitles و …
   ════════════════════════════════════════════════════════════ */

var MG_ICONS = {
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  flask: '<path d="M9 3h6M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/>',
  archive:
    '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  userplus:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2M16 7l3 3"/>',
  alert:
    '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
  bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
};

function mgIcon(n) {
  return (
    '<svg class="mgi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    MG_ICONS[n] +
    "</svg>"
  );
}

function mgCard(icon, title, desc, body, cls) {
  return (
    '<div class="card mgc' +
    (cls ? " " + cls : "") +
    '"><div class="mgch">' +
    mgIcon(icon) +
    "<div><h2>" +
    title +
    "</h2>" +
    (desc ? '<p class="hint">' + desc + "</p>" : "") +
    "</div></div>" +
    body +
    "</div>"
  );
}

var MGMT_VIEWS = ["admin", "lists", "smp", "archive"];

/* v167.11: مرکز مدیریت — صفحه‌ی اصلی با ۴ کارت؛ موارد کم‌کاربرد زیر «پیشرفته» */
var MG_GROUPS = [
  [
    "users",
    "کاربران و نقش‌ها",
    "حساب‌ها، دسترسی و نقش‌ها",
    [
      ["users", "کاربران"],
      ["roles", "نقش‌ها"],
    ],
  ],
  ["list", "فهرست‌ها و برگه‌ها", "بندهای بازدید، قطعات و ایرادهای آماده", [["lists", "فهرست‌ها"]]],
  [
    "flask",
    "نمونه‌زنی و بایگانی",
    "نمونه‌ها و خودروهای بایگانی‌شده",
    [
      ["smp", "نمونه‌زنی"],
      ["archive", "بایگانی"],
    ],
  ],
  ["sliders", "تنظیمات", "شیفت‌ها، هدف‌ها، سمت‌ها و بخش‌ها", [["set", "تنظیمات"]]],
];

var MG_ADV = [
  ["sec", "shield", "امنیت", "کد پرسنلی و رمز مدیر"],
  ["data", "database", "داده‌ها و منطقه‌ی خطر", "فهرست بازدیدها و پاک‌سازی"],
];

function mgCur() {
  return S.tab === "admin" ? S.adm || "" : S.tab;
}

function mgmtBar() {
  var cur = mgCur();
  if (!cur) return "";
  var g = MG_GROUPS.filter(function (x) {
      return x[3].some(function (p) {
        return p[0] === cur;
      });
    })[0],
    adv = MG_ADV.filter(function (x) {
      return x[0] === cur;
    })[0];
  var h =
    '<div class="mgtop"><button type="button" class="mgback" data-act="mg" data-t="home">→ مرکز مدیریت</button><h1>' +
    esc(g ? g[1] : adv ? adv[2] : "") +
    "</h1></div>";
  if (g && g[3].length > 1)
    h +=
      '<div class="mgseg" role="tablist">' +
      g[3]
        .map(function (p) {
          return (
            '<button type="button" role="tab" data-act="mg" data-t="' +
            p[0] +
            '" aria-selected="' +
            (p[0] === cur) +
            '">' +
            p[1] +
            "</button>"
          );
        })
        .join("") +
      "</div>";
  return h;
}

var MG_TONE = {
  users: "--stamp",
  list: "--ok",
  flask: "--open",
  sliders: "--tone4",
};

// صفحه‌ی اصلی مدیریت با گروه‌ها و کاشی‌ها.
function hubView() {
  var h =
    '<div class="mghero"><h1>مرکز مدیریت</h1><p>' +
    faDigits(S.data.users.length) +
    " کاربر · " +
    faDigits(totalOpen()) +
    " مورد باز</p></div>";
  h +=
    '<div class="mghub">' +
    MG_GROUPS.map(function (g) {
      return (
        '<button type="button" class="mgtile" style="--tn:var(' +
        MG_TONE[g[0]] +
        ')" data-act="mg" data-t="' +
        g[3][0][0] +
        '">' +
        mgIcon(g[0]) +
        "<b>" +
        g[1] +
        "</b><small>" +
        g[2] +
        "</small></button>"
      );
    }).join("") +
    "</div>";
  return (
    h +
    '<details class="mgmore"><summary>پیشرفته</summary><div class="mgrows">' +
    MG_ADV.map(function (x) {
      return mgRow(x[1], x[2], x[3], 'data-act="mg" data-t="' + x[0] + '"');
    }).join("") +
    mgRow(
      "archive",
      "تاریخچه‌ی تغییرها",
      "فهرست تغییرهای ثبت‌شده",
      'data-act="mg" data-t="lists" data-pg="log"',
    ) +
    "</div></details>"
  );
}

function mgRow(icon, title, desc, attrs) {
  return (
    '<button type="button" class="mgrow2" ' +
    attrs +
    ">" +
    mgIcon(icon) +
    '<span class="mgrt"><b>' +
    title +
    "</b>" +
    (desc ? "<small>" + desc + "</small>" : "") +
    '</span><span class="mgchev" aria-hidden="true">‹</span></button>'
  );
}

function mgrList(key, def) {
  var l = S.lists && S.lists[key];
  return Array.isArray(l) ? l : def;
}

function mgrTitles() {
  return mgrList("mgrTitles", MGR_TITLES_DEF);
}

function mgrUnits() {
  return mgrList("mgrUnits", MGR_UNITS_DEF);
}

function mgrFields() {
  return (
    '<div class="mgrow"><label class="f">سمت<select class="in" id="ut">' +
    listOptions(mgrTitles()) +
    '</select></label><label class="f">بخش<select class="in" id="uu"><option value="">بدون بخش</option>' +
    listOptions(mgrUnits()) +
    '</select></label></div><label class="f">رمز<input class="in" id="up" type="password" autocomplete="new-password"></label>'
  );
}

function adminView() {
  var pages = {
    users: usersCard,
    roles: rolesCards,
    sec: securityCards,
    set: settingsCards,
    data: dataCards,
  };
  return S.adm ? (pages[S.adm] || hubView)() : hubView();
}

function mgrChips(key, list) {
  return (
    list
      .map(function (v) {
        return (
          '<span class="mgpill">' +
          esc(v) +
          ' <button type="button" class="btn sm" data-act="mgrdel" data-k="' +
          key +
          '" data-v="' +
          esc(v) +
          '" aria-label="حذف ' +
          esc(v) +
          '">✕</button></span>'
        );
      })
      .join(" ") || '<span class="hint">خالی</span>'
  );
}

function mgrAddForm(formName, inputId, label) {
  return (
    '<form data-form="' +
    formName +
    '" class="row" style="margin-top:8px"><label class="f grow">' +
    label +
    '<input class="in" id="' +
    inputId +
    '" autocomplete="off" maxlength="30"></label><button class="btn" type="submit">افزودن</button></form>'
  );
}

function mgrCard() {
  var body =
    '<h3 style="margin:0 0 6px;font-size:15px">سمت‌ها</h3><div class="mgchips">' +
    mgrChips("mgrTitles", mgrTitles()) +
    "</div>" +
    mgrAddForm("mgraddt", "mgt_in", "سمت تازه (مثلاً مدیرعامل)") +
    '<h3 style="margin:16px 0 6px;font-size:15px">بخش‌ها</h3><div class="mgchips">' +
    mgrChips("mgrUnits", mgrUnits()) +
    "</div>" +
    mgrAddForm("mgraddu", "mgu_in", "بخش تازه");
  return mgCard(
    "users",
    "سمت‌ها و بخش‌های مدیریتی",
    "این فهرست‌ها در فرم «افزودن کاربر ← مدیریتی» دیده می‌شود. حذف یک مورد فقط از انتخاب‌های بعدی برمی‌دارد و حساب‌های ساخته‌شده را عوض نمی‌کند. دست‌کم یک سمت بماند.",
    body,
  );
}

/* افزودن/حذف یک مورد از فهرست سمت‌ها یا بخش‌ها (ذخیره در سند فهرست‌ها) */
function mgrListSave(key, def, mut, what) {
  var next = mut(mgrList(key, def).slice());
  if (typeof next === "string") {
    toast(next);
    return false;
  }
  return lsSave(
    function (c) {
      c[key] = next;
    },
    what,
    false,
  );
}

function mgrAdd(key, def, inputId) {
  var v = fieldValue(inputId);
  if (!v) {
    toast("نام را بنویسید.");
    return;
  }
  mgrListSave(
    key,
    def,
    function (l) {
      if (l.indexOf(v) >= 0) return "این مورد قبلاً هست.";
      l.push(v);
      return l;
    },
    "افزودن " + v,
  );
}

function mgrRemove(key, def, v) {
  mgrListSave(
    key,
    def,
    function (l) {
      if (key === "mgrTitles" && l.length <= 1) return "دست‌کم یک سمت باید بماند.";
      return l.filter(function (x) {
        return x !== v;
      });
    },
    "حذف " + v,
  );
}

var SET_PAGES = [
  ["num", "hash", "طول مجاز شماره‌ها", "حداقل و حداکثر رقم‌ها", cfgCard],
  ["shift", "sliders", "ساعت شیفت‌ها", "شروع و پایان هر شیفت", shiftCard],
  ["target", "sliders", "هدف تولید روزانه", "", targetCard],
  ["mgr", "users", "سمت‌ها و بخش‌های مدیریتی", "فهرست فرم افزودن کاربر", mgrCard],
  ["mark", "bolt", "نشانه‌ی کسری باز", "بارگذاری سبک", markCard],
];
