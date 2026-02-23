// Safety Center - HomeSphere
// Handles emergency features, panic button, emergency contacts, location sharing

document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    let currentUser = null;
    let userLocation = null;
    let locationWatchId = null;

    // Authentication check
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        currentUser = user;

        // Load user profile
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        if (userData) {
            const displayName = userData.displayName ||
                (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : null) ||
                'User';
            document.getElementById('userProfileName').textContent = displayName;
            document.getElementById('userProfileImg').src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`;
        }

        // Load safety data
        loadEmergencyContacts();
        loadActiveSessions();
        loadSafetyStats();
        loadSafeWord();
    });

    // Load Emergency Contacts
    async function loadEmergencyContacts() {
        try {
            const snapshot = await firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .collection('emergencyContacts')
                .get();

            const container = document.getElementById('emergencyContactsList');

            if (snapshot.empty) {
                container.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">No emergency contacts added yet</p>';
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const contact = doc.data();
                html += `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                                ${contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p class="font-semibold text-gray-800">${contact.name}</p>
                                <p class="text-sm text-gray-500">${contact.phone} • ${contact.relation}</p>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="callContact('${contact.phone}')" 
                                class="text-green-600 hover:text-green-700 p-2" title="Call">
                                <i class="fas fa-phone"></i>
                            </button>
                            <button onclick="deleteContact('${doc.id}')" 
                                class="text-red-600 hover:text-red-700 p-2" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading emergency contacts:', error);
        }
    }

    // Load Active Sessions
    async function loadActiveSessions() {
        try {
            const snapshot = await firebase.firestore()
                .collection('bookings')
                .where('userId', '==', currentUser.uid)
                .where('status', 'in', ['assigned', 'in-progress'])
                .get();

            const container = document.getElementById('activeSessionsList');

            if (snapshot.empty) {
                container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">No active service sessions</p>';
                return;
            }

            let html = '';
            for (const doc of snapshot.docs) {
                const booking = doc.data();

                // Fetch helper details
                let helperData = { displayName: 'Helper', phone: 'N/A', verified: false };
                if (booking.helperId) {
                    const helperDoc = await firebase.firestore().collection('users').doc(booking.helperId).get();
                    if (helperDoc.exists) {
                        helperData = helperDoc.data();
                    }
                }

                const verifiedBadge = helperData.verified || helperData.status === 'verified'
                    ? '<span class="text-green-600 text-xs ml-2"><i class="fas fa-check-circle"></i> Verified</span>'
                    : '<span class="text-yellow-600 text-xs ml-2"><i class="fas fa-exclamation-circle"></i> Unverified</span>';

                html += `
                    <div class="border-l-4 border-indigo-500 bg-indigo-50 rounded-xl p-4 mb-4">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <h4 class="font-bold text-gray-800">${booking.service}</h4>
                                <p class="text-sm text-gray-600 mt-1">
                                    Helper: ${helperData.displayName || helperData.firstName || 'Unknown'}
                                    ${verifiedBadge}
                                </p>
                                <p class="text-xs text-gray-500 mt-1">
                                    Status: <span class="font-semibold text-indigo-600">${booking.status}</span>
                                </p>
                            </div>
                            <div class="flex flex-col space-y-2">
                                <button onclick="shareSessionLocation('${doc.id}')" 
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs">
                                    <i class="fas fa-map-marker-alt mr-1"></i>Share Location
                                </button>
                                <button onclick="reportIssue('${doc.id}')" 
                                    class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs">
                                    <i class="fas fa-flag mr-1"></i>Report Issue
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading active sessions:', error);
        }
    }

    // Load Safety Stats
    async function loadSafetyStats() {
        try {
            const bookingsSnapshot = await firebase.firestore()
                .collection('bookings')
                .where('userId', '==', currentUser.uid)
                .where('status', '==', 'completed')
                .get();

            let verifiedCount = 0;
            for (const doc of bookingsSnapshot.docs) {
                const booking = doc.data();
                if (booking.helperId) {
                    const helperDoc = await firebase.firestore().collection('users').doc(booking.helperId).get();
                    if (helperDoc.exists && (helperDoc.data().verified || helperDoc.data().status === 'verified')) {
                        verifiedCount++;
                    }
                }
            }

            document.getElementById('verifiedHelpersCount').textContent = verifiedCount;
            document.getElementById('safeCompletionsCount').textContent = bookingsSnapshot.size;
        } catch (error) {
            console.error('Error loading safety stats:', error);
        }
    }

    // Load Safe Word
    async function loadSafeWord() {
        try {
            const doc = await firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .get();

            const userData = doc.data();
            if (userData && userData.safeWord) {
                document.getElementById('currentSafeWord').textContent = userData.safeWord;
            }
        } catch (error) {
            console.error('Error loading safe word:', error);
        }
    }

    // Panic Button
    window.triggerPanic = async function () {
        if (!confirm('⚠️ WARNING: This will alert emergency services and your emergency contacts. Continue only in case of real emergency!')) {
            return;
        }

        try {
            const panicButton = document.getElementById('panicButton');
            panicButton.disabled = true;
            panicButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>ALERTING...';

            // Get current location
            let location = null;
            if (navigator.geolocation) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                    location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                } catch (err) {
                    console.error('Location error:', err);
                }
            }

            // Get user data for better context
            const userDoc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
            const userData = userDoc.data();

            // Create panic alert in Firestore
            const alertRef = await firebase.firestore().collection('panicAlerts').add({
                userId: currentUser.uid,
                userName: userData.displayName || `${userData.firstName} ${userData.lastName}` || currentUser.displayName || 'User',
                userEmail: currentUser.email,
                userPhone: userData.phoneNumber || userData.phone || '',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                location: location,
                status: 'active',
                resolved: false,
                smsNotified: false, // Will trigger SMS in admin dashboard
                priority: 'urgent'
            });

            console.log('🚨 Panic alert created:', alertRef.id);

            // Show success alert with more details
            alert(`🚨 EMERGENCY ALERT ACTIVATED!

✅ Safety team notified
✅ Emergency contacts will be alerted via SMS
✅ Your location has been shared
${location ? `✅ GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : '⚠️ Location unavailable'}

Alert ID: ${alertRef.id.substring(0, 8)}

Stay safe! Our team will contact you shortly.`);

            panicButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>HELP DISPATCHED';
            panicButton.classList.remove('panic-button');
            panicButton.classList.add('bg-green-500', 'text-white');

        } catch (error) {
            console.error('Panic alert error:', error);
            alert('Error sending alert. Please call emergency services directly: 100');
            panicButton.disabled = false;
            panicButton.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>ACTIVATE PANIC MODE';
        }
    };

    // Share Location
    window.shareLocation = async function () {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // Save location to Firestore
            await firebase.firestore().collection('users').doc(currentUser.uid).update({
                lastLocation: location,
                lastLocationTime: firebase.firestore.FieldValue.serverTimestamp(),
                sharingLocation: true
            });

            const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

            alert(`📍 Location Shared Successfully!\n\nShare this link with emergency contacts:\n${mapsUrl}`);

            // Copy to clipboard
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(mapsUrl);
                console.log('Location link copied to clipboard');
            }

        } catch (error) {
            console.error('Location sharing error:', error);
            alert('Unable to access location. Please enable location services.');
        }
    };

    // Call Emergency Police
    window.callPolice = function () {
        if (confirm('🚨 This will initiate a call to Emergency Services (100). Continue?')) {
            window.location.href = 'tel:100';
        }
    };

    // Call Contact
    window.callContact = function (phone) {
        window.location.href = `tel:${phone}`;
    };

    // Add Emergency Contact
    document.getElementById('addContactForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('contactName').value;
        const phone = document.getElementById('contactPhone').value;
        const relation = document.getElementById('contactRelation').value;

        try {
            await firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .collection('emergencyContacts')
                .add({
                    name: name,
                    phone: phone,
                    relation: relation,
                    addedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            closeAddContactModal();
            document.getElementById('addContactForm').reset();
            loadEmergencyContacts();
            alert('✅ Emergency contact added successfully!');
        } catch (error) {
            console.error('Error adding contact:', error);
            alert('Error adding contact. Please try again.');
        }
    });

    // Delete Contact
    window.deleteContact = async function (contactId) {
        if (!confirm('Remove this emergency contact?')) return;

        try {
            await firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .collection('emergencyContacts')
                .doc(contactId)
                .delete();

            loadEmergencyContacts();
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Error removing contact.');
        }
    };

    // Safe Word
    document.getElementById('safeWordForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const safeWord = document.getElementById('safeWordInput').value.trim();

        if (safeWord.length < 3) {
            alert('Safe word must be at least 3 characters long');
            return;
        }

        try {
            await firebase.firestore().collection('users').doc(currentUser.uid).update({
                safeWord: safeWord,
                safeWordUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            closeSafeWordModal();
            loadSafeWord();
            alert('✅ Safe word updated successfully!');
        } catch (error) {
            console.error('Error updating safe word:', error);
            alert('Error updating safe word.');
        }
    });

    // Share Session Location
    window.shareSessionLocation = async function (bookingId) {
        await shareLocation();
        alert(`Location shared for active session #${bookingId.substring(0, 8)}`);
    };

    // Report Issue
    window.reportIssue = async function (bookingId) {
        const issue = prompt('Describe the safety issue:');
        if (!issue) return;

        try {
            await firebase.firestore().collection('safetyReports').add({
                bookingId: bookingId,
                userId: currentUser.uid,
                issue: issue,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            });

            alert('⚠️ Safety issue reported. Our team will investigate immediately.');
        } catch (error) {
            console.error('Error reporting issue:', error);
            alert('Error submitting report.');
        }
    };

    // View Safety Tips
    window.viewSafetyTips = function () {
        document.getElementById('safetyTipsModal').classList.remove('hidden');
    };

    // Modal Controls
    window.openAddContactModal = () => document.getElementById('addContactModal').classList.remove('hidden');
    window.closeAddContactModal = () => document.getElementById('addContactModal').classList.add('hidden');
    window.openSafeWordModal = () => document.getElementById('safeWordModal').classList.remove('hidden');
    window.closeSafeWordModal = () => document.getElementById('safeWordModal').classList.add('hidden');
    window.closeSafetyTipsModal = () => document.getElementById('safetyTipsModal').classList.add('hidden');
});
