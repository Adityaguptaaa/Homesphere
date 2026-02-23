// Helper Dashboard Logic
document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }

        console.log('👷 Helper authenticated:', user.email);
        loadDashboardData(user);
        loadAvailableAndActiveJobs(user);
    });
});

async function loadDashboardData(user) {
    try {
        // 1. Load User Profile for Name/Avatar
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            document.querySelectorAll('.helper-name').forEach(el => el.textContent = data.displayName || 'Helper');
            const welcomeMsg = document.getElementById('welcomeMessage');
            if (welcomeMsg) welcomeMsg.textContent = `Welcome, ${data.displayName || 'Helper'}!`;

            const avatars = document.querySelectorAll('.helper-avatar');
            avatars.forEach(img => {
                img.src = `https://ui-avatars.com/api/?name=${data.displayName || 'Helper'}&background=06b6d4&color=fff`;
            });
        }

        // 2. Load Stats (Earnings, Ratings, Jobs)
        // Note: For production, use aggregated stats on user document to save reads
        // Here we query bookings (MVP approach)

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        firebase.firestore().collection('bookings')
            .where('helperId', '==', user.uid)
            .where('status', '==', 'completed')
            .onSnapshot(snapshot => {
                let totalEarnings = 0;
                let todayEarnings = 0;
                let todayJobs = 0;
                let totalStars = 0;
                let reviewCount = 0;

                snapshot.forEach(doc => {
                    const job = doc.data();
                    const price = parseFloat(job.price) || 0;
                    totalEarnings += price;

                    // Check if today (using completedAt or date?) Assuming date field structure
                    // Need timestamp check. job.updatedAt or job.date
                    const jobDate = job.updatedAt ? job.updatedAt.toDate() : (job.date ? new Date(job.date) : null);
                    if (jobDate && jobDate >= startOfDay) {
                        todayEarnings += price;
                        todayJobs++;
                    }

                    if (job.rating) {
                        totalStars += job.rating;
                        reviewCount++;
                    }
                });

                // Update UI
                updateText('todaysEarnings', todayEarnings.toLocaleString());
                updateText('todaysJobsCount', todayJobs);
                updateText('walletBalance', totalEarnings.toLocaleString()); // Assuming Balance = Total Earnings for MVP
                updateText('totalEarnings', '₹' + totalEarnings.toLocaleString()); // Chart header total

                const avg = reviewCount > 0 ? (totalStars / reviewCount).toFixed(1) : '5.0'; // Default high trust for new
                updateText('avgRatingDisplay', avg);
                updateText('totalReviewsCount', reviewCount);
                updateText('totalReviewsText', reviewCount);

                // Trust Score (Simulated based on jobs/rating)
                const trust = Math.min(100, 50 + (reviewCount * 2) + (avg * 5));
                updateText('trustScore', Math.floor(trust));

            });

    } catch (error) {
        console.error("Dashboard load error:", error);
    }
}

function updateText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// Reuse logic for lists - streamlined
function loadAvailableAndActiveJobs(user) {
    // My Active Jobs
    firebase.firestore().collection('bookings')
        .where('helperId', '==', user.uid)
        .where('status', 'in', ['assigned', 'in-progress'])
        .onSnapshot(snap => {
            const list = document.getElementById('myJobsList');
            if (!list) return;
            if (snap.empty) {
                list.innerHTML = `<div class="text-center py-8 text-gray-500"><p>No active jobs.</p></div>`;
                return;
            }
            let html = '';
            snap.forEach(doc => {
                const job = { id: doc.id, ...doc.data() };
                html += renderMiniCard(job, 'active');
            });
            list.innerHTML = html;
        });

    // Available Jobs (Pending & Unassigned & Matched Skills - simplistic here, just pending unassigned)
    // For dashboard, we might show ALL pending or just a few.
    // Let's show recent pending jobs.
    firebase.firestore().collection('bookings')
        .where('status', '==', 'pending')
        .limit(5)
        .onSnapshot(snap => {
            const list = document.getElementById('availableJobsList');
            const countBadge = document.getElementById('availableJobsCount');
            if (!list) return;

            let html = '';
            let count = 0;
            snap.forEach(doc => {
                const job = doc.data();
                if (!job.helperId) { // Confirm unassigned
                    html += renderMiniCard({ id: doc.id, ...job }, 'available');
                    count++;
                }
            });

            if (count === 0) list.innerHTML = `<div class="text-center py-8 text-gray-500"><p>No new jobs available.</p></div>`;
            else list.innerHTML = html;

            if (countBadge) countBadge.textContent = count;
        });
}

function renderMiniCard(job, type) {
    const statusColor = type === 'active' ? 'border-green-500/50' : 'border-gray-700';
    return `
        <div class="bg-gray-700/50 rounded-xl p-3 border ${statusColor} mb-2 flex justify-between items-center">
            <div>
                <h4 class="font-bold text-white text-sm">${job.service}</h4>
                <p class="text-xs text-gray-400">${job.address || 'Location N/A'}</p>
            </div>
            <span class="text-cyan-400 font-bold text-sm">₹${job.price}</span>
        </div>
    `;
}
