import { Platform, StatusBar } from 'react-native';

export const AndroidSafeAreaStyle = () => ({
  flex: 1,
  backgroundColor: 'white', // Match your app's theme
  paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  paddingBottom: Platform.OS === 'android' ? 80 : 0, // Add bottom padding for Android
});
