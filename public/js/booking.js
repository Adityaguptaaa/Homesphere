// Booking Management Functions

// Create a new booking
async function createBooking(bookingData) {
    try {
        const user = firebaseAuth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Prepare booking object
        const booking = {
            userId: user.uid,
            userEmail: user.email,
            userName: user.displayName || 'User',
            serviceId: bookingData.serviceId,
            service: bookingData.serviceName,
            category: bookingData.category,
            amount: bookingData.amount,
            duration: bookingData.duration,
            scheduledDate: firebase.firestore.Timestamp.fromDate(new Date(bookingData.scheduledDate)),
            address: bookingData.address,
            phone: bookingData.phone,
            notes: bookingData.notes || '',
            status: 'pending',
            paymentStatus: 'pending',
            helperId: null,
            helperName: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('📝 Creating booking:', booking);

        // Add booking to Firestore
        const bookingRef = await firebaseDB.collection('bookings').add(booking);

        console.log('✅ Booking created with ID:', bookingRef.id);

        // Update user's total bookings count
        await firebaseDB.collection('users').doc(user.uid).update({
            totalBookings: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ User booking count updated');

        return {
            success: true,
            bookingId: bookingRef.id,
            booking: booking
        };

    } catch (error) {
        console.error('❌ Error creating booking:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Get user's bookings
async function getUserBookings(userId, limit = 10) {
    try {
        console.log('📥 Fetching bookings for user:', userId);

        const bookingsSnapshot = await firebaseDB.collection('bookings')
            .where('userId', '==', userId)
            // .orderBy('createdAt', 'desc') // Removed to fix index error
            .limit(limit)
            .get();

        if (bookingsSnapshot.empty) {
            console.log('ℹ️ No bookings found');
            return {
                success: true,
                bookings: []
            };
        }

        const bookings = [];
        bookingsSnapshot.forEach(doc => {
            bookings.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort client-side instead to avoid needing a composite index
        bookings.sort((a, b) => {
            // Handle different timestamp formats safely
            const getMillis = (timestamp) => {
                if (!timestamp) return 0;
                if (timestamp.toMillis) return timestamp.toMillis(); // Firestore Timestamp
                if (timestamp instanceof Date) return timestamp.getTime(); // JS Date
                if (timestamp.seconds) return timestamp.seconds * 1000; // Serialized Timestamp
                return 0;
            };

            return getMillis(b.createdAt) - getMillis(a.createdAt); // Descending order
        });

        console.log(`✅ Found ${bookings.length} bookings`);

        return {
            success: true,
            bookings: bookings
        };

    } catch (error) {
        console.error('❌ Error fetching bookings:', error);
        return {
            success: false,
            error: error.message,
            bookings: []
        };
    }
}

// Get booking by ID
async function getBookingById(bookingId) {
    try {
        const bookingDoc = await firebaseDB.collection('bookings').doc(bookingId).get();

        if (!bookingDoc.exists) {
            return {
                success: false,
                error: 'Booking not found'
            };
        }

        return {
            success: true,
            booking: {
                id: bookingDoc.id,
                ...bookingDoc.data()
            }
        };

    } catch (error) {
        console.error('❌ Error fetching booking:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Update booking status
async function updateBookingStatus(bookingId, status) {
    try {
        await firebaseDB.collection('bookings').doc(bookingId).update({
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Booking ${bookingId} status updated to: ${status}`);

        return {
            success: true
        };

    } catch (error) {
        console.error('❌ Error updating booking status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Cancel booking
async function cancelBooking(bookingId) {
    try {
        const user = firebaseAuth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Get booking to verify ownership
        const bookingDoc = await firebaseDB.collection('bookings').doc(bookingId).get();

        if (!bookingDoc.exists) {
            throw new Error('Booking not found');
        }

        const booking = bookingDoc.data();

        if (booking.userId !== user.uid) {
            throw new Error('Unauthorized to cancel this booking');
        }

        // Update booking status to cancelled
        await firebaseDB.collection('bookings').doc(bookingId).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Booking ${bookingId} cancelled`);

        return {
            success: true
        };

    } catch (error) {
        console.error('❌ Error cancelling booking:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Assign helper to booking (for admin/system)
async function assignHelperToBooking(bookingId, helperId, helperName) {
    try {
        await firebaseDB.collection('bookings').doc(bookingId).update({
            helperId: helperId,
            helperName: helperName,
            status: 'assigned',
            assignedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Helper ${helperName} assigned to booking ${bookingId}`);

        return {
            success: true
        };

    } catch (error) {
        console.error('❌ Error assigning helper:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
