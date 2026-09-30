# Graph Report - readpanda-mobile  (2026-09-23)

## Corpus Check
- 172 files · ~178,803 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 38 file(s) not represented in the graph (top: .ttf 10, .xml 5, .mmd 4)

## Summary
- 1135 nodes · 2540 edges · 71 communities (58 shown, 13 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 170 edges (avg confidence: 0.87)
- Token cost: 300,138 input · 0 output

## Community Hubs (Navigation)
- iOS Comment Sheet UI
- Design Review HTML Harness
- Shared UI Components
- App Dependency Manifest
- Bucket and Picker Screens
- Reader Chrome Header
- SQLite Storage Service
- Auth Screens and Context
- Notification UI Components
- Package Metadata
- Android Google Sign-In Bridge
- iOS App Delegate Bootstrap
- Zustand Stores and Services
- PDF Comment Overlay
- API Request Test Helpers
- Reader Design Tokens
- Navigation Stacks and Cards
- Android Icon Asset Ladder
- Comments Service and Store
- Reading Progress Sync
- API Retry Service
- iOS App Icon Set
- Deep Link Navigation
- Error Handling and Retry Flow
- PDF Viewer Native Bridge
- PDF Caching and Rooms
- Build Scripts
- Notification Storage Utils
- Comment Anchoring Design
- Comment and Design Rules
- Nocturnal Sanctuary Design System
- Onboarding and Discovery Flow
- Brand and Scaffold Assets
- Comment Sheet State Machine
- PDF Highlight Rendering
- Push Notification Delivery
- Auth Token Conventions
- HTTP Hooks and Logging
- Commentable PDF View
- Token Lifecycle Security
- Android Main Activity
- App Entry Point
- PDF Document Loading
- Design Review Findings
- PDF Selection Anchoring
- First-Run Recommendations
- Auth API Client
- Architecture Patterns
- Toaster Patch Component
- Reader Status View
- Google Auth Service
- CI Build Pipeline
- Tab IA and Nav Fixes
- Metro Bundler Config
- Dev Dependencies
- Search and Analytics
- ESLint Config
- Storage Backends
- Gradle Wrapper Script
- Gutter Scroll Tracking
- Repository Metadata
- Onboarding Permissions
- Dependency Resolutions

## God Nodes (most connected - your core abstractions)
1. `RNPdfView` - 71 edges
2. `react-native` - 47 edges
3. `log` - 46 edges
4. `CommentSheetView` - 43 edges
5. `react` - 35 edges
6. `DS` - 34 edges
7. `getBackendUrl()` - 33 edges
8. `useReadingProgressStore` - 26 edges
9. `EnhancedStorage` - 26 edges
10. `ReaderHeaderView` - 25 edges

## Surprising Connections (you probably didn't know these)
- `CI .env Generation from Secrets` --semantically_similar_to--> `API_URL Environment Configuration`  [INFERRED] [semantically similar]
  .github/workflows/xcode-build-analyze.yml → RUN.md
- `AsyncStorage Token Persistence` --conceptually_related_to--> `Hybrid Storage Strategy (MMKV + SQLite)`  [AMBIGUOUS]
  TECHNICAL_DOCUMENTATION.md → .github/copilot-instructions.md
- `Navigation Architecture (AuthStack / MainTabs)` --semantically_similar_to--> `AuthContext Conditional Navigation Gate`  [INFERRED] [semantically similar]
  TECHNICAL_DOCUMENTATION.md → .github/copilot-instructions.md
- `apiService Centralized Retry Layer` --semantically_similar_to--> `Centralized Axios Instance with Auth Interceptor`  [INFERRED] [semantically similar]
  API_RETRY_DOCUMENTATION.md → TECHNICAL_DOCUMENTATION.md
- `No Inbound Path for Comments` --conceptually_related_to--> `apiService Centralized Retry Layer`  [INFERRED]
  docs/diagrams/README.md → API_RETRY_DOCUMENTATION.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Token Refresh and Retry Flow** — api_retry_documentation_apiservice, api_retry_documentation_authenticatedrequests, api_retry_documentation_token_refresh_flow, api_retry_documentation_concurrent_refresh_guard, api_retry_documentation_refreshtoken_authcontext, api_retry_documentation_error_classification, api_retry_documentation_http_service_hooks [EXTRACTED 1.00]
- **Nocturnal Sanctuary Rule Set** — design_no_line_rule, design_surface_hierarchy, design_glass_and_gradient_rule, design_manrope_typography, design_tonal_elevation, design_radius_floor, design_ghost_border_fallback [EXTRACTED 1.00]
- **Spoiler-Free Comment Unlock Pipeline** — comments_6a_6b_spoiler_rule, comments_6a_6b_comment_model, comments_6a_6b_gutter_dots, comments_6a_6b_scrubber_ticks, design_handoff_redesign_readme_unlocked_selector, design_handoff_redesign_readme_reading_tab, readme_readpanda_product_concept [INFERRED 0.85]
- **Token Refresh and Revocation Flow** — sequence_diagrams_token_management_flow_http_interceptor, sequence_diagrams_token_management_flow_auth_controller, sequence_diagrams_token_management_flow_refresh_token_store, sequence_diagrams_token_management_flow_revoked_token_handler, sequence_diagrams_token_management_flow_logout_handler, sequence_diagrams_token_management_flow_secure_storage [EXTRACTED 1.00]
- **Push Notification Delivery Pipeline** — sequence_diagrams_push_notification_flow_notification_api, sequence_diagrams_push_notification_flow_firebase_cloud_messaging, sequence_diagrams_push_notification_flow_notification_service, sequence_diagrams_push_notification_flow_notification_list, sequence_diagrams_push_notification_flow_navigation_service, sequence_diagrams_push_notification_flow_analytics_service [EXTRACTED 1.00]
- **Offline-First Resilience Pattern** — sequence_diagrams_pdf_processing_cache_manager, sequence_diagrams_pdf_processing_offline_first_caching, sequence_diagrams_pdf_processing_deferred_progress_sync, sequence_diagrams_error_handlingrecovery_offline_retry_queue, sequence_diagrams_search_contentdiscovery_cached_recent_searches, sequence_diagrams_token_management_flow_network_error_prompt [INFERRED 0.75]
- **ReadPanda panda logo rendered across all five Android density buckets** — android_app_src_main_res_drawable_mdpi_logo_logo, android_app_src_main_res_drawable_hdpi_logo_logo, android_app_src_main_res_drawable_xhdpi_logo_logo, android_app_src_main_res_drawable_xxhdpi_logo_logo, android_app_src_main_res_drawable_xxxhdpi_logo_logo, android_app_src_main_res_drawable_mdpi_logo_density_bucket_ladder [INFERRED 0.95]
- **Default Android launcher icon set (square + round, all densities)** — android_app_src_main_res_mipmap_mdpi_ic_launcher_ic_launcher, android_app_src_main_res_mipmap_hdpi_ic_launcher_ic_launcher, android_app_src_main_res_mipmap_xhdpi_ic_launcher_ic_launcher, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_ic_launcher, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_ic_launcher, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_ic_launcher_round, android_app_src_main_res_mipmap_hdpi_ic_launcher_round_ic_launcher_round, android_app_src_main_res_mipmap_xhdpi_ic_launcher_round_ic_launcher_round, android_app_src_main_res_mipmap_xxhdpi_ic_launcher_round_ic_launcher_round, android_app_src_main_res_mipmap_xxxhdpi_ic_launcher_round_ic_launcher_round, android_app_src_main_res_mipmap_mdpi_ic_launcher_round_adaptive_icon_shape_masking [INFERRED 0.95]
- **iOS AppIcon Size Ladder (20/29/40/60pt at 2x and 3x plus marketing)** — ios_readpanda_images_xcassets_appicon_appiconset_40_appicon_20pt_2x, ios_readpanda_images_xcassets_appicon_appiconset_60_appicon_20pt_3x, ios_readpanda_images_xcassets_appicon_appiconset_58_appicon_29pt_2x, ios_readpanda_images_xcassets_appicon_appiconset_87_appicon_29pt_3x, ios_readpanda_images_xcassets_appicon_appiconset_80_appicon_40pt_2x, ios_readpanda_images_xcassets_appicon_appiconset_120_appicon_40pt_3x, ios_readpanda_images_xcassets_appicon_appiconset_120_1_appicon_60pt_2x, ios_readpanda_images_xcassets_appicon_appiconset_180_appicon_60pt_3x, ios_readpanda_images_xcassets_appicon_appiconset_1024_appicon_marketing [EXTRACTED 1.00]
- **Universal Splash Logo Scale Set (1x/2x/3x)** — ios_readpanda_images_xcassets_splash_imageset_logo_splash_logo_1x, ios_readpanda_images_xcassets_splash_imageset_logo_2x_splash_logo_2x, ios_readpanda_images_xcassets_splash_imageset_logo_3x_splash_logo_3x, ios_readpanda_images_xcassets_splash_imageset_logo_splash_launch_mark [EXTRACTED 1.00]
- **ReadPanda Visual Brand System (icon, splash, night-reading concept)** — ios_readpanda_images_xcassets_appicon_appiconset_1024_brand_identity, ios_readpanda_images_xcassets_splash_imageset_logo_splash_launch_mark, ios_readpanda_images_xcassets_appicon_appiconset_1024_appicon_marketing, ios_readpanda_images_xcassets_splash_imageset_logo_3x_splash_logo_3x [INFERRED 0.85]
- **Dark Cozy-Reading Brand Asset Family** — src_assets_readpandalogo_new_logo, design_handoff_redesign_assets_readpandalogo_new_logo, src_assets_splashlogo_logo, src_assets_readpandalogo_new_cozy_reading_brand_identity [INFERRED 0.85]
- **Superseded Pastel Kawaii Brand Assets** — src_assets_readpandalogo_legacy_logo, src_assets_readpandasplash_splash, src_assets_readpandalogo_new_cozy_reading_brand_identity [INFERRED 0.75]
- **Expo Template Placeholder Assets Never Replaced** — src_assets_icon_placeholder, src_assets_adaptive_icon_placeholder, src_assets_splash_placeholder, src_assets_favicon_placeholder, src_assets_icon_unreplaced_expo_scaffold_assets [INFERRED 0.85]

## Communities (71 total, 13 thin omitted)

### Community 0 - "iOS Comment Sheet UI"
Cohesion: 0.05
Nodes (40): Double, Foundation, AvatarView, CommentRowView, CommentSheetDelegate, CommentSheetView, .isOpen, Bool (+32 more)

### Community 1 - "Design Review HTML Harness"
Cohesion: 0.06
Nodes (75): boot(), bundledBlob(), cdnScriptFor(), collectProps(), compileAttr(), compileTemplate(), contentKey(), createComponentFactory() (+67 more)

### Community 2 - "Shared UI Components"
Cohesion: 0.09
Nodes (35): react-native, react-native-linear-gradient, BookCoverGradient(), styles, BucketTile(), styles, CommentRow(), CommentThreadSheet() (+27 more)

### Community 3 - "App Dependency Manifest"
Cohesion: 0.04
Nodes (47): StandaloneRoot(), dependencies, axios, @bottom-tabs/react-navigation, crypto-js, eslint-plugin-react-hooks, eslint-plugin-react-native, react (+39 more)

### Community 4 - "Bucket and Picker Screens"
Cohesion: 0.10
Nodes (34): react-native-vector-icons, PickerSheet(), styles, showToast(), toastConfig, Toaster(), styles, UserBuckets() (+26 more)

### Community 5 - "Reader Chrome Header"
Cohesion: 0.08
Nodes (20): AnyObject, ReaderHeaderDelegate, ReaderHeaderView, .showsComment, .title, .unreadCount, ReaderScrubberView, .commentPages (+12 more)

### Community 7 - "Auth Screens and Context"
Cohesion: 0.13
Nodes (25): react, src_assets_readpandalogo_new, primaryButton(), ssoButton(), styles, AuthContext, useAuth(), Login() (+17 more)

### Community 8 - "Notification UI Components"
Cohesion: 0.09
Nodes (23): react-native-elements, ref_services_api, Background(), styles, NotificationBadge(), styles, iconButton(), styles (+15 more)

### Community 9 - "Package Metadata"
Cohesion: 0.06
Nodes (33): author, description, license, main, name, private, version, axios (+25 more)

### Community 10 - "Android Google Sign-In Bridge"
Cohesion: 0.08
Nodes (25): activity, GoogleSignInModule, GoogleSignInPackage, MainApplication, Application, CoroutineContext, CoroutineScope, credentialmanager (+17 more)

### Community 11 - "iOS App Delegate Bootstrap"
Cohesion: 0.08
Nodes (24): Firebase, AppDelegate, ReactNativeDelegate, Any, Bool, URL, <RNAppAuthAuthorizationFlowManager>, <RNAppAuthAuthorizationFlowManagerDelegate> (+16 more)

### Community 12 - "Zustand Stores and Services"
Cohesion: 0.17
Nodes (8): zustand, STORAGE_CATEGORIES, styles, NotificationService, useMessageStore, useNotificationStore, defaultConfig, log

### Community 13 - "PDF Comment Overlay"
Cohesion: 0.12
Nodes (16): DispatchWorkItem, RNPdfView, .bookTitle, .hasRoom, .lockedCount, .roomName, .submitting, .threads (+8 more)

### Community 14 - "API Request Test Helpers"
Cohesion: 0.16
Nodes (14): AUTH_ERRORS, testAuthenticatedRequest(), testLoginFlow(), testPublicDataRequest(), testSignupFlow(), loginRequest, makeAuthenticatedGetRequest(), makePublicPostRequest() (+6 more)

### Community 15 - "Reader Design Tokens"
Cohesion: 0.19
Nodes (13): CGSize, Colors, DS, Fonts, Radius, readerGradientImage(), CGFloat, CGPoint (+5 more)

### Community 16 - "Navigation Stacks and Cards"
Cohesion: 0.11
Nodes (15): react-native-reanimated, react-native-safe-area-context, AnimatedPressable, AnimatedTouchableOpacity, NewBookCard(), headerLeftBack(), MainStackNavigator(), Stack (+7 more)

### Community 17 - "Android Icon Asset Ladder"
Cohesion: 0.12
Nodes (19): ReadPanda Panda Logo (hdpi, 146x141), Android Density Bucket Asset Ladder, ReadPanda Panda Logo (mdpi, 97x94), ReadPanda Panda Logo (xhdpi, 195x188), ReadPanda Panda Logo (xxhdpi, 292x282), ReadPanda Panda Logo (xxxhdpi, 390x377, master), ReadPanda Panda Brand Mark, Default Android Launcher Icon (hdpi, 72x72) (+11 more)

### Community 18 - "Comments Service and Store"
Cohesion: 0.27
Nodes (15): makeAuthenticatedPostRequest(), createComment(), fetchBookComments(), likeComment(), markCommentsRead(), unlikeComment(), commentIdsIn(), countUnread() (+7 more)

### Community 19 - "Reading Progress Sync"
Cohesion: 0.25
Nodes (15): makeAuthenticatedPutRequest(), fetchRoomProgress(), putReadingProgress(), belongsToRoom(), bookIdOf(), memberProgressFor(), roomBookOf(), roomMemberProgress() (+7 more)

### Community 21 - "iOS App Icon Set"
Cohesion: 0.16
Nodes (15): App Icon 1024 (App Store Marketing), Cozy Night Reading Brand Identity, App Icon 120 (60pt @2x, duplicate file), Duplicate-File-Per-Icon-Slot Workaround, App Icon 120 (40pt @3x), App Icon 180 (60pt @3x), App Icon 40 (20pt @2x, notification), App Icon 58 (29pt @2x, settings) (+7 more)

### Community 22 - "Deep Link Navigation"
Cohesion: 0.21
Nodes (12): @react-navigation/native, @react-navigation/stack, INVITE_LINK_RE, parseInviteCode(), useInviteDeepLink(), AppContent(), linking, navigationRef (+4 more)

### Community 23 - "Error Handling and Retry Flow"
Cohesion: 0.16
Nodes (15): App Component (Error Handling), Backend API (Error Path), Error Boundary, Error Fallback UI, Local Storage (Error Cache), Logger Service, Offline Retry Queue, Offline-First PDF Caching (+7 more)

### Community 24 - "PDF Viewer Native Bridge"
Cohesion: 0.16
Nodes (9): CryptoKit, PassthroughView, RCT_EXTERN_MODULE, RNPdfViewerManager, CGPoint, UIView, PDFKit, RCTViewManager (+1 more)

### Community 25 - "PDF Caching and Rooms"
Cohesion: 0.16
Nodes (14): Cache Manager, Content Delivery Network, Deferred Reading Progress Sync, Local Storage (PDF Cache), PDF Processing Service, PDF Viewer, Current Read Screen, Join Room Screen (+6 more)

### Community 26 - "Build Scripts"
Cohesion: 0.15
Nodes (13): scripts, android, clean, clean:all, ios, lint, lint:check, lint:fix (+5 more)

### Community 27 - "Notification Storage Utils"
Cohesion: 0.26
Nodes (10): @react-native-async-storage/async-storage, checkNotificationPermission(), getNotifications(), getUnreadCount(), markNotificationAsRead(), NotificationType, saveNotification(), getNotificationCount() (+2 more)

### Community 28 - "Comment Anchoring Design"
Cohesion: 0.18
Nodes (12): Exponential Backoff Policy, Comment Composer Entry Points, File-Hash Comment Keying, Gutter Dot Clusters, UIKit Overlay over PDFAnnotation Subclass, Passage Anchor (pageIndex / selectionString / bounds), 6b Thread Bottom Sheet, Annotation Pop-ups (+4 more)

### Community 29 - "Comment and Design Rules"
Cohesion: 0.20
Nodes (12): Comment Data Model, Scrubber Comment Ticks, Spoiler Unlock Rule, Glass and Gradient Rule, Hex to DS Token Mapping, Glass Tab Bar, 1b Reading Tab, Unlocked Comment Selector (+4 more)

### Community 30 - "Nocturnal Sanctuary Design System"
Cohesion: 0.24
Nodes (12): The Digital Curator North Star, Ghost Border Fallback, Knockout Ring Border Exemption, No-Line Rule Patches, Off-Palette Color Patches, 1d Login Redesign, Redesign Handoff 1a-1d, System Adherence Findings (+4 more)

### Community 31 - "Onboarding and Discovery Flow"
Cohesion: 0.20
Nodes (12): Auth API, Email Verification Service, Interest Selection Screen, Sign Up Screen, User Preferences API (Onboarding), Content API, Home Screen (Manuscript Selection), Favorites Screen (+4 more)

### Community 32 - "Brand and Scaffold Assets"
Cohesion: 0.24
Nodes (11): Design Handoff Copy of ReadPanda Primary Logo, Expo Default Android Adaptive Icon Placeholder, Expo Default Web Favicon Placeholder, Expo Default App Icon Placeholder, Unreplaced Expo Scaffold Assets, Legacy ReadPanda Logo (Pastel Panda Face), Cozy Night Reading Brand Identity, ReadPanda Primary Logo (Panda Reading Under Blanket) (+3 more)

### Community 33 - "Comment Sheet State Machine"
Cohesion: 0.22
Nodes (7): .openThreadKey, State, empty, failed, loading, ready, String

### Community 34 - "PDF Highlight Rendering"
Cohesion: 0.27
Nodes (3): Bool, UIButton, PDFPage

### Community 35 - "Push Notification Delivery"
Cohesion: 0.27
Nodes (10): App State, Deep Link Routing, Firebase Cloud Messaging, Foreground/Background Delivery Split, Navigation Service, Notification API, Notification List, Notification Service (FCM Client) (+2 more)

### Community 36 - "Auth Token Conventions"
Cohesion: 0.22
Nodes (9): AuthContext Conditional Navigation Gate, Bearer Token Header Convention, readpanda:// Deep Linking Scheme, enhanceedStorage Wrapper Convention, authenticatedRequests Helpers, Concurrent Token Refresh Guard, AuthContext refreshToken(), Automatic Token Refresh on 401/498 (+1 more)

### Community 37 - "HTTP Hooks and Logging"
Cohesion: 0.25
Nodes (9): Logger-over-console Convention, Toaster Service Singleton, apiService Centralized Retry Layer, Retry Error Classification (4xx / 5xx / network), useGet / usePost / usePut HTTP Hooks, AsyncStorage Token Persistence, Centralized Axios Instance with Auth Interceptor, Custom Data-Fetching Hooks (+1 more)

### Community 38 - "Commentable PDF View"
Cohesion: 0.25
Nodes (6): CommentablePDFView, .initialPage, Any, Void, PDFView, Selector

### Community 39 - "Token Lifecycle Security"
Cohesion: 0.39
Nodes (9): Auth Controller, Token Encryption at Rest, Forced Re-Authentication Edge Cases, Login Screen, Logout Handler, Refresh Token Store, Revoked Token Handler, Secure Storage (Token Vault) (+1 more)

### Community 40 - "Android Main Activity"
Cohesion: 0.32
Nodes (5): MainActivity, defaultreactactivitydelegate, fabricenabled, ReactActivity, ReactActivityDelegate

### Community 41 - "App Entry Point"
Cohesion: 0.32
Nodes (6): App(), styles, react-native-splash-screen, AuthProvider(), AppNavigator(), useAuthStore

### Community 42 - "PDF Document Loading"
Cohesion: 0.36
Nodes (4): Data, .pdfDetails, URL, PDFDocument

### Community 44 - "Design Review Findings"
Cohesion: 0.29
Nodes (8): Contrast and Accessibility Findings, Current UI Recreated from Source, ReadPanda Design Review Summary, The Social Gap, ReadPanda Product Concept, API_URL Environment Configuration, Local Development Setup, src/ Project Structure

### Community 46 - "First-Run Recommendations"
Cohesion: 0.50
Nodes (6): useFirstRunRecommendation(), Home(), matches(), seedCollection(), selectedInterests(), topInterest()

### Community 47 - "Auth API Client"
Cohesion: 0.43
Nodes (7): getUserPreferences(), loginUser(), signUpUser(), ssoSignUpUser(), updateUserPreferences(), src_utils_helper_encryptedpassword, getBackendUrl()

### Community 48 - "Architecture Patterns"
Cohesion: 0.29
Nodes (7): Hybrid Storage Strategy (MMKV + SQLite), PDF Reading Native Swift Bridge, ReadPanda Architecture Patterns, 6a Reader Comment Overlay, Room-Scoped Comment Visibility, Runtime-Only PDF Highlight Annotations, Four-Boundary Participant Map

### Community 49 - "Toaster Patch Component"
Cohesion: 0.29
Nodes (3): toastConfig, react-native-toast-message, ref_styles_global

### Community 50 - "Reader Status View"
Cohesion: 0.43
Nodes (3): ReaderStatusView, CGRect, NSCoder

### Community 51 - "Google Auth Service"
Cohesion: 0.29
Nodes (3): react-native-app-auth, googleAuthConfig, GoogleAuthService

### Community 52 - "CI Build Pipeline"
Cohesion: 0.33
Nodes (6): Dynamic Backend URL Detection (getBackendUrl), Xcode Build and Analyze CI Job, CocoaPods Cache Step, CI .env Generation from Secrets, Simulator App Artifact Packaging, Manrope Font Loading Setup

### Community 53 - "Tab IA and Nav Fixes"
Cohesion: 0.33
Nodes (6): Interest Navigation Crash Fix, 1a Home - Tonight, Interest Route Registration Fix, 1c Rooms Tab, Three-Tab IA (Home, Reading, Rooms), Navigation and IA Findings

### Community 54 - "Metro Bundler Config"
Cohesion: 0.33
Nodes (5): config, {getDefaultConfig, mergeConfig}, path, ref_path, @react-native/metro-config

### Community 55 - "Dev Dependencies"
Cohesion: 0.33
Nodes (6): devDependencies, @babel/core, eslint, @eslint/js, eslint-plugin-react, globals

### Community 56 - "Search and Analytics"
Cohesion: 0.33
Nodes (6): Crash Analytics, Analytics Service (Notification Engagement), Cached Recent Searches, Search Analytics, Search API, Search Bar

### Community 57 - "ESLint Config"
Cohesion: 0.40
Nodes (4): @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-native

### Community 58 - "Storage Backends"
Cohesion: 0.40
Nodes (4): ref_env, react-native-mmkv, react-native-sqlite-storage, mmkvStorage

### Community 59 - "Gradle Wrapper Script"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 61 - "Repository Metadata"
Cohesion: 0.50
Nodes (4): repository, directory, type, url

### Community 62 - "Onboarding Permissions"
Cohesion: 0.50
Nodes (4): Auth Context, Deferred Notification Permission Prompt, Notification Service (Permission Request), Secure Storage (Onboarding Status)

## Ambiguous Edges - Review These
- `Hybrid Storage Strategy (MMKV + SQLite)` → `AsyncStorage Token Persistence`  [AMBIGUOUS]
  TECHNICAL_DOCUMENTATION.md · relation: conceptually_related_to
- `Xcode Build and Analyze CI Job` → `Manrope Font Loading Setup`  [AMBIGUOUS]
  .github/workflows/xcode-build-analyze.yml · relation: conceptually_related_to
- `PDF Viewer` → `Current Read Screen`  [AMBIGUOUS]
  sequence_diagrams/room_management.md · relation: conceptually_related_to
- `Cozy Night Reading Brand Identity` → `App Icon 40 (20pt @2x, notification)`  [AMBIGUOUS]
  ios/ReadPanda/Images.xcassets/AppIcon.appiconset/40.png · relation: references
- `Legacy ReadPanda Splash Artwork (Green Bamboo Wordmark)` → `Cozy Night Reading Brand Identity`  [AMBIGUOUS]
  src/assets/readpandaSplash.png · relation: conceptually_related_to

## Knowledge Gaps
- **207 isolated node(s):** `styles`, `toastConfig`, `.isOpen`, `-resumeExternalUserAgentFlowWithURL`, `RCT_EXTERN_MODULE` (+202 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 355 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Hybrid Storage Strategy (MMKV + SQLite)` and `AsyncStorage Token Persistence`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Xcode Build and Analyze CI Job` and `Manrope Font Loading Setup`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `PDF Viewer` and `Current Read Screen`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Cozy Night Reading Brand Identity` and `App Icon 40 (20pt @2x, notification)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Legacy ReadPanda Splash Artwork (Green Bamboo Wordmark)` and `Cozy Night Reading Brand Identity`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react` connect `App Dependency Manifest` to `Design Review HTML Harness`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `dependencies` connect `App Dependency Manifest` to `Package Metadata`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._