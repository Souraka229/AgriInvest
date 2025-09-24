// firebase-config.js - Version modulaire Firebase v12
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
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
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Configuration Firebase
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

// Exporter les fonctions Firebase pour une utilisation globale
window.firebaseApp = {
    // Auth functions
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    
    // Firestore functions
    db,
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
    serverTimestamp,
    
    // Helper functions
    firestore: {
        FieldValue: {
            increment: increment,
            serverTimestamp: serverTimestamp
        }
    }
};

console.log('✅ Firebase configuré avec succès!');