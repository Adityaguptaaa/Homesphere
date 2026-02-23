// Admin Bookings Management
document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    const bookingsTableBody = document.getElementById('bookingsTableBody');
    const loadingState = document.getElementById('loadingState');
    const totalBookingsCount = document.getElementById('totalBookingsCount');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) { // check admin
            window.location.href = '../login.html';
            return;
        }
        loadBookings();
    });

    function loadBookings() {
        loadingState.classList.remove('hidden');

        firebase.firestore().collection('bookings')
            .limit(50) // Cap for performance, maybe add pagination in real app
            .onSnapshot(snapshot => {
                let html = '';
                let count = 0;

                if (snapshot.empty) {
                    html = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">No bookings found.</td></tr>`;
                } else {
                    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // Client side sort desc
                    bookings.sort((a, b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0));

                    bookings.forEach(booking => {
                        count++;

                        let statusColor = 'bg-gray-700 text-gray-300';
                        if (booking.status === 'pending') statusColor = 'bg-yellow-500/20 text-yellow-500';
                        else if (booking.status === 'assigned') statusColor = 'bg-blue-500/20 text-blue-500';
                        else if (booking.status === 'in-progress') statusColor = 'bg-purple-500/20 text-purple-500';
                        else if (booking.status === 'completed') statusColor = 'bg-green-500/20 text-green-500';
                        else if (booking.status === 'cancelled') statusColor = 'bg-red-500/20 text-red-500';

                        const date = booking.date ? new Date(booking.date).toLocaleDateString() : 'N/A';

                        html += `
                            <tr class="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                                <td class="px-6 py-4 font-medium text-white">${booking.service}</td>
                                <td class="px-6 py-4">
                                    <div class="text-white font-medium">${booking.userName || 'Unknown'}</div>
                                    <div class="text-xs text-gray-500">${booking.userPhone || booking.userEmail || '-'}</div>
                                </td>
                                <td class="px-6 py-4 text-gray-400">${booking.helperId ? 'Assigned' : 'Unassigned'}</td> <!-- fetching helper name is complex without join, using ID/Status -->
                                <td class="px-6 py-4 text-gray-400">${date}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor}">
                                        ${booking.status || 'unknown'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 font-bold text-cyan-400">₹${booking.price || 0}</td>
                            </tr>
                        `;
                    });
                }

                if (bookingsTableBody) bookingsTableBody.innerHTML = html;
                if (totalBookingsCount) totalBookingsCount.textContent = count;
                loadingState.classList.add('hidden');
            });
    }
});
