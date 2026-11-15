/* ════════════════════════════════════════════════════════════
   داده‌ی ایستگاه‌ها — پایه
   این فایل فقط «ظرف» داده‌ها را می‌سازد و ترتیب ایستگاه‌ها را نگه می‌دارد.
   فهرست آیتم‌های هر ایستگاه در فایل جداگانه‌ی همان ایستگاه است (پوشه‌ی data).
   ════════════════════════════════════════════════════════════ */

var SHEETS = {
  engine: null,
  chassis: null,
  trim: null,
  final1: null,
  final2: null,
  mech: null,
  roll: null,
  road: null,
  mech2: null,
  comm: null,
  gas: null,
};
var EXTEND_ITEMS = { chassis: null, engine: null, trim: null, final1: null, final2: null };
var EXTEND_GROUPS = { chassis: null, engine: null, trim: null, final1: null, final2: null };
