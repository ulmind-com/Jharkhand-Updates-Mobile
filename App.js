import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Audio } from 'expo-av';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import TabNavigator from './src/navigation/TabNavigator';
import VendorShopScreen from './src/screens/VendorShopScreen';
import CommunityPostDetailsScreen from './src/screens/CommunityPostDetailsScreen';
import StateNewsDetailsScreen from './src/screens/StateNewsDetailsScreen';
import CreateCommunityPostScreen from './src/screens/CreateCommunityPostScreen';
import CreateJobPostScreen from './src/screens/CreateJobPostScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import CreateEventPostScreen from './src/screens/CreateEventPostScreen';
import CreatePropertyListingScreen from './src/screens/CreatePropertyListingScreen';
import CreateStateNewsScreen from './src/screens/CreateStateNewsScreen';
import CreatePromotionScreen from './src/screens/CreatePromotionScreen';
import SearchScreen from './src/screens/SearchScreen';
import MyPostsScreen from './src/screens/MyPostsScreen';
import MyPostsListScreen from './src/screens/MyPostsListScreen';
import JobDetailsScreen from './src/screens/JobDetailsScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import PropertyDetailsScreen from './src/screens/PropertyDetailsScreen';
import EventsScreen from './src/screens/EventsScreen';
import PropertiesScreen from './src/screens/PropertiesScreen';
import PromotionsScreen from './src/screens/PromotionsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import EmailServiceScreen from './src/screens/EmailServiceScreen';
import LiveSportsScreen from './src/screens/LiveSportsScreen';
import CricketScorecardScreen from './src/screens/CricketScorecardScreen';
import FootballDetailsScreen from './src/screens/FootballDetailsScreen';
import SplashScreenAnimation from './src/screens/SplashScreenAnimation';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import PendingApprovalsScreen from './src/screens/PendingApprovalsScreen';
import PendingCategoryListScreen from './src/screens/PendingCategoryListScreen';
import ComingSoonAdminScreen from './src/screens/ComingSoonAdminScreen';
import AdminPropertiesScreen from './src/screens/AdminPropertiesScreen';
import AiChatScreen from './src/screens/AiChatScreen';
import NewsArticleScreen from './src/screens/NewsArticleScreen';
import AdminPropertyDetailsScreen from './src/screens/AdminPropertyDetailsScreen';
import AdminPropertyLeadsScreen from './src/screens/AdminPropertyLeadsScreen';
import VendorDashboardScreen from './src/screens/VendorDashboardScreen';
import { LocationProvider } from './src/context/LocationContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { setupNotificationChannel } from './src/services/ScoreNotificationService';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Inject global CSS for smooth scrolling and hiding scrollbars on web
      const style = document.createElement('style');
      style.textContent = `
        * {
          scroll-behavior: smooth;
        }
        ::-webkit-scrollbar {
          width: 0px;
          height: 0px;
          background: transparent;
          display: none;
        }
      `;
      document.head.appendChild(style);
    } else {
      // Native Audio Configuration to allow sounds over calls and ignore silent switches
      try {
        Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: true,
        });
      } catch (e) {
        console.log("Audio mode configuration failed:", e);
      }
    }

    // OneSignal Debug & Initialization
    try {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
      OneSignal.initialize("8f6aeaec-1885-4245-b351-0885c4cb7312");
      OneSignal.Notifications.requestPermission(true);

      OneSignal.Notifications.addEventListener('click', (event) => {
        console.log('OneSignal: notification clicked:', event);
        const data = event?.notification?.additionalData;
        if (data && data.targetScreen && navigationRef.isReady()) {
          navigationRef.navigate(data.targetScreen, data.params || {});
        }
      });
    } catch (e) {
      console.log("OneSignal native module not found (Likely running in Expo Go without a custom native build). Skipping OneSignal initialization.");
    }

    // Initialize Score Notification Channel for Android
    setupNotificationChannel();
  }, []);

  if (!fontsLoaded || showSplash) {
    return (
      <SplashScreenAnimation
        onFinish={() => setShowSplash(false)}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LocationProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="auto" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Screen name="UserProfile" component={UserProfileScreen} />
              <Stack.Screen name="VendorShop" component={VendorShopScreen} />
              <Stack.Screen name="Events" component={EventsScreen} />
              <Stack.Screen name="Properties" component={PropertiesScreen} />
              <Stack.Screen name="Promotions" component={PromotionsScreen} />
              <Stack.Screen name="CommunityPostDetails" component={CommunityPostDetailsScreen} />
              <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
              <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
              <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
              <Stack.Screen name="StateNewsDetails" component={StateNewsDetailsScreen} />
              <Stack.Screen name="Search" component={SearchScreen} />
              <Stack.Screen name="MyPosts" component={MyPostsScreen} />
              <Stack.Screen name="MyPostsList" component={MyPostsListScreen} />
              <Stack.Screen name="History" component={HistoryScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="EmailService" component={EmailServiceScreen} />
              <Stack.Screen name="LiveSports" component={LiveSportsScreen} />
              <Stack.Screen name="CricketScorecard" component={CricketScorecardScreen} />
              <Stack.Screen name="FootballDetails" component={FootballDetailsScreen} />
              <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
              <Stack.Screen name="PendingApprovals" component={PendingApprovalsScreen} />
              <Stack.Screen name="PendingCategoryList" component={PendingCategoryListScreen} />
              <Stack.Screen name="ComingSoonAdmin" component={ComingSoonAdminScreen} />
              <Stack.Screen name="AdminProperties" component={AdminPropertiesScreen} />
              <Stack.Screen name="AdminPropertyDetails" component={AdminPropertyDetailsScreen} />
              <Stack.Screen name="AdminPropertyLeads" component={AdminPropertyLeadsScreen} />
              <Stack.Screen name="VendorDashboard" component={VendorDashboardScreen} />
              <Stack.Screen name="CreateCommunityPost" component={CreateCommunityPostScreen} />
              <Stack.Screen name="CreateJobPost" component={CreateJobPostScreen} />
              <Stack.Screen name="CreateEventPost" component={CreateEventPostScreen} />
              <Stack.Screen name="CreatePropertyListing" component={CreatePropertyListingScreen} />
              <Stack.Screen name="CreateStateNews" component={CreateStateNewsScreen} />
              <Stack.Screen name="CreatePromotion" component={CreatePromotionScreen} />
              <Stack.Screen name="AiChat" component={AiChatScreen} />
              <Stack.Screen name="NewsArticle" component={NewsArticleScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </LocationProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

