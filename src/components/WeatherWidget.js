import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import axios from 'axios';
import { View as MotiView } from 'moti';

const WEATHER_API_KEY = "08e6542c3ce14ae39f1174408252212";

export default function WeatherWidget() {
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

    useFocusEffect(
        useCallback(() => {
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
            fetchUser();
        }, [])
    );

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Permission to access location was denied');
                    setLoading(false);
                    return;
                }

                let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const { latitude, longitude } = location.coords;

                // Use forecast.json for Next 3 Days forecast as per the new UI layout
                const resp = await axios.get(`https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&days=3&aqi=no&alerts=no`);

                setWeather({
                    temp: Math.round(resp.data.current.temp_c),
                    condition: resp.data.current.condition.text,
                    isDay: resp.data.current.is_day === 1
                });

                if (resp.data.forecast && resp.data.forecast.forecastday) {
                    setForecast(resp.data.forecast.forecastday.map(day => ({
                        date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
                        avgTemp: Math.round(day.day.avgtemp_c),
                        condition: day.day.condition.text
                    })));
                }

                setLoading(false);
            } catch (error) {
                console.error("Error fetching weather:", error);
                setErrorMsg('Failed to load weather');
                setLoading(false);
            }
        };

        fetchWeather();
    }, []);

    const getWeatherIcon = (conditionText, isDay = true) => {
        const text = (conditionText || "").toLowerCase();
        if (text.includes("thunder") || text.includes("storm")) return { name: "thunderstorm", color: "#fcd34d" };
        if (text.includes("rain") || text.includes("drizzle") || text.includes("shower")) return { name: "rainy", color: "#93c5fd" };
        if (text.includes("cloud") || text.includes("overcast")) return { name: "cloud", color: "#e5e7eb" };
        if (text.includes("clear") || text.includes("sunny")) return { name: isDay ? "sunny" : "moon", color: isDay ? "#fcd34d" : "#c7d2fe" };
        return { name: isDay ? "partly-sunny" : "cloudy-night", color: "#e5e7eb" };
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
                        <Text style={styles.greeting}>Hello {userName}!</Text>
                        <Text style={styles.subtext}>Fetching local weather...</Text>
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
                        <Text style={styles.greeting}>Hello {userName}!</Text>
                        <Text style={styles.subtext}>Welcome to Jharkhand Bihar Updates</Text>
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

    const currentIcon = getWeatherIcon(weather?.condition, weather?.isDay);

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.container}
        >
            <View style={styles.headerRow}>
                <View style={{ flex: 1, paddingRight: 15 }}>
                    <Text style={styles.greeting}>Hello {userName}!</Text>
                    <Text style={styles.subtext}>Looks like a {weather?.condition?.toLowerCase() || 'cloudy'} one today</Text>
                </View>

                <View style={styles.weatherPill}>
                    <Ionicons name={currentIcon.name} size={32} color={currentIcon.color} style={styles.cloudIcon} />
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
        fontSize: 22, fontFamily: 'Outfit_400Regular', // Reduced from 26
        fontFamily: 'Outfit_700Bold',
        color: '#ffffff',
        marginBottom: 4, // Tighter
    },
    subtext: {
        fontSize: 14, fontFamily: 'Outfit_400Regular', // Reduced from 18
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
    },
    cloudIcon: {
        marginRight: 10, // Reduced
    },
    dayText: {
        color: '#d1d5db',
        fontSize: 11, fontFamily: 'Outfit_400Regular', // Smaller
        fontFamily: 'Outfit_600SemiBold',
    },
    tempLarge: {
        color: '#ffffff',
        fontSize: 22, fontFamily: 'Outfit_400Regular', // Reduced
        fontFamily: 'Outfit_700Bold',
        letterSpacing: -0.5,
    }
});
