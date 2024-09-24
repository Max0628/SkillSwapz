import { createNavbar, addNavbarStyles } from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    const categoryContainer = document.getElementById('category-container');
    const searchInput = document.getElementById('search-input');
    let debounceTimer;  // 用於防抖的計時器


    const navbar = await createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    // 當用戶在搜尋框中輸入後，重定向到 index.html，並帶上搜尋參數
    searchInput.addEventListener('input', function () {
        const searchKeyword = this.value.trim();

        // 如果計時器還在運行，則清除它（防止重複執行）
        clearTimeout(debounceTimer);

        // 設定防抖：當用戶停止輸入 500 毫秒後再執行搜尋
        debounceTimer = setTimeout(() => {
            if (searchKeyword) {
                window.location.href = `/index.html?search=${encodeURIComponent(searchKeyword)}`;
            }
        }, 500);  // 延遲 500 毫秒
    });

    // 當用戶點擊標籤時，重定向到 index.html，並帶上該標籤作為搜尋參數
    categoryContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('tag')) {
            const tagKeyword = event.target.textContent.replace('#', '').trim();
            window.location.href = `/index.html?search=${encodeURIComponent(tagKeyword)}`;
        }
    });

    // 模擬動態加載分類和標籤的邏輯（保持現有功能）
    async function fetchCategories() {
        try {
            const response = await fetch('/api/1.0/post/category');
            const categories = await response.json();
            displayCategories(categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }

    function displayCategories(categories) {
        categoryContainer.innerHTML = '';
        categories.forEach(category => {
            const categoryCard = document.createElement('div');
            categoryCard.classList.add('category-card');

            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category.categoryName;
            categoryCard.appendChild(categoryTitle);

            const tagList = document.createElement('div');
            tagList.classList.add('tag-list');

            category.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.classList.add('tag');
                tagElement.textContent = `#${tag.tagName}`;
                tagList.appendChild(tagElement);
            });

            categoryCard.appendChild(tagList);
            categoryContainer.appendChild(categoryCard);
        });
    }

    await fetchCategories();
});
