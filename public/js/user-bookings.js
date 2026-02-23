// User Bookings Logic

let currentUser = null;
let allBookings = [];
let currentFilter = window.defaultFilter || 'all';

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
        } else {
            currentUser = user;
            loadUserProfile(user.uid);
            loadBookingsRealtime(user.uid);
        }
    });

    // Booking Form Submission
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }

    // Rate Form Submission
    const rateForm = document.getElementById('rateForm');
    if (rateForm) {
        rateForm.addEventListener('submit', handleRateSubmit);
    }
});

async function loadUserProfile(uid) {
    try {
        const doc = await firebaseDB.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            const fullName = `${data.firstName} ${data.lastName}`;
            const nameEl = document.getElementById('userProfileName');
            if (nameEl) nameEl.textContent = fullName;
            const imgEl = document.getElementById('userProfileImg');
            if (imgEl) imgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=6366f1&color=fff`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function loadBookingsRealtime(uid) {
    const container = document.getElementById('bookingsContainer');
    firebaseDB.collection('bookings')
        .where('userId', '==', uid)
        .onSnapshot((snapshot) => {
            allBookings = [];
            snapshot.forEach(doc => {
                allBookings.push({ id: doc.id, ...doc.data() });
            });
            // Client-side sort
            allBookings.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.seconds : Date.now() / 1000;
                const timeB = b.createdAt ? b.createdAt.seconds : Date.now() / 1000;
                return timeB - timeA;
            });
            renderBookings();
        }, (error) => {
            console.error("Error fetching bookings:", error);
            container.innerHTML = `<div class="col-span-2 text-center text-red-500 py-8">Error loading bookings. Please try again.</div>`;
        });
}

function renderBookings() {
    const container = document.getElementById('bookingsContainer');
    if (!container) return;
    container.innerHTML = '';

    let filtered = allBookings;
    if (currentFilter !== 'all') {
        filtered = allBookings.filter(b => b.status === currentFilter);
        if (currentFilter === 'upcoming') {
            filtered = allBookings.filter(b => ['pending', 'assigned'].includes(b.status));
        }
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-2 text-center py-12 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
                <h3 class="text-lg font-semibold text-gray-800">No bookings found</h3>
                <p class="text-gray-500">You don't have any bookings in this category.</p>
                <button onclick="openBookingModal()" class="text-indigo-600 font-semibold hover:underline mt-2">Book a Service</button>
            </div>`;
        return;
    }

    filtered.forEach(booking => {
        const date = booking.scheduledDate ? new Date(booking.scheduledDate.seconds * 1000).toLocaleString() : 'Date Pending';
        const price = booking.totalPrice || booking.amount || 0;
        const statusDetails = getStatusDetails(booking.status);

        // Determine Rate Button State (If already rated, hide or show 'Rated')
        let rateButton = '';
        if (booking.status === 'completed') {
            if (booking.rating) {
                rateButton = `<span class="px-3 py-1 bg-gray-100 text-yellow-600 rounded-lg text-sm font-semibold"><i class="fas fa-star mr-1"></i>${booking.rating}</span>`;
            } else {
                rateButton = `<button onclick="openRateModal('${booking.id}')" class="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors shadow-sm">Rate Helper</button>`;
            }
        }

        container.innerHTML += `
            <div class="bg-white rounded-2xl shadow-lg p-6 border-l-4 ${statusDetails.borderColor} hover:shadow-xl transition-shadow relative">
                <div class="flex items-center justify-between mb-4">
                    <span class="${statusDetails.bg} ${statusDetails.text} px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">${booking.status}</span>
                    <span class="text-xs text-gray-400 font-mono">#${booking.id.substr(0, 8)}</span>
                </div>
                <div class="flex items-center space-x-4 mb-4">
                    <div class="w-14 h-14 ${statusDetails.iconBg} rounded-xl flex items-center justify-center">
                        <i class="${getServiceIcon(booking.serviceName)} ${statusDetails.iconColor} text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">${booking.serviceName}</h3>
                        <p class="text-sm text-gray-600"><i class="far fa-clock mr-1"></i> ${date}</p>
                    </div>
                </div>
                <div class="bg-gray-50 rounded-xl p-3 mb-4">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-gray-500 text-xs">Helper</span>
                        <span class="font-semibold text-gray-800 text-sm">${booking.helperName || 'Pending Assignment'}</span>
                    </div>
                    ${booking.helperName ? `<div class="flex items-center justify-end mt-1"><span class="text-xs text-yellow-500"><i class="fas fa-star mr-1"></i>4.8</span></div>` : ''}
                </div>
                <div class="flex items-center justify-between border-t border-gray-100 pt-3">
                    <span class="font-bold text-indigo-600 text-lg">₹${price}</span>
                    <div class="space-x-2 flex items-center">
                         ${rateButton}
                         ${['pending', 'assigned'].includes(booking.status) ? `<button onclick="cancelBooking('${booking.id}')" class="px-3 py-1 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors">Cancel</button>` : ''}
                    </div>
                </div>
            </div>`;
    });
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    const serviceSelect = document.getElementById('serviceSelect');
    const dateInput = document.getElementById('bookingDate').value;
    const addressInput = document.getElementById('bookingAddress').value;
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    const serviceName = selectedOption.value;
    const price = parseInt(selectedOption.getAttribute('data-price'));
    const bookingDate = new Date(dateInput);

    if (!serviceName || !dateInput) { alert('Please fill all fields'); return; }

    const bookingData = {
        userId: currentUser.uid,
        userName: document.getElementById('userProfileName').textContent || 'User',
        userPhone: currentUser.phoneNumber || '',
        userEmail: currentUser.email || '',
        serviceName: serviceName,
        service: serviceName, // Alias
        amount: price,
        totalPrice: price, // Alias
        price: price, // Display
        scheduledDate: firebase.firestore.Timestamp.fromDate(bookingDate),
        address: addressInput,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        paymentStatus: 'pending'
    };

    const btn = e.target.querySelector('button[type="submit"]');
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        btn.disabled = true;
        await firebaseDB.collection('bookings').add(bookingData);
        alert('Booking Confirmed!');
        closeBookingModal();
        e.target.reset();
    } catch (error) {
        console.error('Error creating booking:', error);
        alert('Error: ' + error.message);
    } finally {
        btn.textContent = 'Confirm Booking';
        btn.disabled = false;
    }
}

async function cancelBooking(id) {
    if (!confirm("Cancel this booking?")) return;
    try {
        await firebaseDB.collection('bookings').doc(id).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.error(e); alert("Could not cancel."); }
}

function filterBookings(category) {
    currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = 'px-6 py-2 rounded-xl bg-white text-gray-700 font-semibold hover:bg-gray-100 whitespace-nowrap filter-btn';
        if (btn.id === `btn-${category}`) {
            btn.className = 'px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold whitespace-nowrap filter-btn';
        }
    });
    renderBookings();
}

function getStatusDetails(status) {
    switch (status) {
        case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-800', borderColor: 'border-yellow-400', iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' };
        case 'assigned': return { bg: 'bg-blue-100', text: 'text-blue-800', borderColor: 'border-blue-400', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' };
        case 'in-progress': return { bg: 'bg-indigo-100', text: 'text-indigo-800', borderColor: 'border-indigo-400', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' };
        case 'completed': return { bg: 'bg-green-100', text: 'text-green-800', borderColor: 'border-green-400', iconBg: 'bg-green-50', iconColor: 'text-green-600' };
        case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-800', borderColor: 'border-red-400', iconBg: 'bg-red-50', iconColor: 'text-red-600' };
        default: return { bg: 'bg-gray-100', text: 'text-gray-800', borderColor: 'border-gray-400', iconBg: 'bg-gray-50', iconColor: 'text-gray-600' };
    }
}

function getServiceIcon(serviceName) {
    if (!serviceName) return 'fas fa-tools';
    const lower = serviceName.toLowerCase();
    if (lower.includes('clean')) return 'fas fa-broom';
    if (lower.includes('repair') || lower.includes('ac')) return 'fas fa-wrench';
    if (lower.includes('plumb')) return 'fas fa-faucet';
    if (lower.includes('elect')) return 'fas fa-bolt';
    if (lower.includes('paint')) return 'fas fa-paint-roller';
    return 'fas fa-concierge-bell';
}

// Rate Functions
function openRateModal(bookingId) {
    const modal = document.getElementById('rateModal');
    if (!modal) return;
    document.getElementById('rateBookingId').value = bookingId;
    modal.classList.remove('hidden');
    // Reset Stars
    document.getElementById('ratingValue').value = '';
    setRating(0); // Use setRating to reset
    document.getElementById('rateReview').value = '';
}

function closeRateModal() {
    const modal = document.getElementById('rateModal');
    if (modal) modal.classList.add('hidden');
}

// Make setRating global
window.setRating = setRating;

function setRating(value) {
    console.log("Setting rating:", value);
    const val = parseInt(value);
    document.getElementById('ratingValue').value = val;
    updateStars(val);
}

function updateStars(value) {
    const stars = document.querySelectorAll('#starContainer i');
    stars.forEach(star => {
        const starVal = parseInt(star.getAttribute('data-value'));
        if (starVal <= value) {
            star.classList.remove('text-gray-300');
            star.classList.add('text-yellow-400');
        } else {
            star.classList.remove('text-yellow-400');
            star.classList.add('text-gray-300');
        }
    });
}

async function handleRateSubmit(e) {
    e.preventDefault();
    const bookingId = document.getElementById('rateBookingId').value;
    const rating = document.getElementById('ratingValue').value;
    const review = document.getElementById('rateReview').value;

    if (!rating) { alert("Please tap a star to rate."); return; }

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;

    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        btn.disabled = true;

        await firebaseDB.collection('bookings').doc(bookingId).update({
            rating: parseInt(rating),
            review: review,
            ratedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Thanks for your feedback!");
        closeRateModal();
    } catch (err) {
        console.error("Rate error:", err);
        alert("Failed to submit rating.");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Explicitly expose functions to window to ensure HTML onclick attributes work
window.openRateModal = openRateModal;
window.closeRateModal = closeRateModal;
window.cancelBooking = cancelBooking;
window.filterBookings = filterBookings;
window.setRating = setRating;
