document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    const jobsContainer = document.getElementById('jobsContainer');
    const loadingState = document.getElementById('loadingState');
    let currentFilter = 'requests'; // Default to 'New Requests' to find work
    let helperData = {};

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Load User Skills & Details
            try {
                const doc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (doc.exists) {
                    const data = doc.data();
                    userSkills = data.skills || [];
                    helperData = {
                        name: data.displayName || 'Helper',
                        phone: data.phoneNumber || data.phone || ''
                    };
                }
            } catch (e) {
                console.error("Error loading profile:", e);
            }

            // ... (rest of setup)
            loadJobs(user);
        } else {
            window.location.href = '../login.html';
        }
    });

    // ... (rest of code)

    window.acceptJob = async (jobId, uid) => {
        try {
            await firebase.firestore().collection('bookings').doc(jobId).update({
                helperId: uid,
                helperName: helperData.name,
                helperPhone: helperData.phone,
                status: 'assigned',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // UI auto-updates via snapshot, job moves from 'requests' to 'active'
        } catch (err) {
            console.error("Accept error:", err);
            alert("Failed to accept job. Someone else might have taken it.");
        }
    };

    window.rejectJob = async (jobId) => {
        if (!confirm("Cancel this assignment? It will return to the pool.")) return;
        try {
            await firebase.firestore().collection('bookings').doc(jobId).update({
                helperId: null,
                status: 'pending',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) { alert("Failed to cancel."); }
    };

    window.updateJobStatus = async (jobId, newStatus) => {
        if (!confirm(`Change status to ${newStatus}?`)) return;
        try {
            await firebase.firestore().collection('bookings').doc(jobId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) { alert("Failed to update status"); }
    };
});
