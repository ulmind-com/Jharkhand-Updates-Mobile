import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { View as MotiView } from 'moti';
import { EventSkeleton } from '../components/Skeletons';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function EventsScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/events`);
            if (res.data.data) {
                setEvents(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching events:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load events' });
        } finally {
            setLoading(false);
        }
    };

    const isEventOver = (eventDate, endDate) => {
        const dateToCheck = endDate || eventDate;
        if (!dateToCheck) return false;

        const now = new Date();
        const eventDateTime = new Date(dateToCheck);

        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventOnlyDate = new Date(eventDateTime.getFullYear(), eventDateTime.getMonth(), eventDateTime.getDate());

        return eventOnlyDate < todayDate;
    };

    const renderEvent = ({ item }) => {
        const expired = isEventOver(item.eventDate, item.endDate);
        const dateStr = item.eventDate ? new Date(item.eventDate).toLocaleDateString() : '';
        const timeStr = item.eventDate ? new Date(item.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        return (
            <MotiView
                style={[styles.card, expired && styles.cardExpired]}
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 350 }}
            >
                {expired && (
                    <View style={styles.expiredOverlay}>
                        <View style={styles.expiredBadge}>
                            <Text style={styles.expiredText}>EVENT OVER</Text>
                        </View>
                    </View>
                )}

                {item.imageUrls?.length > 0 ? (
                    <Image
                        source={{ uri: item.imageUrls[0] }}
                        style={[styles.eventImage, expired ? { opacity: 0.6 } : {}]}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.eventImage, styles.placeholderImage]}>
                        <Ionicons name="calendar" size={48} color="rgba(255,255,255,0.5)" />
                    </View>
                )}

                {item.eventDate && (
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateMonth}>{new Date(item.eventDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
                        <Text style={styles.dateDay}>{new Date(item.eventDate).getDate()}</Text>
                    </View>
                )}

                <View style={styles.cardContent}>
                    <Text style={[styles.title, expired && { color: '#6b7280' }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    <View style={styles.detailsContainer}>
                        {item.location && (
                            <View style={styles.detailRow}>
                                <Ionicons name="location" size={16} color={expired ? '#9ca3af' : '#9333ea'} />
                                <Text style={[styles.detailText, expired && { color: '#9ca3af' }]} numberOfLines={1}>{item.location}</Text>
                            </View>
                        )}

                        {item.eventDate && (
                            <View style={styles.detailRow}>
                                <Ionicons name="calendar-outline" size={16} color={expired ? '#9ca3af' : '#2563eb'} />
                                <Text style={[styles.detailText, expired && { color: '#9ca3af' }]}>{dateStr} {item.endDate ? `- ${new Date(item.endDate).toLocaleDateString()}` : ''}</Text>
                            </View>
                        )}

                        {item.eventDate && (
                            <View style={styles.detailRow}>
                                <Ionicons name="time" size={16} color={expired ? '#9ca3af' : '#4f46e5'} />
                                <Text style={[styles.detailText, expired && { color: '#9ca3af' }]}>{timeStr}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.buttonContainer}>
                        {item.reglink && !expired && (
                            <TouchableOpacity style={styles.primaryButton} onPress={() => Linking.openURL(item.reglink)}>
                                <Text style={styles.primaryButtonText}>Registration</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.secondaryButton, expired && styles.buttonDisabled]}
                            disabled={expired}
                            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
                        >
                            <Text style={[styles.secondaryButtonText, expired && { color: '#6b7280' }]}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </MotiView>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: 8, marginLeft: -8, marginRight: 8 }}>
                    <Ionicons name="chevron-back" size={28} color="#9333ea" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Discover Events</Text>
                <TouchableOpacity style={{ marginLeft: 'auto' }}>
                    <Ionicons name="add-circle" size={26} color="#9333ea" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.listContent}>
                    {[...Array(3)].map((_, i) => <EventSkeleton key={i} />)}
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderEvent}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>No events found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkMode ? colors.background : '#f5f3ff' }, // purple-50
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: isDarkMode ? colors.border : '#ede9fe'
    },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: isDarkMode ? colors.primaryLight : '#9333ea' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },
    card: {
        backgroundColor: colors.surface, borderRadius: 20, marginBottom: 20, overflow: 'hidden',
        elevation: 4, shadowColor: isDarkMode ? colors.shadow : '#9333ea', shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDarkMode ? 0.3 : 0.15, shadowRadius: 8,
        borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border
    },
    cardExpired: { opacity: 0.8 },
    expiredOverlay: {
        position: 'absolute', top: -10, right: -10, zIndex: 20, transform: [{ rotate: '12deg' }]
    },
    expiredBadge: {
        backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 8, borderWidth: 2, borderColor: '#fca5a5'
    },
    expiredText: { color: '#fff', fontSize: 13, fontFamily: 'Outfit_700Bold', letterSpacing: 1 },
    eventImage: { width: '100%', height: 200, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6' },
    placeholderImage: { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#a855f7', alignItems: 'center', justifyContent: 'center' },
    dateBadge: {
        position: 'absolute', top: 16, left: 16, borderRadius: 20, overflow: 'hidden', elevation: 5, backgroundColor: colors.surface
    },
    dateMonth: { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#9333ea', color: isDarkMode ? colors.textDim : '#fff', textAlign: 'center', fontSize: 11, fontFamily: 'Outfit_700Bold', paddingVertical: 4, paddingHorizontal: 12 },
    dateDay: { textAlign: 'center', fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.text, paddingVertical: 6 },
    cardContent: { padding: 20 },
    title: { fontSize: 19, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 16 },
    detailsContainer: { gap: 10, marginBottom: 20 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.textDim, flexShrink: 1 },
    buttonContainer: { flexDirection: 'row', gap: 10 },
    primaryButton: {
        flex: 1, backgroundColor: isDarkMode ? colors.primary : '#9333ea', paddingVertical: 12, borderRadius: 20, alignItems: 'center'
    },
    primaryButtonText: { color: '#fff', fontSize: 14, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' },
    secondaryButton: {
        flex: 1, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6', paddingVertical: 12, borderRadius: 20, alignItems: 'center'
    },
    buttonDisabled: { backgroundColor: isDarkMode ? colors.border : '#e5e7eb' },
    secondaryButtonText: { color: colors.textDim, fontSize: 14, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_600SemiBold' },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: colors.textDim, fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginTop: 16 }
});







