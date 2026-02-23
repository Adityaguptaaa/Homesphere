// Firebase Authentication Module
// Handles user registration, login, logout, and session management

// Register new user
async function registerUser(email, password, userData) {
    try {
        // Create user with email and password
        const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update display name
        await user.updateProfile({
            displayName: `${userData.firstName} ${userData.lastName}`
        });

        // Store additional user data in Firestore
        await firebaseDB.collection('users').doc(user.uid).set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            displayName: `${userData.firstName} ${userData.lastName}`,
            email: email,
            phone: userData.phone,
            role: userData.role || 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            walletBalance: 0,
            totalBookings: 0,
            subscription: null
        });

        console.log('✅ User registered successfully:', user.uid);
        return { success: true, user: user };
    } catch (error) {
        console.error('❌ Registration error:', error);
        return { success: false, error: error.message };
    }
}

// Login user
async function loginUser(email, password) {
    try {
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Get user data from Firestore
        const userDoc = await firebaseDB.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        console.log('✅ User logged in successfully:', user.uid);
        return { success: true, user: user, userData: userData };
    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: error.message };
    }
}

// Logout user
async function logoutUser() {
    try {
        await firebaseAuth.signOut();
        console.log('✅ User logged out successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Logout error:', error);
        return { success: false, error: error.message };
    }
}

// Google Sign In
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebaseAuth.signInWithPopup(provider);
        const user = result.user;

        // Check if user exists in Firestore
        const userDoc = await firebaseDB.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            // Create new user document
            await firebaseDB.collection('users').doc(user.uid).set({
                firstName: user.displayName.split(' ')[0],
                lastName: user.displayName.split(' ').slice(1).join(' '),
                displayName: user.displayName,
                email: user.email,
                phone: user.phoneNumber || '',
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                walletBalance: 0,
                totalBookings: 0,
                subscription: null
            });
        }

        console.log('✅ Google sign-in successful:', user.uid);
        return { success: true, user: user };
    } catch (error) {
        console.error('❌ Google sign-in error:', error);
        return { success: false, error: error.message };
    }
}

// Facebook Sign In
async function signInWithFacebook() {
    try {
        const provider = new firebase.auth.FacebookAuthProvider();
        const result = await firebaseAuth.signInWithPopup(provider);
        const user = result.user;

        // Check if user exists in Firestore
        const userDoc = await firebaseDB.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            // Create new user document
            await firebaseDB.collection('users').doc(user.uid).set({
                firstName: user.displayName.split(' ')[0],
                lastName: user.displayName.split(' ').slice(1).join(' '),
                displayName: user.displayName,
                email: user.email,
                phone: user.phoneNumber || '',
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                walletBalance: 0,
                totalBookings: 0,
                subscription: null
            });
        }

        console.log('✅ Facebook sign-in successful:', user.uid);
        return { success: true, user: user };
    } catch (error) {
        console.error('❌ Facebook sign-in error:', error);
        return { success: false, error: error.message };
    }
}

// Password Reset
async function resetPassword(email) {
    try {
        await firebaseAuth.sendPasswordResetEmail(email);
        console.log('✅ Password reset email sent');
        return { success: true };
    } catch (error) {
        console.error('❌ Password reset error:', error);
        return { success: false, error: error.message };
    }
}

// Get current user
function getCurrentUser() {
    return firebaseAuth.currentUser;
}

// Check authentication state
function onAuthStateChanged(callback) {
    return firebaseAuth.onAuthStateChanged(callback);
}

// Get user data from Firestore
async function getUserData(uid) {
    try {
        const userDoc = await firebaseDB.collection('users').doc(uid).get();
        if (userDoc.exists) {
            return { success: true, data: userDoc.data() };
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('❌ Error getting user data:', error);
        return { success: false, error: error.message };
    }
}

// Update user data
async function updateUserData(uid, data) {
    try {
        await firebaseDB.collection('users').doc(uid).update(data);
        console.log('✅ User data updated successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating user data:', error);
        return { success: false, error: error.message };
    }
}
