// Admin Helpers Management
document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    const helpersTableBody = document.getElementById('helpersTableBody');
    const loadingState = document.getElementById('loadingState');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        loadHelpers();
    });

    function loadHelpers() {
        loadingState.classList.remove('hidden');

        firebase.firestore().collection('users')
            .where('role', '==', 'helper')
            .onSnapshot(snapshot => {
                let html = '';
                let count = 0;

                if (snapshot.empty) {
                    html = `<tr><td colspan="7" class="px-6 py-8 text-center text-gray-400">No helpers found.</td></tr>`;
                } else {
                    snapshot.forEach(doc => {
                        count++;
                        const helper = { id: doc.id, ...doc.data() };

                        // Construct display name with fallback
                        const displayName = helper.displayName ||
                            (helper.firstName && helper.lastName ? `${helper.firstName} ${helper.lastName}`.trim() : null) ||
                            helper.firstName ||
                            helper.lastName ||
                            'Unnamed';

                        let statusColor = 'text-gray-400';
                        if (helper.status === 'verified') statusColor = 'text-green-400 bg-green-900/20';
                        else if (helper.status === 'pending') statusColor = 'text-yellow-400 bg-yellow-900/20';
                        else if (helper.status === 'blocked') statusColor = 'text-red-400 bg-red-900/20';

                        const skills = Array.isArray(helper.skills) ? helper.skills.join(', ') : (helper.skills || 'None');
                        const rating = helper.rating ? helper.rating.toFixed(1) : 'New';

                        html += `
                            <tr class="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                                <td class="px-6 py-4 flex items-center space-x-3">
                                    <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">
                                        ${displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div class="flex items-center space-x-2">
                                            <span class="text-white font-medium">${displayName}</span>
                                            ${helper.verified ?
                                '<i class="fas fa-check-circle text-green-500 text-xs" title="Aadhar Verified"></i>' :
                                helper.verificationStatus === 'pending' ?
                                    '<i class="fas fa-clock text-yellow-500 text-xs" title="Verification Pending"></i>' :
                                    helper.verificationStatus === 'rejected' ?
                                        '<i class="fas fa-times-circle text-red-500 text-xs" title="Verification Rejected"></i>' :
                                        '<i class="fas fa-exclamation-triangle text-gray-500 text-xs" title="Not Verified"></i>'
                            }
                                        </div>
                                        <div class="text-xs text-gray-500">${helper.email}</div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 text-gray-300 text-sm font-mono">${helper.phoneNumber || helper.phone || '-'}</td>
                                <td class="px-6 py-4 text-gray-300 text-sm max-w-xs truncate" title="${skills}">${skills}</td>
                                <td class="px-6 py-4 font-bold text-yellow-400">
                                    <i class="fas fa-star text-xs mr-1"></i>${rating}
                                </td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor}">
                                        ${helper.status || 'pending'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 flex space-x-2">
                                    ${helper.status !== 'verified' ?
                                `<button onclick="verifyHelper('${helper.id}')" class="text-xs px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white transition-colors">Verify</button>`
                                : ''}
                                    
                                    <button onclick="viewHelperReviews('${helper.id}', '${displayName}')" class="text-xs px-3 py-1 rounded border border-purple-500 text-purple-300 hover:bg-purple-900/30 transition-colors">
                                        <i class="fas fa-comments"></i>
                                    </button>

                                    <button onclick="toggleHelperBlock('${helper.id}', '${helper.status}')" 
                                        class="text-xs px-3 py-1 rounded border border-gray-600 hover:bg-red-900/30 text-red-300 transition-colors">
                                        ${helper.status === 'blocked' ? 'Unblock' : 'Block'}
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }

                if (helpersTableBody) helpersTableBody.innerHTML = html;
                const countBadge = document.getElementById('totalHelpersCount');
                if (countBadge) countBadge.textContent = count;

                loadingState.classList.add('hidden');
            });
    }

    window.verifyHelper = async (uid) => {
        if (!confirm("Verify this helper? They will be able to accept jobs.")) return;
        try {
            await firebase.firestore().collection('users').doc(uid).update({ status: 'verified' });
        } catch (e) { alert("Error verifying helper"); }
    };

    window.toggleHelperBlock = async (uid, currentStatus) => {
        const newStatus = currentStatus === 'blocked' ? 'verified' : 'blocked';
        if (!confirm(`Change status to ${newStatus}?`)) return;
        try {
            await firebase.firestore().collection('users').doc(uid).update({ status: newStatus });
        } catch (e) { alert("Error updating status"); }
    };

    window.viewHelperReviews = async (uid, name) => {
        const modal = document.getElementById('reviewsModal');
        const list = document.getElementById('reviewsList');
        const nameEl = modal.querySelector('h3');

        nameEl.textContent = `Reviews for ${name}`;
        list.innerHTML = `<div class="flex justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div></div>`;
        modal.classList.remove('hidden');

        try {
            // Removed orderBy to avoid index issues. Sorting client-side.
            const snap = await firebase.firestore().collection('bookings')
                .where('helperId', '==', uid)
                .get();

            let reviews = [];
            snap.forEach(doc => {
                const data = doc.data();
                if (data.rating) reviews.push(data);
            });

            // Client side sort
            reviews.sort((a, b) => b.rating - a.rating);

            let html = '';

            if (reviews.length === 0) {
                list.innerHTML = `<p class="text-center text-gray-400 py-8">No reviews yet for this helper.</p>`;
                return;
            }

            reviews.forEach(review => {
                const stars = '⭐'.repeat(review.rating);
                let date = 'No Date';
                if (review.ratedAt) date = new Date(review.ratedAt.seconds * 1000).toLocaleDateString();
                // Check if ratedAt exists, otherwise try createdAt, otherwise date
                else if (review.createdAt) date = new Date(review.createdAt.seconds * 1000).toLocaleDateString();

                html += `
                    <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-4">
                        <div class="flex justify-between items-start mb-2">
                            <span class="font-bold text-white text-sm">${review.userName || 'Customer'}</span>
                            <span class="text-xs text-gray-500">${date}</span>
                        </div>
                        <div class="text-yellow-400 text-xs mb-2">${stars}</div>
                        <p class="text-gray-300 text-sm italic">"${review.review || 'No comment provided'}"</p>
                        <div class="mt-2 text-xs text-purple-400">Service: ${review.service}</div>
                    </div>
                `;
            });

            list.innerHTML = html;

        } catch (err) {
            console.error("Review load error:", err);
            list.innerHTML = `<p class="text-red-400 text-center py-4">Error loading reviews: ${err.message}</p>`;
        }
    };
});
