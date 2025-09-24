// app.js - Application AgriInvest corrigée
let currentUser = null;
let userData = null;
let products = [];

// Configuration API MTN Mobile Money
const MTN_API_CONFIG = {
    apiKey: "VOTRE_CLÉ_API_MTN",
    baseUrl: "https://api.mtn.com/v1/",
    callbackUrl: "https://votresite.com/callback"
};

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Démarrage de l\'application...');
    initializeApp();
});

function initializeApp() {
    // Vérifier que Firebase est chargé
    if (!window.firebaseAuth) {
        console.error('❌ Firebase non chargé');
        setTimeout(initializeApp, 1000);
        return;
    }
    
    console.log('✅ Firebase détecté, configuration des événements...');
    setupEventListeners();
    setupAuthListener();
}

function setupEventListeners() {
    console.log('🔧 Configuration des écouteurs d\'événements...');
    
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
    
    // Modal d'investissement
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('invest-quantity').addEventListener('input', updateInvestTotal);
    
    // Fermer modal en cliquant à l'extérieur
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('invest-modal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Onglets historique
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    console.log('✅ Écouteurs d\'événements configurés');
}

function setupAuthListener() {
    const { onAuthStateChanged } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    
    onAuthStateChanged(auth, async (user) => {
        console.log('🔐 État auth changé:', user ? 'connecté' : 'déconnecté');
        
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
    if (isLoggedIn) {
        document.getElementById('user-email').textContent = currentUser.email;
        document.getElementById('user-info').style.display = 'inline';
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('signup-btn').style.display = 'none';
        document.getElementById('auth-forms').style.display = 'none';
        
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('history').style.display = 'none';
        document.getElementById('withdraw').style.display = 'none';
    } else {
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('login-btn').style.display = 'inline';
        document.getElementById('signup-btn').style.display = 'inline';
        document.getElementById('auth-forms').style.display = 'block';
        
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('history').style.display = 'none';
        document.getElementById('withdraw').style.display = 'none';
    }
}

// AUTHENTIFICATION
async function handleLogin(e) {
    e.preventDefault();
    console.log('🔐 Tentative de connexion...');
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { signInWithEmailAndPassword } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Connexion réussie');
    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        alert('Erreur de connexion: ' + error.message);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    console.log('👤 Tentative d\'inscription...');
    
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const referralCode = document.getElementById('referral-code').value;
    
    const { createUserWithEmailAndPassword, doc, setDoc, serverTimestamp } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('✅ Utilisateur créé, sauvegarde des données...');
        
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
        
        console.log('✅ Données utilisateur sauvegardées');
        
        if (referralCode) {
            await applyReferralBonus(referralCode, user.uid);
        }
        
        alert('Compte créé avec succès!');
        
    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        alert('Erreur d\'inscription: ' + error.message);
    }
}

async function handleLogout() {
    const { signOut } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    
    try {
        await signOut(auth);
        console.log('✅ Déconnexion réussie');
    } catch (error) {
        console.error('❌ Erreur déconnexion:', error);
        alert('Erreur de déconnexion: ' + error.message);
    }
}

// GESTION DES DONNÉES
async function loadUserData() {
    if (!currentUser) return;
    
    console.log('📊 Chargement des données utilisateur...');
    const { doc, getDoc } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            console.log('✅ Données utilisateur chargées:', userData);
            updateDashboard();
        } else {
            console.error('❌ Document utilisateur non trouvé');
        }
    } catch (error) {
        console.error('❌ Erreur chargement données:', error);
    }
}

async function loadProducts() {
    console.log('📦 Chargement des produits...');
    const { collection, getDocs, addDoc, serverTimestamp } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
    try {
        const querySnapshot = await getDocs(collection(db, 'produits'));
        products = [];
        
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ ${products.length} produits chargés`);
        
        // Si aucun produit, créer les produits par défaut
        if (products.length === 0) {
            console.log('🆕 Création des produits par défaut...');
            await createDefaultProducts();
            await loadProducts(); // Recharger les produits
        } else {
            displayProducts();
        }
    } catch (error) {
        console.error('❌ Erreur chargement produits:', error);
    }
}

async function createDefaultProducts() {
    const { collection, addDoc, serverTimestamp } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
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
        },
        {
            nom: "Cacao",
            description: "Investissement premium dans la culture du cacao",
            prix: 20000,
            limiteReinvestissement: 5,
            capitalInvesti: 0,
            createdAt: serverTimestamp()
        }
    ];
    
    for (const product of defaultProducts) {
        await addDoc(collection(db, 'produits'), product);
    }
    
    console.log('✅ Produits par défaut créés');
}

// AFFICHAGE
function showDashboard() {
    hideAllSections();
    document.getElementById('dashboard').style.display = 'block';
    console.log('📊 Affichage du tableau de bord');
}

function showInvest() {
    hideAllSections();
    document.getElementById('dashboard').style.display = 'block';
    console.log('💼 Affichage section investissement');
}

function showHistory() {
    hideAllSections();
    document.getElementById('history').style.display = 'block';
    loadTransactionHistory();
    console.log('📈 Affichage historique');
}

function showWithdraw() {
    hideAllSections();
    document.getElementById('withdraw').style.display = 'block';
    console.log('💰 Affichage section retrait');
}

function showLoginForm() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    console.log('🔐 Affichage formulaire connexion');
}

function showSignupForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    console.log('👤 Affichage formulaire inscription');
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
    console.log(`📁 Onglet changé: ${tabName}`);
}

function updateDashboard() {
    if (!userData) return;
    
    document.getElementById('total-invested').textContent = formatCurrency(userData.capitalInvesti || 0) + ' FCFA';
    document.getElementById('daily-income').textContent = formatCurrency(calculateDailyIncome()) + ' FCFA';
    document.getElementById('total-bonus').textContent = formatCurrency((userData.bonusBienvenue || 0) + (userData.bonusParrainage || 0)) + ' FCFA';
    document.getElementById('available-balance').textContent = formatCurrency(calculateAvailableBalance()) + ' FCFA';
    
    console.log('📊 Tableau de bord mis à jour');
}

function displayProducts() {
    const productsList = document.getElementById('products-list');
    
    if (products.length === 0) {
        productsList.innerHTML = '<p>Aucun produit disponible pour le moment.</p>';
        return;
    }
    
    productsList.innerHTML = '';
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <h4>${product.nom}</h4>
            <p>${product.description || 'Investissement agricole rentable'}</p>
            <p><strong>Prix:</strong> ${formatCurrency(product.prix)} FCFA</p>
            <p><strong>Limite:</strong> ${product.limiteReinvestissement} investissements</p>
            <p><strong>Capital investi:</strong> ${formatCurrency(product.capitalInvesti || 0)} FCFA</p>
            <button class="btn-primary invest-btn" data-product-id="${product.id}">
                Investir maintenant
            </button>
        `;
        productsList.appendChild(productCard);
    });
    
    // Ajouter les écouteurs d'événements pour les boutons d'investissement
    document.querySelectorAll('.invest-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            console.log('🔄 Ouverture modal pour produit:', productId);
            openInvestModal(productId);
        });
    });
    
    console.log(`✅ ${products.length} produits affichés`);
}

// INVESTISSEMENT
function openInvestModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.error('❌ Produit non trouvé:', productId);
        return;
    }
    
    console.log('📦 Ouverture modal pour:', product.nom);
    
    document.getElementById('modal-product-name').textContent = product.nom;
    document.getElementById('modal-product-price').textContent = formatCurrency(product.prix);
    document.getElementById('modal-product-limit').textContent = product.limiteReinvestissement;
    document.getElementById('invest-quantity').value = 1;
    document.getElementById('invest-quantity').max = product.limiteReinvestissement;
    
    // Stocker l'ID du produit dans le formulaire
    document.getElementById('invest-form').setAttribute('data-product-id', productId);
    
    updateInvestTotal();
    document.getElementById('invest-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('invest-modal').style.display = 'none';
    console.log('❌ Modal fermé');
}

function updateInvestTotal() {
    const quantity = parseInt(document.getElementById('invest-quantity').value) || 0;
    const productId = document.getElementById('invest-form').getAttribute('data-product-id');
    const product = products.find(p => p.id === productId);
    
    if (product) {
        const total = quantity * product.prix;
        document.getElementById('invest-total').textContent = formatCurrency(total);
    }
}

// Gérer le formulaire d'investissement
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'invest-form') {
        e.preventDefault();
    }
});

// Créer l'écouteur pour le formulaire d'investissement
document.getElementById('invest-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('💳 Soumission formulaire d\'investissement...');
    
    const productId = this.getAttribute('data-product-id');
    const quantity = parseInt(document.getElementById('invest-quantity').value);
    const phoneNumber = document.getElementById('invest-phone').value;
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        alert('Produit non trouvé!');
        return;
    }
    
    const amount = quantity * product.prix;
    
    console.log(`📊 Détails investissement: ${quantity} x ${product.nom} = ${amount} FCFA`);
    
    try {
        // Simuler le paiement MTN
        const paymentSuccess = await processMTNPayment(phoneNumber, amount);
        
        if (paymentSuccess) {
            await updateInvestment(productId, quantity, amount);
            closeModal();
            await loadUserData();
            await loadProducts();
            alert('✅ Investissement réalisé avec succès!');
        } else {
            alert('❌ Échec du paiement. Veuillez réessayer.');
        }
    } catch (error) {
        console.error('❌ Erreur investissement:', error);
        alert('Erreur lors de l\'investissement: ' + error.message);
    }
});

async function processMTNPayment(phoneNumber, amount) {
    console.log(`📱 Simulation paiement MTN: ${amount}FCFA vers ${phoneNumber}`);
    
    return new Promise((resolve) => {
        setTimeout(() => {
            // Pour l'instant, on simule un paiement réussi
            console.log('✅ Paiement simulé réussi');
            resolve(true);
        }, 2000);
    });
}

async function updateInvestment(productId, quantity, amount) {
    if (!currentUser) return;
    
    console.log('💾 Mise à jour de l\'investissement...');
    const { doc, updateDoc, collection, addDoc, increment, serverTimestamp } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
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
            console.log('🎁 Bonus de bienvenue appliqué:', welcomeBonus);
        }
        
        console.log('✅ Investissement sauvegardé');
    } catch (error) {
        console.error('❌ Erreur sauvegarde investissement:', error);
        throw error;
    }
}

// RETRAITS
async function handleWithdraw(e) {
    e.preventDefault();
    console.log('💰 Demande de retrait...');
    
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
    
    const { collection, addDoc, doc, updateDoc, increment, serverTimestamp } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
      
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
        alert('✅ Demande de retrait envoyée! Elle sera traitée manuellement.');
        await loadUserData();
        
    } catch (error) {
        console.error('❌ Erreur retrait:', error);
        alert('Erreur lors de la demande de retrait: ' + error.message);
    }
}

// HISTORIQUE
async function loadTransactionHistory() {
    if (!currentUser) return;
    
    console.log('📈 Chargement historique...');
    const { collection, getDocs, query, where, orderBy } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
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
        
        console.log('✅ Historique chargé');
    } catch (error) {
        console.error('❌ Erreur chargement historique:', error);
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
    try {
        const date = timestamp.toDate();
        return date.toLocaleDateString('fr-FR');
    } catch (error) {
        return 'Date invalide';
    }
}

function getProductName(productId) {
    const product = products.find(p => p.id === productId);
    return product ? product.nom : 'N/A';
}

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function applyReferralBonus(referralCode, newUserId) {
    const { collection, getDocs, query, where, doc, updateDoc } = window.firebaseFunctions;
    const db = window.firebaseDb;
    
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
            console.log('✅ Bonus parrainage appliqué');
        }
    } catch (error) {
        console.error('❌ Erreur bonus parrainage:', error);
    }
}

// Fonction pour initialiser manuellement les produits
window.initializeAppProducts = createDefaultProducts;

console.log('✅ Application AgriInvest prête!');