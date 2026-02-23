document.addEventListener('DOMContentLoaded', async () => {
    // Check if Firebase is initialized
    if (!firebase.apps.length) {
        console.error("Firebase not initialized!");
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Find 'My Bookings' link in sidebar
            const bookingLink = document.querySelector('a[href="booking.html"]');

            if (bookingLink) {
                try {
                    // Real-time listener for active user bookings
                    // Query for bookings that need attention (upcoming, in-progress, pending)
                    firebase.firestore().collection('bookings')
                        .where('userId', '==', user.uid)
                        .where('status', 'in', ['pending', 'upcoming', 'in-progress'])
                        .onSnapshot(snapshot => {
                            const count = snapshot.size;
                            let badge = bookingLink.querySelector('.booking-badge');

                            if (count > 0) {
                                if (!badge) {
                                    badge = document.createElement('span');
                                    // Style matching the design system
                                    badge.className = 'booking-badge ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm';
                                    bookingLink.appendChild(badge);
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
                    console.error("Error fetching user booking count:", error);
                }
            }
        }
    });
});
