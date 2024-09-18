document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('profile-form');
    // const avatarImg = document.getElementById('avatar');
    // const avatarUpload = document.getElementById('avatar-upload');

    // 載入用戶資料
    loadUserProfile();

    // 處理頭像上傳
    // avatarUpload.addEventListener('change', function(event) {
    //     const file = event.target.files[0];
    //     if (file) {
    //         const reader = new FileReader();
    //         reader.onload = function(e) {
    //             avatarImg.src = e.target.result;
    //         }
    //         reader.readAsDataURL(file);
    //     }
    // });

    // 處理表單提交
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        updateProfile();
    });
});

async function loadUserProfile() {
    try {
        const response = await fetch('/api/1.0/user/profile', {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const userData = await response.json();

        document.getElementById('username').value = userData.username;
        document.getElementById('job-title').value = userData.job_title || '';
        document.getElementById('bio').value = userData.bio || '';
        // if (userData.avatar_url) {
        //     document.getElementById('avatar').src = userData.avatar_url;
        // }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateProfile() {
    const formData = new FormData(document.getElementById('profile-form'));

    try {
        const response = await fetch('/api/1.0/user/profile', {
            method: 'PUT',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to update profile');

        alert('個人資料更新成功！');
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('更新失敗，請稍後再試。');
    }
}