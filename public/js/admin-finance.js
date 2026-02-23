// Admin Finance Management
document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    const payoutsTableBody = document.getElementById('payoutsTableBody');
    const loadingState = document.getElementById('loadingState');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        loadPayouts();
    });

    function loadPayouts() {
        loadingState.classList.remove('hidden');

        firebase.firestore().collection('payouts')
            .onSnapshot(snapshot => {
                let html = '';

                if (snapshot.empty) {
                    html = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No payout requests.</td></tr>`;
                } else {
                    const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // Sort descending date
                    payouts.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));

                    payouts.forEach(payout => {
                        const date = payout.requestedAt ? new Date(payout.requestedAt.seconds * 1000).toLocaleDateString() : 'N/A';

                        let statusColor = 'bg-gray-700 text-gray-300';
                        if (payout.status === 'pending') statusColor = 'bg-yellow-500/20 text-yellow-500';
                        else if (payout.status === 'processed') statusColor = 'bg-green-500/20 text-green-500';
                        else if (payout.status === 'rejected') statusColor = 'bg-red-500/20 text-red-500';

                        html += `
                            <tr class="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                                <td class="px-6 py-4 font-medium text-white">₹${payout.amount}</td>
                                <td class="px-6 py-4 text-gray-400 text-xs">${payout.helperId}</td>
                                <td class="px-6 py-4 text-gray-400 text-sm max-w-xs truncate">${payout.note || '-'}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor}">
                                        ${payout.status || 'unknown'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-gray-500 text-xs">${date}</td>
                                <td class="px-6 py-4 flex space-x-2">
                                    ${payout.status === 'pending' ? `
                                        <button onclick="updatePayout('${payout.id}', 'processed')" class="text-xs px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white transition-colors">Approve</button>
                                        <button onclick="updatePayout('${payout.id}', 'rejected')" class="text-xs px-3 py-1 rounded border border-red-500 text-red-400 hover:bg-red-900/20 transition-colors">Reject</button>
                                    ` : '<span class="text-gray-600 text-xs italic">Closed</span>'}
                                </td>
                            </tr>
                        `;
                    });
                }

                if (payoutsTableBody) payoutsTableBody.innerHTML = html;
                loadingState.classList.add('hidden');
            });
    }

    window.updatePayout = async (id, status) => {
        if (!confirm(`Mark request as ${status}?`)) return;
        try {
            await firebase.firestore().collection('payouts').doc(id).update({
                status: status,
                processedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { alert("Error updating payout"); }
    };
});
