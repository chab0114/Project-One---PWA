const API_KEY = '3e7d5c5d91edd8eae1fcac9b14f3b548';
const BASE_URL = 'https://api.themoviedb.org/3';
const SEARCH_ENDPOINT = '/search/movie';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const CACHE_VERSION = '1.0.0';
const CACHE_PREFIX = 'wfr';
const CACHE_NAMES = {
    APP: `${CACHE_PREFIX}-app-${CACHE_VERSION}`,
    CART: `${CACHE_PREFIX}-cart-${CACHE_VERSION}`,
    RENTED: `${CACHE_PREFIX}-rented-${CACHE_VERSION}`,
    SEARCH: `${CACHE_PREFIX}-search-${CACHE_VERSION}`,
    IMAGES: `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
    DYNAMIC: `${CACHE_PREFIX}-dynamic-${CACHE_VERSION}`
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

    cartLink.addEventListener('click', async (e) => {
        e.preventDefault();
        navigateToScreen(cartScreen);
        cartLink.classList.add('active');
        const items = await loadCartItems();
        displayCartItems(items);
    });

    playButton.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToScreen(viewScreen);
    });

    async function displayResults(movies, searchQuery, isOffline = false) {
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
        
        const cartCache = await caches.open(CACHE_NAMES.CART);
        const rentedCache = await caches.open(CACHE_NAMES.RENTED);
        
        const cartIndexResponse = await cartCache.match('cart-index');
        const rentedIndexResponse = await rentedCache.match('rented-index');
        
        const cartIndex = cartIndexResponse ? await cartIndexResponse.json() : [];
        const rentedIndex = rentedIndexResponse ? await rentedIndexResponse.json() : [];
    
        const movieCards = movies.map(movie => {
            const isInCart = cartIndex.includes(movie.id);
            const isRented = rentedIndex.includes(movie.id);
            
            const buttonState = isRented ? 'rented' : (isInCart ? 'added' : '');
            const buttonText = isRented ? 'Rented' : (isInCart ? 'Added' : 'Add to Cart');
            
            return `
                <div class="search-card ${buttonState}" data-movie-id="${movie.id}">
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
                            <button class="btn btn-primary add-to-cart-btn ${buttonState}" ${(isInCart || isRented) ? 'disabled' : ''}>
                                ${buttonText}
                            </button>
                            <button class="btn btn-secondary details-btn">Details</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');        
        
        searchStatus.innerHTML = `
            <div class="status-message">
                <p>${isOffline ? '<span class="no-results">You are offline!</span> Showing cached results for ' : 'Search results for '}<span class="highlight">${searchQuery}</span></p>
            </div>
        `;        
    
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
            // Check if online
            if (!navigator.onLine) {
                console.log('Device is offline, searching in cache...');
                showOfflineMessage();
                
                // Get search results from cache
                const movies = await getSearchResultsFromCache(query);
                displayResults(movies, query, true);
                return;
            }
            
            // If online - make the API request
            const url = `${BASE_URL}${SEARCH_ENDPOINT}?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
            console.log('Making request to:', url); 
        
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Search results:', data);
            
            if (data && data.results) {
                // Cache each movie individually and store the query
                await cacheSearchResults(query, data.results);
                
                // Display the results
                displayResults(data.results, query);
            } else {
                displayResults([], query);
            }            
            
        } catch (error) {
            console.error('Search failed:', error);
            showError('Search failed. Please try again.');
        }
    }

    async function cacheSearchResults(query, movies) {
        try {
            const cache = await caches.open(CACHE_NAMES.SEARCH);
            
            // Store the query-to-movie-ids mapping
            const queryKey = `query-${query.toLowerCase()}`;
            const movieIds = movies.map(movie => movie.id);
            await cache.put(queryKey, new Response(JSON.stringify(movieIds)));
            
            // Store each movie individually
            for (const movie of movies) {
                const movieKey = `movie-${movie.id}`;
                
                // Check if the movie is already cached
                const exists = await cache.match(movieKey);
                if (!exists) {
                    await cache.put(movieKey, new Response(JSON.stringify(movie)));
                }
            }
            
            // Also store a timestamp to know when this search was performed
            await cache.put(`${queryKey}-timestamp`, new Response(JSON.stringify(Date.now())));
            
            // Store a list of all cached queries for easier lookup
            const queriesResponse = await cache.match('cached-queries');
            const cachedQueries = queriesResponse ? await queriesResponse.json() : [];
            
            if (!cachedQueries.includes(query.toLowerCase())) {
                cachedQueries.push(query.toLowerCase());
                await cache.put('cached-queries', new Response(JSON.stringify(cachedQueries)));
            }
            
        } catch (error) {
            console.error('Error caching search results:', error);
        }
    }
    
    async function getSearchResultsFromCache(query) {
        try {
            const cache = await caches.open(CACHE_NAMES.SEARCH);
            const queryKey = `query-${query.toLowerCase()}`;
            
            // First, try to find an exact match for the query
            const queryResponse = await cache.match(queryKey);
            
            if (queryResponse) {
                // We found this exact query in the cache
                const movieIds = await queryResponse.json();
                const movies = [];
                
                // Retrieve each movie by its ID
                for (const id of movieIds) {
                    const movieResponse = await cache.match(`movie-${id}`);
                    if (movieResponse) {
                        const movie = await movieResponse.json();
                        movies.push(movie);
                    }
                }
                
                return movies;
            }
            
            // If no exact match, try a more flexible search across all cached movies
            console.log('No exact query match, searching all cached movies');
            
            // Get list of all cached queries
            const queriesResponse = await cache.match('cached-queries');
            if (!queriesResponse) {
                return [];
            }
            
            const cachedQueries = await queriesResponse.json();
            const allMovies = [];
            
            // Gather all cached movies from all queries
            for (const cachedQuery of cachedQueries) {
                const queryResp = await cache.match(`query-${cachedQuery}`);
                if (queryResp) {
                    const ids = await queryResp.json();
                    
                    for (const id of ids) {
                        const movieResp = await cache.match(`movie-${id}`);
                        if (movieResp) {
                            const movie = await movieResp.json();
                            // Avoid duplicates
                            if (!allMovies.some(m => m.id === movie.id)) {
                                allMovies.push(movie);
                            }
                        }
                    }
                }
            }
            
            // Filter the movies based on the query
            const lowerQuery = query.toLowerCase();
            return allMovies.filter(movie => 
                movie.title.toLowerCase().includes(lowerQuery) ||
                (movie.overview && movie.overview.toLowerCase().includes(lowerQuery))
            );
            
        } catch (error) {
            console.error('Error retrieving from cache:', error);
            return [];
        }
    }
    
    function isApiRequest(request) {
        return request.url.includes('api.themoviedb.org');
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
        const cache = await caches.open(CACHE_NAMES.CART);
        
        // Check if movie exists in cart first
        const movieKey = `movie-${movie.id}`;
        const exists = await cache.match(movieKey);
        
        if (exists) {
            alert('This movie is already in your cart');
            return;
        }
        
        // Update UI to show it's added
        const searchCard = document.querySelector(`.search-card[data-movie-id="${movie.id}"]`);
        if (searchCard) {
            searchCard.classList.add('added');
            const addButton = searchCard.querySelector('.add-to-cart-btn');
            if (addButton) {
                addButton.textContent = 'Added';
                addButton.classList.add('added');
                addButton.disabled = true;
            }
        }

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
            const cache = await caches.open(CACHE_NAMES.CART);
            
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
            
            return movies;
        } catch (error) {
            console.error('Failed to load cart items:', error);
            return [];
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
                            : '/assets/images/placeholder.jpg'}" 
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
            const cache = await caches.open(CACHE_NAMES.CART);
            
            // Remove the movie from cache
            await cache.delete(`movie-${movie.id}`);
            
            // Update the index
            const indexResponse = await cache.match('cart-index');
            let cartIndex = indexResponse ? await indexResponse.json() : [];
            cartIndex = cartIndex.filter(id => id !== movie.id);
            await cache.put('cart-index', new Response(JSON.stringify(cartIndex)));
            
            // Update cart count
            updateCartCount(cartIndex.length);
            
            // Load and display updated cart
            const items = await loadCartItems();
            displayCartItems(items);
            
            alert(`${movie.title} has been removed from cart!`);
        } catch (error) {
            console.error('Failed to remove from cart:', error);
            alert('Failed to remove movie from cart');
        }
    }

    async function rentMovie(movie) {
        try {
            const cartCache = await caches.open(CACHE_NAMES.CART);
            const rentedCache = await caches.open(CACHE_NAMES.RENTED);
            
            // Check if movie already exists in rented items
            const rentedMovieKey = `movie-${movie.id}`;
            const movieExists = await rentedCache.match(rentedMovieKey);
            
            if (movieExists) {
                alert('This movie is already rented');
                return;
            }

            // Update UI when rented
            const cartCard = document.querySelector(`.cart-card[data-movie-id="${movie.id}"]`);
            if (cartCard) {
                cartCard.classList.add('rented');
                const rentButton = cartCard.querySelector('.rent-btn');
                if (rentButton) {
                    rentButton.textContent = 'Rented';
                    rentButton.classList.add('rented');
                    rentButton.disabled = true;
                }
            }

            const searchCard = document.querySelector(`.search-card[data-movie-id="${movie.id}"]`);
            if (searchCard) {
                searchCard.classList.remove('added');
                searchCard.classList.add('rented');
                const addButton = searchCard.querySelector('.add-to-cart-btn');
                if (addButton) {
                    addButton.textContent = 'Rented';
                    addButton.classList.remove('added');
                    addButton.classList.add('rented');
                    addButton.disabled = true;
                }
            }
            
            // Store the individual movie in rented cache
            await rentedCache.put(rentedMovieKey, new Response(JSON.stringify(movie)));
            
            // Update the rented index
            const indexResponse = await rentedCache.match('rented-index');
            const rentedIndex = indexResponse ? await indexResponse.json() : [];
            
            if (!rentedIndex.includes(movie.id)) {
                rentedIndex.push(movie.id);
                await rentedCache.put('rented-index', new Response(JSON.stringify(rentedIndex)));
            }
            
            // Remove from cart cache
            setTimeout(async () => {
                const cartIndexResponse = await cartCache.match('cart-index');
                let cartIndex = cartIndexResponse ? await cartIndexResponse.json() : [];
                cartIndex = cartIndex.filter(id => id !== movie.id);
                await cartCache.put('cart-index', new Response(JSON.stringify(cartIndex)));
                await cartCache.delete(`movie-${movie.id}`);
                
                updateCartCount(cartIndex.length);
                
                // Refresh the cart display
                const items = await loadCartItems();
                displayCartItems(items);
            }, 2000);
            
            alert(`${movie.title} has been rented!`);

            
        } catch (error) {
            console.error('Failed to rent movie:', error);
            alert('Failed to rent movie');
        }
    }

    async function loadRentedItems() {
        try {
            const cache = await caches.open(CACHE_NAMES.RENTED);
            
            // Get the index of movie IDs
            const indexResponse = await cache.match('rented-index');
            if (!indexResponse) {
                return [];
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
            
            return movies;
        } catch (error) {
            console.error('Failed to load rented items:', error);
            return [];
        }
    }

    rentedLink.addEventListener('click', async (e) => {
        e.preventDefault();
        navigateToScreen(rentedScreen);
        rentedLink.classList.add('active');

        const rentedMovies = await loadRentedItems();
        displayRentedItems(rentedMovies);
    });

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
                    <button class="btn btn-secondary return-btn">Return</button>
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
        
        const returnButtons = rentedItems.querySelectorAll('.return-btn');
        returnButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                returnMovie(items[index]);
            });
        });
    }

    async function returnMovie(movie) {
        try {
            const rentedCache = await caches.open(CACHE_NAMES.RENTED);
            
            // Remove the movie from the cache
            await rentedCache.delete(`movie-${movie.id}`);
            
            // Update the index
            const indexResponse = await rentedCache.match('rented-index');
            let rentedIndex = indexResponse ? await indexResponse.json() : [];
            
            rentedIndex = rentedIndex.filter(id => id !== movie.id);
            await rentedCache.put('rented-index', new Response(JSON.stringify(rentedIndex)));

            const searchCard = document.querySelector(`.search-card[data-movie-id="${movie.id}"]`);
            if (searchCard) {
                searchCard.classList.remove('rented');
                const addButton = searchCard.querySelector('.add-to-cart-btn');
                if (addButton) {
                    addButton.textContent = 'Add to Cart';
                    addButton.classList.remove('rented');
                    addButton.disabled = false;
                }
            }
            
            // Reload and display the updated list
            const rentedMovies = await loadRentedItems();
            displayRentedItems(rentedMovies);
            
            alert(`${movie.title} has been returned!`);
        } catch (error) {
            console.error('Failed to return movie:', error);
            alert('Failed to return movie');
        }
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
});







