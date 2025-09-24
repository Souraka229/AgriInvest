// app.js - Application AgriInvest avec Firebase v12 modulaire
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

// Variables globales
let currentUser = null;
let userData = null;
let products = [];

// Configuration API MTN Mobile Money
const MTN_API_CONFIG = {
    apiKey: "VOTRE_CLÉ_API_MTN",
    baseUrl: "https://api.mtn.com/v1/",
    callbackUrl: "https://votresite.com/callback"
};

// Attendre que Firebase soit chargé
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeApp, 500);
});

async function initializeApp() {
    try {
        // Initialiser Firebase avec la configuration globale
        const firebaseApp = window.firebaseApp;
        if (!firebaseApp) {
            throw new Error('Firebase non initialisé');
        }
        
        console.log('🚀 Initialisation de l\'application AgriInvest...');
        
        // Configurer les écouteurs d'événements
        setupEventListeners();
        
        // Observer l'état d'authentification
        setupAuthListener();
        
        // Charger les produits
        await loadProducts();
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
    }
}

function setupEventListeners() {
    // Navigation
    document.getElementById('dashboard-link').addEventListener('click', showDashboard);
    document.getElementById('invest-link').addEventListener('click', showInvest);
    document.getElementById('history-link').addEventListener('click', showHistory);
    document.getElementById('withdraw-link').addEventListener('click', showWithdraw);
    
    // Authentification
    document.getElementById('login-btn').addEventListener('click', showLoginForm);
    document.getElementById('signup-btn').addEventListener('click', showSignupForm);
    document.getElementById('show-signup').addEventListener('click', showSignupForm);
    document.getElementById('show-login').addEventListener('click', showLoginForm);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Formulaires
    document.getElementById('login-form-submit').addEventListener('submit', handleLogin);
    document.getElementById('signup-form-submit').addEventListener('submit', handleSignup);
    document.getElementById('withdraw-form').addEventListener('submit', handleWithdraw);
    document.getElementById('invest-form').addEventListener('submit', handleInvestment);
    
    // Onglets historique
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('invest-quantity').addEventListener('input', updateInvestTotal);
    
    // Fermer modal en cliquant à l'extérieur
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('invest-modal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

function setupAuthListener() {
    const { onAuthStateChanged, auth } = window.firebaseApp;
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Utilisateur connecté
            currentUser = user;
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('user-info').style.display = 'inline';
            document.getElementById('login-btn').style.display = 'none';
            document.getElementById('signup-btn').style.display = 'none';
            document.getElementById('auth-forms').style.display = 'none';
            
            await loadUserData();
            await loadProducts();
            showDashboard();
        } else {
            // Utilisateur déconnecté
            currentUser = null;
            userData = null;
            document.getElementById('user-info').style.display = 'none';
            document.getElementById('login-btn').style.display = 'inline';
            document.getElementById('signup-btn').style.display = 'inline';
            document.getElementById('auth-forms').style.display = 'block';
            showLoginForm();
            
            hideAllSections();
        }
    });
}

// FONCTIONS D'AUTHENTIFICATION
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { signInWithEmailAndPassword, auth } = window.firebaseApp;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('Erreur de connexion: ' + error.message);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const referralCode = document.getElementById('referral-code').value;
    const { createUserWithEmailAndPassword, auth, db, doc, setDoc, serverTimestamp } = window.firebaseApp;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Créer le document utilisateur
        await setDoc(doc(db, 'users', user.uid), {
            email: email,
            capitalInvesti: 0,
            revenus: 0,
            bonusBienvenue: 0,
            bonusParrainage: 0,
            retraits: 0,
            dateInscription: serverTimestamp(),
            codeParrain: generateReferralCode(),
            parrain: referralCode || null
        });
        
        // Appliquer le bonus de parrainage si code fourni
        if (referralCode) {
            await applyReferralBonus(referralCode, user.uid);
        }
        
        alert('Compte créé avec succès!');
        
    } catch (error) {
        alert('Erreur d\'inscription: ' + error.message);
    }
}

async function handleLogout() {
    const { signOut, auth } = window.firebaseApp;
    
    try {
        await signOut(auth);
    } catch (error) {
        alert('Erreur de déconnexion: ' + error.message);
    }
}

// FONCTIONS DE GESTION DES DONNÉES
async function loadUserData() {
    if (!currentUser) return;
    
    const { db, doc, getDoc } = window.firebaseApp;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            updateDashboard();
        }
    } catch (error) {
        console.error('Erreur chargement données utilisateur:', error);
    }
}

async function loadProducts() {
    const { db, collection, getDocs } = window.firebaseApp;
    
    try {
        const querySnapshot = await getDocs(collection(db, 'produits'));
        products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        // Si aucun produit, créer les produits par défaut
        if (products.length === 0) {
            await initializeDefaultProducts();
            await loadProducts(); // Recharger après création
        } else {
            displayProducts();
        }
    } catch (error) {
        console.error('Erreur chargement produits:', error);
    }
}

async function initializeDefaultProducts() {
    const { db, collection, addDoc, serverTimestamp } = window.firebaseApp;
    
    const defaultProducts = [
        {
            nom: "Riz",
            description: "Investissement dans la culture du riz - Rendement garanti",
            prix: 10000,
            limiteReinvestissement: 10,
            capitalInvesti: 0,
            createdAt: serverTimestamp()
        },
        {
            nom: "Anacarde",
            description: "Investissement dans la culture de l'anacarde - Haut rendement",
            prix: 15000,
            limiteReinvestissement: 8,
            capitalInvesti: 0,
            createdAt: serverTimestamp()
        },
        {
            nom: "Tomate",
            description: "Investissement dans la culture de la tomate - Cycle court",
            prix: 8000,
            limiteReinvestissement: 12,
            capitalInvesti: 0,
            createdAt: serverTimestamp()
        }
    ];
    
    for (const product of defaultProducts) {
        await addDoc(collection(db, 'produits'), product);
    }
    
    console.log('✅ Produits par défaut créés');
}

// FONCTIONS D'AFFICHAGE
function showDashboard() {
    hideAllSections();
    document.getElementById('dashboard').style.display = 'block';
    if (currentUser) updateDashboard();
}

function showInvest() {
    hideAllSections();
    document.getElementById('dashboard').style.display = 'block';
}

function showHistory() {
    hideAllSections();
    document.getElementById('history').style.display = 'block';
    if (currentUser) loadTransactionHistory();
}

function showWithdraw() {
    hideAllSections();
    document.getElementById('withdraw').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function showSignupForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
}

function hideAllSections() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('history').style.display = 'none';
    document.getElementById('withdraw').style.display = 'none';
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function updateDashboard() {
    if (!userData) return;
    
    document.getElementById('total-invested').textContent = formatCurrency(userData.capitalInvesti || 0);
    document.getElementById('daily-income').textContent = formatCurrency(calculateDailyIncome());
    document.getElementById('total-bonus').textContent = formatCurrency((userData.bonusBienvenue || 0) + (userData.bonusParrainage || 0));
    document.getElementById('available-balance').textContent = formatCurrency(calculateAvailableBalance());
}

function displayProducts() {
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = '';
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <h4>${product.nom}</h4>
            <p>${product.description || 'Investissement agricole rentable'}</p>
            <p>Prix: ${formatCurrency(product.prix)} FCFA</p>
            <p>Limite: ${product.limiteReinvestissement} investissements</p>
            <p>Capital investi: ${formatCurrency(product.capitalInvesti || 0)} FCFA</p>
            <button class="btn-primary invest-btn" data-product-id="${product.id}">Investir</button>
        `;
        productsList.appendChild(productCard);
    });
    
    document.querySelectorAll('.invest-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            openInvestModal(this.dataset.productId);
        });
    });
}

// FONCTIONS D'INVESTISSEMENT
function openInvestModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('modal-product-name').textContent = product.nom;
    document.getElementById('modal-product-price').textContent = formatCurrency(product.prix);
    document.getElementById('modal-product-limit').textContent = product.limiteReinvestissement;
    document.getElementById('invest-quantity').value = 1;
    document.getElementById('invest-quantity').max = product.limiteReinvestissement;
    updateInvestTotal();
    
    document.getElementById('invest-form').dataset.productId = productId;
    document.getElementById('invest-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('invest-modal').style.display = 'none';
}

function updateInvestTotal() {
    const quantity = parseInt(document.getElementById('invest-quantity').value) || 0;
    const productId = document.getElementById('invest-form').dataset.productId;
    const product = products.find(p => p.id === productId);
    
    if (product) {
        const total = quantity * product.prix;
        document.getElementById('invest-total').textContent = formatCurrency(total);
    }
}

async function handleInvestment(e) {
    e.preventDefault();
    
    const productId = this.dataset.productId;
    const quantity = parseInt(document.getElementById('invest-quantity').value);
    const phoneNumber = document.getElementById('invest-phone').value;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const amount = quantity * product.prix;
    
    try {
        const paymentSuccess = await processMTNPayment(phoneNumber, amount);
        
        if (paymentSuccess) {
            await updateInvestment(productId, quantity, amount);
            closeModal();
            await loadUserData();
            await loadProducts();
            alert('Investissement réalisé avec succès!');
        } else {
            alert('Échec du paiement. Veuillez réessayer.');
        }
    } catch (error) {
        alert('Erreur lors de l\'investissement: ' + error.message);
    }
}

async function processMTNPayment(phoneNumber, amount) {
    // Simulation de paiement MTN
    return new Promise((resolve) => {
        setTimeout(() => resolve(true), 2000);
    });
}

async function updateInvestment(productId, quantity, amount) {
    if (!currentUser) return;
    
    const { db, doc, updateDoc, collection, addDoc, increment, serverTimestamp } = window.firebaseApp;
    
    try {
        // Mettre à jour le capital de l'utilisateur
        await updateDoc(doc(db, 'users', currentUser.uid), {
            capitalInvesti: increment(amount)
        });
        
        // Mettre à jour le capital du produit
        await updateDoc(doc(db, 'produits', productId), {
            capitalInvesti: increment(amount)
        });
        
        // Enregistrer le dépôt
        await addDoc(collection(db, 'depots'), {
            userId: currentUser.uid,
            productId: productId,
            amount: amount,
            quantity: quantity,
            date: serverTimestamp(),
            status: 'completed'
        });
        
        // Bonus de bienvenue si premier dépôt
        if (!userData.bonusBienvenue) {
            const welcomeBonus = amount * 0.25;
            await updateDoc(doc(db, 'users', currentUser.uid), {
                bonusBienvenue: welcomeBonus
            });
        }
        
    } catch (error) {
        throw error;
    }
}

// FONCTIONS DE RETRAIT
async function handleWithdraw(e) {
    e.preventDefault();
    
    const amount = parseInt(document.getElementById('withdraw-amount').value);
    const phoneNumber = document.getElementById('withdraw-number').value;
    
    if (amount < 500) {
        alert('Le montant minimum de retrait est de 500 FCFA');
        return;
    }
    
    const availableBalance = calculateAvailableBalance();
    if (amount > availableBalance) {
        alert('Solde insuffisant pour ce retrait');
        return;
    }
    
    const { db, collection, addDoc, doc, updateDoc, increment, serverTimestamp } = window.firebaseApp;
    
    try {
        await addDoc(collection(db, 'retraits'), {
            userId: currentUser.uid,
            amount: amount,
            phoneNumber: phoneNumber,
            date: serverTimestamp(),
            status: 'pending'
        });
        
        await updateDoc(doc(db, 'users', currentUser.uid), {
            retraits: increment(amount)
        });
        
        document.getElementById('withdraw-form').reset();
        alert('Demande de retrait envoyée!');
        await loadUserData();
        
    } catch (error) {
        alert('Erreur lors de la demande de retrait: ' + error.message);
    }
}

// HISTORIQUE DES TRANSACTIONS
async function loadTransactionHistory() {
    if (!currentUser) return;
    
    const { db, collection, getDocs, query, where, orderBy } = window.firebaseApp;
    
    try {
        // Dépôts
        const depositsQuery = query(
            collection(db, 'depots'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );
        
        const depositsSnapshot = await getDocs(depositsQuery);
        const depositsList = document.getElementById('deposits-list');
        depositsList.innerHTML = '';
        
        depositsSnapshot.forEach(doc => {
            const deposit = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(deposit.date)}</td>
                <td>${formatCurrency(deposit.amount)} FCFA</td>
                <td>${getProductName(deposit.productId)}</td>
                <td>${deposit.status}</td>
            `;
            depositsList.appendChild(row);
        });
        
        // Retraits
        const withdrawalsQuery = query(
            collection(db, 'retraits'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );
        
        const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
        const withdrawalsList = document.getElementById('withdrawals-list');
        withdrawalsList.innerHTML = '';
        
        withdrawalsSnapshot.forEach(doc => {
            const withdrawal = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(withdrawal.date)}</td>
                <td>${formatCurrency(withdrawal.amount)} FCFA</td>
                <td>${withdrawal.phoneNumber}</td>
                <td>${withdrawal.status}</td>
            `;
            withdrawalsList.appendChild(row);
        });
        
    } catch (error) {
        console.error('Erreur chargement historique:', error);
    }
}

// FONCTIONS UTILITAIRES
function calculateDailyIncome() {
    return (userData.capitalInvesti || 0) * 0.1;
}

function calculateAvailableBalance() {
    const totalEarnings = (userData.revenus || 0) + (userData.bonusBienvenue || 0) + (userData.bonusParrainage || 0);
    const totalWithdrawals = userData.retraits || 0;
    return totalEarnings - totalWithdrawals;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount);
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('fr-FR');
}

function getProductName(productId) {
    const product = products.find(p => p.id === productId);
    return product ? product.nom : 'N/A';
}

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function applyReferralBonus(referralCode, newUserId) {
    const { db, collection, getDocs, where, doc, updateDoc, increment } = window.firebaseApp;
    
    try {
        const sponsorQuery = query(
            collection(db, 'users'),
            where('codeParrain', '==', referralCode)
        );
        
        const sponsorSnapshot = await getDocs(sponsorQuery);
        
        if (!sponsorSnapshot.empty) {
            const sponsorDoc = sponsorSnapshot.docs[0];
            await updateDoc(doc(db, 'users', newUserId), {
                parrain: sponsorDoc.id
            });
        }
    } catch (error) {
        console.error('Erreur bonus parrainage:', error);
    }
}

// Initialisation manuelle des produits
window.initializeProducts = initializeDefaultProducts;

console.log('✅ Application AgriInvest chargée!');