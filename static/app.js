// DaoSync - Main JavaScript file

let currentTravelerId = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadCities();
    setMinDate();
    
    document.getElementById('searchForm').addEventListener('submit', handleSearch);
});

// Load available cities
async function loadCities() {
    try {
        const response = await fetch('/api/cities');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const cities = await response.json();
        
        const originSelect = document.getElementById('origin');
        const destinationSelect = document.getElementById('destination');
        
        cities.forEach(city => {
            const option1 = document.createElement('option');
            option1.value = city;
            option1.textContent = city;
            originSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = city;
            option2.textContent = city;
            destinationSelect.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading cities:', error);
    }
}

// Set minimum date to today
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('travelDate').setAttribute('min', today);
    document.getElementById('travelDate').value = today;
}

// Handle search form submission
async function handleSearch(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        origin: document.getElementById('origin').value,
        destination: document.getElementById('destination').value,
        budget: document.getElementById('budget').value,
        travel_date: document.getElementById('travelDate').value + 'T12:00:00'
    };
    
    // First, add the traveler
    try {
        const travelerResponse = await fetch('/api/traveler', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!travelerResponse.ok) {
            throw new Error(`HTTP error! status: ${travelerResponse.status}`);
        }
        
        const travelerData = await travelerResponse.json();
        currentTravelerId = travelerData.id;
        
        // Then search for routes
        await searchRoutes(formData);
        
        // And find matches
        await findMatches(formData);
        
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

// Search for routes
async function searchRoutes(formData) {
    try {
        const response = await fetch('/api/routes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const routes = await response.json();
        displayRoutes(routes);
        
    } catch (error) {
        console.error('Error searching routes:', error);
    }
}

// Find travel matches
async function findMatches(formData) {
    try {
        const response = await fetch('/api/matches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const matches = await response.json();
        displayMatches(matches);
        
    } catch (error) {
        console.error('Error finding matches:', error);
    }
}

// Display routes
function displayRoutes(routes) {
    const resultsSection = document.getElementById('resultsSection');
    const hsrList = document.getElementById('hsrList');
    const flightList = document.getElementById('flightList');
    
    hsrList.innerHTML = '';
    flightList.innerHTML = '';
    
    if (routes.hsr.length === 0 && routes.flights.length === 0) {
        resultsSection.style.display = 'block';
        hsrList.innerHTML = '<div class="no-results">No routes found within your budget</div>';
        return;
    }
    
    // Display HSR routes
    if (routes.hsr.length > 0) {
        routes.hsr.forEach(route => {
            const card = createRouteCard(route, 'hsr');
            hsrList.appendChild(card);
        });
    } else {
        hsrList.innerHTML = '<div class="no-results">No HSR routes available within budget</div>';
    }
    
    // Display flight routes
    if (routes.flights.length > 0) {
        routes.flights.forEach(route => {
            const card = createRouteCard(route, 'flight');
            flightList.appendChild(card);
        });
    } else {
        flightList.innerHTML = '<div class="no-results">No flights available within budget</div>';
    }
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Create route card element
function createRouteCard(route, type) {
    const card = document.createElement('div');
    card.className = 'route-card';
    
    const routeNumber = type === 'hsr' ? route.train_number : route.flight_number;
    const hours = Math.floor(route.duration / 60);
    const minutes = route.duration % 60;
    const durationText = `${hours}h ${minutes}m`;
    
    card.innerHTML = `
        <div class="route-header">
            <div class="route-number">${routeNumber}</div>
            <div class="route-price">¥${route.price}</div>
        </div>
        <div class="route-details">
            <div class="route-info">
                <span>⏰ ${route.departure_time}</span>
                <span>⏱️ ${durationText}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => {
        if (currentTravelerId) {
            createItinerary(currentTravelerId, route.id);
        }
    });
    
    return card;
}

// Display matches
function displayMatches(matches) {
    const matchesSection = document.getElementById('matchesSection');
    const routeMatchList = document.getElementById('routeMatchList');
    const destinationMatchList = document.getElementById('destinationMatchList');
    
    routeMatchList.innerHTML = '';
    destinationMatchList.innerHTML = '';
    
    // Display route matches
    if (matches.route_matches.length > 0) {
        matches.route_matches.forEach(match => {
            const card = createMatchCard(match);
            routeMatchList.appendChild(card);
        });
    } else {
        routeMatchList.innerHTML = '<div class="no-results">No travelers found on the same route yet</div>';
    }
    
    // Display destination matches
    if (matches.destination_matches.length > 0) {
        matches.destination_matches.forEach(match => {
            const card = createMatchCard(match);
            destinationMatchList.appendChild(card);
        });
    } else {
        destinationMatchList.innerHTML = '<div class="no-results">No travelers found at the same destination yet</div>';
    }
    
    matchesSection.style.display = 'block';
}

// Create match card element
function createMatchCard(match) {
    const card = document.createElement('div');
    card.className = 'match-card';
    
    const travelDate = new Date(match.travel_date).toLocaleDateString();
    
    card.innerHTML = `
        <div class="match-name">👤 ${match.name}</div>
        <div class="match-details">
            📍 ${match.origin} → ${match.destination} | 
            📅 ${travelDate} | 
            💰 Budget: ¥${match.budget}
        </div>
    `;
    
    return card;
}

// Create itinerary
async function createItinerary(travelerId, routeId) {
    try {
        const response = await fetch('/api/itinerary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                traveler_id: travelerId,
                route_id: routeId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        alert('✅ Route selected! Itinerary saved successfully.');
        
    } catch (error) {
        console.error('Error creating itinerary:', error);
        alert('Failed to save itinerary. Please try again.');
    }
}