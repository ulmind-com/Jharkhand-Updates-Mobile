import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { View as MotiView } from 'moti';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useLocation } from '../context/LocationContext';

export default function TopHeader() {
    const navigation = useNavigation();
    const { selectedState, setLocation } = useLocation();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const toggleLocation = () => {
        if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setLocation(selectedState === 'Jharkhand' ? 'Bihar' : 'Jharkhand');
        setDropdownOpen(false);
    };

    return (
        <View style={styles.headerContainer}>
            <View style={styles.leftSection}>
                <TouchableOpacity
                    style={styles.locationSelector}
                    onPress={() => {
                        if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDropdownOpen(!dropdownOpen);
                    }}
                >
                    <Text style={styles.locationText}>{selectedState}</Text>
                    <Ionicons name="chevron-down" size={16} color="#047857" style={{ marginLeft: 4 }} />
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
                <TouchableOpacity style={styles.iconButton} onPress={() => {
                    if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('Search');
                }}>
                    <Ionicons name="search-outline" size={20} color="#047857" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => {
                    if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('UserProfile');
                }}>
                    <Ionicons name="person-outline" size={20} color="#047857" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
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
        color: '#1f2937',
        letterSpacing: -0.5,
    },
    dropdown: {
        position: 'absolute',
        top: 32,
        left: 0,
        backgroundColor: '#fff',
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
        fontSize: 16, fontFamily: 'Outfit_400Regular',
        color: '#374151',
        fontFamily: 'Outfit_600SemiBold',
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
        borderColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    }
});



