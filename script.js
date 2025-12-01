"use strict";

let currentFilter = 'all';
let userLat = null;
let userLng = null;
let map = null;
let directionsService = null;
let directionsRenderer = null;
let placesService = null;
let allPlaces = [];

// IMPORTANT: For production, you MUST:
// 1. Create a backend proxy server, OR
// 2. Restrict this API key to your domain only in Google Cloud Console
// 3. Use environment variables with a build tool (Vite, Webpack)
const API_KEY = 'AIzaSyBZjgrXCPheK5GZuTanUrt4zfQBIksfkwE';
// FIXED: Changed the logic - check if it's not the placeholder
const hasApiKey = API_KEY && API_KEY !== '' && !API_KEY.includes('YOUR_API_KEY_HERE');

// Fix the hoisting issue - declare functions first
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function showDemoResults() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
    
    const filtersEl = document.getElementById('filters');
    if (filtersEl) filtersEl.style.display = 'flex';
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = 'Find Places Along Route';
    }

    // Use reliable image URLs
    allPlaces = [
        {
            name: 'Ichiran Ramen Shibuya',
            category: 'restaurant',
            rating: 4.5,
            price_level: 2,
            vicinity: 'Shibuya, Tokyo',
            opening_hours: { open_now: true },
            photos: [{ getUrl: () => 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80' }],
            geometry: { location: { lat: () => 35.6625, lng: () => 139.7003 } }
        },
        {
            name: 'Meiji Shrine',
            category: 'tourist_attraction',
            rating: 4.8,
            price_level: 0,
            vicinity: 'Yoyogi Park, Shibuya',
            opening_hours: { open_now: true },
            photos: [{ getUrl: () => 'https://images.unsplash.com/photo-1624253321890-36b0c1c777f6?auto=format&fit=crop&w=800&q=80' }],
            geometry: { location: { lat: () => 35.6764, lng: () => 139.6993 } }
        },
        {
            name: 'Sushi Dai Tsukiji',
            category: 'restaurant',
            rating: 4.7,
            price_level: 3,
            vicinity: 'Tsukiji Market, Tokyo',
            opening_hours: { open_now: true },
            photos: [{ getUrl: () => 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80' }],
            geometry: { location: { lat: () => 35.6655, lng: () => 139.7704 } }
        },
        {
            name: 'Tokyo Skytree',
            category: 'tourist_attraction',
            rating: 4.6,
            price_level: 2,
            vicinity: 'Sumida, Tokyo',
            opening_hours: { open_now: true },
            photos: [{ getUrl: () => 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80' }],
            geometry: { location: { lat: () => 35.7101, lng: () => 139.8107 } }
        }
    ];

    displayFilteredResults();
}

function displayFilteredResults() {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;

    const filtered = currentFilter === 'all' ? allPlaces : allPlaces.filter(p => p.category === currentFilter);

    if (!filtered.length) {
        resultsDiv.innerHTML = '<div class="empty-state"><p>No places found</p></div>';
        return;
    }

    resultsDiv.innerHTML = filtered.map(place => {
        const isOpen = place.opening_hours ? place.opening_hours.open_now : true;
        const priceLevel = place.price_level || 0;
        const priceStr = priceLevel === 0 ? 'Free' : '¥'.repeat(priceLevel); // Fixed price display

        const lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
        const lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;

        const imageUrl = place.photos && place.photos.length && place.photos[0].getUrl
    ? place.photos[0].getUrl()
    : 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80';

        return `
        <div class="place-card">
            <img src="${imageUrl}" alt="${place.name}" class="place-image" onerror="this.src='https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80'">
            <div class="place-content">
                <div class="place-header">
                    <div class="place-title">
                        <h3>${place.name}</h3>
                        <div class="place-type">${place.vicinity}</div>
                    </div>
                    <span class="category-badge ${place.category === 'restaurant' ? 'food' : 'activity'}">
                        ${place.category === 'restaurant' ? '🍜 Food' : '🎌 Activity'}
                    </span>
                </div>
                <div class="status-badge ${isOpen ? 'open' : 'closed'}">
                    ${isOpen ? '● Open Now' : '● Closed'}
                </div>
                <div class="place-stats">
                    ${place.rating ? `<div class="stat">⭐ ${place.rating}</div>` : ''}
                    <div class="stat">💴 ${priceStr}</div>
                </div>
                <button class="btn-navigate" onclick="navigate(${lat}, ${lng}, '${place.name.replace(/'/g, "\\'")}')">
                    🧭 Navigate Here
                </button>
            </div>
        </div>`;
    }).join('');
}

function filterPlaces(category) {
    currentFilter = category;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if ((category === 'all' && btn.textContent.includes('All')) ||
            (category === 'restaurant' && btn.textContent.includes('Food')) ||
            (category === 'tourist_attraction' && btn.textContent.includes('Shit To Do'))) {
            btn.classList.add('active');
        }
    });

    displayFilteredResults();
}

function navigate(lat, lng, name) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
        ? `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    window.open(url, '_blank');
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
        // You can optionally show a toast that offline mode won't work
      });
  });
}

function getUserLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    const locInput = document.getElementById('currentLocation');
    if (locInput) {
        locInput.value = 'Getting location...';
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            
            if (locInput) {
                locInput.value = `${userLat.toFixed(4)}, ${userLng.toFixed(4)}`;
            }

            // Only add marker if Google Maps is loaded and available
            if (map && typeof google !== 'undefined' && google.maps) {
                map.setCenter({ lat: userLat, lng: userLng });
                // Add a marker for user location
                new google.maps.Marker({
                    position: { lat: userLat, lng: userLng },
                    map: map,
                    title: 'Your Location',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#4285F4',
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2
                    }
                });
            }

            showToast('✅ Location found!', 'success');
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Could not get your location.';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location permission denied. Please enable in settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out.';
                    break;
            }
            showToast(errorMessage, 'error');
            if (locInput) {
                locInput.value = '';
            }
        },
        { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 
        }
    );
}

function initMap() {
    if (!hasApiKey) {
        console.warn('Google Maps API key not configured');
        showToast('Running in demo mode - no Google Maps API key', 'warning');
        return;
    }

    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }

        map = new google.maps.Map(mapElement, {
            zoom: 14,
            center: { lat: 35.6762, lng: 139.6503 },
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }
            ]
        });

        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({ 
            map: map, 
            suppressMarkers: false,
            polylineOptions: {
                strokeColor: '#4285F4',
                strokeWeight: 4,
                strokeOpacity: 0.7
            }
        });

        placesService = new google.maps.places.PlacesService(map);

        console.log('Google Maps initialized successfully');

    } catch (error) {
        console.error('Failed to initialize map:', error);
        showToast('Failed to load map. Please refresh.', 'error');
    }
}

function searchRoute() {
    const destinationInput = document.getElementById('destination');
    if (!destinationInput) return;
    
    const destination = destinationInput.value.trim();
    if (!destination) {
        showToast('Please enter a destination', 'warning');
        return;
    }
    
    if (!userLat || !userLng) {
        showToast('Please enable location access first', 'warning');
        return;
    }

    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'none';
    
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'block';
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span class="spinner"></span> Searching...';
    }

    // Clear previous results
    allPlaces = [];
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) resultsDiv.innerHTML = '';

    if (!hasApiKey) {
        // Demo mode
        setTimeout(showDemoResults, 1500);
        return;
    }

    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) mapContainer.style.display = 'block';

    const request = {
        origin: { lat: userLat, lng: userLng },
        destination: destination,
        travelMode: 'WALKING',
        provideRouteAlternatives: false
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Fit map to route bounds
            const bounds = new google.maps.LatLngBounds();
            result.routes[0].legs[0].steps.forEach(step => {
                bounds.union(step.lat_lngs);
            });
            map.fitBounds(bounds);
            
            searchPlacesAlongRoute(result.routes[0]);
        } else {
            if (loadingEl) loadingEl.style.display = 'none';
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.innerHTML = 'Find Places Along Route';
            }
            
            if (status === 'ZERO_RESULTS') {
                showToast('No route found. Try a different destination.', 'error');
            } else {
                showToast('Could not find route. Please try again.', 'error');
            }
        }
    });
}

function searchPlacesAlongRoute(route) {
    const waypoints = route.overview_path;
    const searchRadius = 500;
    const samplePoints = [];
    const step = Math.max(1, Math.floor(waypoints.length / 10));

    for (let i = 0; i < waypoints.length; i += step) {
        if (samplePoints.length < 20) { // Limit to 20 search points
            samplePoints.push(waypoints[i]);
        }
    }

    let searchesCompleted = 0;
    const totalSearches = samplePoints.length * 2;
    const placeSet = new Set(); // Use Set to avoid duplicates

    if (totalSearches === 0) {
        displayRealResults();
        return;
    }

    samplePoints.forEach((point) => {
        ['restaurant', 'tourist_attraction'].forEach((type) => {
            const request = {
                location: point,
                radius: searchRadius,
                type: type,
                rankBy: google.maps.places.RankBy.PROMINENCE
            };

            placesService.nearbySearch(request, (results, status, pagination) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    results.forEach((place) => {
                        if (!placeSet.has(place.place_id)) {
                            place.category = type;
                            allPlaces.push(place);
                            placeSet.add(place.place_id);
                        }
                    });
                }
                
                searchesCompleted++;
                if (searchesCompleted === totalSearches) {
                    displayRealResults();
                }
            });
        });
    });
}

function displayRealResults() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = 'Find Places Along Route';
    }

    const filtersEl = document.getElementById('filters');
    if (filtersEl) filtersEl.style.display = 'flex';

    // Sort by rating and distance
    allPlaces.sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        
        // Add distance calculation here if needed
        return 0;
    });

    allPlaces = allPlaces.slice(0, 50); // Limit results
    displayFilteredResults();
    
    // Show result count
    showToast(`Found ${allPlaces.length} places along your route`, 'success');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Add event listeners
    const locationBtn = document.getElementById('locationBtn');
    if (locationBtn) {
        locationBtn.addEventListener('click', getUserLocation);
    }
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchRoute);
    }
    
    getUserLocation();
    
    // Add Enter key support for destination input
    const destinationInput = document.getElementById('destination');
    if (destinationInput) {
        destinationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchRoute();
            }
        });
    }
    
    // Load Google Maps if API key is available
    if (hasApiKey && typeof google === 'undefined') {
        console.log('Loading Google Maps API...');
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=initMap`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            console.error('Failed to load Google Maps API');
            showToast('Failed to load Google Maps. Check your API key.', 'error');
        };
        document.head.appendChild(script);
    } else if (!hasApiKey) {
        console.warn('Running in demo mode - no API key configured');
        showToast('Running in demo mode', 'info');
    }
});

// Make functions globally available
window.getUserLocation = getUserLocation;
window.searchRoute = searchRoute;
window.filterPlaces = filterPlaces;
window.navigate = navigate;
window.initMap = initMap;