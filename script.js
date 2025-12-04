"use strict";

let currentFilter = 'all';
let userLat = null;
let userLng = null;
let map = null;
let directionsService = null;
let directionsRenderer = null;
let placesService = null;
let allPlaces = [];

// API key for google maps, google route, destination 
const API_KEY = import.meta.env.VITE_API_KEY;
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

function loadGoogleMaps() {
      if (typeof google !== 'undefined') {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        showToast('Failed to load Google Maps. Check your API key.', 'error');
        document.getElementById('apiSetup').style.display = 'block';
        document.getElementById('searchCard').style.display = 'none';
      };
      document.head.appendChild(script);
    }

    function initMap() {
      try {
        map = new google.maps.Map(document.getElementById('map'), {
          zoom: 14,
          center: { lat: 35.6762, lng: 139.6503 },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({ 
          map: map,
          polylineOptions: {
            strokeColor: '#4285F4',
            strokeWeight: 4,
            strokeOpacity: 0.7
          }
        });

        placesService = new google.maps.places.PlacesService(map);
        showToast('Maps loaded successfully!', 'success');
        getUserLocation();
      } catch (error) {
        showToast('Failed to initialize map', 'error');
      }
    }

    function getUserLocation() {
      if (!navigator.geolocation) {
        showToast('Geolocation not supported', 'error');
        return;
      }

      const locInput = document.getElementById('currentLocation');
      locInput.value = 'Getting location...';

      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLat = position.coords.latitude;
          userLng = position.coords.longitude;
          
          locInput.value = `${userLat.toFixed(4)}, ${userLng.toFixed(4)}`;

          if (map) {
            map.setCenter({ lat: userLat, lng: userLng });
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
          let errorMessage = 'Could not get your location';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location permission denied';
          }
          showToast(errorMessage, 'error');
          locInput.value = '';
        }
      );
    }

    function searchRoute() {
      const destination = document.getElementById('destination').value.trim();
      if (!destination) {
        showToast('Please enter a destination', 'warning');
        return;
      }
      
      if (!userLat || !userLng) {
        showToast('Please enable location access first', 'warning');
        return;
      }

      document.getElementById('emptyState').style.display = 'none';
      document.getElementById('loading').style.display = 'block';
      
      const searchBtn = document.getElementById('searchBtn');
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<span class="spinner"></span> Searching...';

      allPlaces = [];
      document.getElementById('results').innerHTML = '';
      document.getElementById('mapContainer').style.display = 'block';

      const request = {
        origin: { lat: userLat, lng: userLng },
        destination: destination,
        travelMode: 'WALKING'
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          
          const bounds = new google.maps.LatLngBounds();
          result.routes[0].overview_path.forEach(point => {
            bounds.extend(point);
          });
          map.fitBounds(bounds);
          
          searchPlacesAlongRoute(result.routes[0]);
        } else {
          document.getElementById('loading').style.display = 'none';
          searchBtn.disabled = false;
          searchBtn.innerHTML = 'Find Places Along Route';
          showToast('Could not find route. Try a different destination.', 'error');
        }
      });
    }

    function searchPlacesAlongRoute(route) {
      const waypoints = route.overview_path;
      const searchRadius = 500;
      const samplePoints = [];
      const step = Math.max(1, Math.floor(waypoints.length / 10));

      for (let i = 0; i < waypoints.length; i += step) {
        if (samplePoints.length < 20) {
          samplePoints.push(waypoints[i]);
        }
      }

      let searchesCompleted = 0;
      const totalSearches = samplePoints.length * 2;
      const placeSet = new Set();

      samplePoints.forEach((point) => {
        ['restaurant', 'tourist_attraction'].forEach((type) => {
          const request = {
            location: point,
            radius: searchRadius,
            type: type
          };
          
          placesService.nearbySearch(request, (results, status) => {
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
              displayResults();
            }
          });
        });
      });
    }

    function displayResults() {
      document.getElementById('loading').style.display = 'none';
      
      const searchBtn = document.getElementById('searchBtn');
      searchBtn.disabled = false;
      searchBtn.innerHTML = 'Find Places Along Route';

      document.getElementById('filters').style.display = 'flex';

      allPlaces.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      allPlaces = allPlaces.slice(0, 50);
      
      displayFilteredResults();
      showToast(`Found ${allPlaces.length} places along your route!`, 'success');
    }

    function displayFilteredResults() {
      const resultsDiv = document.getElementById('results');
      const filtered = currentFilter === 'all' ? allPlaces : allPlaces.filter(p => p.category === currentFilter);

      if (!filtered.length) {
        resultsDiv.innerHTML = '<div class="empty-state"><p>No places found</p></div>';
        return;
      }

      resultsDiv.innerHTML = filtered.map(place => {
        const isOpen = place.opening_hours ? place.opening_hours.open_now : true;
        const priceLevel = place.price_level || 0;
        const priceStr = priceLevel === 0 ? 'Free' : '¥'.repeat(priceLevel);
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const imageUrl = place.photos && place.photos.length 
          ? place.photos[0].getUrl({ maxWidth: 800 })
          : 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80';

        return `
          <div class="place-card">
            <img src="${imageUrl}" alt="${place.name}" class="place-image">
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
              <button class="btn-navigate" onclick="navigate(${lat}, ${lng})">
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
      });
      event.target.classList.add('active');
      displayFilteredResults();
    }

    function navigate(lat, lng) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const url = isIOS
        ? `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
      window.open(url, '_blank');
    }

    window.initMap = initMap;

    // Check if API key exists on load
    if (API_KEY) {
      document.getElementById('apiSetup').style.display = 'none';
      document.getElementById('searchCard').style.display = 'block';
      document.getElementById('emptyState').style.display = 'block';
      loadGoogleMaps();
    }

    window.addEventListener('DOMContentLoaded', () => {
  // Search button
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) searchBtn.addEventListener('click', searchRoute);

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = e.target.textContent.includes('Food') ? 'restaurant'
                     : e.target.textContent.includes('Activities') ? 'tourist_attraction'
                     : 'all';
      filterPlaces(category);

      // update active class
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });

  // Location button
  const locBtn = document.querySelector('.btn-location');
  if (locBtn) locBtn.addEventListener('click', getUserLocation);
});