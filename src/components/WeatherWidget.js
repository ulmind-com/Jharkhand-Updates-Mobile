import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import axios from 'axios';
import { View as MotiView } from 'moti';

const WEATHER_API_KEY = "08e6542c3ce14ae39f1174408252212";

// Global cache to prevent duplicate requests when remounted rapidly (e.g. ListHeaderComponent)
let cachedWeather = null;
let cachedForecast = null;
let lastFetchTime = 0;

export default function WeatherWidget() {
    const navigation = useNavigation();
    const [userName, setUserName] = useState('User');
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [currentTime, setCurrentTime] = useState("");

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            let hours = now.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const minutes = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
            setCurrentTime(`${hours}:${minutes} ${ampm}`);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                let name = Platform.OS === 'web' ? localStorage.getItem('userName') : await SecureStore.getItemAsync('userName');
                let token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');

                // If no name is cached but we have a token, fetch it from the backend
                if (!name && token) {
                    const res = await axios.get('https://api.jharkhandbiharupdates.com/api/v1/user/profile', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data?.data?.fullName) {
                        name = res.data.data.fullName;
                        // Cache it for next time
                        if (Platform.OS === 'web') {
                            localStorage.setItem('userName', name);
                        } else {
                            await SecureStore.setItemAsync('userName', name);
                        }
                    }
                }

                if (name) {
                    setUserName(name.split(' ')[0]);
                } else {
                    setUserName('User'); // Fallback if logged out
                }
            } catch (e) {
                console.log("Error fetching user name for widget:", e);
            }
        };

        // Run on mount
        fetchUser();

        // Also run every time the screen comes into focus
        const unsubscribe = navigation.addListener('focus', fetchUser);
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Return cached data if less than 15 minutes old
                const now = Date.now();
                if (cachedWeather && lastFetchTime && (now - lastFetchTime < 15 * 60 * 1000)) {
                    setWeather(cachedWeather);
                    setForecast(cachedForecast || []);
                    setLoading(false);
                    return;
                }

                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Permission to access location was denied');
                    setLoading(false);
                    return;
                }

                // 1. Try last known for instant speed
                let location = await Location.getLastKnownPositionAsync();

                // 2. Fallback to current with 5-second timeout if null
                if (!location) {
                    location = await Promise.race([
                        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000))
                    ]);
                }

                const { latitude, longitude } = location.coords;

                const resp = await axios.get(`https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&days=3&aqi=no&alerts=no`);

                const newWeather = {
                    temp: Math.round(resp.data.current.temp_c),
                    condition: resp.data.current.condition.text,
                    isDay: resp.data.current.is_day === 1
                };

                let newForecast = [];
                if (resp.data.forecast && resp.data.forecast.forecastday) {
                    newForecast = resp.data.forecast.forecastday.map(day => ({
                        date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
                        avgTemp: Math.round(day.day.avgtemp_c),
                        condition: day.day.condition.text
                    }));
                }

                // Update global cache
                cachedWeather = newWeather;
                cachedForecast = newForecast;
                lastFetchTime = Date.now();

                setWeather(newWeather);
                setForecast(newForecast);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching weather:", error);

                // If it timed out but we have stale cache, use it instead of erroring
                if (cachedWeather) {
                    setWeather(cachedWeather);
                    setForecast(cachedForecast || []);
                } else {
                    setErrorMsg('Failed to load weather');
                }
                setLoading(false);
            }
        };

        fetchWeather();
    }, []);

    // 🎥 Map weather condition → Lottie JSON file
    const getLottieSource = (conditionText, isDay = true) => {
        const text = (conditionText || "").toLowerCase();
        if (text.includes("thunder") || text.includes("storm"))
            return require('../../assets/lottie/weather/thunderstorm.json');
        if (text.includes("rain") || text.includes("drizzle") || text.includes("shower"))
            return isDay
                ? require('../../assets/lottie/weather/rainy.json')
                : require('../../assets/lottie/weather/night_rain.json');
        if (text.includes("cloud") || text.includes("overcast"))
            return isDay
                ? require('../../assets/lottie/weather/cloudy.json')
                : require('../../assets/lottie/weather/partly_cloudy_night.json');
        if (text.includes("clear") || text.includes("sunny"))
            return isDay
                ? require('../../assets/lottie/weather/sunny.json')
                : require('../../assets/lottie/weather/night.json');
        // Default
        return isDay
            ? require('../../assets/lottie/weather/partly_cloudy.json')
            : require('../../assets/lottie/weather/partly_cloudy_night.json');
    };

    // Lazy-load LottieView to avoid issues on web
    const LottieView = Platform.OS !== 'web' ? require('lottie-react-native').default : null;

    const WeatherAnimation = ({ conditionText, isDay }) => {
        if (!LottieView) {
            // Web fallback — keep Ionicon
            const text = (conditionText || "").toLowerCase();
            let iconName = "partly-sunny";
            let iconColor = "#e5e7eb";

            if (text.includes("thunder") || text.includes("storm")) { iconName = "thunderstorm"; iconColor = "#fcd34d"; }
            else if (text.includes("rain") || text.includes("drizzle") || text.includes("shower")) { iconName = "rainy"; iconColor = "#93c5fd"; }
            else if (text.includes("cloud") || text.includes("overcast")) { iconName = "cloud"; iconColor = "#e5e7eb"; }
            else if (text.includes("clear") || text.includes("sunny")) { iconName = isDay ? "sunny" : "moon"; iconColor = isDay ? "#fcd34d" : "#c7d2fe"; }
            else { iconName = isDay ? "partly-sunny" : "cloudy-night"; iconColor = "#e5e7eb"; }

            return <Ionicons name={iconName} size={32} color={iconColor} style={styles.cloudIcon} />;
        }
        return (
            <LottieView
                source={getLottieSource(conditionText, isDay)}
                autoPlay
                loop
                style={styles.lottieIcon}
            />
        );
    };

    if (loading) {
        return (
            <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={styles.container}
            >
                <View style={styles.headerRow}>
                    <View style={{ flex: 1, paddingRight: 15 }}>
                        <Text style={styles.greeting} numberOfLines={1}>Hello {userName}!</Text>
                        <Text style={styles.subtext} numberOfLines={2}>Fetching local weather...</Text>
                    </View>
                    <View style={styles.weatherPill}>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text style={[styles.dayText, { marginLeft: 8 }]}>Loading</Text>
                    </View>
                </View>
            </MotiView>
        );
    }

    if (errorMsg) {
        return (
            <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={styles.container}
            >
                <View style={styles.headerRow}>
                    <View style={{ flex: 1, paddingRight: 15 }}>
                        <Text style={styles.greeting} numberOfLines={1}>Hello {userName}!</Text>
                        <Text style={styles.subtext} numberOfLines={2}>Welcome to Jharkhand Updates</Text>
                    </View>
                    <View style={styles.weatherPill}>
                        <Ionicons name="time-outline" size={24} color="#f3f4f6" style={styles.cloudIcon} />
                        <View>
                            <Text style={styles.dayText}>Current Time</Text>
                            <Text style={[styles.tempLarge, { fontSize: 16 }]}>{currentTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                    </View>
                </View>
            </MotiView>
        );
    }

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.container}
        >
            <View style={styles.headerRow}>
                <View style={{ flex: 1, paddingRight: 15 }}>
                    <Text style={styles.greeting} numberOfLines={1}>Hello {userName}!</Text>
                    <Text style={styles.subtext} numberOfLines={2}>Looks like a {weather?.condition?.toLowerCase() || 'cloudy'} one today</Text>
                </View>

                <View style={styles.weatherPill}>
                    <WeatherAnimation
                        conditionText={weather?.condition}
                        isDay={weather?.isDay}
                    />
                    <View>
                        <Text style={styles.dayText}>Today</Text>
                        <Text style={styles.tempLarge}>{weather?.temp || '--'}°C</Text>
                    </View>
                </View>
            </View>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#275C53', // Darker sexy green from screenshot
        padding: 20, // Reduced from 24
        paddingTop: 24, // Reduced from 32
        paddingBottom: 24,
        borderRadius: 20, // Sharper corners
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        color: '#ffffff',
        marginBottom: 4, // Tighter
    },
    subtext: {
        fontSize: 14,
        color: '#f3f4f6',
        fontFamily: 'Outfit_500Medium',
    },
    weatherPill: {
        backgroundColor: '#204C42', // Even darker inner pill
        borderRadius: 24, // Sleeker pill
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10, // Tighter
        paddingHorizontal: 16,
        flexShrink: 0,
    },
    lottieIcon: {
        width: 52,
        height: 52,
        marginRight: 8,
    },
    cloudIcon: {
        marginRight: 10, // Reduced
    },
    dayText: {
        color: '#d1d5db',
        fontSize: 11,
        fontFamily: 'Outfit_600SemiBold',
    },
    tempLarge: {
        color: '#ffffff',
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: -0.5,
    }
});
