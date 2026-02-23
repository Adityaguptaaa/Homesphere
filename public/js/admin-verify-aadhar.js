// Admin Aadhar Verification System
console.log('🆔 Admin Aadhar Verification loaded');

let currentUser = null;

// Check admin authentication
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '../login.html';
        return;
    }

    currentUser = user;

    // Verify admin role
    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
        alert('❌ Admin access required');
        window.location.href = '../login.html';
        return;
    }

    console.log('✅ Admin authenticated:', user.email);
    loadVerifications();
});

// Load all verification requests
async function loadVerifications() {
    try {
        const helpersSnapshot = await firebase.firestore()
            .collection('users')
            .where('role', '==', 'helper')
            .get();

        let pending = [];
        let verified = [];
        let rejected = [];

        helpersSnapshot.forEach(doc => {
            const helper = { id: doc.id, ...doc.data() };
            const status = helper.verificationStatus || 'pending';

            if (status === 'pending') pending.push(helper);
            else if (status === 'verified') verified.push(helper);
            else if (status === 'rejected') rejected.push(helper);
        });

        // Update counts
        document.getElementById('pendingCount').textContent = pending.length;
        document.getElementById('verifiedCount').textContent = verified.length;
        document.getElementById('rejectedCount').textContent = rejected.length;

        // Render lists
        renderPendingList(pending);
        renderVerifiedList(verified);

    } catch (error) {
        console.error('Error loading verifications:', error);
    }
}

// Render pending verifications
function renderPendingList(helpers) {
    const container = document.getElementById('pendingList');

    if (helpers.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">No pending verifications</p>';
        return;
    }

    let html = '';
    helpers.forEach(helper => {
        const name = helper.displayName || `${helper.firstName} ${helper.lastName}`;
        const aadhar = helper.aadharNumber ? helper.aadharNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : 'Not provided';
        const uploadDate = helper.aadharUploadedAt ? new Date(helper.aadharUploadedAt.toDate()).toLocaleDateString() : 'Unknown';

        html += `
            <div class="bg-gray-800 bg-opacity-50 rounded-xl p-4 mb-4 border border-yellow-500/20 hover:border-yellow-500/40 transition-all">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <div class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-lg">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 class="text-white font-bold">${name}</h3>
                                <p class="text-sm text-gray-400">${helper.serviceCategory || 'Service Provider'}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 text-sm mt-3">
                            <div>
                                <span class="text-gray-400">Email:</span>
                                <p class="text-white">${helper.email}</p>
                            </div>
                            <div>
                                <span class="text-gray-400">Phone:</span>
                                <p class="text-white">${helper.phoneNumber || helper.phone || '-'}</p>
                            </div>
                            <div>
                                <span class="text-gray-400">Aadhar Number:</span>
                                <p class="text-white font-mono">${aadhar}</p>
                            </div>
                            <div>
                                <span class="text-gray-400">Uploaded:</span>
                                <p class="text-white">${uploadDate}</p>
                            </div>
                        </div>
                    </div>
                    <div class="ml-4">
                        <button onclick='openVerifyModal(${JSON.stringify(helper).replace(/'/g, "\\'")})'
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold whitespace-nowrap">
                            <i class="fas fa-eye mr-2"></i>Review
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Render verified helpers
function renderVerifiedList(helpers) {
    const container = document.getElementById('verifiedList');

    if (helpers.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">No verified helpers yet</p>';
        return;
    }

    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
    helpers.forEach(helper => {
        const name = helper.displayName || `${helper.firstName} ${helper.lastName}`;
        const verifiedDate = helper.verifiedAt ? new Date(helper.verifiedAt.toDate()).toLocaleDateString() : 'Recently';

        html += `
            <div class="bg-gray-800 bg-opacity-50 rounded-xl p-4 border border-green-500/20">
                <div class="flex items-center space-x-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1">
                        <h4 class="text-white font-semibold text-sm">${name}</h4>
                        <p class="text-xs text-gray-400">${helper.serviceCategory || 'Helper'}</p>
                    </div>
                    <i class="fas fa-check-circle text-green-500"></i>
                </div>
                <div class="text-xs text-gray-400">
                    <p>Verified: ${verifiedDate}</p>
                    <p class="font-mono mt-1">${helper.aadharNumber ? helper.aadharNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 ****') : ''}</p>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

// Open verification modal
window.openVerifyModal = function (helper) {
    const modal = document.getElementById('verifyModal');
    const name = helper.displayName || `${helper.firstName} ${helper.lastName}`;

    document.getElementById('modalName').textContent = name;
    document.getElementById('modalEmail').textContent = helper.email;
    document.getElementById('modalPhone').textContent = helper.phoneNumber || helper.phone || '-';
    document.getElementById('modalService').textContent = helper.serviceCategory || '-';
    document.getElementById('modalExperience').textContent = `${helper.experience || 0} years`;
    document.getElementById('modalAadhar').textContent = helper.aadharNumber ?
        helper.aadharNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : 'Not provided';

    if (helper.aadharImageURL) {
        document.getElementById('modalAadharImage').src = helper.aadharImageURL;
        document.getElementById('modalImageLink').href = helper.aadharImageURL;
    } else {
        document.getElementById('modalAadharImage').src = 'https://via.placeholder.com/400x250?text=No+Image+Uploaded';
        document.getElementById('modalImageLink').href = '#';
    }

    document.getElementById('currentHelperId').value = helper.id;
    document.getElementById('adminNotes').value = '';

    modal.classList.remove('hidden');
};

window.closeVerifyModal = function () {
    document.getElementById('verifyModal').classList.add('hidden');
};

// Approve helper
window.approveHelper = async function () {
    const helperId = document.getElementById('currentHelperId').value;
    const notes = document.getElementById('adminNotes').value;

    if (!confirm('✅ Approve this helper\'s Aadhar verification?')) return;

    try {
        await firebase.firestore().collection('users').doc(helperId).update({
            verificationStatus: 'verified',
            verified: true,
            verifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
            verifiedBy: currentUser.uid,
            verificationNotes: notes
        });

        alert('✅ Helper verified successfully!');
        closeVerifyModal();
        loadVerifications();
    } catch (error) {
        console.error('Error approving helper:', error);
        alert('❌ Error: ' + error.message);
    }
};

// Reject helper
window.rejectHelper = async function () {
    const helperId = document.getElementById('currentHelperId').value;
    const notes = document.getElementById('adminNotes').value;

    if (!notes.trim()) {
        alert('⚠️ Please provide a reason for rejection');
        return;
    }

    if (!confirm('❌ Reject this helper\'s verification?')) return;

    try {
        await firebase.firestore().collection('users').doc(helperId).update({
            verificationStatus: 'rejected',
            verified: false,
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: currentUser.uid,
            rejectionReason: notes
        });

        alert('❌ Verification rejected');
        closeVerifyModal();
        loadVerifications();
    } catch (error) {
        console.error('Error rejecting helper:', error);
        alert('❌ Error: ' + error.message);
    }
};
