import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { InventoryProvider } from '@/contexts/InventoryContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <NotificationProvider>
      <InventoryProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen 
              name="notifications" 
              options={{ 
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right'
              }} 
            />
            <Stack.Screen name="item-details" options={{ headerShown: true }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </InventoryProvider>
    </NotificationProvider>
  );
}