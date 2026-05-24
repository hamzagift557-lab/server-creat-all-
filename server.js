require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
app.use(cors());
app.use(express.json());

// 1. إعداد Firebase Admin SDK
// سيقرأ السيرفر المفتاح السري من متغيرات البيئة في Fly.io
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://hamza-kr-default-rtdb.firebaseio.com" // رابط قاعدتك
});

const db = admin.database();

// 2. إعداد Cloudflare R2 عبر AWS S3 SDK
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// إعداد رفع الملفات في الذاكرة المؤقتة للسيرفر
const upload = multer({ storage: multer.memoryStorage() });

// ---------------------------------------------------------
// المسارات (APIs)
// ---------------------------------------------------------

// أ. تسجيل الدخول للبائعين
app.post('/api/login', async (req, res) => {
    const { sellerKey } = req.body;
    
    if (!sellerKey) {
        return res.status(400).json({ success: false, message: "المرجو إدخال المفتاح" });
    }

    try {
        // البحث عن المفتاح في مجلد keys في فايربيس
        const snapshot = await db.ref('keys').orderByValue().equalTo(sellerKey).once('value');
        const data = snapshot.val();

        if (data) {
            // استخراج اسم البائع (مثل hamza store)
            const sellerName = Object.keys(data)[0];
            return res.json({ success: true, sellerName: sellerName, message: "تم تسجيل الدخول بنجاح" });
        } else {
            return res.status(401).json({ success: false, message: "المفتاح غير صحيح" });
        }
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ success: false, message: "حدث خطأ في السيرفر" });
    }
});

// مسار تجريبي للتأكد من عمل السيرفر
app.get('/', (req, res) => {
    res.send("EPEC Store API is Running 🚀");
});

// تشغيل السيرفر
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
