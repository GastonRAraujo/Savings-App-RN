import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { useColorScheme } from '@/hooks/useColorScheme';
import { loadDatabase } from './database';
import { SQLiteProvider } from 'expo-sqlite';
import { HideNumbersProvider } from './HideNumbersContext';
import { ActivityIndicator, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Roboto: require('../assets/fonts/Roboto-Regular.ttf'),
    RobotoMedium: require('../assets/fonts/Roboto-Medium.ttf'),
    Roboto2014: require('../assets/fonts/Roboto-Regular-2014.ttf'),
    OpenSans: require('../assets/fonts/OpenSans-Regular.ttf'),
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Hide splash screen once both fonts and database are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    // Show loading screen until fonts and database are ready
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading resources...</Text>
      </View>
    );
  }

  return (
    // Wrap the entire app inside GestureHandlerRootView
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SQLiteProvider databaseName="mySQLiteDB.db" onInit={loadDatabase}>
          <HideNumbersProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          </HideNumbersProvider>
        </SQLiteProvider>
        <Toast />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
