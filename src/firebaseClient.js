import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCggeL8S5bnckPd_IZ5Yt2Ichb-98VuhDo",
  authDomain: "vila-olinda-app.firebaseapp.com",
  projectId: "vila-olinda-app",
  storageBucket: "vila-olinda-app.firebasestorage.app",
  messagingSenderId: "802331621603",
  appId: "1:802331621603:web:d1b68fa33d189073bdadd6",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
