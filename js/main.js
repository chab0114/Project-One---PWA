const API_KEY = '3e7d5c5d91edd8eae1fcac9b14f3b548';
const BASE_URL = 'https://api.themoviedb.org/3';
const SEARCH_ENDPOINT = '/search/movie';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const CACHE_NAMES = {
    cart: 'cart-items-v1',
    movies: 'movies-cache-v1'
};


document.addEventListener('DOMContentLoaded', () => {
    const searchForms = document.querySelectorAll('.search-form');
    if (!searchForms.length) {
        console.error('Could not find search forms');
        return;
    }

    const searchInputs = document.querySelectorAll('.search-form input[type="search"]');
    if (!searchInputs.length) {
        console.error('Could not find search inputs');
        return;
    }

    const searchResults = document.querySelector('.search-results');
    if (!searchResults) {
        console.error('Could not find search result');
        return;
    }

    const homeLink = document.querySelector('.nav-item .home-icon').parentElement;
    const searchLink = document.querySelector('.nav-item .search-icon').parentElement;
    const cartLink = document.querySelector('.nav-item .cart-icon').parentElement;
    const rentedLink = document.querySelector('.nav-item .rented-icon').parentElement;
    const playButton = document.querySelector('.nav-item-play');

    const homeScreen = document.querySelector('.home-screen');
    const searchScreen = document.querySelector('.search-screen');
    const viewScreen = document.querySelector('.view-screen');
    const cartScreen = document.querySelector('.cart-screen');
    const rentedScreen = document.querySelector('.rented-screen');
    const cartCount = document.querySelector('.cart-icon').nextElementSibling;
    const cartItems = document.querySelector('.cart-items');

    function navigateToScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');

        initializeSearchStatus();
    }

    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToScreen(homeScreen);
        homeLink.classList.add('active');
    });

    searchLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToScreen(searchScreen);
        searchLink.classList.add('active');
    });

    cartLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToScreen(cartScreen);
        cartLink.classList.add('active');
        loadCartItems();
    });

    rentedLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToScreen(rentedScreen);
        rentedLink.classList.add('active');
    });

    playButton.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToScreen(viewScreen);
    });

    function displayResults(movies, searchQuery) {
        const searchStatus = document.querySelector('.search-status');    
        
        if (!movies || movies.length === 0) {
            searchStatus.innerHTML = `
                <div class="status-message">
                    <p>No results found for "${searchQuery}"</p>
                </div>
            `;
            searchResults.innerHTML = '';
            return;
        }
        console.log('Display movies:', movies);
        searchStatus.innerHTML = `
            <div class="status-message">
                <p>Search results for "${searchQuery}"</p>
            </div>
        `;
    
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
    
        const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
        addToCartButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                addToCart(movies[index]);
            });
        });
    }

    function navigateToScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    
        initializeSearchStatus();
    }
    
    
    function syncSearchInputs(value) {
        searchInputs.forEach(input => {
            input.value = value;
        });
    }

    function initializeSearchStatus() {
        const searchStatus = document.querySelector('.search-status');
        if (searchStatus) {
            searchStatus.innerHTML = `
                <div class="status-message">
                    <p>Welcome to WheatFlixRent</p>
                </div>
            `;
        }
    }
    

    function showLoading() {
        const searchStatus = document.querySelector('.search-status');
        searchStatus.innerHTML = `
            <div class="status-message loading">
                <p>Searching for movies...</p>
            </div>
        `;
    }

    function showError(message) {
        const searchStatus = document.querySelector('.search-status');
        searchStatus.innerHTML = `
            <div class="status-message error">
                <p>${message}</p>
            </div>
        `;
    }

    async function searchMovies(query) {
        console.log('Searching for:', query); 
        showLoading();
        navigateToScreen(searchScreen);
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
                displayResults(data.results, query);
            } else {
                displayResults([], query);
            }            
            
        } catch (error) {
            console.error('Search failed:', error);
            
        }
    }

    searchForms.forEach((form, index) => {
        const input = searchInputs[index];

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = input.value.trim();
            console.log('Form submitted with:', query);
            if (query) {
                searchMovies(query);
            }
        });

        input.addEventListener('keyup', (e) => {
            if (input.value.trim() === '') {
                searchResults.innerHTML = '';
                initializeSearchStatus();
                return;
            }

            if (e.key === 'Enter') {
                const query = input.value.trim();
                if (query) {
                    searchMovies(query);
                }
            }
        });
    });
    
    async function addToCart(movie) {
        try {
            const cache = await caches.open(CACHE_NAMES.cart);
            const response = await cache.match('cart-items');
            const cartItems = response ? await response.json() : [];
            
            if (!cartItems.some(item => item.id === movie.id)) {
                cartItems.push(movie);
                
                await cache.put('cart-items', new Response(JSON.stringify(cartItems)));
                
                updateCartCount(cartItems.length);
                
                alert('Movie added to cart!');
            } else {
                alert('This movie is already in your cart');
            }
        } catch (error) {
            console.error('Failed to add to cart:', error);
            alert('Failed to add movie to cart');
        }
    }

    function updateCartCount(count) {
        cartCount.textContent = count || '';
    }

    async function loadCartItems() {
        try {
            const cache = await caches.open(CACHE_NAMES.cart);
            const response = await cache.match('cart-items');
            const cartItems = response ? await response.json() : [];
            
            console.log('Loading cart items:', cartItems);
            displayCartItems(cartItems);
        } catch (error) {
            console.error('Failed to load cart items:', error);
        }
    }
    
    
    function displayCartItems(items) {
        if (!items || items.length === 0) {
            cartItems.innerHTML = '<p>Your cart is empty</p>';
            return;
        }
    
        const cartCards = items.map(movie => `
            <div class="cart-card" data-movie-id="${movie.id}">
                <div class="cart-card-image-container">
                    <img 
                        src="${movie.poster_path 
                            ? IMAGE_BASE_URL + movie.poster_path 
                            : 'assets/images/placeholder.jpg'}" 
                        alt="${movie.title}" 
                        class="cart-card-image"
                    >
                    <h3 class="cart-card-title">${movie.title}</h3>
                </div>
                <div class="cart-card-content">
                    <p class="movie-year">Released: ${movie.release_date?.split('-')[0] || 'N/A'}</p>
                    <div class="movie-rating">★ ${movie.vote_average?.toFixed(1) || 'N/A'}</div>
                    <div class="cart-card-buttons">
                        <button class="btn btn-primary rent-btn">Rent</button>
                        <button class="btn btn-secondary remove-btn">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    
        cartItems.innerHTML = cartCards;
    }

    initializeSearchStatus();
    
});






