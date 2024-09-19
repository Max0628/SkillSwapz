import { getUserId } from './combinedUtils';

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

document.addEventListener('DOMContentLoaded', () => {
    const typeSelect = document.getElementById('type');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields');
    const postForm = document.getElementById('postForm');

    typeSelect.addEventListener('change', () => renderFieldsForType(typeSelect.value));

    function renderFieldsForType(type) {
        dynamicFieldsContainer.innerHTML = ''; // Clear the container first
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

            const resultText = await response.text();
            if (response.ok) {
                alert('文章發表成功！');
                console.log('Response:', resultText);
            } else {
                console.error('Error:', resultText);
                alert('發表文章失敗。');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('發表文章時發生錯誤，請稍後再試。');
        }
    });
});
