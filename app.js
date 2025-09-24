// app.js
let currentUser = null;
let userData = null;
let products = [];

// Configuration API MTN Mobile Money
const MTN_API_CONFIG = {
    apiKey: "VOTRE_CLÉ_API_MTN",
    baseUrl: "https://api.mtn.com/v1/",
    callbackUrl: "https://votresite.com/callback"
};

// Initialisation
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    setupEventListeners();
    setupAuthListener();
    updateDailyIncome();
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
    document.getElementById('invest-form').addEventListener('submit', handleInvest);
    
    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('invest-quantity').addEventListener('input', updateInvestTotal);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function setupAuthListener() {
    const { onAuthStateChanged } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            showUserInterface(true);
            await loadUserData();
            await loadProducts();
            showDashboard();
        } else {
            currentUser = null;
            userData = null;
            showUserInterface(false);
            showLoginForm();
        }
    });
}

function showUserInterface(isLoggedIn) {
    document.getElementById('user-info').style.display = isLoggedIn ? 'inline' : 'none';
    document.getElementById('login-btn').style.display = isLoggedIn ? 'none' : 'inline';
    document.getElementById('signup-btn').style.display = isLoggedIn ? 'none' : 'inline';
    document.getElementById('auth-forms').style.display = isLoggedIn ? 'none' : 'block';
    document.getElementById('dashboard').style.display = isLoggedIn ? 'block' : 'none';
}

// Authentification
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { signInWithEmailAndPassword } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    
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
    const { createUserWithEmailAndPassword, doc, setDoc, serverTimestamp } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, 'users', user.uid), {
            email,
            capitalInvesti: 0,
            revenus: 0,
            bonusBienvenue: 0,
            bonusParrainage: 0,
            retraits: 0,
            dateInscription: serverTimestamp(),
            codeParrain: generateReferralCode(),
            parrain: referralCode || null
        });
        
        if (referralCode) {
            await applyReferralBonus(referralCode, user.uid);
        }
        
        alert('Compte créé avec succès!');
    } catch (error) {
        alert('Erreur d\'inscription: ' + error.message);
    }
}

async function handleLogout() {
    const { signOut } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    
    try {
        await signOut(auth);
    } catch (error) {
        alert('Erreur de déconnexion: ' + error.message);
    }
}

// Données
async function loadUserData() {
    const { doc, getDoc } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
        userData = userDoc.data();
        updateDashboard();
    }
}

async function loadProducts() {
    const { collection, getDocs } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
    const querySnapshot = await getDocs(collection(db, 'produits'));
    products = [];
    querySnapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    
    if (products.length === 0) {
        await createDefaultProducts();
        await loadProducts();
    } else {
        displayProducts();
    }
}

async function createDefaultProducts() {
    const { collection, addDoc, serverTimestamp } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
    const defaultProducts = [
        { nom: "Riz", prix: 10000, limiteReinvestissement: 10, capitalInvesti: 0, createdAt: serverTimestamp() },
        { nom: "Anacarde", prix: 15000, limiteReinvestissement: 8, capitalInvesti: 0, createdAt: serverTimestamp() },
        { nom: "Tomate", prix: 8000, limiteReinvestissement: 12, capitalInvesti: 0, createdAt: serverTimestamp() }
    ];
    
    for (const product of defaultProducts) {
        await addDoc(collection(db, 'produits'), product);
    }
}

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function applyReferralBonus(referralCode, newUserId) {
    const { query, where, getDocs, doc, updateDoc, increment } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
    const q = query(collection(db, 'users'), where('codeParrain', '==', referralCode));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        const referrer = querySnapshot.docs[0];
        const firstDeposit = 10000; // Montant initial fictif pour calcul du bonus
        const bonus = firstDeposit * 0.28;
        
        await updateDoc(doc(db, 'users', referrer.id), {
            bonusParrainage: increment(bonus)
        });
        
        await updateDoc(doc(db, 'users', newUserId), {
            bonusBienvenue: firstDeposit * 0.25
        });
    }
}

// Affichage
function showDashboard() {
    hideAllSections();
    document.getElementById('dashboard').style.display = 'block';
}

function showInvest() {
    hideAllSections();
    document.getElementById('dashboard').style.display = 'block';
}

function showHistory() {
    hideAllSections();
    document.getElementById('history').style.display = 'block';
    loadTransactionHistory();
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
    document.getElementById('total-invested').textContent = formatCurrency(userData.capitalInvesti || 0) + ' FCFA';
    document.getElementById('daily-income').textContent = formatCurrency(calculateDailyIncome()) + ' FCFA';
    document.getElementById('total-bonus').textContent = formatCurrency((userData.bonusBienvenue || 0) + (userData.bonusParrainage || 0)) + ' FCFA';
    document.getElementById('available-balance').textContent = formatCurrency(calculateAvailableBalance()) + ' FCFA';
}

function displayProducts() {
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = '';
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <h4>${product.nom}</h4>
            <p>Prix: ${formatCurrency(product.prix)} FCFA</p>
            <p>Limite: ${product.limiteReinvestissement}</p>
            <p>Capital investi: ${formatCurrency(product.capitalInvesti || 0)} FCFA</p>
            <button class="btn-primary invest-btn" data-product-id="${product.id}">Investir</button>
        `;
        productsList.appendChild(card);
    });
    
    document.querySelectorAll('.invest-btn').forEach(btn => {
        btn.addEventListener('click', () => openInvestModal(btn.dataset.productId));
    });
}

function openInvestModal(productId) {
    const product = products.find(p => p.id === productId);
    document.getElementById('modal-product-name').textContent = product.nom;
    document.getElementById('modal-product-price').textContent = formatCurrency(product.prix);
    document.getElementById('modal-product-limit').textContent = product.limiteReinvestissement;
    document.getElementById('invest-quantity').value = 1;
    document.getElementById('invest-quantity').max = product.limiteReinvestissement;
    document.getElementById('invest-form').dataset.productId = productId;
    updateInvestTotal();
    document.getElementById('invest-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('invest-modal').style.display = 'none';
}

function updateInvestTotal() {
    const quantity = parseInt(document.getElementById('invest-quantity').value) || 0;
    const productId = document.getElementById('invest-form').dataset.productId;
    const product = products.find(p => p.id === productId);
    const total = quantity * product.prix;
    document.getElementById('invest-total').textContent = formatCurrency(total);
}

async function handleInvest(e) {
    e.preventDefault();
    const productId = e.target.dataset.productId;
    const quantity = parseInt(document.getElementById('invest-quantity').value);
    const phoneNumber = document.getElementById('invest-phone').value;
    const product = products.find(p => p.id === productId);
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
    // Implémentation simulée - Remplacez par l'appel réel à l'API MTN
    console.log(`Processing payment of ${amount} FCFA to ${phoneNumber}`);
    return new Promise(resolve => {
        setTimeout(() => resolve(true), 2000); // Simulation d'un paiement réussi
    });
}

async function updateInvestment(productId, quantity, amount) {
    const { doc, updateDoc, collection, addDoc, increment, serverTimestamp } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
    await updateDoc(doc(db, 'users', currentUser.uid), {
        capitalInvesti: increment(amount),
        revenus: increment(amount * 0.25) // Bonus de bienvenue
    });
    
    await updateDoc(doc(db, 'produits', productId), {
        capitalInvesti: increment(amount)
    });
    
    await addDoc(collection(db, 'depots'), {
        userId: currentUser.uid,
        productId,
        montant: amount,
        quantite: quantity,
        date: serverTimestamp(),
        statut: 'completed'
    });
}

async function handleWithdraw(e) {
    e.preventDefault();
    const amount = parseInt(document.getElementById('withdraw-amount').value);
    const number = document.getElementById('withdraw-number').value;
    
    if (amount < 500) {
        alert('Le montant minimum de retrait est de 500 FCFA');
        return;
    }
    
    if (amount > calculateAvailableBalance()) {
        alert('Solde insuffisant');
        return;
    }
    
    const { collection, addDoc, serverTimestamp } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
    try {
        await addDoc(collection(db, 'retraits'), {
            userId: currentUser.uid,
            montant: amount,
            numero: number,
            date: serverTimestamp(),
            statut: 'pending'
        });
        
        alert('Demande de retrait enregistrée');
        document.getElementById('withdraw-form').reset();
    } catch (error) {
        alert('Erreur lors de la demande de retrait: ' + error.message);
    }
}

async function loadTransactionHistory() {
    const { collection, getDocs, query, where, orderBy } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
    // Dépôts
    const depositsQuery = query(
        collection(db, 'depots'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
    );
    const depositsSnapshot = await getDocs(depositsQuery);
    const depositsTable = document.querySelector('#deposits-table tbody');
    depositsTable.innerHTML = '';
    
    depositsSnapshot.forEach(doc => {
        const deposit = doc.data();
        const product = products.find(p => p.id === deposit.productId);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(deposit.date.toDate()).toLocaleString()}</td>
            <td>${formatCurrency(deposit.montant)} FCFA</td>
            <td>${product ? product.nom : 'N/A'}</td>
            <td>${deposit.statut}</td>
        `;
        depositsTable.appendChild(row);
    });
    
    // Retraits
    const withdrawalsQuery = query(
        collection(db, 'retraits'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
    );
    const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
    const withdrawalsTable = document.querySelector('#withdrawals-table tbody');
    withdrawalsTable.innerHTML = '';
    
    withdrawalsSnapshot.forEach(doc => {
        const withdrawal = doc.data();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(withdrawal.date.toDate()).toLocaleString()}</td>
            <td>${formatCurrency(withdrawal.montant)} FCFA</td>
            <td>${withdrawal.numero}</td>
            <td>${withdrawal.statut}</td>
        `;
        withdrawalsTable.appendChild(row);
    });
}

function calculateDailyIncome() {
    return userData ? (userData.capitalInvesti * 0.10) : 0;
}

function calculateAvailableBalance() {
    return userData ? 
        (userData.capitalInvesti + userData.revenus + userData.bonusBienvenue + userData.bonusParrainage - userData.retraits) : 
        0;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount);
}

// Mise à jour quotidienne des revenus
function updateDailyIncome() {
    setInterval(async () => {
        if (currentUser && userData) {
            const { doc, updateDoc, increment } = window.firebaseFunctions;
            const db = window.firebaseDb;
            
            const dailyIncome = calculateDailyIncome();
            await updateDoc(doc(db, 'users', currentUser.uid), {
                revenus: increment(dailyIncome)
            });
            await loadUserData();
        }
    }, 24 * 60 * 60 * 1000); // Toutes les 24 heures
}