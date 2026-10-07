// For Expo managed workflow without keychain
import AsyncStorage from '@react-native-async-storage/async-storage';

// AuthService automatically falls back to AsyncStorage on non-mobile platforms
// Force AsyncStorage on mobile by setting Platform.OS override (not recommended)