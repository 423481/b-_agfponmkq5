/* ════════════════════════════════════════════════════════════
   فصل 63 — مدیریت: نقش‌ها و دسترسی‌ها
   نقش‌های ساخته‌شده توسط مالک، دسترسی هر نقش به تب‌ها و محدوده‌ی کار.
   توابع اصلی: roleDefs، customRoleId، isCustomRole، roleDefOf، rolePerm، userSheets، firstRoleTab، customTabs و …
   ════════════════════════════════════════════════════════════ */

/* ---------- نقش‌ها و دسترسی‌ها (مدیر می‌سازد؛ حساب نقش دلخواه role="cr:<id>" دارد) ---------- */
var ROLE_PERMS = [
  ["dash", "داشبورد"],
  ["short", "کسری‌های باز"],
  ["smp", "نمونه‌زنی"],
  ["report", "گزارش"],
  ["car", "پرونده خودرو"],
  ["cpf", "فرم حفاظت از مشتری"],
];

var AREAS = {
  all: { label: "همه‌ی حوزه‌ها", sheets: null },
  chassis: { label: "شاسی و موتور", sheets: ["chassis", "engine"] },
  trim: { label: "تزیینات", sheets: ["trim"] },
  gas: { label: "تست گاز", sheets: ["gas"] },
  final: { label: "نهایی (بالا و پایین)", sheets: ["final1", "final2"] },
  mech: { label: "مکانیکی", sheets: ["mech", "mech2"] },
  roll: { label: "رول تست", sheets: ["roll"] },
  road: { label: "تست جاده", sheets: ["road"] },
  comm: { label: "تجاری", sheets: ["comm"] },
};

var ROLE_DEFAULTS = [
  {
    id: "sup_chassis",
    name: "سرپرست شاسی و موتور",
    scope: "chassis",
    tabs: { dash: true, cpf: true },
  },
  {
    id: "sup_final",
    name: "سرپرست نهایی",
    scope: "final",
    tabs: { dash: true, cpf: true },
  },
  {
    id: "sup_trim",
    name: "سرپرست تزیینات",
    scope: "trim",
    tabs: { dash: true, cpf: true },
  },
];

function roleDefs() {
  var r = S.lists && S.lists.roles;
  return Array.isArray(r) ? r : ROLE_DEFAULTS;
}

function customRoleId(u) {
  var m = u && /^cr:(.+)$/.exec(u.role || "");
  return m ? m[1] : "";
}

function isCustomRole(u) {
  return !!customRoleId(u);
}

function roleDefOf(u) {
  var id = customRoleId(u);
  return id
    ? roleDefs().filter(function (r) {
        return r.id === id;
      })[0] || null
    : null;
}

function rolePerm(p) {
  var d = roleDefOf(S.user);
  return !!(d && d.tabs && d.tabs[p]);
}

/* حوزه‌ی مجاز کاربر: فهرست برگه‌ها، یا null یعنی همه */
function userSheets() {
  var d = roleDefOf(S.user);
  return d && AREAS[d.scope] ? AREAS[d.scope].sheets : null;
}

function firstRoleTab() {
  var t = ROLE_PERMS.map(function (x) {
    return x[0];
  }).filter(rolePerm);
  return t[0] || "dash";
}

function customTabs() {
  var h = '<div class="tabs main" role="tablist">';
  ROLE_PERMS.forEach(function (p) {
    if (rolePerm(p[0]))
      h += p[0] === "short" ? shortTab() : p[0] === "cpf" ? cpfTab() : tabBtn(p[0], p[1]);
  });
  return h + "</div>";
}

function roleEmptyView() {
  return '<div class="card"><p class="hint" style="margin:0">برای این نقش تبی فعال نشده است. با مدیر تماس بگیرید.</p></div>';
}

function roleSheetsTxt(u) {
  var d = roleDefOf(u);
  return d ? d.name : "نقش حذف‌شده";
}

/* ---------- صفحه‌ی مدیریت نقش‌ها ---------- */
function roleForm(r) {
  var tabs = ROLE_PERMS.map(function (p) {
    return (
      '<label class="chk"><input type="checkbox" id="rp_' +
      r.id +
      "_" +
      p[0] +
      '"' +
      (r.tabs && r.tabs[p[0]] ? " checked" : "") +
      "> " +
      p[1] +
      "</label>"
    );
  }).join("");
  var scope = areaOptions(r.scope);
  var del =
    S.roleDel === r.id
      ? '<button type="button" class="btn sm danger" data-act="roledelyes" data-id="' +
        esc(r.id) +
        '">تأیید حذف</button><button type="button" class="btn sm" data-act="roledelno">انصراف</button>'
      : '<button type="button" class="btn sm danger" data-act="roledelask" data-id="' +
        esc(r.id) +
        '">حذف نقش</button>';
  return (
    '<form data-form="rolesave" data-id="' +
    esc(r.id) +
    '" class="mgform" style="border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:12px"><label class="f">نام نقش<input class="in" id="rn_' +
    r.id +
    '" value="' +
    esc(r.name) +
    '" maxlength="40"></label><label class="f">محدود به حوزه<select class="in" id="rs_' +
    r.id +
    '">' +
    scope +
    '</select></label><div class="row">' +
    tabs +
    '</div><div class="row"><button class="btn primary" type="submit">ذخیره</button>' +
    del +
    "</div></form>"
  );
}

function areaOptions(cur) {
  return Object.keys(AREAS)
    .map(function (k) {
      return (
        '<option value="' +
        k +
        '"' +
        (k === cur ? " selected" : "") +
        ">" +
        esc(AREAS[k].label) +
        "</option>"
      );
    })
    .join("");
}

function restoreBtns() {
  return S.roleRestore
    ? '<span class="hint">سه نقش آماده به حالت اولشان برمی‌گردند (نقش‌های دیگر دست نمی‌خورند).</span><button type="button" class="btn sm danger" data-act="rolerestoreyes">تأیید</button><button type="button" class="btn sm" data-act="rolerestoreno">انصراف</button>'
    : '<button type="button" class="btn sm" data-act="rolerestoreask">برگرداندن سه نقش آماده</button>';
}

// نقش‌های ساخته‌شده و دسترسی هر نقش.
function rolesCards() {
  var add =
    '<form data-form="roleadd" class="mgform"><label class="f">نقش تازه (مثلاً مدیر نقاشی)<input class="in" id="rnew" autocomplete="off" maxlength="40"></label><label class="f">حوزه<select class="in" id="rnew_sc">' +
    areaOptions("all") +
    '</select></label><button class="btn" type="submit">افزودن نقش</button></form><div class="row" style="margin-top:12px">' +
    restoreBtns() +
    "</div>";
  return mgCard(
    "shield",
    "نقش‌ها و دسترسی‌ها",
    "برای هر نقش مشخص کنید کدام تب‌ها را ببیند و به کدام حوزه محدود باشد. حساب این نقش‌ها بازدید ثبت نمی‌کند و فقط تب‌های انتخاب‌شده را دارد. دسترسی فعلاً فقط در ظاهر برنامه اعمال می‌شود.",
    roleDefs().map(roleForm).join("") + add,
  );
}

/* ذخیره‌ی کل فهرست نقش‌ها در سند فهرست‌ها */
function rolesSave(next, what) {
  return lsSave(
    function (c) {
      c.roles = next;
    },
    what,
    false,
  );
}

function roleFromForm(r) {
  var tabs = {};
  ROLE_PERMS.forEach(function (p) {
    var e = document.getElementById("rp_" + r.id + "_" + p[0]);
    if (e && e.checked) tabs[p[0]] = true;
  });
  return {
    id: r.id,
    name: fieldValue("rn_" + r.id),
    scope: fieldValue("rs_" + r.id) || "all",
    tabs: tabs,
  };
}

function roleSaveForm(id) {
  var cur = roleDefs(),
    r = cur.filter(function (x) {
      return x.id === id;
    })[0];
  if (!r) return;
  var nr = roleFromForm(r);
  if (!nr.name) {
    toast("نام نقش را بنویسید.");
    return;
  }
  rolesSave(
    cur.map(function (x) {
      return x.id === id ? nr : x;
    }),
    "ذخیره‌ی نقش " + nr.name,
  );
}

function roleAddForm() {
  var name = fieldValue("rnew");
  if (!name) {
    toast("نام نقش را بنویسید.");
    return;
  }
  rolesSave(
    roleDefs().concat([
      {
        id: "r" + Date.now().toString(36),
        name: name,
        scope: fieldValue("rnew_sc") || "all",
        tabs: { dash: true, cpf: true },
      },
    ]),
    "افزودن نقش " + name,
  );
}

/* نقش‌های آماده با همان شناسه جایگزین می‌شوند یا اگر نیستند اضافه می‌شوند */
function rolesRestore() {
  S.roleRestore = false;
  var cur = roleDefs().map(function (r) {
    var d = ROLE_DEFAULTS.filter(function (x) {
      return x.id === r.id;
    })[0];
    return d || r;
  });
  ROLE_DEFAULTS.forEach(function (d) {
    if (
      !cur.some(function (r) {
        return r.id === d.id;
      })
    )
      cur.push(d);
  });
  rolesSave(cur, "برگرداندن نقش‌های آماده");
}

function roleDelete(id) {
  var r = roleDefs().filter(function (x) {
    return x.id === id;
  })[0];
  S.roleDel = "";
  rolesSave(
    roleDefs().filter(function (x) {
      return x.id !== id;
    }),
    "حذف نقش " + (r ? r.name : ""),
  );
}

function submitRoleSave(ev) {
  roleSaveForm(ev.target.getAttribute("data-id"));
}

function submitRoleAdd() {
  roleAddForm();
}
