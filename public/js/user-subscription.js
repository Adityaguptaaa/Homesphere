// User Subscription Logic

let currentUser = null;
let currentBalance = 0;
let currentPlan = 'free';

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
        } else {
            currentUser = user;
            loadUserProfile(user.uid);
            loadUserData(user.uid);
        }
    });
});

async function loadUserProfile(uid) {
    try {
        const doc = await firebaseDB.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            const fullName = `${data.firstName} ${data.lastName}`;
            const nameEl = document.getElementById('userProfileName');
            if (nameEl) nameEl.textContent = fullName;
            const imgEl = document.getElementById('userProfileImg');
            if (imgEl) imgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=6366f1&color=fff`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function loadUserData(uid) {
    firebaseDB.collection('users').doc(uid).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            currentBalance = data.walletBalance || 0;
            const sub = data.subscription || {};
            currentPlan = sub.plan || 'free';
            updateUI(currentPlan);
        }
    });
}

function updateUI(plan) {
    const title = document.getElementById('planTitle');
    const badge = document.getElementById('planBadge');
    const btn = document.getElementById('subscribeBtn');

    if (!title || !badge || !btn) return;

    if (plan === 'premium') {
        title.innerHTML = '<span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Premium Member</span>';
        badge.textContent = 'Premium';
        badge.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200';

        btn.textContent = 'Already Premium';
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.classList.remove('hover:shadow-lg');
        btn.onclick = null;
    } else {
        title.textContent = 'Free Member';
        badge.textContent = 'Free Plan';
        badge.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-600';

        btn.textContent = 'Upgrade Now';
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
        btn.onclick = subscribePremium;
    }
}

async function subscribePremium() {
    if (!currentUser) return;
    if (currentPlan === 'premium') { alert("You are already a Premium member!"); return; }

    const COST = 499;
    if (currentBalance < COST) {
        alert(`Insufficient Wallet Balance! You have ₹${currentBalance}, but Premium costs ₹${COST}. Please add money to your wallet.`);
        window.location.href = 'wallet.html';
        return;
    }

    if (!confirm(`Subscribe to Premium for ₹${COST}? This will be deducted from your wallet.`)) return;

    const btn = document.getElementById('subscribeBtn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        btn.disabled = true;
    }

    try {
        const batch = firebaseDB.batch();
        const userRef = firebaseDB.collection('users').doc(currentUser.uid);
        const txRef = firebaseDB.collection('transactions').doc();

        // 1. Deduct Balance & Update Subscription
        batch.update(userRef, {
            walletBalance: firebase.firestore.FieldValue.increment(-COST),
            subscription: {
                plan: 'premium',
                startDate: firebase.firestore.FieldValue.serverTimestamp(),
                validTill: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // +30 days
            }
        });

        // 2. Add Expense Record
        batch.set(txRef, {
            userId: currentUser.uid,
            amount: COST,
            type: 'expense',
            description: 'Premium Subscription (Monthly)',
            date: firebase.firestore.FieldValue.serverTimestamp(),
            method: 'Wallet'
        });

        await batch.commit();
        alert("🎉 Welcome to Premium! You have been upgraded successfully.");

    } catch (error) {
        console.error("Subscription failed:", error);
        alert("Transaction Failed: " + error.message);
        if (btn) {
            btn.textContent = 'Upgrade Now';
            btn.disabled = false;
        }
    }
}
