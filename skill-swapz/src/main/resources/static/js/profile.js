import { createNavbar, addNavbarStyles } from './navbar.js';
import { getUserId } from './combinedUtils.js';

document.addEventListener('DOMContentLoaded', async function() {
    const navbar = await createNavbar();
    await document.body.insertBefore(navbar, document.body.firstChild);
    await addNavbarStyles();

    const form = document.getElementById('profileForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        updateBasicProfile();
    });

    document.getElementById('uploadAvatarBtn').addEventListener('click', function() {
        uploadAvatar();
    });

    await loadUserProfile();
});

async function loadUserProfile() {
    try {
        const userId = await getUserId();
        if (!userId) {
            throw new Error('Unable to get user ID');
        }

        const response = await fetch(`/api/1.0/user/profile?userId=${userId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = "landingPage.html";
            throw new Error('Failed to fetch profile');
        }

        const userData = await response.json();

        document.getElementById('userName').value = userData.username;
        document.getElementById('jobTitle').value = userData.jobTitle || '';
        document.getElementById('bio').value = userData.bio || '';

        const avatarElement = document.getElementById('avatar');
        if (userData.avatarUrl) {
            avatarElement.src = userData.avatarUrl;

            avatarElement.onerror = function () {
                this.src = 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp';
            };
        } else {
            avatarElement.src = 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp';
        }

    } catch (error) {
        console.error('Error loading profile:', error);
            }
}

async function uploadAvatar() {
    try {
        const userId = await getUserId();
        if (!userId) {
            throw new Error('Unable to get user ID');
        }

        const avatarFile = document.getElementById('avatarUpload').files[0];
        if (!avatarFile) {
            alert('請選擇圖片');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', avatarFile);
        formData.append('userId', userId);

        const response = await fetch('/api/1.0/user/upload-avatar', {
            method: 'PATCH',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to upload avatar');

                window.location.reload();

        const avatarResponse = await fetch(`/api/1.0/user/avatar?userId=${userId}`, {
            method: 'GET',
            credentials: 'include'
        });
        if (avatarResponse.ok) {
            const avatarData = await avatarResponse.json();
            document.getElementById('avatar').src = avatarData.avatarUrl;
        }

    } catch (error) {
        console.error('Error uploading avatar:', error);
    }
}

async function updateBasicProfile() {
    try {
        const userId = await getUserId();
        if (!userId) {
            throw new Error('Unable to get user ID');
        }

        const data = {
            id: userId,
            username: document.getElementById('userName').value,
            jobTitle: document.getElementById('jobTitle').value,
            bio: document.getElementById('bio').value
        };

        const response = await fetch('/api/1.0/user/profile', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to update basic profile');


        window.location.reload();
    } catch (error) {
        console.error('Error updating basic profile:', error);

    }
}

document.getElementById('avatarUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('avatar').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
});