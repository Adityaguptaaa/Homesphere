// User Wallet Logic

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
        } else {
            currentUser = user;
            loadUserProfile(user.uid);
            loadWalletBalance(user.uid);
            loadTransactions(user.uid);
        }
    });

    // Add Money Form
    const addMoneyForm = document.getElementById('addMoneyForm');
    if (addMoneyForm) {
        addMoneyForm.addEventListener('submit', handleAddMoney);
    }
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

function loadWalletBalance(uid) {
    firebaseDB.collection('users').doc(uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const balance = data.walletBalance || 0;
            const cashback = data.cashbackBalance || 0;

            const balEl = document.getElementById('totalBalance');
            if (balEl) balEl.textContent = `₹${balance.toLocaleString()}`;
            const cashEl = document.getElementById('cashbackBalance');
            if (cashEl) cashEl.textContent = `₹${cashback.toLocaleString()}`;
        }
    });
}

function loadTransactions(uid) {
    const container = document.getElementById('transactionsList');
    // We combine Bookings (Expenses) and Transactions (Credit/Debit)
    let bookingsData = [];
    let transactionsData = [];

    firebaseDB.collection('bookings')
        .where('userId', '==', uid)
        .onSnapshot(snap => {
            bookingsData = [];
            snap.forEach(doc => {
                const d = doc.data();
                if (d.status === 'completed') {
                    bookingsData.push({
                        id: doc.id,
                        type: 'expense',
                        description: `${d.serviceName} Payment`,
                        amount: d.totalPrice || d.amount || 0,
                        date: d.scheduledDate ? d.scheduledDate.seconds * 1000 : Date.now()
                    });
                }
            });
            mergeAndRender();
        });

    firebaseDB.collection('transactions')
        .where('userId', '==', uid)
        .onSnapshot(snap => {
            transactionsData = [];
            snap.forEach(doc => {
                const d = doc.data();
                transactionsData.push({
                    id: doc.id,
                    type: d.type || 'credit',
                    description: d.description || 'Transaction',
                    amount: d.amount || 0,
                    date: d.date ? d.date.seconds * 1000 : Date.now()
                });
            });
            mergeAndRender();
        });

    function mergeAndRender() {
        if (!container) return;
        const merged = [...bookingsData, ...transactionsData];
        merged.sort((a, b) => b.date - a.date);

        container.innerHTML = '';
        if (merged.length === 0) {
            container.innerHTML = '<div class="text-center py-6 text-gray-500">No transactions yet.</div>';
            return;
        }

        merged.forEach(tx => {
            const dateStr = new Date(tx.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            let icon = 'fa-arrow-right', colorClass = 'text-gray-600', bgClass = 'bg-gray-100', sign = '';

            if (tx.type === 'credit') {
                icon = 'fa-arrow-down'; bgClass = 'bg-green-100'; colorClass = 'text-green-600'; sign = '+';
            } else if (tx.type === 'expense' || tx.type === 'debit') {
                icon = 'fa-arrow-up'; bgClass = 'bg-red-100'; colorClass = 'text-red-600'; sign = '-';
            }

            container.innerHTML += `
                <div class="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-all border border-gray-100">
                    <div class="w-12 h-12 ${bgClass} rounded-xl flex items-center justify-center"><i class="fas ${icon} ${colorClass}"></i></div>
                    <div class="flex-1">
                        <p class="font-semibold text-gray-800">${tx.description}</p>
                        <p class="text-xs text-gray-500">${dateStr}</p>
                    </div>
                    <span class="${colorClass} font-bold text-lg">${sign}₹${tx.amount}</span>
                </div>`;
        });
    }
}

async function handleAddMoney(e) {
    e.preventDefault();
    if (!currentUser) return;

    const amountInput = document.getElementById('addMoneyAmount');
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) { alert("Invalid amount"); return; }

    const btn = document.getElementById('confirmAddMoneyBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    try {
        await firebaseDB.collection('transactions').add({
            userId: currentUser.uid,
            amount: amount,
            type: 'credit',
            description: 'Money Added to Wallet',
            date: firebase.firestore.FieldValue.serverTimestamp(),
            method: 'Online'
        });

        await firebaseDB.collection('users').doc(currentUser.uid).update({
            walletBalance: firebase.firestore.FieldValue.increment(amount)
        });

        alert(`Successfully added ₹${amount}!`);
        closeAddMoneyModal();
        e.target.reset();
    } catch (error) {
        console.error("Error adding money:", error);
        alert("Transaction Failed: " + error.message);
    } finally {
        btn.innerHTML = 'Add Money';
        btn.disabled = false;
    }
}
