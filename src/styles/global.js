import { Platform, StyleSheet } from 'react-native';

const WEB_FONT_STACK =
  'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

const MyTheme = {
  dark: false,
  colors: {
    primary: 'rgb(17, 214, 145)',
    background: 'rgb(242, 242, 242)',
    card: 'rgb(255, 255, 255)',
    text: 'rgb(28, 28, 30)',
    border: 'rgb(199, 199, 204)',
    notification: 'rgb(255, 69, 58)',
  },
  fonts: Platform.select({
    web: {
      regular: {
        fontFamily: WEB_FONT_STACK,
        fontWeight: '400',
      },
      medium: {
        fontFamily: WEB_FONT_STACK,
        fontWeight: '500',
      },
      bold: {
        fontFamily: WEB_FONT_STACK,
        fontWeight: '600',
      },
      heavy: {
        fontFamily: WEB_FONT_STACK,
        fontWeight: '700',
      },
    },
    ios: {
      regular: {
        fontFamily: 'System',
        fontWeight: '200',
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '300',
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '400',
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '500',
      },
    },
    default: {
      regular: {
        fontFamily: 'sans-serif',
        fontWeight: 'normal',
      },
      medium: {
        fontFamily: 'sans-serif-medium',
        fontWeight: 'normal',
      },
      bold: {
        fontFamily: 'sans-serif',
        fontWeight: '600',
      },
      heavy: {
        fontFamily: 'sans-serif',
        fontWeight: '700',
      },
    },
  }),
};

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 50,
  },
  mainTitletext: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B0000',
    marginBottom: 10,
  },
  signUpText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#2e7d32',
    //marginTop: 10,
  },
  title: {
    fontSize: 16,
    color: '#333',
    //marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  loginButton: {
    backgroundColor: '#6a1b1a',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 30,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  orText: {
    marginHorizontal: 10,
    color: '#555',
  },
  ssoButton: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ssoButtonText: {
    fontSize: 16,
    color: '#111',
  },
});

const cardStyles = StyleSheet.create({
  // Grid Book Card styles (for Home Screen grid layout)
  gridBookCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    height: 280, // Fixed height for uniformity
    flex: 1, // Takes equal width in 2-column layout
    justifyContent: 'space-between',
  },
  gridBookCover: {
    width: '100%',
    height: 180, // Fixed height
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  gridCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Ensures uniform scaling
  },
  gridBookInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  gridBookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
    minHeight: 36, // Space for 2 lines
  },
  gridBookAuthor: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 16, // Fixed height for author
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 16,
  },
  gridPlaceholderIcon: {
    fontSize: 32,
    color: '#999',
    marginBottom: 8,
  },
  gridPlaceholderTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },

  // List Book Card styles (for other layouts)
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#f5f5f5',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
    lineHeight: 20,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },

  // Generic styles
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
  },
  imageContainer: {
    borderRadius: 8,
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
    color: '#333',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Error states (no loading states)
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
  },
  bookCoverPlaceholder: {
    backgroundColor: '#e8e8e8',
  },
  placeholderText: {
    fontSize: 24,
    marginBottom: 4,
  },
  placeholderIcon: {
    fontSize: 20,
    color: '#999',
  },
  placeholderTitle: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Progress indicator
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '500',
  },
});

// Uniform screen styles for consistency across the app
const screenStyles = StyleSheet.create({
  // Screen containers
  screenContainer: {
    flex: 1,
    backgroundColor: MyTheme.colors.background,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },

  // Typography hierarchy
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: MyTheme.colors.text,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: MyTheme.colors.text,
    marginBottom: 16,
    marginTop: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: MyTheme.colors.text,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 16,
    color: MyTheme.colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  captionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Common UI elements
  section: {
    backgroundColor: MyTheme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: MyTheme.colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: MyTheme.colors.border,
    marginVertical: 20,
  },

  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: MyTheme.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    flexWrap: 'wrap',
    flexDirection: 'column',
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
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
    color: MyTheme.colors.notification,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },

  // Buttons
  primaryButton: {
    backgroundColor: MyTheme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: MyTheme.colors.primary,
    marginVertical: 8,
  },
  secondaryButtonText: {
    color: MyTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export { MyTheme, loginStyles, cardStyles, screenStyles };