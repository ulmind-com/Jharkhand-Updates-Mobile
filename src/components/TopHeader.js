import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { View as MotiView } from 'moti';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

import { useLocation } from '../context/LocationContext';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function TopHeader() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    const { selectedState, setLocation } = useLocation();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    useEffect(() => {
        const checkAuthAndNotifications = async () => {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            setIsLoggedIn(!!token);

            if (token) {
                try {
                    const res = await axios.get(`${BASE_URL}/notifications/recent?limit=1`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data?.data?.length > 0) {
                        const latestId = res.data.data[0].id;
                        const storedIdStr = Platform.OS === 'web' ? localStorage.getItem('lastNotificationId') : await SecureStore.getItemAsync('lastNotificationId');
                        const storedId = storedIdStr ? parseInt(storedIdStr, 10) : 0;
                        if (latestId > storedId) {
                            setHasUnread(true);
                        } else {
                            setHasUnread(false);
                        }
                    } else {
                        setHasUnread(false);
                    }
                } catch (e) {
                    console.log("Error checking notifications in TopHeader:", e);
                }
            }
        };
        checkAuthAndNotifications();
    }, [isFocused]);

    const toggleLocation = () => {
        if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setLocation(selectedState === 'Jharkhand' ? 'Bihar' : 'Jharkhand');
        setDropdownOpen(false);
    };

    return (
        <View style={styles.headerContainer}>
            <View style={styles.leftSection}>
                <TouchableOpacity
                    style={styles.locationSelector}
                    onPress={() => {
                        if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDropdownOpen(!dropdownOpen);
                    }}
                >
                    <Text style={styles.locationText}>{selectedState}</Text>
                    <Ionicons name="chevron-down" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                {dropdownOpen && (
                    <MotiView
                        from={{ opacity: 0, translateY: -10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        style={styles.dropdown}
                    >
                        <TouchableOpacity style={styles.dropdownItem} onPress={toggleLocation}>
                            <Text style={styles.dropdownText}>{selectedState === 'Jharkhand' ? 'Bihar' : 'Jharkhand'}</Text>
                        </TouchableOpacity>
                    </MotiView>
                )}
            </View>

            <View style={styles.rightSection}>
                {isLoggedIn && (
                    <TouchableOpacity style={styles.iconButton} onPress={() => {
                        if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('Notifications');
                    }}>
                        <Ionicons name="notifications-outline" size={20} color="#047857" />
                        {hasUnread && (
                            <View style={styles.badge} />
                        )}
                    </TouchableOpacity>
                )}
                {isLoggedIn ? (
                    <TouchableOpacity style={styles.iconButton} onPress={() => {
                        if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('UserProfile');
                    }}>
                        <Ionicons name="person-outline" size={20} color={colors.text} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.loginBtn, { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }]} onPress={() => {
                        if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('Login');
                    }}>
                        <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 13 }}>Login</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 10,
    },
    leftSection: {
        position: 'relative',
        zIndex: 100,
    },
    locationSelector: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        fontSize: 22, fontFamily: 'Outfit_400Regular',
        color: colors.text,
        letterSpacing: -0.5,
    },
    dropdown: {
        position: 'absolute',
        top: 32,
        left: 0,
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 5,
        minWidth: 120,
    },
    dropdownItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    dropdownText: {
        fontSize: 16, fontFamily: 'Outfit_600SemiBold',
        color: colors.text,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 6,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        borderWidth: 1,
        borderColor: '#fff',
    }
});



