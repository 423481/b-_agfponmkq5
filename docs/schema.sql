-- ساختار عمومی دیتابیس «مُهر» (مستقل از نوع SQL؛ برای SQL Server/PostgreSQL کمی تطبیق لازم است)
-- هر مجموعه (inspections / users / archives) یک جدول با سه ستون: شناسه، محتوای JSON، زمان تغییر.

CREATE TABLE inspections (
  id         VARCHAR(200) NOT NULL PRIMARY KEY,
  data       NVARCHAR(MAX) NOT NULL,          -- JSON پرونده (PostgreSQL: JSONB)
  updated_at DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE archives (
  id         VARCHAR(200) NOT NULL PRIMARY KEY,
  data       NVARCHAR(MAX) NOT NULL,
  updated_at DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE users (
  id         VARCHAR(200) NOT NULL PRIMARY KEY,
  data       NVARCHAR(MAX) NOT NULL,
  updated_at DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME()
);

-- خواندن افزایشی (هر ۵ ثانیه) و جستجو فقط با زمان تغییر انجام می‌شود
CREATE INDEX ix_inspections_updated ON inspections (updated_at, id);
CREATE INDEX ix_archives_updated    ON archives    (updated_at, id);
CREATE INDEX ix_users_updated       ON users       (updated_at, id);

-- جستجوی خودرو با شمارهٔ سریال/شاسی/موتور/اتاق: ستون‌های محاسبه‌شده از JSON
-- (در SQL Server: ستون persisted با JSON_VALUE؛ در PostgreSQL: ایندکس روی data->>'serial')
-- ALTER TABLE inspections ADD serial  AS JSON_VALUE(data,'$.serial')    PERSISTED;
-- ALTER TABLE inspections ADD chassis AS JSON_VALUE(data,'$.chassisNo') PERSISTED;
-- ALTER TABLE inspections ADD engine  AS JSON_VALUE(data,'$.engine')    PERSISTED;
-- ALTER TABLE inspections ADD room    AS JSON_VALUE(data,'$.room')      PERSISTED;
-- CREATE INDEX ix_insp_serial ON inspections (serial);
-- (همین چهار ستون برای archives هم تکرار شود)
