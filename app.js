// app.js - Application AgriInvest avec Firebase v12 modulaire (suite)

// ... (Code précédent inchangé jusqu'à la fin de loadTransactionHistory)

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

        // Revenus
        const earningsQuery = query(
            collection(db, 'revenus'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );

        const earningsSnapshot = await getDocs(earningsQuery);
        const earningsList = document.getElementById('earnings-list');
        earningsList.innerHTML = '';

        earningsSnapshot.forEach(doc => {
            const earning = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(earning.date)}</td>
                <td>${formatCurrency(earning.amount)} FCFA</td>
                <td>${earning.source}</td>
            `;
            earningsList.appendChild(row);
        });

    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
    }
}

// FONCTIONS UTILITAIRES
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', { 
        style: 'decimal', 
        minimumFractionDigits: 0 
    }).format(amount);
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getProductName(productId) {
    const product = products.find(p => p.id === productId);
    return product ? product.nom : 'Produit inconnu';
}

function calculateDailyIncome() {
    if (!userData || !userData.capitalInvesti) return 0;
    // Exemple : 2% de rendement quotidien sur le capital investi
    return Math.round(userData.capitalInvesti * 0.02);
}

function calculateAvailableBalance() {
    if (!userData) return 0;
    return (userData.capitalInvesti || 0) + 
           (userData.bonusBienvenue || 0) + 
           (userData.bonusParrainage || 0) + 
           (userData.revenus || 0) - 
           (userData.retraits || 0);
}

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function applyReferralBonus(referralCode, newUserId) {
    const { db, collection, getDocs, query, where, updateDoc, doc, increment } = window.firebaseApp;

    try {
        const q = query(collection(db, 'users'), where('codeParrain', '==', referralCode));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const referrer = querySnapshot.docs[0];
            const referrerId = referrer.id;
            const bonusAmount = 1000; // Bonus de parrainage fixe (exemple)

            // Ajouter bonus au parrain
            await updateDoc(doc(db, 'users', referrerId), {
                bonusParrainage: increment(bonusAmount)
            });

            // Ajouter bonus au filleul
            await updateDoc(doc(db, 'users', newUserId), {
                bonusParrainage: increment(bonusAmount)
            });

            // Enregistrer la transaction de bonus
            await addDoc(collection(db, 'revenus'), {
                userId: referrerId,
                amount: bonusAmount,
                source: 'Bonus de parrainage',
                date: serverTimestamp()
            });

            await addDoc(collection(db, 'revenus'), {
                userId: newUserId,
                amount: bonusAmount,
                source: 'Bonus de bienvenue (parrainage)',
                date: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Erreur lors de l\'application du bonus de parrainage:', error);
    }
}

// FONCTION DE MISE À JOUR DES REVENUS QUOTIDIENS
async function updateDailyIncome() {
    if (!currentUser) return;

    const { db, doc, updateDoc, collection, addDoc, serverTimestamp } = window.firebaseApp;
    const dailyIncome = calculateDailyIncome();

    try {
        // Mettre à jour les revenus de l'utilisateur
        await updateDoc(doc(db, 'users', currentUser.uid), {
            revenus: increment(dailyIncome)
        });

        // Enregistrer la transaction de revenu
        await addDoc(collection(db, 'revenus'), {
            userId: currentUser.uid,
            amount: dailyIncome,
            source: 'Revenus quotidiens',
            date: serverTimestamp()
        });

        // Recharger les données utilisateur
        await loadUserData();
    } catch (error) {
        console.error('Erreur lors de la mise à jour des revenus quotidiens:', error);
    }
}

// PLANIFICATION DES REVENUS QUOTIDIENS
function scheduleDailyIncomeUpdate() {
    const now = new Date();
    const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0
    );
    const timeUntilMidnight = nextMidnight - now;

    setTimeout(async () => {
        await updateDailyIncome();
        // Planifier la prochaine mise à jour
        scheduleDailyIncomeUpdate();
    }, timeUntilMidnight);
}

// INITIALISATION DES REVENUS QUOTIDIENS
if (currentUser) {
    scheduleDailyIncomeUpdate();
}

console.log('✅ Application AgriInvest complètement chargée!');