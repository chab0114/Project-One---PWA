const API_KEY = '3e7d5c5d91edd8eae1fcac9b14f3b548';
const BASE_URL = 'https://api.themoviedb.org/3';
const SEARCH_ENDPOINT = '/search/movie';

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.querySelector('.search-form');
    if (!searchForm) {
        console.error('Could not find search form');
        return;
    }

    const searchInput = document.querySelector('input[type="search"]');
    if (!searchInput) {
        console.error('Could not find search input');
        return;
    }

    console.log('Found form:', searchForm);
    console.log('Found form:', searchInput);

    async function searchMovies(query) {
        console.log('Searching for:', query); 
        try {
            const url = `${BASE_URL}${SEARCH_ENDPOINT}?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
            console.log('Making request to:', url); 
            
            const response = await fetch(url);
            const data = await response.json();
            console.log('Search results:', data);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        console.log('Input value:', searchInput.value);
        if (query) {
            searchMovies(query);
        }
    });
});