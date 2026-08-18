import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC54xOrsxvzFFcF4RTtq-T1OB_2mf0kPsU",
  authDomain: "ja-doei-app.firebaseapp.com",
  projectId: "ja-doei-app",
  storageBucket: "ja-doei-app.firebasestorage.app",
  messagingSenderId: "99714828186",
  appId: "1:99714828186:web:24bc582f2b02bd450c1c23",
  measurementId: "G-P9959J92X7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
