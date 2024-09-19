import { createNavbar, addNavbarStyles } from './navbar.js';
import { getUserId } from './combinedUtils.js';

document.addEventListener('DOMContentLoaded', async function() {
    // 創建和添加導航欄
    const navbar = createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    const form = document.getElementById('profile-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        updateProfile();
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
        if (!response.ok) throw new Error('Failed to fetch profile');
        const userData = await response.json();

        document.getElementById('username').value = userData.username;
        document.getElementById('job-title').value = userData.jobTitle || '';
        document.getElementById('bio').value = userData.bio || '';
        // if (userData.avatarUrl) {
        //     document.getElementById('avatar').src = userData.avatarUrl;
        // }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('加載個人資料失敗，請稍後再試。');
    }
}

async function updateProfile() {
    try {
        const userId = await getUserId();
        if (!userId) {
            throw new Error('Unable to get user ID');
        }

        const formData = new FormData(document.getElementById('profile-form'));
        formData.append('userId', userId);

        const response = await fetch('/api/1.0/user/profile', {
            method: 'PUT',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to update profile');

        alert('個人資料更新成功！');
        await loadUserProfile(); // 重新加載更新後的資料
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('更新失敗，請稍後再試。');
    }
}

// 處理頭像上傳預覽
document.getElementById('avatar-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('avatar').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
});