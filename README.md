# Pishol Trade Journal — Advanced (Firebase + Charts)

این نسخه پیشرفتهٔ ژورنالِ ترید است که:
- لاگین / ثبت‌نام با ایمیل و رمز
- ذخیرهٔ تریدها در Firebase Firestore (یا fallback به localStorage)
- آپلود اسکرین‌شات (ذخیره به صورت base64)
- جدول با جستجو و فیلتر
- Export CSV
- داشبورد: Equity curve و Winrate chart (Chart.js)

---

## قدم‌های ساده برای فعال کردن ذخیرهٔ آنلاین (Firebase)

1. برو به https://console.firebase.google.com و یک پروژه جدید بساز.
2. در پروژهٔ Firebase → روی آیکون ⚙️ (Settings) → Project settings → در بخش "Your apps" یک Web App اضافه کن (Register app).
3. Firebase بهت یک config می‌دهد شبیه:
   `js
   const firebaseConfig = {
     apiKey: "API_KEY",
     authDomain: "PROJECT_ID.firebaseapp.com",
     projectId: "PROJECT_ID",
     storageBucket: "PROJECT_ID.appspot.com",
     messagingSenderId: "SENDER_ID",
     appId: "APP_ID"
   };
