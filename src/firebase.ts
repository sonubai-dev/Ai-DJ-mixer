import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKoB-vzNWPQtJdht9n9kSup3bisWY6gFE",
  authDomain: "syncbeat-bc17c.firebaseapp.com",
  projectId: "syncbeat-bc17c",
  storageBucket: "syncbeat-bc17c.firebasestorage.app",
  messagingSenderId: "405932989246",
  appId: "1:405932989246:web:19f2b64063f3753336ea6f",
  measurementId: "G-9GGXLX7GE5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
