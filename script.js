  var currentFilter = 'all';
        var userLat = null;
        var userLng = null;
        var map = null;
        var directionsService = null;
        var directionsRenderer = null;
        var placesService = null;
        var allPlaces = [];
        
        var API_KEY = 'AIzaSyDDK06gPB6hI8lOU97QFK2tpgxdTIA_ATU';
        var hasApiKey = API_KEY !== 'AIzaSyDDK06gPB6hI8lOU97QFK2tpgxdTIA_ATU';
        
        function getUserLocation() {
            if (navigator.geolocation) {
                document.getElementById('currentLocation').value = 'Getting location...';
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        userLat = position.coords.latitude;
                        userLng = position.coords.longitude;
                        document.getElementById('currentLocation').value = userLat.toFixed(4) + ', ' + userLng.toFixed(4);
                        
                        if (hasApiKey && map) {
                            map.setCenter({lat: userLat, lng: userLng});
                        }
                        
                        alert('✅ Location found!');
                    },
                    function(error) {
                        alert('❌ Please enable location permissions');
                        document.getElementById('currentLocation').value = '';
                    }
                );
            }
        }
        
        function initMap() {
            if (!hasApiKey) return;
            
            map = new google.maps.Map(document.getElementById('map'), {
                zoom: 14,
                center: {lat: 35.6762, lng: 139.6503},
                mapTypeControl: false,
                streetViewControl: false
            });
            
            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: false
            });
            
            placesService = new google.maps.places.PlacesService(map);
            
            var warningEl = document.getElementById('apiWarning');
            if (warningEl) warningEl.style.display = 'none';
        }
        
        function searchRoute() {
            var destination = document.getElementById('destination').value;
            if (!destination) {
                alert('Please enter a destination');
                return;
            }
            
            if (!userLat || !userLng) {
                alert('Please enable location access first');
                return;
            }
            
            var emptyStateEl = document.getElementById('emptyState');
            if (emptyStateEl) emptyStateEl.style.display = 'none';
            
            var loadingEl = document.getElementById('loading');
            if (loadingEl) loadingEl.style.display = 'block';
            
            var searchBtn = document.getElementById('searchBtn');
            if (searchBtn) searchBtn.disabled = true;
            
            if (!hasApiKey) {
                setTimeout(function() {
                    showDemoResults();
                }, 1500);
                return;
            }
            
            var mapContainer = document.getElementById('mapContainer');
            if (mapContainer) mapContainer.style.display = 'block';
            
            var request = {
                origin: {lat: userLat, lng: userLng},
                destination: destination,
                travelMode: 'WALKING'
            };
            
            directionsService.route(request, function(result, status) {
                if (status === 'OK') {
                    directionsRenderer.setDirections(result);
                    searchPlacesAlongRoute(result.routes[0]);
                } else {
                    alert('Could not find route');
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('searchBtn').disabled = false;
                }
            });
        }
        
        function searchPlacesAlongRoute(route) {
            allPlaces = [];
            var waypoints = route.overview_path;
            var searchRadius = 500;
            
            var samplePoints = [];
            var step = Math.floor(waypoints.length / 5);
            for (var i = 0; i < waypoints.length; i += step) {
                samplePoints.push(waypoints[i]);
            }
            
            var searchesCompleted = 0;
            var totalSearches = samplePoints.length * 2;
            
            samplePoints.forEach(function(point) {
                placesService.nearbySearch({
                    location: point,
                    radius: searchRadius,
                    type: 'restaurant'
                }, function(results, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        results.forEach(function(place) {
                            place.category = 'restaurant';
                            if (!placeExists(place.place_id)) {
                                allPlaces.push(place);
                            }
                        });
                    }
                    searchesCompleted++;
                    if (searchesCompleted === totalSearches) displayRealResults();
                });
                
                placesService.nearbySearch({
                    location: point,
                    radius: searchRadius,
                    type: 'tourist_attraction'
                }, function(results, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        results.forEach(function(place) {
                            place.category = 'tourist_attraction';
                            if (!placeExists(place.place_id)) {
                                allPlaces.push(place);
                            }
                        });
                    }
                    searchesCompleted++;
                    if (searchesCompleted === totalSearches) displayRealResults();
                });
            });
        }
        
        function placeExists(placeId) {
            for (var i = 0; i < allPlaces.length; i++) {
                if (allPlaces[i].place_id === placeId) return true;
            }
            return false;
        }
        
        function displayRealResults() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('filters').style.display = 'flex';
            document.getElementById('searchBtn').disabled = false;
            
            allPlaces.sort(function(a, b) {
                return (b.rating || 0) - (a.rating || 0);
            });
            
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
                    opening_hours: {open_now: true},
                    photos: [{getUrl: function() { return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80'; }}],
                    geometry: {location: {lat: function(){return 35.6625;}, lng: function(){return 139.7003;}}}
                },
                {
                    name: 'Sukiyabashi Jiro',
                    category: 'restaurant',
                    rating: 4.9,
                    price_level: 4,
                    vicinity: 'Ginza, Tokyo',
                    opening_hours: {open_now: true},
                    photos: [{getUrl: function() { return 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80'; }}],
                    geometry: {location: {lat: function(){return 35.6702;}, lng: function(){return 139.7630;}}}
                },
                {
                    name: 'Meiji Shrine',
                    category: 'tourist_attraction',
                    rating: 4.8,
                    price_level: 0,
                    vicinity: 'Yoyogi Park, Shibuya',
                    opening_hours: {open_now: true},
                    photos: [{getUrl: function() { return 'https://images.unsplash.com/photo-1624253321890-36b0c1c777f6?w=800&q=80'; }}],
                    geometry: {location: {lat: function(){return 35.6764;}, lng: function(){return 139.6993;}}}
                },
                {
                    name: 'Tsukiji Outer Market',
                    category: 'restaurant',
                    rating: 4.6,
                    price_level: 2,
                    vicinity: 'Chuo, Tokyo',
                    opening_hours: {open_now: true},
                    photos: [{getUrl: function() { return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80'; }}],
                    geometry: {location: {lat: function(){return 35.6654;}, lng: function(){return 139.7707;}}}
                },
                {
                    name: 'Senso-ji Temple',
                    category: 'tourist_attraction',
                    rating: 4.7,
                    price_level: 0,
                    vicinity: 'Asakusa, Tokyo',
                    opening_hours: {open_now: true},
                    photos: [{getUrl: function() { return 'https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=800&q=80'; }}],
                    geometry: {location: {lat: function(){return 35.7148;}, lng: function(){return 139.7967;}}}
                },
                {
                    name: 'Tonki Tonkatsu',
                    category: 'restaurant',
                    rating: 4.4,
                    price_level: 2,
                    vicinity: 'Meguro, Tokyo',
                    opening_hours: {open_now: false},
                    photos: [{getUrl: function() { return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80'; }}],
                    geometry: {location: {lat: function(){return 35.6339;}, lng: function(){return 139.7155;}}}
                }
            ];
            
            displayFilteredResults();
        }
        
        function displayFilteredResults() {
            var resultsDiv = document.getElementById('results');
            if (!resultsDiv) return;
            
            var filtered = currentFilter === 'all' ? allPlaces : allPlaces.filter(function(p) {
                return p.category === currentFilter;
            });
            
            if (filtered.length === 0) {
                resultsDiv.innerHTML = '<div class="empty-state"><p>No places found</p></div>';
                return;
            }
            
            var html = '';
            for (var i = 0; i < filtered.length; i++) {
                var place = filtered[i];
                var isOpen = place.opening_hours ? place.opening_hours.open_now : true;
                var priceLevel = place.price_level || 0;
                var priceStr = priceLevel === 0 ? 'Free' : '¥Yen'.repeat(priceLevel);
                var lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
                var lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;
                
                var imageUrl = 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80';
                if (place.photos && place.photos.length > 0) {
                    imageUrl = place.photos[0].getUrl ? place.photos[0].getUrl() : place.photos[0];
                }
                
                html += '<div class="place-card">' +
                    '<img src="' + imageUrl + '" alt="' + place.name + '" class="place-image" onerror="this.src=\'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80\'">' +
                    '<div class="place-content">' +
                        '<div class="place-header">' +
                            '<div class="place-title">' +
                                '<h3>' + place.name + '</h3>' +
                                '<div class="place-type">' + place.vicinity + '</div>' +
                            '</div>' +
                            '<span class="category-badge ' + (place.category === 'restaurant' ? 'food' : 'activity') + '">' +
                                (place.category === 'restaurant' ? '🍜 Food' : '🎌 Activity') +
                            '</span>' +
                        '</div>' +
                        '<div class="status-badge ' + (isOpen ? 'open' : 'closed') + '">' +
                            (isOpen ? '● Open Now' : '● Closed') +
                        '</div>' +
                        '<div class="place-stats">' +
                            (place.rating ? '<div class="stat">⭐ ' + place.rating + '</div>' : '') +
                            '<div class="stat">💴 ' + priceStr + '</div>' +
                        '</div>' +
                        '<button class="btn-navigate" onclick="navigate(' + lat + ', ' + lng + ', \'' + place.name.replace(/'/g, "\\'") + '\')">' +
                            '🧭 Navigate Here' +
                        '</button>' +
                    '</div>' +
                '</div>';
            }
            resultsDiv.innerHTML = html;
        }
        
        function filterPlaces(category) {
            currentFilter = category;
            
            var buttons = document.querySelectorAll('.filter-btn');
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove('active');
                if ((category === 'all' && buttons[i].textContent.indexOf('All') !== -1) ||
                    (category === 'restaurant' && buttons[i].textContent.indexOf('Food') !== -1) ||
                    (category === 'tourist_attraction' && buttons[i].textContent.indexOf('Activities') !== -1)) {
                    buttons[i].classList.add('active');
                }
            }
            
            displayFilteredResults();
        }
        
        function navigate(lat, lng, name) {
            var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            var url = isIOS 
                ? 'maps://maps.apple.com/?daddr=' + lat + ',' + lng + '&dirflg=w'
                : 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=walking';
            
            window.open(url, '_blank');
        }
        
        window.onload = function() {
            getUserLocation();
            
            if (hasApiKey) {
                var script = document.createElement('script');
                script.src = 'https://maps.googleapis.com/maps/api/js?key=' + API_KEY + '&libraries=places&callback=initMap';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }
        };