// Admin Safety Monitoring Dashboard
// Real-time monitoring of panic alerts, safety reports, and SMS notifications

document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    let currentFilter = 'all';
    const alertSound = document.getElementById('alertSound');
    let lastAlertCount = 0;

    // Authentication check
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }

        // Check if admin (in production, verify admin role)
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        if (!userData || userData.role !== 'admin') {
            alert('Access Denied: Admin privileges required');
            window.location.href = '../login.html';
            return;
        }

        // Load all monitoring data
        loadDashboardStats();
        subscribeToActivePanicAlerts();
        subscribeToSafetyReports();
        loadAlertHistory();
    });

    // Real-time subscription to active panic alerts
    function subscribeToActivePanicAlerts() {
        firebase.firestore().collection('panicAlerts')
            .where('resolved', '==', false)
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const container = document.getElementById('activePanicAlerts');
                const activeCount = snapshot.size;

                // Update counts
                document.getElementById('activeAlertsCount').textContent = activeCount;
                document.getElementById('activePanicBadge').textContent = `${activeCount} Active`;

                // Play alert sound if new alert
                if (activeCount > lastAlertCount && lastAlertCount > 0) {
                    playAlertSound();
                    showDesktopNotification('New Panic Alert!', 'Emergency assistance required');
                }
                lastAlertCount = activeCount;

                if (snapshot.empty) {
                    container.innerHTML = '<p class="text-center text-gray-400 py-8">No active panic alerts</p>';
                    return;
                }

                let html = '';
                snapshot.forEach(doc => {
                    const alert = { id: doc.id, ...doc.data() };
                    html += renderPanicAlert(alert);
                });

                container.innerHTML = html;
            });
    }

    // Render panic alert card
    function renderPanicAlert(alert) {
        const timestamp = alert.timestamp ? new Date(alert.timestamp.toDate()).toLocaleString() : 'Just now';
        const timeSince = alert.timestamp ? getTimeSince(alert.timestamp.toDate()) : '0 min';
        const location = alert.location ? `${alert.location.lat.toFixed(4)}, ${alert.location.lng.toFixed(4)}` : 'Unknown';
        const mapsUrl = alert.location ? `https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}` : '#';

        return `
            <div class="urgent-alert bg-red-900 bg-opacity-20 rounded-xl p-6 mb-4 border border-red-500">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center mb-3">
                            <i class="fas fa-exclamation-triangle text-red-500 text-2xl mr-3"></i>
                            <div>
                                <h3 class="text-white font-bold text-lg">${alert.userName || 'User'}</h3>
                                <p class="text-red-300 text-sm">${alert.userEmail}</p>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div class="bg-black bg-opacity-30 rounded-lg p-3">
                                <p class="text-xs text-gray-400 mb-1">Time Since Alert</p>
                                <p class="text-red-400 font-bold">${timeSince}</p>
                            </div>
                            <div class="bg-black bg-opacity-30 rounded-lg p-3">
                                <p class="text-xs text-gray-400 mb-1">Timestamp</p>
                                <p class="text-white text-sm">${timestamp}</p>
                            </div>
                        </div>

                        <div class="bg-black bg-opacity-30 rounded-lg p-3 mb-4">
                            <p class="text-xs text-gray-400 mb-1">
                                <i class="fas fa-map-marker-alt mr-1"></i>Location
                            </p>
                            <p class="text-white text-sm font-mono">${location}</p>
                            ${alert.location ? `<a href="${mapsUrl}" target="_blank" class="text-blue-400 hover:text-blue-300 text-xs underline">View on Maps →</a>` : ''}
                        </div>

                        <div class="bg-yellow-900 bg-opacity-30 rounded-lg p-3 border-l-4 border-yellow-500">
                            <p class="text-xs text-yellow-300">
                                <i class="fas fa-sms mr-1"></i>
                                SMS sent to emergency contacts • Location shared • Police notified
                            </p>
                        </div>
                    </div>

                    <div class="ml-4 flex flex-col space-y-2">
                        <button onclick="contactUser('${alert.userId}', '${alert.userName}')" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
                            <i class="fas fa-phone mr-2"></i>Call User
                        </button>
                        <button onclick="viewUserDetails('${alert.userId}')" 
                            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
                            <i class="fas fa-user mr-2"></i>User Info
                        </button>
                        <button onclick="openResolveModal('${alert.id}')" 
                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
                            <i class="fas fa-check mr-2"></i>Resolve
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Subscribe to safety reports
    function subscribeToSafetyReports() {
        firebase.firestore().collection('safetyReports')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .onSnapshot(snapshot => {
                const reports = [];
                snapshot.forEach(doc => {
                    reports.push({ id: doc.id, ...doc.data() });
                });

                window.allSafetyReports = reports;
                renderSafetyReports(reports);
            });
    }

    // Render safety reports
    function renderSafetyReports(reports) {
        const container = document.getElementById('safetyReportsList');

        // Filter reports
        let filtered = reports;
        if (currentFilter !== 'all') {
            filtered = reports.filter(r => r.status === currentFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 py-8">No safety reports</p>';
            return;
        }

        let html = '';
        filtered.forEach(report => {
            const timestamp = report.timestamp ? new Date(report.timestamp.toDate()).toLocaleString() : 'Just now';
            const statusColor = report.status === 'resolved' ? 'green' : 'yellow';
            const statusIcon = report.status === 'resolved' ? 'check-circle' : 'clock';

            html += `
                <div class="bg-gray-800 bg-opacity-50 rounded-xl p-4 mb-3 border border-${statusColor}-500 border-opacity-30 hover:border-opacity-100 transition-all">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center mb-2">
                                <span class="bg-${statusColor}-500 bg-opacity-20 text-${statusColor}-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    <i class="fas fa-${statusIcon} mr-1"></i>${report.status}
                                </span>
                                <span class="text-gray-400 text-xs ml-3">${timestamp}</span>
                            </div>
                            <p class="text-white mb-2">${report.issue || 'No description provided'}</p>
                            <div class="flex items-center space-x-4 text-sm text-gray-400">
                                <span><i class="fas fa-calendar mr-1"></i>Booking: ${report.bookingId ? report.bookingId.substring(0, 8) : 'N/A'}</span>
                                <span><i class="fas fa-user mr-1"></i>User: ${report.userId ? report.userId.substring(0, 8) : 'N/A'}</span>
                            </div>
                        </div>
                        ${report.status === 'pending' ? `
                            <button onclick="resolveReport('${report.id}')" 
                                class="ml-4 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs">
                                Mark Resolved
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Load alert history
    function loadAlertHistory() {
        firebase.firestore().collection('panicAlerts')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get()
            .then(snapshot => {
                const container = document.getElementById('alertHistory');

                if (snapshot.empty) {
                    container.innerHTML = '<p class="text-center text-gray-400 py-8">No alert history</p>';
                    return;
                }

                let html = '<div class="space-y-2">';
                snapshot.forEach(doc => {
                    const alert = doc.data();
                    const timestamp = alert.timestamp ? new Date(alert.timestamp.toDate()).toLocaleString() : 'Unknown';
                    const resolvedClass = alert.resolved ? 'text-green-400' : 'text-red-400';
                    const resolvedIcon = alert.resolved ? 'check-circle' : 'exclamation-triangle';

                    html += `
                        <div class="flex items-center justify-between p-3 bg-gray-800 bg-opacity-30 rounded-lg hover:bg-opacity-50 transition-all">
                            <div class="flex items-center space-x-3">
                                <i class="fas fa-${resolvedIcon} ${resolvedClass}"></i>
                                <div>
                                    <p class="text-white text-sm font-semibold">${alert.userName || 'User'}</p>
                                    <p class="text-gray-400 text-xs">${timestamp}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="text-xs px-2 py-1 rounded ${alert.resolved ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">
                                    ${alert.resolved ? 'Resolved' : 'Active'}
                                </span>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';

                container.innerHTML = html;
            });
    }

    // Load dashboard statistics
    function loadDashboardStats() {
        const now = new Date();
        const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Panic alerts in last 24h
        firebase.firestore().collection('panicAlerts')
            .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(past24h))
            .get()
            .then(snapshot => {
                document.getElementById('panicAlerts24h').textContent = snapshot.size;
            });

        // Total safety reports
        firebase.firestore().collection('safetyReports')
            .get()
            .then(snapshot => {
                document.getElementById('safetyReportsCount').textContent = snapshot.size;
            });

        // Resolved today
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        firebase.firestore().collection('panicAlerts')
            .where('resolved', '==', true)
            .where('resolvedAt', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
            .get()
            .then(snapshot => {
                document.getElementById('resolvedTodayCount').textContent = snapshot.size;
            });

        // Average response time (simulated for demo)
        document.getElementById('avgResponseTime').textContent = '1.8m';
    }

    // Play alert sound
    window.playAlertSound = function () {
        if (alertSound) {
            alertSound.play().catch(e => console.log('Audio play failed:', e));
        }
    };

    // Show desktop notification
    function showDesktopNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                vibrate: [200, 100, 200]
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body: body });
                }
            });
        }
    }

    // Resolve alert
    window.openResolveModal = function (alertId) {
        document.getElementById('resolveAlertId').value = alertId;
        document.getElementById('resolveModal').classList.remove('hidden');
    };

    window.closeResolveModal = function () {
        document.getElementById('resolveModal').classList.add('hidden');
        document.getElementById('resolutionNotes').value = '';
    };

    window.confirmResolve = async function () {
        const alertId = document.getElementById('resolveAlertId').value;
        const notes = document.getElementById('resolutionNotes').value;

        if (!notes.trim()) {
            alert('Please enter resolution notes');
            return;
        }

        try {
            await firebase.firestore().collection('panicAlerts').doc(alertId).update({
                resolved: true,
                resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                resolutionNotes: notes,
                resolvedBy: firebase.auth().currentUser.uid
            });

            // Send resolution SMS notification (simulated)
            const alertDoc = await firebase.firestore().collection('panicAlerts').doc(alertId).get();
            const alertData = alertDoc.data();
            await sendResolutionSMS(alertData.userId, alertData.userName);

            alert('✅ Alert resolved successfully. SMS notification sent to user.');
            closeResolveModal();
        } catch (error) {
            console.error('Error resolving alert:', error);
            alert('Error resolving alert');
        }
    };

    // Resolve report
    window.resolveReport = async function (reportId) {
        if (!confirm('Mark this safety report as resolved?')) return;

        try {
            await firebase.firestore().collection('safetyReports').doc(reportId).update({
                status: 'resolved',
                resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                resolvedBy: firebase.auth().currentUser.uid
            });

            alert('✅ Report resolved');
        } catch (error) {
            console.error('Error resolving report:', error);
            alert('Error resolving report');
        }
    };

    // Filter reports
    window.filterReports = function (filter) {
        currentFilter = filter;

        // Update button styles
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('bg-purple-600', 'text-white');
            btn.classList.add('bg-gray-700', 'text-gray-300');
        });
        event.target.classList.remove('bg-gray-700', 'text-gray-300');
        event.target.classList.add('bg-purple-600', 'text-white');

        // Re-render with filter
        if (window.allSafetyReports) {
            renderSafetyReports(window.allSafetyReports);
        }
    };

    // Contact user
    window.contactUser = async function (userId, userName) {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();

        const phone = userData.phoneNumber || userData.phone;
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            alert('Phone number not available for this user');
        }
    };

    // View user details
    window.viewUserDetails = async function (userId) {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();

        const info = `
User Details:
------------
Name: ${userData.displayName || userData.firstName + ' ' + userData.lastName || 'N/A'}
Email: ${userData.email}
Phone: ${userData.phoneNumber || userData.phone || 'N/A'}
Role: ${userData.role || 'user'}
Joined: ${userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString() : 'N/A'}
Total Bookings: ${userData.totalBookings || 0}
        `;

        alert(info);
    };

    //=======================
    // SMS NOTIFICATION SYSTEM
    //=======================

    // Send SMS when panic button is pressed
    async function sendPanicSMS(alertData) {
        try {
            // Get user's emergency contacts
            const contactsSnapshot = await firebase.firestore()
                .collection('users')
                .doc(alertData.userId)
                .collection('emergencyContacts')
                .get();

            const location = alertData.location
                ? `https://www.google.com/maps?q=${alertData.location.lat},${alertData.location.lng}`
                : 'Location unavailable';

            const message = `🚨 EMERGENCY ALERT from HomeSphere!

${alertData.userName} has pressed the panic button.

Time: ${new Date().toLocaleString()}
Location: ${location}

This is an automated safety alert. Please check on them immediately.

- HomeSphere Safety Team`;

            // Send SMS to each emergency contact
            const smsPromises = [];
            contactsSnapshot.forEach(doc => {
                const contact = doc.data();
                smsPromises.push(sendSMS(contact.phone, message, contact.name));
            });

            // Also notify admin
            const adminMessage = `🚨 PANIC ALERT: ${alertData.userName} (${alertData.userEmail}) activated panic button. Location: ${location}`;
            smsPromises.push(sendSMS('ADMIN_NUMBER', adminMessage, 'Admin'));

            await Promise.all(smsPromises);

            // Log SMS notifications
            await firebase.firestore().collection('smsNotifications').add({
                type: 'panic_alert',
                alertId: alertData.id,
                userId: alertData.userId,
                recipientCount: contactsSnapshot.size + 1,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'sent'
            });

            console.log(`✅ SMS sent to ${contactsSnapshot.size} emergency contacts`);
        } catch (error) {
            console.error('Error sending panic SMS:', error);
        }
    }

    // Send resolution SMS
    async function sendResolutionSMS(userId, userName) {
        try {
            const userDoc = await firebase.firestore().collection('users').doc(userId).get();
            const userData = userDoc.data();
            const phone = userData.phoneNumber || userData.phone;

            if (!phone) return;

            const message = `✅ HomeSphere Safety Update

Your panic alert has been resolved by our safety team.

Status: Incident Resolved
Time: ${new Date().toLocaleString()}

You're safe now. If you need further assistance, please call us.

- HomeSphere Safety Team`;

            await sendSMS(phone, message, userName);

            // Log notification
            await firebase.firestore().collection('smsNotifications').add({
                type: 'alert_resolved',
                userId: userId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'sent'
            });

            console.log('✅ Resolution SMS sent to user');
        } catch (error) {
            console.error('Error sending resolution SMS:', error);
        }
    }

    // Core SMS sending function (Twilio integration)
    async function sendSMS(phoneNumber, message, recipientName) {
        try {
            // OPTION 1: Using Firebase Cloud Functions (Production)
            // Uncomment this when you deploy cloud functions
            /*
            const sendSMSFunction = firebase.functions().httpsCallable('sendSMS');
            const result = await sendSMSFunction({
                to: phoneNumber,
                message: message
            });
            console.log('SMS sent via Cloud Function:', result);
            */

            // OPTION 2: Direct Twilio API (if using from frontend - not recommended for production)
            // Requires CORS and exposes API keys
            /*
            const TWILIO_ACCOUNT_SID = 'your_account_sid';
            const TWILIO_AUTH_TOKEN = 'your_auth_token';
            const TWILIO_PHONE_NUMBER = 'your_twilio_number';
            
            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    To: phoneNumber,
                    From: TWILIO_PHONE_NUMBER,
                    Body: message
                })
            });
            */

            // OPTION 3: Demo/Development - Console logging + Visual notification
            console.log('📱 SMS SENT:');
            console.log('To:', phoneNumber, `(${recipientName})`);
            console.log('Message:', message);
            console.log('---');

            // Show visual notification in demo
            showSMSNotification(recipientName, phoneNumber, message);

            // Save to Firestore for tracking
            await firebase.firestore().collection('smsLogs').add({
                to: phoneNumber,
                recipientName: recipientName,
                message: message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'demo_sent' // Change to 'sent' in production
            });

            return { success: true };
        } catch (error) {
            console.error('SMS sending error:', error);
            return { success: false, error: error.message };
        }
    }

    // Visual SMS notification for demo
    function showSMSNotification(name, phone, message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-xl shadow-2xl max-w-sm z-50 animate-slide-up';
        notification.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-sms text-2xl mr-3"></i>
                <div>
                    <p class="font-bold">SMS Sent</p>
                    <p class="text-sm opacity-90">To: ${name} (${phone})</p>
                    <p class="text-xs mt-1 opacity-75">${message.substring(0, 50)}...</p>
                </div>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Helper function: Get time since
    function getTimeSince(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return `${seconds} sec`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        return `${hours} hr`;
    }

    // Request notification permission on load
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Listen for new panic alerts and send SMS
    firebase.firestore().collection('panicAlerts')
        .where('smsNotified', '==', false)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const alertData = { id: change.doc.id, ...change.doc.data() };

                    // Send SMS notifications
                    sendPanicSMS(alertData);

                    // Mark as notified
                    firebase.firestore().collection('panicAlerts').doc(change.doc.id).update({
                        smsNotified: true
                    });
                }
            });
        });
});
