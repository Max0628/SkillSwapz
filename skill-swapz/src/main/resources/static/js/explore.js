//explore.js
document.addEventListener('DOMContentLoaded', async () => {
    const categoryContainer = document.getElementById('category-container');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

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
                tagElement.addEventListener('click', () => searchByTag(tag.tagName));
                tagList.appendChild(tagElement);
            });

            categoryCard.appendChild(tagList);
            categoryContainer.appendChild(categoryCard);
        });
    }

    async function searchByTag(tagName) {
        try {
            const response = await fetch(`http://localhost:8080/api/1.0/post?keyword=${encodeURIComponent(tagName)}`);
            const results = await response.json();
            displaySearchResults(results);
        } catch (error) {
            console.error('Error searching by tag:', error);
        }
    }

    function displaySearchResults(results) {
        searchResults.innerHTML = '';
        if (results.length === 0) {
            searchResults.innerHTML = '<p>No results found.</p>';
            return;
        }

        results.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('post');
            postElement.innerHTML = `
                <h3>${post.type} - ${post.location}</h3>
                <p><strong>內容：</strong> ${post.content}</p>
                <p><strong>發文者：</strong> User ${post.userId}</p>
                <p><strong>喜歡數：</strong> ${post.likeCount}</p>
            `;
            searchResults.appendChild(postElement);
        });
    }

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        const allTags = document.querySelectorAll('.tag');

        allTags.forEach(tag => {
            const tagText = tag.textContent.toLowerCase();
            if (tagText.includes(query)) {
                tag.style.display = 'inline-block';
            } else {
                tag.style.display = 'none';
            }
        });
    });

    fetchCategories();
});