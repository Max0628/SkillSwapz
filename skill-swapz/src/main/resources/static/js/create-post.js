import { getUserId } from './utils.js';

const postTypes = {
    '交換技能': [
        { name: 'location', label: '地點 (縣市)', type: 'text' },
        { name: 'skillOffered', label: '擅長技能', type: 'text' },
        { name: 'skillWanted', label: '想學習技能', type: 'text' },
        { name: 'content', label: '交換內容及方式', type: 'textarea' }
    ],
    '找老師': [
        { name: 'location', label: '地點 (縣市)', type: 'text' },
        { name: 'skillWanted', label: '學習項目', type: 'text' },
        { name: 'salary', label: '薪資待遇', type: 'text' },
        { name: 'content', label: '家教內容及方式', type: 'textarea' }
    ],
    '找學生': [
        { name: 'location', label: '地點 (縣市)', type: 'text' },
        { name: 'skillOffered', label: '教學項目', type: 'text' },
        { name: 'salary', label: '薪資待遇', type: 'text' },
        { name: 'content', label: '家教內容及方式', type: 'textarea' }
    ],
    '讀書會': [
        { name: 'location', label: '地點 (縣市)', type: 'text' },
        { name: 'bookClubPurpose', label: '讀書會目的', type: 'text' },
        { name: 'content', label: '讀書會內容及方式', type: 'textarea' }
    ]
};

document.addEventListener('DOMContentLoaded', async () => {
    const typeSelect = document.getElementById('type');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields');
    const postForm = document.getElementById('postForm');

    typeSelect.addEventListener('change', () => renderFieldsForType(typeSelect.value));

    function renderFieldsForType(type) {
        dynamicFieldsContainer.innerHTML = '';
        const fields = postTypes[type] || [];

        fields.forEach(field => {
            const fieldHtml = `
                <label for="${field.name}">${field.label}*</label>
                ${field.type === 'textarea'
                ? `<textarea id="${field.name}" name="${field.name}" required></textarea>`
                : `<input type="${field.type}" id="${field.name}" name="${field.name}" required>`
            }
            `;
            dynamicFieldsContainer.innerHTML += fieldHtml;
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(postForm);
        const userId = await getUserId();

        if (!userId) {
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
                const result = await response.text();
                alert('文章發表成功！');
                console.log('Response:', result);
            } else {
                const errorText = await response.text();
                console.error('Error:', errorText);
                alert('發表文章失敗。');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('發表文章時發生錯誤，請稍後再試。');
        }
    }

    postForm.addEventListener('submit', handleSubmit);
});