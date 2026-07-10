import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3KzSh5jJoH5m5e8TBuekDY1QPDOmodEk",
  authDomain: "campus-drive-exam-portal.firebaseapp.com",
  projectId: "campus-drive-exam-portal",
  storageBucket: "campus-drive-exam-portal.firebasestorage.app",
  messagingSenderId: "1098575356509",
  appId: "1:1098575356509:web:67a4aca520d89b293623b4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export default app;
