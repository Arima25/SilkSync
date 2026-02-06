// DaoSync - Main TypeScript file

// Type definitions
interface TravelerFormData {
    name: string;
    origin: string;
    destination: string;
    budget: string;
    travel_date: string;
}

interface TravelerResponse {
    id: number;
    name: string;
    origin: string;
    destination: string;
    budget: number;
    travel_date: string;
}

interface HSRRoute {
    id: number;
    train_number: string;
    departure_time: string;
    duration: number;
    price: number;
}

interface FlightRoute {
    id: number;
    flight_number: string;
    departure_time: string;
    duration: number;
    price: number;
}

interface RoutesResponse {
    hsr: HSRRoute[];
    flights: FlightRoute[];
}

interface Match {
    id: number;
    name: string;
    origin: string;
    destination: string;
    travel_date: string;
    budget: number;
}

interface MatchesResponse {
    route_matches: Match[];
    destination_matches: Match[];
}

interface ItineraryRequest {
    traveler_id: number;
    route_id: number;
}

interface ItineraryResponse {
    id: number;
    traveler_id: number;
    route_id: number;
}

let currentTravelerId: number | null = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function(): void {
    loadCities();
    setMinDate();
    
    const searchForm = document.getElementById('searchForm') as HTMLFormElement | null;
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }
});

// Load available cities
async function loadCities(): Promise<void> {
    try {
        const response = await fetch('/api/cities');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const cities: string[] = await response.json();
        
        const originSelect = document.getElementById('origin') as HTMLSelectElement | null;
        const destinationSelect = document.getElementById('destination') as HTMLSelectElement | null;
        
        if (!originSelect || !destinationSelect) {
            throw new Error('Select elements not found');
        }
        
        cities.forEach((city: string) => {
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
function setMinDate(): void {
    const today = new Date().toISOString().split('T')[0];
    const travelDateInput = document.getElementById('travelDate') as HTMLInputElement | null;
    
    if (travelDateInput) {
        travelDateInput.setAttribute('min', today);
        travelDateInput.value = today;
    }
}

// Handle search form submission
async function handleSearch(event: Event): Promise<void> {
    event.preventDefault();
    
    const nameInput = document.getElementById('name') as HTMLInputElement | null;
    const originSelect = document.getElementById('origin') as HTMLSelectElement | null;
    const destinationSelect = document.getElementById('destination') as HTMLSelectElement | null;
    const budgetInput = document.getElementById('budget') as HTMLInputElement | null;
    const travelDateInput = document.getElementById('travelDate') as HTMLInputElement | null;
    
    if (!nameInput || !originSelect || !destinationSelect || !budgetInput || !travelDateInput) {
        console.error('Form elements not found');
        return;
    }
    
    const formData: TravelerFormData = {
        name: nameInput.value,
        origin: originSelect.value,
        destination: destinationSelect.value,
        budget: budgetInput.value,
        travel_date: travelDateInput.value + 'T12:00:00'
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
        
        const travelerData: TravelerResponse = await travelerResponse.json();
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
async function searchRoutes(formData: TravelerFormData): Promise<void> {
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
        
        const routes: RoutesResponse = await response.json();
        displayRoutes(routes);
        
    } catch (error) {
        console.error('Error searching routes:', error);
    }
}

// Find travel matches
async function findMatches(formData: TravelerFormData): Promise<void> {
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
        
        const matches: MatchesResponse = await response.json();
        displayMatches(matches);
        
    } catch (error) {
        console.error('Error finding matches:', error);
    }
}

// Display routes
function displayRoutes(routes: RoutesResponse): void {
    const resultsSection = document.getElementById('resultsSection') as HTMLElement | null;
    const hsrList = document.getElementById('hsrList') as HTMLElement | null;
    const flightList = document.getElementById('flightList') as HTMLElement | null;
    
    if (!resultsSection || !hsrList || !flightList) {
        console.error('Results elements not found');
        return;
    }
    
    hsrList.innerHTML = '';
    flightList.innerHTML = '';
    
    if (routes.hsr.length === 0 && routes.flights.length === 0) {
        resultsSection.style.display = 'block';
        hsrList.innerHTML = '<div class="no-results">No routes found within your budget</div>';
        return;
    }
    
    // Display HSR routes
    if (routes.hsr.length > 0) {
        routes.hsr.forEach((route: HSRRoute) => {
            const card = createRouteCard(route, 'hsr');
            hsrList.appendChild(card);
        });
    } else {
        hsrList.innerHTML = '<div class="no-results">No HSR routes available within budget</div>';
    }
    
    // Display flight routes
    if (routes.flights.length > 0) {
        routes.flights.forEach((route: FlightRoute) => {
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
function createRouteCard(route: HSRRoute | FlightRoute, type: 'hsr' | 'flight'): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'route-card';
    
    const routeNumber = type === 'hsr' 
        ? (route as HSRRoute).train_number 
        : (route as FlightRoute).flight_number;
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
    
    card.addEventListener('click', (): void => {
        if (currentTravelerId) {
            createItinerary(currentTravelerId, route.id);
        }
    });
    
    return card;
}

// Display matches
function displayMatches(matches: MatchesResponse): void {
    const matchesSection = document.getElementById('matchesSection') as HTMLElement | null;
    const routeMatchList = document.getElementById('routeMatchList') as HTMLElement | null;
    const destinationMatchList = document.getElementById('destinationMatchList') as HTMLElement | null;
    
    if (!matchesSection || !routeMatchList || !destinationMatchList) {
        console.error('Match elements not found');
        return;
    }
    
    routeMatchList.innerHTML = '';
    destinationMatchList.innerHTML = '';
    
    // Display route matches
    if (matches.route_matches.length > 0) {
        matches.route_matches.forEach((match: Match) => {
            const card = createMatchCard(match);
            routeMatchList.appendChild(card);
        });
    } else {
        routeMatchList.innerHTML = '<div class="no-results">No travelers found on the same route yet</div>';
    }
    
    // Display destination matches
    if (matches.destination_matches.length > 0) {
        matches.destination_matches.forEach((match: Match) => {
            const card = createMatchCard(match);
            destinationMatchList.appendChild(card);
        });
    } else {
        destinationMatchList.innerHTML = '<div class="no-results">No travelers found at the same destination yet</div>';
    }
    
    matchesSection.style.display = 'block';
}

// Create match card element
function createMatchCard(match: Match): HTMLDivElement {
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
async function createItinerary(travelerId: number, routeId: number): Promise<void> {
    try {
        const requestBody: ItineraryRequest = {
            traveler_id: travelerId,
            route_id: routeId
        };
        
        const response = await fetch('/api/itinerary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ItineraryResponse = await response.json();
        alert('✅ Route selected! Itinerary saved successfully.');
        
    } catch (error) {
        console.error('Error creating itinerary:', error);
        alert('Failed to save itinerary. Please try again.');
    }
}
