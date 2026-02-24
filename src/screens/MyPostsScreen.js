import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { MotiView } from 'moti';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function MyPostsScreen() {
    const navigation = useNavigation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL');

    const tabs = [
        { id: 'ALL', label: 'All Posts' },
        { id: 'COMMUNITY', label: 'Community' },
        { id: 'JOB', label: 'Jobs' },
        { id: 'EVENT', label: 'Events' },
        { id: 'PROPERTY', label: 'Properties' }
    ];

    useEffect(() => {
        fetchMyPosts();
    }, []);

    const fetchMyPosts = async () => {
        setLoading(true);
        try {
            let token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            if (!token) {
                navigation.replace('Login');
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };

            // In a real scenario, you'd hit a dedicated `/users/me/posts` endpoint.
            // But simulating gathering them by hitting multiple authenticated lists
            const [communityRes, jobsRes, eventsRes, propsRes] = await Promise.all([
                axios.get(`${BASE_URL}/community/user`, { headers }).catch(() => ({ data: [] })),
                axios.get(`${BASE_URL}/jobs/user`, { headers }).catch(() => ({ data: [] })),
                axios.get(`${BASE_URL}/events/user`, { headers }).catch(() => ({ data: [] })),
                axios.get(`${BASE_URL}/properties/user`, { headers }).catch(() => ({ data: [] }))
            ]);

            const mapData = (res, type) => {
                const d = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.content) ? res.data.content : []);
                return d.map(item => ({ ...item, postType: type }));
            };

            const allPosts = [
                ...mapData(communityRes, 'COMMUNITY'),
                ...mapData(jobsRes, 'JOB'),
                ...mapData(eventsRes, 'EVENT'),
                ...mapData(propsRes, 'PROPERTY')
            ];

            // Sort by latest
            allPosts.sort((a, b) => new Date(b.createdAt || b.postedAt) - new Date(a.createdAt || a.postedAt));
            setPosts(allPosts);

        } catch (error) {
            console.error("Error fetching my posts:", error);
            Toast.show({ type: 'error', text1: 'Failed to load posts' });
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (postId, postType) => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete this post?")) {
                handleDelete(postId, postType);
            }
        } else {
            Alert.alert("Delete Post", "Are you sure you want to delete this post? This action cannot be undone.", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", onPress: () => handleDelete(postId, postType), style: "destructive" }
            ]);
        }
    };

    const handleDelete = async (postId, postType) => {
        try {
            let token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = { Authorization: `Bearer ${token}` };

            let endpoint = '';
            if (postType === 'COMMUNITY') endpoint = `${BASE_URL}/community/${postId}`;
            if (postType === 'JOB') endpoint = `${BASE_URL}/jobs/${postId}`;
            if (postType === 'EVENT') endpoint = `${BASE_URL}/events/${postId}`;
            if (postType === 'PROPERTY') endpoint = `${BASE_URL}/properties/${postId}`;

            await axios.delete(endpoint, { headers });

            // Remove from local state immediately
            setPosts(prev => prev.filter(p => !(p.id === postId && p.postType === postType)));
            Toast.show({ type: 'success', text1: 'Post deleted successfully' });

        } catch (error) {
            console.error("Delete error:", error);
            Toast.show({ type: 'error', text1: 'Failed to delete post' });
        }
    };

    const filteredPosts = activeTab === 'ALL'
        ? posts
        : posts.filter(p => p.postType === activeTab);

    const renderPost = ({ item }) => {
        const title = item.title || item.name || item.jobTitle || item.content;

        return (
            <MotiView
                style={styles.postCard}
                from={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.postType}</Text>
                    </View>
                    <Text style={styles.dateText}>
                        {new Date(item.createdAt || item.postedAt).toLocaleDateString()}
                    </Text>
                </View>

                <Text style={styles.title} numberOfLines={2}>{title}</Text>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => Toast.show({ type: 'info', text1: 'Editing coming soon' })}
                    >
                        <Ionicons name="pencil" size={16} color="#047857" />
                        <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => confirmDelete(item.id, item.postType)}
                    >
                        <Ionicons name="trash" size={16} color="#ef4444" />
                        <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </MotiView>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => { if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Posts</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={tabs}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.tabsScroll}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.tab, activeTab === item.id && styles.activeTab]}
                            onPress={() => setActiveTab(item.id)}
                        >
                            <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#047857" />
                </View>
            ) : filteredPosts.length > 0 ? (
                <FlatList
                    data={filteredPosts}
                    keyExtractor={(item) => `${item.postType}-${item.id}`}
                    renderItem={renderPost}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.centerBox}>
                    <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No posts found</Text>
                    <Text style={styles.emptyDesc}>You haven't created any {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} posts yet.</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        width: 40,
    },
    headerTitle: {
        fontSize: 18, 
        color: '#111827',
    },
    tabsContainer: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tabsScroll: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: '#f3f4f6',
    },
    activeTab: {
        backgroundColor: '#047857',
    },
    tabText: {
        fontSize: 14, 
        color: '#4b5563',
    },
    activeTabText: {
        color: '#ffffff',
    },
    listContainer: {
        padding: 16,
    },
    postCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: '#d1fae5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        color: '#065f46',
        fontSize: 10, 
    },
    dateText: {
        fontSize: 12, fontFamily: 'Outfit_400Regular',
        color: '#6b7280',
    },
    title: {
        fontSize: 16, 
        color: '#1f2937',
        lineHeight: 22,
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    editBtn: {
        borderColor: '#d1fae5',
        backgroundColor: '#ecfdf5',
    },
    editBtnText: {
        marginLeft: 6,
        color: '#047857',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14, fontFamily: 'Outfit_400Regular',
    },
    deleteBtn: {
        borderColor: '#fee2e2',
        backgroundColor: '#fef2f2',
    },
    deleteBtnText: {
        marginLeft: 6,
        color: '#ef4444',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14, fontFamily: 'Outfit_400Regular',
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 18, 
        color: '#111827',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14, fontFamily: 'Outfit_400Regular',
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    }
});







