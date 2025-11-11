# MediTrack Pro - Paramedic Inventory Management

## Overview

MediTrack Pro is a cross-platform mobile application built with React Native and Expo for managing paramedic inventory. The application enables paramedics to track medical supplies, equipment, and medications through barcode scanning and manual entry. It provides real-time inventory status monitoring, low stock alerts, and categorized item management across medications, equipment, and supplies.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework: Expo React Native (v54)**
- **Rationale**: Expo provides a unified development experience across iOS, Android, and web platforms with minimal configuration
- **Key Features**:
  - File-based routing using `expo-router` for declarative navigation
  - Tab-based navigation pattern with bottom tabs for main sections (Home, Scan, Inventory)
  - Platform-specific optimizations for iOS and Android
  - Web support enabled through `react-native-web`

**Navigation Structure**
- **Pattern**: Tab-based navigation with three main screens
- **Implementation**: Using `@react-navigation/bottom-tabs` and `expo-router`
- **Screens**:
  - Home: Dashboard with statistics and quick actions
  - Scan: Barcode scanning interface with manual entry fallback
  - Inventory: Full inventory list with category filtering

**State Management**
- **Solution**: React Context API (`InventoryContext`)
- **Rationale**: Lightweight state management suitable for app-wide inventory data without external dependencies
- **Data Structure**: Manages inventory items with properties including ID, name, category, quantity, last scanned date, and status
- **Computed States**: Tracks checked-in items, checked-out items, and low stock counts

**UI/UX Design Patterns**
- **Theming**: Light/dark mode support using `@react-navigation` themes
- **Color Scheme**: Dynamic theme switching based on system preferences
- **Components**:
  - Themed components (`ThemedText`, `ThemedView`) for consistent styling
  - Platform-specific icon rendering (SF Symbols on iOS, Material Icons on Android/web)
  - Haptic feedback on iOS for tab interactions
  - Collapsible components for content organization

**Animations and Interactions**
- **Library**: `react-native-reanimated` for performant animations
- **Use Cases**: 
  - Parallax scroll views
  - Animated transitions
  - Wave animations
  - Platform-specific haptic feedback using `expo-haptics`

### Data Layer

**Local State Management**
- **Type System**: TypeScript with strict mode enabled
- **Data Models**:
  - `InventoryItem`: Core data structure with typed fields
  - `ItemCategory`: Union type for categorization (Medication, Equipment, Supplies)
  - Status tracking: In Stock, Low Stock, Out of Stock
- **Mock Data**: Currently using in-context mock data for development/testing

**Current Data Flow**
- In-memory state managed through React Context
- No persistent storage implementation yet
- Mock data initialized on context provider mount

### Build and Development

**Build Configuration**
- **Platform Support**: iOS, Android, and Web
- **Metro Bundler**: Used for web builds with static output
- **New Architecture**: Enabled (`newArchEnabled: true`) for future React Native features
- **Edge-to-Edge**: Android edge-to-edge display support enabled

**Development Tools**
- TypeScript for type safety
- ESLint with Expo configuration for code quality
- Jest with `jest-expo` for testing framework
- Path aliases configured (`@/*`) for cleaner imports

**Asset Management**
- Custom fonts (SpaceMono)
- Platform-specific icons and splash screens
- Adaptive icons for Android
- SF Symbols integration for iOS

### Platform-Specific Considerations

**iOS**
- SF Symbols for native icon appearance
- Haptic feedback integration
- Blur effects for tab bar background
- Tablet support enabled

**Android**
- Material Icons as fallback
- Adaptive icon support with custom background
- Edge-to-edge display support

**Web**
- Static output generation via Metro
- Hydration-aware color scheme detection
- External link handling with in-app browser on native platforms

## External Dependencies

### Core Expo Modules
- `expo` (v54.0.9): Core Expo SDK
- `expo-router` (~6.0.7): File-based routing system
- `expo-splash-screen`: Splash screen management
- `expo-status-bar`: Status bar customization
- `expo-font`: Custom font loading
- `expo-constants`: App configuration access
- `expo-linking`: Deep linking support
- `expo-system-ui`: System UI customization

### UI and Interaction Libraries
- `@react-navigation/native` (v7.1.6): Navigation framework
- `@react-navigation/bottom-tabs` (v7.3.10): Tab navigation
- `@expo/vector-icons` (v15.0.2): Icon library
- `expo-symbols` (~1.0.7): SF Symbols support (iOS)
- `expo-blur` (~15.0.7): Blur effect component
- `expo-haptics` (~15.0.7): Haptic feedback
- `expo-image` (~3.0.8): Optimized image component

### Animation and Gesture Handling
- `react-native-reanimated` (~4.1.0): High-performance animations
- `react-native-gesture-handler` (~2.28.0): Gesture recognition
- `react-native-worklets` (0.5.1): JavaScript worklets for animations

### Platform Support
- `react-native-web` (^0.21.0): Web platform support
- `react-native-webview` (13.15.0): WebView component
- `react-native-safe-area-context` (~5.6.0): Safe area handling
- `react-native-screens` (~4.16.0): Native screen optimization

### Development Dependencies
- `typescript` (~5.9.2): Type checking
- `eslint` (^9.25.0): Code linting
- `eslint-config-expo` (~10.0.0): Expo ESLint configuration
- `jest` (^29.2.1): Testing framework
- `jest-expo` (~54.0.12): Expo-specific Jest preset
- `@babel/core` (^7.25.2): JavaScript transpilation

### Future Integration Considerations
- **Database**: No database currently implemented; architecture supports future addition of local storage (SQLite via Expo SQLite) or remote database
- **Barcode Scanning**: Camera integration prepared but not yet implemented; will likely use `expo-camera` or `expo-barcode-scanner`
- **Authentication**: No authentication system currently; structure supports future addition
- **Cloud Sync**: No remote API integration; context-based architecture allows for future API service layer addition