document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    const totalEarningsEl = document.getElementById('totalEarnings');
    const earningsTableBody = document.getElementById('earningsTableBody');
    const loadingState = document.getElementById('loadingState');
    const contentState = document.getElementById('contentState');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            loadEarnings(user);
        } else {
            window.location.href = '../login.html';
        }
    });

    function loadEarnings(user) {
        contentState.classList.add('hidden');
        loadingState.classList.remove('hidden');

        firebase.firestore().collection('bookings')
            .where('helperId', '==', user.uid)
            .where('status', '==', 'completed')
            .onSnapshot(snapshot => {
                let total = 0;
                let html = '';

                if (snapshot.empty) {
                    html = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No completed jobs yet. Start working to earn!</td></tr>`;
                } else {
                    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // Sort by date desc (client side)
                    jobs.sort((a, b) => (b.currrenTimestamp || 0) - (a.currentTimestamp || 0));

                    jobs.forEach(job => {
                        const price = parseFloat(job.price) || 0;
                        total += price;
                        const date = job.date ? new Date(job.date).toLocaleDateString() : 'N/A';

                        html += `
                            <tr class="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                                <td class="px-6 py-4 text-white font-medium">${job.service}</td>
                                <td class="px-6 py-4 text-gray-400">${date}</td>
                                <td class="px-6 py-4 text-gray-400">${job.userName || 'Customer'}</td>
                                <td class="px-6 py-4 text-right text-cyan-400 font-bold">+₹${price}</td>
                            </tr>
                        `;
                    });
                }

                totalEarningsEl.textContent = '₹' + total.toLocaleString();
                earningsTableBody.innerHTML = html;

                loadingState.classList.add('hidden');
                contentState.classList.remove('hidden');
            });
    }
});
