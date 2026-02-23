// Firebase Configuration
// Replace these values with your actual Firebase project credentials

const firebaseConfig = {
    apiKey: "AIzaSyAoZ4snOk8Y89ufiorLcSvy3AXy0Kv_T78",
  authDomain: "swifthelp-ecd54.firebaseapp.com",
  projectId: "swifthelp-ecd54",
  storageBucket: "swifthelp-ecd54.firebasestorage.app",
  messagingSenderId: "575657998341",
  appId: "1:575657998341:web:0109339c3a31bd9ec5c46c",
  measurementId: "G-K3F0T69KZP"
};

// Initialize Firebase
let app, auth, db, storage;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();

    // Storage is optional - only initialize if you've enabled it in Firebase Console
    try {
        storage = firebase.storage();
        console.log('✅ Firebase Storage initialized');
    } catch (storageError) {
        console.log('ℹ️ Firebase Storage not enabled (optional - can be added later)');
        storage = null;
    }

    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Export for use in other files
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDB = db;
window.firebaseStorage = storage;
