import { createNavbar, addNavbarStyles } from './navbar.js';
import { getUserId} from './combinedUtils.js';
document.addEventListener('DOMContentLoaded', async () => {
    const categoryContainer = document.getElementById('category-container');
    const searchInput = document.getElementById('search-input');
    let debounceTimer;

    const currentUserId = await getUserId();
    if (!currentUserId) {
        window.location.href = "auth.html";
        console.log('User not logged in');
        return;
    }

    const navbar = await createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    searchInput.addEventListener('input', function () {
        const searchKeyword = this.value.trim();

        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            if (searchKeyword) {
                window.location.href = `/index.html?search=${encodeURIComponent(searchKeyword)}`;
            }
        }, 500);
    });

    categoryContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('tag')) {
            const tagKeyword = event.target.textContent.replace('#', '').trim();
            window.location.href = `/index.html?search=${encodeURIComponent(tagKeyword)}`;
        }
    });

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
