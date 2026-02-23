document.addEventListener('DOMContentLoaded', async () => {
    // Check if Firebase is initialized
    if (!firebase.apps.length) {
        console.error("Firebase not initialized!");
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Get the 'My Jobs' sidebar link span
            const jobsLinkSpan = document.querySelector('a[href="jobs.html"] span');
            if (jobsLinkSpan) {
                try {
                    // Real-time listener for active jobs
                    firebase.firestore().collection('bookings')
                        .where('helperId', '==', user.uid)
                        .where('status', 'in', ['pending', 'in-progress'])
                        .onSnapshot(snapshot => {
                            const count = snapshot.size;
                            // Check if badge already exists
                            let badge = jobsLinkSpan.parentElement.querySelector('.job-badge');

                            if (count > 0) {
                                if (!badge) {
                                    badge = document.createElement('span');
                                    badge.className = 'job-badge ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full';
                                    jobsLinkSpan.parentElement.appendChild(badge);
                                }
                                badge.textContent = count;
                                badge.style.display = 'inline-block';
                            } else {
                                if (badge) {
                                    badge.style.display = 'none';
                                }
                            }
                        });
                } catch (error) {
                    console.error("Error fetching job count:", error);
                }
            }
        }
    });
});
