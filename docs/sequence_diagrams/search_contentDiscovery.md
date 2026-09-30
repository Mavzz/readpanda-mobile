---
config:
  theme: redux-dark-color
---
sequenceDiagram
    autonumber
    box rgba(60,60,60,0.1) React Native App
      participant User
      participant SearchBar as "Search Bar"
      participant HomeScreen as "Home Screen"
      participant FavoritesScreen as "Favorites Screen"
      participant Storage as "Local Storage"
    end
    box rgba(82,53,88,0.12) Backend Services
      participant SearchAPI as "Search API"
      participant RecommendationAPI as "ML Recommendation Service"
      participant UserAPI as "User Preferences API"
      participant Analytics as "Search Analytics"
    end
    
    User->>SearchBar: Enter search query
    SearchBar->>Storage: Check recent searches
    Storage-->>SearchBar: Return cached results
    SearchBar->>SearchAPI: Send search request
    SearchAPI->>Analytics: Log search query
    SearchAPI-->>SearchBar: Return search results
    User->>HomeScreen: View recommended content
    HomeScreen->>UserAPI: Get user preferences
    UserAPI->>RecommendationAPI: Request personalized content
    RecommendationAPI-->>HomeScreen: Return recommendations
    User->>FavoritesScreen: Add to favorites
    FavoritesScreen->>UserAPI: Update user preferences
    UserAPI->>RecommendationAPI: Update recommendation model