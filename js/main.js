const API_KEY = '3e7d5c5d91edd8eae1fcac9b14f3b548';
const BASE_URL = 'https://api.themoviedb.org/3';
const SEARCH_ENDPOINT = '/search/movie';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const CACHE_NAMES = {
    cart: 'cart-items-v1',
    movies: 'movies-cache-v1',
    rented: 'rented-items-v1'
};
const OFFLINE_MESSAGE = 'You are offline. Showing cached results.';
const ERROR_MESSAGE = 'Unable to fetch results. Please try again.';


document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker registered successfully.'))
        .catch(error => console.error('Service Worker registration failed:', error));
    }

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
    
        async function loadRentedMoviesOnScreen() {
            try {
                const cache = await caches.open(CACHE_NAMES.rented);
                const response = await cache.match('rented-items');
                const rentedItems = response ? await response.json() : [];
                
                displayRentedItems(rentedItems);
            } catch (error) {
                console.error('Failed to load rented movies:', error);
            }
        }
        loadRentedMoviesOnScreen();
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
                    <p><span class="no-results">No results found</span> for <span class="highlight">${searchQuery}</span></p>
                </div>
            `;
            searchResults.innerHTML = '';
            return;
        }
    
        searchStatus.innerHTML = `
            <div class="status-message">
                <p>Search results for <span class="highlight">${searchQuery}</span></p>
            </div>
        `;
    
        const movieCards = movies.map(movie => `
            <div class="search-card" data-movie-id="${movie.id}">
                <img 
                    src="${movie.poster_path 
                        ? IMAGE_BASE_URL + movie.poster_path 
                        : '/assets/images/placeholder.jpg'}" 
                    alt="${movie.title}" 
                    class="search-card-image"
                >
                <div class="search-card-content">
                    <div>
                        <h3 class="movie-title">${movie.title}</h3>
                        <p class="movie-year">${movie.release_date?.split('-')[0] || 'N/A'}</p>
                        <div class="movie-rating">★ ${movie.vote_average?.toFixed(1) || 'N/A'}</div>
                    </div>
                    <div class="search-card-buttons">
                        <button class="btn btn-primary add-to-cart-btn">Add to Cart</button>
                        <button class="btn btn-secondary details-btn">Details</button>
                    </div>
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
    
        const detailsButtons = document.querySelectorAll('.details-btn');
        detailsButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                showMovieDetails(movies[index]);
            });
        });
    }

    const detailsButtons = document.querySelectorAll('.details-btn');
    detailsButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            showMovieDetails(movies[index]);
        });
    });

    function showMovieDetails(movie) {
        console.log('Showing details for movie:', movie);
        const detailsScreen = document.querySelector('.details-screen');
        const movieDetails = detailsScreen.querySelector('.movie-details');
        
        movieDetails.innerHTML = `
            <img 
                src="${movie.poster_path 
                    ? IMAGE_BASE_URL + movie.poster_path 
                    : '/assets/images/placeholder.jpg'}" 
                alt="${movie.title}" 
                class="movie-details-image"
            >
            <div class="movie-details-content">
                <h2 class="movie-details-title">${movie.title}</h2>
                
                <div class="movie-details-info">
                    <div class="movie-details-row">
                        <span class="movie-details-label">Release Date:</span>
                        <span>${movie.release_date || 'N/A'}</span>
                    </div>
                    
                    <div class="movie-details-row">
                        <span class="movie-details-label">Rating:</span>
                        <span>★ ${movie.vote_average?.toFixed(1) || 'N/A'}</span>
                    </div>
                    
                    <div class="movie-details-row">
                        <span class="movie-details-label">Vote Count:</span>
                        <span>${movie.vote_count || 'N/A'}</span>
                    </div>
                    
                    <div class="movie-details-row">
                        <span class="movie-details-label">Original Language:</span>
                        <span>${movie.original_language?.toUpperCase() || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="movie-details-overview">
                    <p>${movie.overview || 'No overview available.'}</p>
                </div>
            </div>
        `;
    
        navigateToScreen(detailsScreen);
    }

    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', () => {
        navigateToScreen(searchScreen);
    });

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
                    <p>Welcome to <span class="highlight">WheatFlix</span>Rent</p>
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
                console.log('Device is offline, searching in cache...');
                showOfflineMessage();
                
                const cache = await caches.open(CACHE_NAMES.SEARCH);
                if (!cache) {
                    console.log('No cache found');
                    displayResults([], query);
                    return;
                }
    
                const cachedRequests = await cache.keys();
                let allCachedMovies = [];

                for (const request of cachedRequests) {
                    const response = await cache.match(request);
                    const data = await response.json();
                    if (data && data.results) {
                        allCachedMovies = [...allCachedMovies, ...data.results];
                    }
                }
    
                const filteredMovies = allCachedMovies.filter(movie => 
                    movie.title.toLowerCase().includes(query.toLowerCase())
                );
    
                console.log('Found in cache:', filteredMovies.length, 'movies');
                displayResults(filteredMovies, query);
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
            showError('Search failed. Please try again.');
        }
    }

    function showOfflineMessage() {
        const searchStatus = document.querySelector('.search-status');
        searchStatus.innerHTML = `
            <div class="status-message">
                <p>${OFFLINE_MESSAGE}</p>
            </div>
        `;
    }

    window.addEventListener('online', function() {
        document.body.classList.remove('offline');
    });
    
    window.addEventListener('offline', function() {
        document.body.classList.add('offline');
    });

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
            
            // Check if movie exists in cart first
            const movieKey = `movie-${movie.id}`;
            const exists = await cache.match(movieKey);
            
            if (!exists) {
                // Store the individual movie
                await cache.put(movieKey, new Response(JSON.stringify(movie)));
                
                // Maintain an index of IDs for listing
                const indexResponse = await cache.match('cart-index');
                const index = indexResponse ? await indexResponse.json() : [];
                
                if (!index.includes(movie.id)) {
                    index.push(movie.id);
                    await cache.put('cart-index', new Response(JSON.stringify(index)));
                }
                
                updateCartCount(index.length);
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
            
            // Get the index of movie IDs
            const indexResponse = await cache.match('cart-index');
            if (!indexResponse) {
                displayCartItems([]);
                return;
            }
            
            const index = await indexResponse.json();
            const movies = [];
            
            // Fetch each movie individually
            for (const id of index) {
                const response = await cache.match(`movie-${id}`);
                if (response) {
                    const movie = await response.json();
                    movies.push(movie);
                }
            }
            
            displayCartItems(movies);
        } catch (error) {
            console.error('Failed to load cart items:', error);
        }
    }
    
    
    function displayCartItems(items) {
        if (!items || items.length === 0) {
            cartItems.innerHTML = `
                <div class="search-status">
                    <div class="status-message">
                        <p>Your cart is empty</p>
                    </div>
                </div>
            `;
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
    
        const rentButtons = cartItems.querySelectorAll('.rent-btn');
        const removeButtons = cartItems.querySelectorAll('.remove-btn');
    
        rentButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                rentMovie(items[index]);
            });
        });
    
        removeButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                removeFromCart(items[index]);
            });
        });
    }

    initializeSearchStatus();
    
    const rentButtons = cartItems.querySelectorAll('.rent-btn');
    const removeButtons = cartItems.querySelectorAll('.remove-btn');

    async function removeFromCart(movie) {
        try {
            const cache = await caches.open(CACHE_NAMES.cart);
            const response = await cache.match('cart-items');
            let cartItems = response ? await response.json() : [];
            
            cartItems = cartItems.filter(item => item.id !== movie.id);
            
            await cache.put('cart-items', new Response(JSON.stringify(cartItems)));
            
            displayCartItems(cartItems);
            updateCartCount(cartItems.length);
        } catch (error) {
            console.error('Failed to remove from cart:', error);
            alert('Failed to remove movie from cart');
        }
    }

    async function rentMovie(movie) {
        try {
            const cartCache = await caches.open(CACHE_NAMES.cart);
            const rentedCache = await caches.open(CACHE_NAMES.rented);
            
            const cartResponse = await cartCache.match('cart-items');
            const rentedResponse = await rentedCache.match('rented-items');
            
            let cartItems = cartResponse ? await cartResponse.json() : [];
            let rentedItems = rentedResponse ? await rentedResponse.json() : [];
            
            if (rentedItems.some(item => item.id === movie.id)) {
                alert('This movie is already rented');
                return;
            }
    
            rentedItems.push(movie);
            await rentedCache.put('rented-items', new Response(JSON.stringify(rentedItems)));
            
            cartItems = cartItems.filter(item => item.id !== movie.id);
            await cartCache.put('cart-items', new Response(JSON.stringify(cartItems)));
            
            displayCartItems(cartItems);
            displayRentedItems(rentedItems);
            updateCartCount(cartItems.length);
            
            alert(`${movie.title} has been rented!`);
            
            navigateToScreen(rentedScreen);
        } catch (error) {
            console.error('Failed to rent movie:', error);
            alert('Failed to rent movie');
        }
    }
    
    function displayRentedItems(items) {
        const rentedItems = document.querySelector('.rented-items');

        if (!items || items.length === 0) {
            rentedItems.innerHTML = `
                <div class="search-status">
                    <div class="status-message">
                        <p>No movies rented yet</p>
                    </div>
                </div>
            `;
            return;
        }
    
    
        const rentedCards = items.map(movie => `
            <div class="rented-card" data-movie-id="${movie.id}">
                <div class="rented-card-image-container">
                    <img 
                        src="${movie.poster_path 
                            ? IMAGE_BASE_URL + movie.poster_path 
                            : 'assets/images/placeholder.jpg'}" 
                        alt="${movie.title}" 
                        class="rented-card-image"
                    >
                    <h3 class="rented-card-title">${movie.title}</h3>
                </div>
                <div class="rented-card-content">
                    <p class="movie-year">Released: ${movie.release_date?.split('-')[0] || 'N/A'}</p>
                    <div class="movie-rating">★ ${movie.vote_average?.toFixed(1) || 'N/A'}</div>
                    <button class="btn btn-primary watch-btn">Watch</button>
                </div>
            </div>
        `).join('');
    
        rentedItems.innerHTML = rentedCards;
    
        const watchButtons = rentedItems.querySelectorAll('.watch-btn');
        watchButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                watchMovie(items[index]);
            });
        });
    }

    function watchMovie(movie) {
        navigateToScreen(viewScreen);
    
        viewScreen.innerHTML = `
            <div class="view-movie-container">
                <h2>${movie.title}</h2>
                <video controls>
                    <source src="assets/videos/placeholder.mp4" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <button class="btn btn-primary mark-watched-btn">Mark as Watched</button>
            </div>
        `;
    }

    rentButtons.forEach((button, index) => {
        button.addEventListener('click', () => rentMovie(items[index]));
    });

    removeButtons.forEach((button, index) => {
        button.addEventListener('click', () => removeFromCart(items[index]));
    });
});






