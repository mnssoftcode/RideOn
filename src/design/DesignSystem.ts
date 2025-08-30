import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

// Modern Minimal Color Palette
export const Colors = {
  // Primary Colors
  primary: '#000000',           // Pure Black
  secondary: '#1A1A1A',         // Light Black
  accent: '#2D2D2D',            // Dark Gray
  
  // Background Colors
  background: '#FFFFFF',        // Pure White
  surface: '#F8F9FA',           // Ghost White
  card: '#FFFFFF',              // Card Background
  
  // Text Colors
  textPrimary: '#000000',       // Primary Text
  textSecondary: '#6C757D',     // Secondary Text
  textTertiary: '#ADB5BD',      // Tertiary Text
  textInverse: '#FFFFFF',       // Text on dark backgrounds
  
  // Status Colors
  success: '#28A745',           // Success Green
  warning: '#FFC107',           // Warning Yellow
  error: '#DC3545',             // Error Red
  info: '#17A2B8',              // Info Blue
  
  // Border & Divider Colors
  border: '#E9ECEF',            // Light Border
  divider: '#F1F3F4',           // Subtle Divider
  
  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal Overlay
  shadow: 'rgba(0, 0, 0, 0.1)',  // Shadow Color
};

// Typography Scale
export const Typography = {
  // Font Sizes
  xs: moderateScale(10),
  sm: moderateScale(12),
  base: moderateScale(14),
  lg: moderateScale(16),
  xl: moderateScale(18),
  '2xl': moderateScale(20),
  '3xl': moderateScale(24),
  '4xl': moderateScale(28),
  '5xl': moderateScale(32),
  
  // Font Weights
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  
  // Line Heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

// Spacing Scale
export const Spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  '2xl': scale(24),
  '3xl': scale(32),
  '4xl': scale(40),
  '5xl': scale(48),
  '6xl': scale(64),
};

// Border Radius
export const BorderRadius = {
  none: 0,
  sm: moderateScale(4),
  md: moderateScale(8),
  lg: moderateScale(12),
  xl: moderateScale(16),
  '2xl': moderateScale(20),
  '3xl': moderateScale(24),
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Layout Constants
export const Layout = {
  // Screen Padding
  screenPadding: Spacing.lg,
  
  // Header Heights
  headerHeight: verticalScale(60),
  tabBarHeight: verticalScale(80),
  
  // Card Dimensions
  cardPadding: Spacing.lg,
  cardMargin: Spacing.md,
  
  // Button Heights
  buttonHeight: verticalScale(48),
  buttonHeightSmall: verticalScale(40),
  
  // Input Heights
  inputHeight: verticalScale(48),
  
  // Avatar Sizes
  avatarSmall: scale(32),
  avatarMedium: scale(48),
  avatarLarge: scale(80),
  avatarXLarge: scale(120),
};

// Common Styles
export const CommonStyles = {
  // Screen Container
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Safe Area Container
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Header
  header: {
    backgroundColor: Colors.background,
    paddingTop: verticalScale(10),
    paddingBottom: Spacing.lg,
    paddingHorizontal: Layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Layout.cardPadding,
    marginBottom: Layout.cardMargin,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  
  // Button Base
  buttonBase: {
    height: Layout.buttonHeight,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    ...Shadows.sm,
  },
  
  // Primary Button
  buttonPrimary: {
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  
  // Secondary Button
  buttonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  
  // Text Button
  buttonText: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...Shadows.none,
  },
  
  // Input Base
  inputBase: {
    height: Layout.inputHeight,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  
  // Text Styles
  textPrimary: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: Typography.normal,
  },
  
  textSecondary: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: Typography.normal,
  },
  
  textHeading: {
    fontSize: Typography['2xl'],
    color: Colors.textPrimary,
    fontWeight: Typography.bold,
  },
  
  textSubheading: {
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    fontWeight: Typography.semibold,
  },
  
  textCaption: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    fontWeight: Typography.normal,
  },
};

// Responsive Helpers
export const Responsive = {
  scale,
  verticalScale,
  moderateScale,
  
  // Screen Dimensions
  screenWidth: scale(375), // Base width
  screenHeight: verticalScale(812), // Base height
  
  // Responsive Padding
  padding: (size: number) => scale(size),
  paddingVertical: (size: number) => verticalScale(size),
  paddingHorizontal: (size: number) => scale(size),
  
  // Responsive Margin
  margin: (size: number) => scale(size),
  marginVertical: (size: number) => verticalScale(size),
  marginHorizontal: (size: number) => scale(size),
  
  // Responsive Font Size
  fontSize: (size: number) => moderateScale(size),
  
  // Responsive Border Radius
  borderRadius: (size: number) => moderateScale(size),
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
  CommonStyles,
  Responsive,
};
