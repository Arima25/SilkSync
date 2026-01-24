# SilkSync Mobile App

A React Native mobile application for travel planning along the Silk Road, featuring HSR and flight route search, travel companion matching, and real-time currency exchange.

## Technologies

### Frontend / Mobile
- **React Native** - Cross-platform mobile development
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library
- **Mapbox SDK** - International mapping
- **Amap SDK** - China mapping with coordinate accuracy

### Authentication & Payments
- **Firebase Auth** - Email + social login
- **WeChat Pay** - Deep linking for payments

### Data & Utilities
- **Axios** - REST API communication
- **AsyncStorage** - Offline data caching
- **Currency Exchange API** - Real-time USD ↔ CNY conversion

## Project Structure

```
mobile/
├── src/
│   ├── App.tsx              # Main app with navigation
│   ├── screens/             # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── MapScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/            # API and utility services
│   │   ├── authService.ts   # Firebase authentication
│   │   ├── apiService.ts    # Backend API calls
│   │   ├── currencyService.ts # Currency exchange
│   │   └── mapService.ts    # Map utilities
│   └── types/               # TypeScript definitions
│       └── index.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## Getting Started

### Prerequisites
- Node.js >= 18
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

### Installation

1. Navigate to mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your API keys in `.env`:
   - Firebase credentials
   - Mapbox access token
   - Amap API keys (for China)
   - Exchange rate API key

### Running the App

**Android:**
```bash
npm run android
```

**iOS (macOS only):**
```bash
cd ios && pod install && cd ..
npm run ios
```

## Features

### 🔐 Authentication
- Email/password sign up and sign in
- Password reset via email
- WeChat login integration ready
- Persistent session management

### 🚄 Route Search
- High-Speed Rail (HSR) routes
- Flight search
- Budget filtering with currency toggle
- Real-time pricing

### 🗺️ Maps
- Mapbox for international locations
- Amap for China (better accuracy)
- Automatic provider switching based on location
- GCJ-02 ↔ WGS-84 coordinate conversion

### 💱 Currency Exchange
- Real-time USD ↔ CNY rates
- Offline rate caching
- In-app currency conversion

### 👥 Travel Companions
- Match with travelers on same route
- Match with travelers at same destination
- Contact and connect features

## Environment Variables

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | Backend API URL |
| `FIREBASE_API_KEY` | Firebase API key |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `MAPBOX_ACCESS_TOKEN` | Mapbox access token |
| `AMAP_API_KEY_ANDROID` | Amap Android API key |
| `AMAP_API_KEY_IOS` | Amap iOS API key |
| `EXCHANGE_RATE_API_KEY` | Exchange rate API key |
| `WECHAT_APP_ID` | WeChat app ID for payments |

## Backend API

The mobile app connects to the existing Flask backend. Ensure the backend is running and accessible.

## License

MIT License
