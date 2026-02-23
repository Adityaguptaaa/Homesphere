// Admin Analytics Management
document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) { // check admin
            window.location.href = '../login.html';
            return;
        }
        loadAnalytics();
    });

    function loadAnalytics() {

        // 1. Users Stats
        firebase.firestore().collection('users').get().then(snap => {
            let users = 0;
            let helpers = 0;
            snap.forEach(doc => {
                const d = doc.data();
                if (d.role === 'user') users++;
                if (d.role === 'helper') helpers++;
            });
            document.getElementById('totalUsers').textContent = users;
            document.getElementById('totalHelpers').textContent = helpers;
        });

        // 2. Bookings Stats & Revenue
        firebase.firestore().collection('bookings').onSnapshot(snap => {
            let total = 0;
            let pending = 0;
            let completed = 0;
            let revenue = 0;

            snap.forEach(doc => {
                total++;
                const d = doc.data();
                if (d.status === 'pending') pending++;
                if (d.status === 'completed') {
                    completed++;
                    revenue += (parseFloat(d.price) || 0);
                }
            });

            document.getElementById('totalBookings').textContent = total;
            document.getElementById('activeBookings').textContent = pending + (total - pending - completed); // approximate active
            document.getElementById('totalRevenue').textContent = '₹' + revenue.toLocaleString();

            // Update Charts if they exist (mock data update)
            if (window.revenueChart) {
                // Update chart logic here
            }
        });
    }
});
