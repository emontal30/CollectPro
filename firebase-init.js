const firebaseConfig = {
  apiKey: "AIzaSyA5LyXdHN4twb01ZPQquVgEnREGNjyMyok",
  authDomain: "collectpro-8791f.firebaseapp.com",
  databaseURL: "https://collectpro-8791f.firebaseio.com",
  projectId: "collectpro-8791f",
  storageBucket: "collectpro-8791f.firebasestorage.app",
  messagingSenderId: "284526120646",
  appId: "1:284526120646:web:6108ab0ccdbd01098c11c7",
  measurementId: "G-WWLE0GJK3Y"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// إنشاء مراجع للخدمات التي ستستخدمها
const auth = firebase.auth();
const database = firebase.database();

console.log("Firebase initialized successfully!");

// الآن يمكنك استخدام 'auth' و 'database' في ملف script.js