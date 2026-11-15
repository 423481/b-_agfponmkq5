# قرارداد سرویس دیتابیس «مُهر» (نسخهٔ ۱)

برنامه فقط یک نقطهٔ تماس با دیتابیس دارد (`sbFetch`). برای اینکه کد برنامه دست نخورد و آزمون‌شده بماند،
سرویس شرکت (.NET + SQL) همان **زیرمجموعهٔ کوچک PostgREST** را پیاده می‌کند. نشانی پایه در `API_URL` (فایل `00-settings.js`) می‌نشیند؛
خالی = Supabase فعلی.

مجموعه‌ها: `inspections`، `users`، `archives`. هر سطر `{id, data(JSON), updated_at(ISO-UTC)}`. زمان را فقط سرور می‌گذارد (همیشه صعودی).
هدر `Authorization: Bearer <توکن>` فرستاده می‌شود (خالی تا زمان ورود سروری).

| درخواست | معنی |
|---|---|
| `GET /{c}?select=id,updated_at&order=id&limit=1000&offset=N` | فهرست سبک (تشخیص تغییر/حذف) |
| `GET /{c}?select=id,data,updated_at&order=id&limit=500&offset=N` | فهرست کامل صفحه‌ای |
| `GET /{c}?select=id,data,updated_at&updated_at=gte.<ISO>&order=updated_at,id&limit=1000&offset=N` | فقط تغییرهای بعد از زمان |
| `GET /{c}?select=id,data,updated_at&id=in.("a","b",…)` | چند شناسه (تا ۴۰ تا) |
| `GET /{c}?select=data[,updated_at]&id=eq.<id>` | یک سطر |
| `GET /inspections?select=…&data->>F=in.(v1,v2)` | جستجوی خودرو؛ F یکی از `key, serial, chassisNo, engine, room` |
| `POST /{c}?on_conflict=id` + بدنه `[{id,data}]` | هدر `Prefer: resolution=merge-duplicates` = ذخیره/جایگزینی؛ `resolution=ignore-duplicates,return=representation` = فقط‌جدید (اگر بود، آرایهٔ خالی برگردد) |
| `PATCH /{c}?id=eq.<id>&updated_at=eq.<زمان خوانده‌شده>` + `{data,updated_at}` | قفل خوش‌بینانه؛ فقط اگر زمان هنوز برابر باشد اعمال و سطر را برگرداند، وگرنه `[]` |
| `DELETE /{c}?id=eq.<id>` | حذف |

نکته‌ها
- پارامتر `or=(…)` (بازهٔ بارگذاری) لازم نیست؛ سرور می‌تواند ۴۰۰ بدهد و برنامه خودش به حالت بدون بازه برمی‌گردد.
- خطا: کد ۴xx/۵xx با متن؛ برنامه پیام «سرور: کد …» نشان می‌دهد.
- امنیت (در سرویس واقعی): بررسی توکن و نقش سمت سرور روی هر درخواست؛ `users` فقط برای نقش‌های مجاز؛ CORS فقط برای دامنهٔ برنامه؛ HTTPS.
- آزمون: `node docs/mock-api.js 8899` همین قرارداد را روی حافظه اجرا می‌کند (فقط برای تست).
