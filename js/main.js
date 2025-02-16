const API_KEY = '3e7d5c5d91edd8eae1fcac9b14f3b548';
const BASE_URL = 'https://api.themoviedb.org/3';
const SEARCH_ENDPOINT = '/search/movie';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.querySelector('.search-form');
    if (!searchForm) {
        console.error('Could not find search form');
        return;
    }

    const searchInput = searchForm.querySelector('input[type="search"]');
    if (!searchInput) {
        console.error('Could not find search input');
        return;
    }

    const searchResults = document.querySelector('.search-results');
    if (!searchResults) {
        console.error('Could not find search result');
        return;
    }

    console.log('Search form found:', searchForm !== null);
    console.log('Search input found:', searchInput !== null);
    console.log('Results container found:', searchResults !== null);

    function showLoading() {
        searchResults.innerHTML = `
            <div class="loading-message">
                <p>Searching for movies...</p>
            </div>
        `;
    }

    function showError(message) {
        searchResults.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
            </div>
        `;
    }

    async function searchMovies(query) {
        console.log('Searching for:', query); 
        showLoading();
        try {
            if (!navigator.onLine) {
                showError('You are offline. Please check your internet connection.');
                return;
            }
            const url = `${BASE_URL}${SEARCH_ENDPOINT}?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
            console.log('Making request to:', url); 
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Search results:', data);
            if (data && data.results) {
                displayResults(data.results);
            } else {
                displayResults([]);
            }
            
        } catch (error) {
            console.error('Search failed:', error);
            
        }
    }

    searchInput.addEventListener('keyup', (e) =>{
        if (searchInput.value.trim() === '') {
            searchResults.innerHTML = '';
            return;
        }

        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchMovies(query);
            }
        }
    });

    function displayResults(movies) {
        if (!movies || movies.length === 0) {
            searchResults.innerHTML = '<p>No movies found</p>';
            return;
        }
        console.log('Display movies:', movies);
    
        const movieCards = movies.map(movie => `
            <div class="search-card" data-movie-id="${movie.id}">
                <img 
                    src="${movie.poster_path 
                        ? IMAGE_BASE_URL + movie.poster_path 
                        : 'assets/images/placeholder.jpg'}" 
                    alt="${movie.title}" 
                    class="search-card-image"
                >
                <div class="search-card-content">
                    <div>
                        <h3 class="movie-title">${movie.title}</h3>
                        <p class="movie-year">${movie.release_date?.split('-')[0] || 'N/A'}</p>
                        <div class="movie-rating">★ ${movie.vote_average?.toFixed(1) || 'N/A'}</div>
                    </div>
                    <button class="btn btn-primary add-to-cart-btn">Add to Cart</button>
                </div>
            </div>
        `).join('');
    
        searchResults.innerHTML = movieCards;
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

