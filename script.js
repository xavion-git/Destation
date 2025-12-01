"use strict";

let currentFilter = 'all';
let userLat = null;
let userLng = null;
let map = null;
let directionsService = null;
let directionsRenderer = null;
let placesService = null;
let allPlaces = [];

const API_KEY = 'AIzaSyBZjgrXCPheK5GZuTanUrt4zfQBIksfkwE';
const hasApiKey = API_KEY !== '';

function getUserLocation() {
    if (!navigator.geolocation) return;

    const locInput = document.getElementById('currentLocation');
    locInput.value = 'Getting location...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            locInput.value = `${userLat.toFixed(4)}, ${userLng.toFixed(4)}`;

            if (map) map.setCenter({ lat: userLat, lng: userLng });

            alert('✅ Location found!');
        },
        () => {
            alert('❌ Please enable location permissions');
            locInput.value = '';
        }
    );
}

function initMap() {
    if (!hasApiKey) return;

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: { lat: 35.6762, lng: 139.6503 },
        mapTypeControl: false,
        streetViewControl: false
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ map: map, suppressMarkers: false });

    // TODO: For new apps, consider migrating to google.maps.places.Place
    placesService = new google.maps.places.PlacesService(map);

    const warningEl = document.getElementById('apiWarning');
    if (warningEl) warningEl.style.display = 'none';
}

function searchRoute() {
    const destination = document.getElementById('destination').value;
    if (!destination) return alert('Please enter a destination');
    if (!userLat || !userLng) return alert('Please enable location access first');

    document.getElementById('emptyState').style.display = 'none';
    const loadingEl = document.getElementById('loading');
    loadingEl.style.display = 'block';
    document.getElementById('searchBtn').disabled = true;

    if (!hasApiKey) {
        setTimeout(showDemoResults, 1500);
        return;
    }

    document.getElementById('mapContainer').style.display = 'block';

    const request = {
        origin: { lat: userLat, lng: userLng },
        destination: destination,
        travelMode: 'WALKING'
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            searchPlacesAlongRoute(result.routes[0]);
        } else {
            alert('Could not find route');
            loadingEl.style.display = 'none';
            document.getElementById('searchBtn').disabled = false;
        }
    });
}

function searchPlacesAlongRoute(route) {
    allPlaces = [];
    const waypoints = route.overview_path;
    const searchRadius = 500;
    const samplePoints = [];
    const step = Math.floor(waypoints.length / 5);

    for (let i = 0; i < waypoints.length; i += step) samplePoints.push(waypoints[i]);

    let searchesCompleted = 0;
    const totalSearches = samplePoints.length * 2;

    samplePoints.forEach((point) => {
        ['restaurant', 'tourist_attraction'].forEach((type) => {
            placesService.nearbySearch({ location: point, radius: searchRadius, type: type }, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    results.forEach((place) => {
                        place.category = type;
                        if (!placeExists(place.place_id)) allPlaces.push(place);
                    });
                }
                searchesCompleted++;
                if (searchesCompleted === totalSearches) displayRealResults();
            });
        });
    });
}

function placeExists(placeId) {
    return allPlaces.some((p) => p.place_id === placeId);
}

function displayRealResults() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('filters').style.display = 'flex';
    document.getElementById('searchBtn').disabled = false;

    allPlaces.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    allPlaces = allPlaces.slice(0, 30);
    displayFilteredResults();
}

function showDemoResults() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('filters').style.display = 'flex';
    document.getElementById('searchBtn').disabled = false;

    allPlaces = [
        {
            name: 'Ichiran Ramen Shibuya',
            category: 'restaurant',
            rating: 4.5,
            price_level: 2,
            vicinity: 'Shibuya, Tokyo',
            opening_hours: { open_now: true },
            photos: [{ getUrl: () => 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80' }],
            geometry: { location: { lat: () => 35.6625, lng: () => 139.7003 } }
        },
        {
            name: 'Meiji Shrine',
            category: 'tourist_attraction',
            rating: 4.8,
            price_level: 0,
            vicinity: 'Yoyogi Park, Shibuya',
            opening_hours: { open_now: true },
            photos: [{ getUrl: () => 'https://images.unsplash.com/photo-1624253321890-36b0c1c777f6?w=800&q=80' }],
            geometry: { location: { lat: () => 35.6764, lng: () => 139.6993 } }
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
        const priceStr = priceLevel === 0 ? 'Free' : '¥Yen'.repeat(priceLevel);

        const lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
        const lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;

        const imageUrl = place.photos && place.photos.length && place.photos[0].getUrl
            ? place.photos[0].getUrl()
            : 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80';

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

window.onload = function() {
    getUserLocation();

    if (hasApiKey) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }
};
