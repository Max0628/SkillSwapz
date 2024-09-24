// create-post.js
import { getUserId } from './combinedUtils.js';
import { createNavbar, addNavbarStyles } from './navbar.js';

const postTypes = {
    "交換技能": [
        { name: 'location', label: '地點 (縣市)', type: 'text' },
        { name: 'skillOffered', label: '擅長技能', type: 'text' },
        { name: 'skillWanted', label: '想學習技能', type: 'text' },
        { name: 'content', label: '交換內容及方式', type: 'textarea' }
    ],
    "找老師": [
        { name: 'location', label: '地點 (縣市)', type: 'text' },
        { name: 'skillWanted', label: '學習項目', type: 'text' },
        { name: 'salary', label: '薪資待遇', type: 'text' },
        { name: 'content', label: '家教內容及方式', type: 'textarea' }
    ],
    "找學生": [
        { name: 'location', label: '地點 (縣市)', type: 'text' },
        { name: 'skillOffered', label: '教學項目', type: 'text' },
        { name: 'salary', label: '薪資待遇', type: 'text' },
        { name: 'content', label: '家教內容及方式', type: 'textarea' }
    ],
    "讀書會": [
        { name: 'location', label: '地點 (縣市)', type: 'text' },
        { name: 'bookClubPurpose', label: '讀書會目的', type: 'text' },
        { name: 'content', label: '讀書會內容及方式', type: 'textarea' }
    ]
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired');

    // 創建導航欄
    const navbar = await createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);

    // 添加導航欄樣式
    addNavbarStyles();

    const typeSelect = document.getElementById('type');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields');
    const postForm = document.getElementById('postForm');

    if (!typeSelect || !dynamicFieldsContainer || !postForm) {
        console.error('One or more required elements are missing from the DOM');
        return;
    }

    // 當類型變化時動態生成表單字段
    typeSelect.addEventListener('change', () => renderFieldsForType(typeSelect.value));

    // 初始化時立即渲染字段（預設為交換技能）
    typeSelect.value = "交換技能";
    renderFieldsForType("交換技能");

    function renderFieldsForType(type) {
        console.log('Rendering fields for type:', type);
        dynamicFieldsContainer.innerHTML = '';
        const fields = postTypes[type] || [];

        fields.forEach(field => {
            const fieldWrapper = document.createElement('div');
            const label = document.createElement('label');
            label.htmlFor = field.name;
            label.textContent = `${field.label}*`;

            let inputElement;
            if (field.type === 'textarea') {
                inputElement = document.createElement('textarea');
            } else {
                inputElement = document.createElement('input');
                inputElement.type = field.type;
            }
            inputElement.id = field.name;
            inputElement.name = field.name;
            inputElement.required = true;

            fieldWrapper.appendChild(label);
            fieldWrapper.appendChild(inputElement);
            dynamicFieldsContainer.appendChild(fieldWrapper);
        });
    }

    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted');
        const formData = new FormData(postForm);
        const userId = await getUserId();

        if (!userId) {
            console.error('Unable to get user ID');
            alert('無法獲取用戶信息，請登入後再試');
            return;
        }

        formData.append('userId', userId);

        try {
            const response = await fetch('/api/1.0/post', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (response.ok) {
                alert('文章發表成功！');
                window.location.href = "index.html";
            } else {
                const errorText = await response.text();
                console.error('Error creating post:', errorText);
                alert('發表文章失敗。');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('發表文章時發生錯誤，請稍後再試。');
        }
    });
});