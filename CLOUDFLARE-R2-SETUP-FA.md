# راه‌اندازی مدیریت فایل LinkBox با Cloudflare R2

## معماری و هزینه
- رابط کاربری روی GitHub Pages می‌ماند.
- فایل‌ها در Cloudflare R2 ذخیره می‌شوند؛ دیتابیس D1 فقط مشخصات فایل و وضعیت بارگذاری را نگه می‌دارد.
- Cloudflare Worker واسط امن بین سایت و R2 است.
- Supabase Auth فعلی برای ورود مدیر استفاده می‌شود.
- فایل‌ها به قطعات ۱۰ مگابایتی تقسیم می‌شوند؛ خود R2 multipart upload تا ۵ ترابایت برای هر آبجکت را پشتیبانی می‌کند؛ این پیاده‌سازی وب با قطعات ۱۰ مگابایتی و سقف ۱۰٬۰۰۰ قطعه، فعلاً هر فایل را تا حدود ۱۰۰ گیگابایت می‌پذیرد.

**فضای نامحدود رایگان وجود ندارد.** R2 در پلن Standard در حال حاضر ۱۰ GB-month فضای رایگان، یک میلیون عملیات Class A و ده میلیون عملیات Class B در ماه دارد. بالاتر از آن هزینه ذخیره‌سازی و عملیات محاسبه می‌شود؛ انتقال خروجی اینترنتی R2 هزینه egress ندارد. قیمت‌ها ممکن است تغییر کنند؛ پیش از استفاده حجیم، صفحه رسمی را بررسی کنید: https://developers.cloudflare.com/r2/pricing/

## ۱) ساخت منابع Cloudflare
1. وارد https://dash.cloudflare.com شوید و حساب بسازید.
2. از Storage & databases > R2 یک Bucket با نام `linkbox-files` بسازید.
3. از Storage & databases > D1 یک دیتابیس با نام `linkbox-file-index` بسازید.
4. در بخش D1، قسمت Console، محتوای `cloudflare-worker/schema.sql` را اجرا کنید.
5. در Cloudflare Workers یک Worker ایجاد کنید یا با Wrangler از پوشه `cloudflare-worker` Deploy کنید.

## ۲) تنظیم Worker
1. فایل `cloudflare-worker/wrangler.toml` را باز کنید و `database_id` واقعی D1 را جایگزین کنید.
2. در تنظیمات Worker، متغیرهای محیطی و Secrets را تنظیم کنید:
   - `SUPABASE_URL` = آدرس پروژه Supabase فعلی
   - `SUPABASE_ANON_KEY` = کلید publishable/anon همان پروژه (به‌صورت Secret)
   - `ADMIN_EMAILS` = ایمیل حساب مدیر مجاز؛ اگر چند مدیر دارید با کاما جدا کنید
   - `MAX_RECEIVE_BYTES` = حداکثر حجم هر فایل دریافتی بر حسب بایت؛ پیش‌فرض ۵ ترابایت است اما رابط فعلی سقف ۱۰۰ گیگابایت دارد
3. در Bindings، اتصال R2 با نام متغیر `FILES` و Bucket برابر `linkbox-files` و اتصال D1 با نام متغیر `DB` برقرار باشد.
4. Worker را Deploy کنید و نشانی آن را کپی کنید.

برای Deploy با Wrangler (پس از نصب Node.js و Wrangler):
```bash
cd cloudflare-worker
npx wrangler login
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put ADMIN_EMAILS
npx wrangler deploy
```
مقدار `SUPABASE_URL` و `MAX_RECEIVE_BYTES` در `wrangler.toml`/Variables قابل تنظیم است. برای `SUPABASE_ANON_KEY` از Secret استفاده کنید.

## ۳) اتصال به سایت
در `config.js` مقدار `fileWorkerUrl` را با نشانی Worker جایگزین کنید، برای نمونه:
```js
fileWorkerUrl: "https://linkbox-file-worker.YOUR-SUBDOMAIN.workers.dev"
```
فایل‌ها را Commit و Push کنید تا GitHub Pages به‌روزرسانی شود.

## ۴) استفاده
- از منوی LinkBox وارد «مدیریت فایل» شوید.
- با حساب مدیر فعلی وارد شوید.
- «بارگذاری فایل» فایل‌ها را به‌صورت قطعه‌ای در R2 می‌فرستد.
- «ساخت لینک دریافت» یک لینک ۷۲ ساعته برای دریافت فایل از دیگران می‌سازد؛ لینک را برای فرستنده ارسال کنید. فایل دریافتی در آرشیو مدیر با برچسب ورودی قرار می‌گیرد.
- لینک دانلود آرشیو خصوصی ۱۵ دقیقه اعتبار دارد.

## نکات امنیتی و محدودیت‌ها
- کلیدهای R2، کلید سرویس Supabase و هیچ Secret را هرگز در `config.js` یا GitHub قرار ندهید.
- فقط کلید publishable/anon Supabase در کد مرورگر باقی می‌ماند؛ Worker احراز هویت را با Supabase Auth بررسی می‌کند و در صورت تنظیم `ADMIN_EMAILS` ایمیل را هم محدود می‌کند.
- لینک دریافت یک مجوز Bearer است؛ هرکس آن را داشته باشد تا زمان انقضا امکان بارگذاری دارد. آن را فقط برای گیرنده موردنظر بفرستید.
- حذف فایل از آرشیو، آبجکت R2 را نیز حذف می‌کند.
- این نسخه فهرست فایل‌های دریافتی و شخصی را در یک آرشیو مدیر نشان می‌دهد؛ سطح دسترسی مدیران را با `ADMIN_EMAILS` محدود کنید.
- برای آرشیو حساس، قبل از بارگذاری واقعی ابتدا با چند فایل آزمایشی کارکرد و بازیابی را بررسی کنید و برای داده‌های مهم نسخه پشتیبان مستقل داشته باشید.
