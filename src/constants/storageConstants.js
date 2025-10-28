// Storage strategy for different data types

export const STORAGE_CATEGORIES = {
  // MMKV - Fast access, simple data
  MMKV: {
    // User session & auth
    AUTH_TOKEN: 'auth_token',
    USER_PROFILE: 'user_profile',
    REFRESH_TOKEN: 'refresh_token',
    
    // App settings
    THEME_PREFERENCE: 'theme_preference',
    FONT_SIZE: 'font_size',
    READING_MODE: 'reading_mode',
    
    // Cache
    API_CACHE: 'api_cache',
    RECENT_SEARCHES: 'recent_searches',
    LAST_READ_POSITION: 'last_read_position',
    
    // App state
    CURRENT_MANUSCRIPT: 'current_manuscript',
    NAVIGATION_STATE: 'navigation_state',
  },
  
  // SQLite - Complex queries, relationships
  SQLITE: {
    MANUSCRIPTS: 'manuscripts',
    READING_ROOMS: 'reading_rooms',
    NOTIFICATIONS: 'notifications',
    USER_PREFERENCES: 'user_preferences',
    READING_HISTORY: 'reading_history',
  }
};