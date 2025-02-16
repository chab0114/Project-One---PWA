const API_KEY = '3e7d5c5d91edd8eae1fcac9b14f3b548'
const BASE_URL = 'https://api.themoviedb.org/3';
const SEARCH_ENDPOINT = '/search/movie';

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.querySelector('.search-form')
    const searchInput = document.querySelector('input[type="search"]');

    console.log('Search form fount:', searchForm !==null);
    console.log('Search input fount:', searchInput !==null);

    async function searchMovies(query) { 
        try {
            const response = awaitnfetch (
                `${BASE_URL}${SEARCH_ENDPOINT}?api_key=${API_KEY}&query=${endcodeURIComponent(query)}`
            );
            const data = await response.json();
            console.log('Search result:', data);
        } catch (error) {
            console.error('Search failed', error);
        }
    }

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.ariaValueMax.trim();
        if (query) {
            searchMovies(query);
        }
    });
});