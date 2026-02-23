document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    const avgRatingEl = document.getElementById('avgRating');
    const totalReviewsEl = document.getElementById('totalReviews');
    const reviewsContainer = document.getElementById('reviewsContainer');
    const loadingState = document.getElementById('loadingState');
    const contentState = document.getElementById('contentState');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            loadPerformance(user);
        } else {
            window.location.href = '../login.html';
        }
    });

    function loadPerformance(user) {
        contentState.classList.add('hidden');
        loadingState.classList.remove('hidden');

        firebase.firestore().collection('bookings')
            .where('helperId', '==', user.uid)
            .where('status', '==', 'completed')
            .onSnapshot(snapshot => {
                let totalStars = 0;
                let count = 0;
                let html = '';

                if (snapshot.empty) {
                    html = `<p class="text-center text-gray-500 col-span-full py-12">No reviews yet.</p>`;
                } else {
                    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // Filter those with ratings
                    const reviewedJobs = jobs.filter(j => j.rating > 0);
                    count = reviewedJobs.length;

                    reviewedJobs.forEach(job => {
                        totalStars += job.rating;
                        const rating = job.rating;
                        const starsHtml = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
                        const date = job.ratedAt ? new Date(job.ratedAt.toDate()).toLocaleDateString() : 'N/A';

                        html += `
                            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <div class="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 class="text-lg font-bold text-white">${job.userName || 'Customer'}</h4>
                                        <p class="text-yellow-400 text-sm tracking-widest">${starsHtml}</p>
                                    </div>
                                    <span class="text-gray-500 text-xs">${date}</span>
                                </div>
                                <p class="text-gray-300 italic">"${job.review || 'No written review provided.'}"</p>
                                <div class="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
                                    Service: ${job.service}
                                </div>
                            </div>
                        `;
                    });
                }

                const avg = count > 0 ? (totalStars / count).toFixed(1) : 'NEW';
                avgRatingEl.textContent = avg;
                totalReviewsEl.textContent = `${count} Reviews`;
                reviewsContainer.innerHTML = html;

                loadingState.classList.add('hidden');
                contentState.classList.remove('hidden');
            });
    }
});
