// ✅ Fixit Firebase Configuration (connected to your "bang-bonus" Firebase project)

// Firebase SDK script load karni zaruri hai before this file is called
// So make sure in index.html, before this file, you add Firebase CDN scripts (shown below)

const firebaseConfig = {
  apiKey: "AIzaSyCv_Ce8EnmFISrPz9eB-_xx63zEWCEO8jk",
  authDomain: "bang-bonus.firebaseapp.com",
  projectId: "bang-bonus",
  storageBucket: "bang-bonus.firebasestorage.app",
  messagingSenderId: "270808547011",
  appId: "1:270808547011:web:2feb103ce9e891fd7bec76",
  measurementId: "G-D8TLSF2P2Y"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics(app);
