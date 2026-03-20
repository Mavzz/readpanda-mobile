import { Platform, StyleSheet } from 'react-native';

// ─── Nocturnal Sanctuary Design Tokens ──────────────────────────────────────

export const DS = {
  colors: {
    // Surface hierarchy (Level 0 → highest)
    background: '#0b1326',
    surface: '#0b1326',
    surfaceContainerLowest: '#060d20',
    surfaceContainerLow: '#131b2e',
    surfaceContainer: '#171f33',
    surfaceContainerHigh: '#222a3e',
    surfaceContainerHighest: '#2d3654',

    // Brand / accent
    primary: '#ffddb8',
    primaryContainer: '#ffb95f',
    onPrimary: '#472a00',

    // Secondary (gradient partner)
    secondary: '#e8c49a',

    // Text hierarchy
    onSurface: '#dae2fd',   // tertiary – main/display text
    onSurfaceVariant: '#d6c3b2',   // metadata, labels

    // Ghost border (use at 15% opacity)
    outlineVariant: '#514537',

    // Glassmorphism surface (surfaceContainer at 70% opacity = B3 in hex)
    surfaceContainerGlass: '#171f33B3',

    // Error / notification
    error: '#ffb4ab',
  },

  radius: {
    sm: 12,
    md: 24,
    lg: 32,
    xl: 48,
    full: 9999,
  },

  spacing: {
    4: 4,
    8: 8,
    12: 12,
    16: 16,
    20: 20,
    24: 24,
    32: 32,
    40: 40,
    48: 48,
    64: 64,
  },
};

// ─── React Navigation theme ──────────────────────────────────────────────────

const MyTheme = {
  dark: true,
  colors: {
    primary: DS.colors.primary,
    background: DS.colors.background,
    card: DS.colors.surfaceContainerLow,
    text: DS.colors.onSurface,
    border: 'transparent',
    notification: DS.colors.error,
  },
  fonts: Platform.select({
    ios: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '600' },
      heavy: { fontFamily: 'System', fontWeight: '700' },
    },
    default: {
      regular: { fontFamily: 'sans-serif', fontWeight: 'normal' },
      medium: { fontFamily: 'sans-serif-medium', fontWeight: 'normal' },
      bold: { fontFamily: 'sans-serif', fontWeight: '600' },
      heavy: { fontFamily: 'sans-serif', fontWeight: '700' },
    },
  }),
};

// ─── Login / Auth screen styles ───────────────────────────────────────────────

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  mainTitletext: {
    fontSize: 32,
    fontWeight: '700',
    color: DS.colors.onSurface,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  signUpText: {
    fontSize: 15,
    color: DS.colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    color: DS.colors.onSurfaceVariant,
  },
  // Sunken input fields
  input: {
    backgroundColor: DS.colors.surfaceContainerLowest,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: DS.radius.md,
    fontSize: 16,
    marginBottom: 16,
    color: DS.colors.onSurface,
  },
  // Primary button placeholder (real gradient lives in Button.js)
  loginButton: {
    paddingVertical: 16,
    borderRadius: DS.radius.full,
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  loginButtonText: {
    color: DS.colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: DS.colors.outlineVariant,
    opacity: 0.3,
  },
  orText: {
    marginHorizontal: 12,
    color: DS.colors.onSurfaceVariant,
    fontSize: 14,
  },
  ssoButton: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    paddingVertical: 16,
    borderRadius: DS.radius.full,
    alignItems: 'center',
  },
  ssoButtonText: {
    fontSize: 15,
    color: DS.colors.primary,
    fontWeight: '600',
  },
});

// ─── Card styles ──────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  // Grid Book Card
  gridBookCard: {
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.xl,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
    height: 280,
    flex: 1,
    justifyContent: 'space-between',
  },
  gridBookCover: {
    width: '100%',
    height: 180,
    borderRadius: DS.radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  gridCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridBookInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  gridBookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.onSurface,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
    minHeight: 36,
  },
  gridBookAuthor: {
    fontSize: 12,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 16,
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.surfaceContainerHigh,
    padding: 16,
  },
  gridPlaceholderIcon: {
    fontSize: 32,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  gridPlaceholderTitle: {
    fontSize: 12,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },

  // List Book Card
  bookCard: {
    flexDirection: 'row',
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 4,
    alignItems: 'center',
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: DS.radius.sm,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.colors.onSurface,
    marginBottom: 4,
    lineHeight: 20,
  },
  bookAuthor: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 8,
  },

  // Generic card
  container: {
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    padding: 12,
    margin: 8,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 3,
    minWidth: 120,
  },
  imageContainer: {
    borderRadius: DS.radius.sm,
    overflow: 'hidden',
    marginBottom: 8,
    aspectRatio: 3 / 4,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.onSurface,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Error / placeholder states
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.surfaceContainerHigh,
    padding: 8,
  },
  bookCoverPlaceholder: {
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  placeholderText: {
    fontSize: 24,
    marginBottom: 4,
  },
  placeholderIcon: {
    fontSize: 20,
    color: DS.colors.onSurfaceVariant,
  },
  placeholderTitle: {
    fontSize: 10,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Progress bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderRadius: DS.radius.full,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: DS.colors.primary,
    borderRadius: DS.radius.full,
  },
  progressText: {
    fontSize: 11,
    color: DS.colors.onSurfaceVariant,
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '500',
  },
});

// ─── Shared screen styles ─────────────────────────────────────────────────────

const screenStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },

  // Typography
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: DS.colors.onSurface,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: DS.colors.onSurface,
    marginBottom: 16,
    marginTop: 24,
    letterSpacing: -0.2,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.colors.onSurface,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 16,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 24,
    marginBottom: 12,
  },
  captionText: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 24,
  },

  // Section card (no border – tonal layering only)
  section: {
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.xl,
    padding: 20,
    marginBottom: 16,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 4,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: DS.colors.onSurfaceVariant,
    marginTop: 16,
    textAlign: 'center',
  },

  // Empty states
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: DS.colors.onSurfaceVariant,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    flexWrap: 'wrap',
    flexDirection: 'column',
    fontSize: 16,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.7,
  },

  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: DS.colors.error,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },

  // Buttons (gradient lives in Button.js; these are fallback plain styles)
  primaryButton: {
    backgroundColor: DS.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: DS.radius.full,
    alignItems: 'center',
    marginVertical: 8,
  },
  primaryButtonText: {
    color: DS.colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: DS.radius.full,
    alignItems: 'center',
    marginVertical: 8,
  },
  secondaryButtonText: {
    color: DS.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export { MyTheme, loginStyles, cardStyles, screenStyles };