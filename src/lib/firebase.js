import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCN33Ef3xx3PZyu1F-pvSyRYWlFt28YD_g",
  authDomain: "possoftware-93abe.firebaseapp.com",
  databaseURL: "https://possoftware-93abe-default-rtdb.firebaseio.com",
  projectId: "possoftware-93abe",
  storageBucket: "possoftware-93abe.appspot.com",
  messagingSenderId: "1070673846419",
  appId: "1:1070673846419:web:2d6698e1a5dba120176d66",
  measurementId: "G-BXSFDXQ6P4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistence

export const auth = getAuth(app);
export const db = getDatabase(app);
