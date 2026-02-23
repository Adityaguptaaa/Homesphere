document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    const payoutHistoryBody = document.getElementById('payoutHistoryBody');
    const payoutForm = document.getElementById('payoutForm');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            loadPayouts(user);

            // Handle Payout Request
            if (payoutForm) {
                payoutForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const amount = parseFloat(document.getElementById('payoutAmount').value);
                    const note = document.getElementById('payoutNote').value;

                    if (!amount || amount <= 0) {
                        alert("Please enter a valid amount");
                        return;
                    }

                    try {
                        await firebase.firestore().collection('payouts').add({
                            helperId: user.uid,
                            amount: amount,
                            note: note,
                            status: 'pending',
                            requestedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        alert("Payout request submitted successfully!");
                        payoutForm.reset();
                    } catch (err) {
                        console.error("Payout error:", err);
                        alert("Failed to submit request.");
                    }
                });
            }
        } else {
            window.location.href = '../login.html';
        }
    });

    function loadPayouts(user) {
        firebase.firestore().collection('payouts')
            .where('helperId', '==', user.uid)
            .onSnapshot(snapshot => {
                let html = '';
                if (snapshot.empty) {
                    html = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">No payout requests found.</td></tr>`;
                } else {
                    const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // Sort locally
                    payouts.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));

                    payouts.forEach(payout => {
                        const date = payout.requestedAt ? new Date(payout.requestedAt.seconds * 1000).toLocaleDateString() : 'Just now';
                        let statusColor = 'text-yellow-400';
                        if (payout.status === 'processed') statusColor = 'text-green-400';
                        if (payout.status === 'rejected') statusColor = 'text-red-400';

                        html += `
                            <tr class="border-b border-gray-700 hover:bg-gray-800/50">
                                <td class="px-6 py-4 text-gray-300 font-medium">₹${payout.amount}</td>
                                <td class="px-6 py-4 text-gray-400">${date}</td>
                                <td class="px-6 py-4 text-gray-400">${payout.note || '-'}</td>
                                <td class="px-6 py-4 font-bold ${statusColor} capitalize">${payout.status}</td>
                            </tr>
                        `;
                    });
                }
                if (payoutHistoryBody) payoutHistoryBody.innerHTML = html;
            });
    }
});
