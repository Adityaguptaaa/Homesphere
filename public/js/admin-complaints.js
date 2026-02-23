// Admin Complaints Management
document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    const complaintsTableBody = document.getElementById('complaintsTableBody');
    const loadingState = document.getElementById('loadingState');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) { // check admin
            window.location.href = '../login.html';
            return;
        }
        loadComplaints();
    });

    function loadComplaints() {
        loadingState.classList.remove('hidden');

        firebase.firestore().collection('complaints')
            .onSnapshot(snapshot => {
                let html = '';

                if (snapshot.empty) {
                    html = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No complaints filed.</td></tr>`;
                } else {
                    snapshot.forEach(doc => {
                        const complaint = { id: doc.id, ...doc.data() };

                        let statusColor = 'bg-gray-700 text-gray-300';
                        if (complaint.status === 'open') statusColor = 'bg-red-500/20 text-red-500';
                        else if (complaint.status === 'resolved') statusColor = 'bg-green-500/20 text-green-500';

                        html += `
                            <tr class="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                                <td class="px-6 py-4 text-white font-medium">#${complaint.id.substr(0, 6)}</td>
                                <td class="px-6 py-4 text-gray-400 text-xs">${complaint.userId}</td>
                                <td class="px-6 py-4 text-gray-400 text-sm max-w-xs truncate">${complaint.issue || 'No details'}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor}">
                                        ${complaint.status || 'open'}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    ${complaint.status !== 'resolved' ?
                                `<button onclick="resolveComplaint('${complaint.id}')" class="text-xs px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white transition-colors">Resolve</button>`
                                : '<span class="text-gray-500 text-xs italic">Closed</span>'}
                                </td>
                            </tr>
                        `;
                    });
                }

                if (complaintsTableBody) complaintsTableBody.innerHTML = html;
                loadingState.classList.add('hidden');
            });
    }

    window.resolveComplaint = async (id) => {
        if (!confirm("Mark as resolved?")) return;
        try {
            await firebase.firestore().collection('complaints').doc(id).update({
                status: 'resolved',
                resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { alert("Error resolving complaint"); }
    };
});
