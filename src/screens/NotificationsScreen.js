import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';
import { ThemeContext } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function NotificationsScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            if (!token) return;

            const res = await axios.get(`${BASE_URL}/notifications/recent?limit=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.data) {
                const dataList = res.data.data;
                setNotifications(dataList);

                if (dataList.length > 0) {
                    const highestId = Math.max(...dataList.map(n => n.id));
                    if (Platform.OS === 'web') {
                        localStorage.setItem('lastNotificationId', String(highestId));
                    } else {
                        SecureStore.setItemAsync('lastNotificationId', String(highestId));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleDelete = async (id) => {
        const confirmDelete = () => {
            const executeDelete = async () => {
                try {
                    const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
                    if (!token) return;

                    await axios.delete(`${BASE_URL}/notifications/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    setNotifications(prev => prev.filter(n => n.id !== id));
                } catch (error) {
                    console.error('Error deleting notification:', error);
                    Alert.alert('Error', 'Failed to delete notification.');
                }
            };
            executeDelete();
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete this notification?")) confirmDelete();
        } else {
            Alert.alert("Delete Notification", "Are you sure you want to delete this notification?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", onPress: confirmDelete, style: "destructive" }
            ]);
        }
    };

    const handleClearAll = async () => {
        if (notifications.length === 0) return;

        const confirmClear = () => {
            const executeClear = async () => {
                try {
                    const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
                    if (!token) return;

                    await axios.delete(`${BASE_URL}/notifications/clear-all`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    setNotifications([]);
                } catch (error) {
                    console.error('Error clearing notifications:', error);
                    Alert.alert('Error', 'Failed to clear all notifications.');
                }
            };
            executeClear();
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to clear all notifications?")) confirmClear();
        } else {
            Alert.alert("Clear All", "Are you sure you want to clear all notifications?", [
                { text: "Cancel", style: "cancel" },
                { text: "Clear All", onPress: confirmClear, style: "destructive" }
            ]);
        }
    };

    const handleNotificationClick = (notification) => {
        const referenceId = notification.referenceId;
        const referenceType = notification.referenceType;
        const message = notification.message || '';

        if (referenceId && referenceType) {
            switch (referenceType.toUpperCase()) {
                case "JOB": navigation.navigate('JobDetails', { jobId: referenceId }); return;
                case "EVENT": navigation.navigate('EventDetails', { eventId: referenceId }); return;
                case "COMMUNITY":
                case "COMMUNITY_POST": navigation.navigate('CommunityPostDetails', { postId: referenceId }); return;
                case "LOCAL_NEWS":
                case "NEWS": navigation.navigate('StateNewsDetails', { newsId: referenceId }); return;
                case "PROPERTY": navigation.navigate('PropertyDetails', { propertyId: referenceId }); return;
            }
        }

        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes("job") && lowerMessage.includes("approved")) return navigation.navigate('JobsScreen');
        if (lowerMessage.includes("event") && lowerMessage.includes("approved")) return navigation.navigate('Events');
        if (lowerMessage.includes("community post") && lowerMessage.includes("approved")) return navigation.navigate('Main', { screen: 'Community' });
        if (lowerMessage.includes("property") && lowerMessage.includes("approved")) return navigation.navigate('Properties');
        if (lowerMessage.includes("commented on your post") || lowerMessage.includes("replied to your comment")) {
            if (referenceId) return navigation.navigate('CommunityPostDetails', { postId: referenceId });
            return navigation.navigate('Main', { screen: 'Community' });
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.notificationCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}
            onPress={() => handleNotificationClick(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardContent}>
                <Text style={[styles.message, { color: colors.text }]}>{item.message || "Notification"}</Text>
                <Text style={[styles.date, { color: colors.textDim }]}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                    if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleDelete(item.id);
                }}
            >
                <Ionicons name="trash-outline" size={20} color={colors.textDim} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>

                <TouchableOpacity onPress={handleClearAll} style={styles.clearAllButton}>
                    <Ionicons name="trash-bin" size={18} color={colors.primary} />
                    <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear All</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="notifications-off-outline" size={64} color={colors.border} />
                    <Text style={[styles.emptyText, { color: colors.textDim }]}>No new notifications</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_600SemiBold' },
    clearAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
    clearAllText: { fontSize: 14, fontFamily: 'Outfit_500Medium' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { marginTop: 16, fontSize: 16, fontFamily: 'Outfit_500Medium' },
    listContainer: { padding: 16, paddingBottom: 120 },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardContent: { flex: 1, paddingRight: 16 },
    message: { fontSize: 15, fontFamily: 'Outfit_500Medium', marginBottom: 6, lineHeight: 22 },
    date: { fontSize: 12, fontFamily: 'Outfit_400Regular' },
    deleteButton: { padding: 4 },
});
