import React, { useEffect, useState, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, BookOpen, Fingerprint, Settings, Heart } from 'lucide-react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications'; // 🔥 EKLENDİ

// Context & DB & Error Boundary
import { ThemeProvider, useTheme } from './src/context/ThemeContext'; 
import { initDB } from './src/database/db';
import GlobalErrorBoundary from './src/components/GlobalErrorBoundary'; 

// Bileşenler
import GlobalAIOverlay from './src/components/GlobalAIOverlay';

// Ekranlar
import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import LibraryDetailScreen from './src/screens/LibraryDetailScreen';
import SurahDetailScreen from './src/screens/SurahDetailScreen';
import ZikirScreen from './src/screens/ZikirScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import QiblaScreen from './src/screens/QiblaScreen';
import OnboardingScreen from './src/screens/OnBoardingScreen'; 
import ChatScreen from './src/screens/ChatScreen'; 
import MosqueScreen from './src/screens/MosqueScreen'; 
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen'; 
import HeritageScreen from './src/screens/HeritageScreen';
import ImsakiyeScreen from './src/screens/ImsakiyeScreen';

// 🔥 GLOBAL NAVIGASYON REFERANSI
export const navigationRef = createNavigationContainerRef();

SplashScreen.preventAutoHideAsync();

// 🔥 BİLDİRİM AYARLARI (Uygulama açıkken bildirim gelirse nasıl görünsün?)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- ANA SAYFA STACK ---
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
    </Stack.Navigator>
  );
}

// --- KÜTÜPHANE STACK ---
function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LibraryMain" component={LibraryScreen} />
      <Stack.Screen name="LibraryDetail" component={LibraryDetailScreen} />
      <Stack.Screen name="SurahDetail" component={SurahDetailScreen} />
    </Stack.Navigator>
  );
}

// --- AYARLAR STACK ---
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}

// --- TAB NAVIGATOR ---
function MainTabs() {
  const { theme, isDarkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Ana Sayfa') return <Home size={size} color={color} />;
          if (route.name === 'KütüphaneTab') return <BookOpen size={size} color={color} />;
          if (route.name === 'Favoriler') return <Heart size={size} color={color} />;
          if (route.name === 'Zikirmatik') return <Fingerprint size={size} color={color} />;
          if (route.name === 'AyarlarTab') return <Settings size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: isDarkMode ? '#8E8E93' : '#A0A0A0',
        tabBarStyle: { 
          height: Platform.OS === 'ios' ? 90 : 70, 
          paddingBottom: Platform.OS === 'ios' ? 30 : 10, 
          borderTopWidth: 0, 
          backgroundColor: theme.card,
          elevation: 10,
          shadowColor: isDarkMode ? '#000' : '#DDD',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
      })}
    >
      <Tab.Screen name="Ana Sayfa" component={HomeStack} />
      <Tab.Screen 
        name="KütüphaneTab" 
        component={LibraryStack} 
        options={{ tabBarLabel: 'Kütüphane' }} 
      />
      <Tab.Screen name="Favoriler" component={FavoritesScreen} /> 
      <Tab.Screen name="Zikirmatik" component={ZikirScreen} />
      <Tab.Screen 
        name="AyarlarTab" 
        component={SettingsStack} 
        options={{ tabBarLabel: 'Ayarlar' }} 
      />
    </Tab.Navigator>
  );
}

// --- ROOT NAVIGATOR ---
function RootNavigator({ isFirstLaunch }) {
  return (
    <Stack.Navigator 
      initialRouteName={isFirstLaunch ? "Onboarding" : "MainTabs"}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      
      {/* GLOBAL EKRANLAR */}
      <Stack.Screen name="ChatScreen" component={ChatScreen} /> 
      <Stack.Screen name="Qibla" component={QiblaScreen} />
      <Stack.Screen name="Mosque" component={MosqueScreen} />
      <Stack.Screen name="Heritage" component={HeritageScreen} /> 
      <Stack.Screen name="Imsakiye" component={ImsakiyeScreen} /> 
    </Stack.Navigator>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  // 🔥 SES KANALLARINI KURMA FONKSİYONU
  async function setupNotificationChannels() {
    if (Platform.OS === 'android') {
      try {
        // 1. Ney Sesi
        await Notifications.setNotificationChannelAsync('ney', {
          name: 'Ney Sesi 🎶',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'ney.wav', // Dosya adı (uzantılı)
          vibrationPattern: [0, 250, 250, 250],
        });

        // 2. Kuş Cıvıltısı
        await Notifications.setNotificationChannelAsync('kus-civiltisi', {
          name: 'Kuş Cıvıltısı 🐦',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'kuscivilti.wav', 
          vibrationPattern: [0, 250, 250, 250],
        });

        // 3. Rüzgar Çanı
        await Notifications.setNotificationChannelAsync('ruzgar-cani', {
          name: 'Rüzgar Çanı 🎐',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'ruzgarcan.wav',
          vibrationPattern: [0, 250, 250, 250],
        });

        // 4. Derin Çınlama
        await Notifications.setNotificationChannelAsync('tibetan-bowl', {
          name: 'Derin Çınlama 🧘',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'thunderbowl.wav',
          vibrationPattern: [0, 250, 250, 250],
        });

        // 5. Klasik
        await Notifications.setNotificationChannelAsync('klasik', {
          name: 'Klasik 🎸',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'arabicsounds.wav',
          vibrationPattern: [0, 250, 250, 250],
        });

        // 6. Varsayılan Kanal (Default)
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Varsayılan',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        console.log("✅ Bildirim kanalları kuruldu.");
      } catch (error) {
        console.log("❌ Kanal kurma hatası:", error);
      }
    }
  }

  useEffect(() => {
    async function prepare() {
      try {
        await initDB();
        
        // 🔥 Kanalları kur
        await setupNotificationChannels();

        const alreadyLaunched = await AsyncStorage.getItem('alreadyLaunched');
        if (alreadyLaunched === null) {
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady || isFirstLaunch === null) return null;

  return (
    <GlobalErrorBoundary>
      <ThemeProvider>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <NavigationContainer ref={navigationRef}>
             <RootNavigator isFirstLaunch={isFirstLaunch} />
             <GlobalAIOverlay /> 
          </NavigationContainer>
        </View>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}