// Admin Users Management
document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    const usersTableBody = document.getElementById('usersTableBody');
    const loadingState = document.getElementById('loadingState');
    const totalUsersCount = document.getElementById('totalUsersCount');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) { // add admin check here in real app
            window.location.href = '../login.html';
            return;
        }
        loadUsers();
    });

    function loadUsers() {
        loadingState.classList.remove('hidden');

        firebase.firestore().collection('users')
            .where('role', '==', 'user')
            // .orderBy('createdAt', 'desc') // careful with indexes
            .onSnapshot(snapshot => {
                let html = '';
                let count = 0;

                if (snapshot.empty) {
                    html = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">No users found.</td></tr>`;
                } else {
                    snapshot.forEach(doc => {
                        count++;
                        const user = { id: doc.id, ...doc.data() };

                        // Construct display name with fallback
                        const displayName = user.displayName ||
                            (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
                            user.firstName ||
                            user.lastName ||
                            'Unknown User';

                        const statusColor = user.status === 'blocked' ? 'text-red-400' : 'text-green-400';
                        const joined = user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A';

                        html += `
                            <tr class="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                                <td class="px-6 py-4 flex items-center space-x-3">
                                    <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
                                        ${displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span class="text-white font-medium">${displayName}</span>
                                </td>
                                <td class="px-6 py-4 text-gray-400 text-sm">${user.email}</td>
                                <td class="px-6 py-4 text-gray-400 text-sm">${user.phoneNumber || user.phone || '-'}</td>
                                <td class="px-6 py-4 font-semibold text-xs uppercase ${statusColor}">${user.status || 'Active'}</td>
                                <td class="px-6 py-4 text-gray-500 text-xs">${joined}</td>
                                <td class="px-6 py-4">
                                    <button onclick="toggleUserStatus('${user.id}', '${user.status || 'active'}')" 
                                        class="text-xs px-3 py-1 rounded border border-gray-600 hover:bg-gray-700 text-gray-300 transition-colors">
                                        ${user.status === 'blocked' ? 'Unblock' : 'Block'}
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }

                if (usersTableBody) usersTableBody.innerHTML = html;
                if (totalUsersCount) totalUsersCount.textContent = count;
                loadingState.classList.add('hidden');
            }, error => {
                console.error("Error loading users:", error);
                loadingState.innerHTML = '<p class="text-red-500 text-center">Error loading users.</p>';
            });
    }

    window.toggleUserStatus = async (uid, currentStatus) => {
        const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        const action = newStatus === 'blocked' ? 'Block' : 'Activate';

        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await firebase.firestore().collection('users').doc(uid).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // UI updates automatically via snapshot
        } catch (err) {
            console.error("Update error:", err);
            alert("Failed to update status.");
        }
    };
});
