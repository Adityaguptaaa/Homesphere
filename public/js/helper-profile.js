document.addEventListener('DOMContentLoaded', async () => {
    if (!firebase.apps.length) return;

    const profileForm = document.getElementById('profileForm');
    const loadingState = document.getElementById('loadingState');
    const formContent = document.getElementById('formContent');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            loadProfile(user);

            // Update Profile
            if (profileForm) {
                profileForm.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const name = document.getElementById('helperName').value;
                    const phone = document.getElementById('helperPhone').value;
                    const skills = document.getElementById('helperSkills').value;
                    const address = document.getElementById('helperAddress').value;

                    try {
                        const btn = e.target.querySelector('button[type="submit"]');
                        const originalText = btn.textContent;
                        btn.textContent = 'Saving...';
                        btn.disabled = true;

                        await firebase.firestore().collection('users').doc(user.uid).update({
                            displayName: name,
                            phoneNumber: phone,
                            skills: skills.split(',').map(s => s.trim()).filter(s => s),
                            address: address,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });

                        // Also update Auth profile name if changed
                        if (user.displayName !== name) {
                            await user.updateProfile({ displayName: name });
                        }

                        alert("Profile updated successfully!");
                        btn.textContent = originalText;
                        btn.disabled = false;
                    } catch (err) {
                        console.error("Profile update error:", err);
                        alert("Failed to update profile.");
                    }
                });
            }
        } else {
            window.location.href = '../login.html';
        }
    });

    async function loadProfile(user) {
        try {
            const doc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();

                document.getElementById('helperName').value = data.displayName || user.displayName || '';
                document.getElementById('helperEmail').value = data.email || user.email || '';
                document.getElementById('helperPhone').value = data.phoneNumber || '';
                document.getElementById('helperSkills').value = Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || '');
                document.getElementById('helperAddress').value = data.address || '';

                // Show form
                loadingState.classList.add('hidden');
                formContent.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Error loading profile:", err);
        }
    }
});
