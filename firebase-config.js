// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Remplacez par votre configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB7p0HYUDyEVE79wkdZ4VSP7Okyf9djsNI",
    authDomain: "xlab-dbe8d.firebaseapp.com",
    projectId: "xlab-dbe8d",
    storageBucket: "xlab-dbe8d.firebasestorage.app",
    messagingSenderId: "1029412345967",
    appId: "1:1029412345967:web:fceb97686ee8885ca9959a"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exporter pour utilisation globale
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseApp = app;

// Exporter les fonctions
window.firebaseFunctions = {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, orderBy, increment, serverTimestamp
};