import React, { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    FlatList, ActivityIndicator, Image, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { MotiView } from 'moti';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function SearchScreen() {
    const navigation = useNavigation();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState('ALL');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);

    const tabs = [
        { id: 'ALL', label: 'All' },
        { id: 'JOBS', label: 'Jobs' },
        { id: 'PROPERTIES', label: 'Properties' },
        { id: 'EVENTS', label: 'Events' }
    ];

    const performSearch = async (searchQuery) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const q = searchQuery.toLowerCase();
            let allData = [];

            if (activeTab === 'ALL') {
                const [jobsRes, propsRes, eventsRes] = await Promise.all([
                    axios.get(`${BASE_URL}/jobs`).catch(() => ({ data: [] })),
                    axios.get(`${BASE_URL}/properties`).catch(() => ({ data: [] })),
                    axios.get(`${BASE_URL}/events`).catch(() => ({ data: [] }))
                ]);

                const extractData = (res, type) => {
                    const d = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.content) ? res.data.content : []);
                    return d.map(item => ({ ...item, type }));
                };

                allData = [
                    ...extractData(jobsRes, 'JOB'),
                    ...extractData(propsRes, 'PROPERTY'),
                    ...extractData(eventsRes, 'EVENT')
                ];
            } else {
                let apiEndpoint = `${BASE_URL}/jobs`;
                let type = 'JOB';

                if (activeTab === 'PROPERTIES') { apiEndpoint = `${BASE_URL}/properties`; type = 'PROPERTY'; }
                if (activeTab === 'EVENTS') { apiEndpoint = `${BASE_URL}/events`; type = 'EVENT'; }

                const resp = await axios.get(apiEndpoint);
                const d = Array.isArray(resp.data?.data) ? resp.data.data : (Array.isArray(resp.data?.content) ? resp.data.content : []);
                allData = d.map(item => ({ ...item, type }));
            }

            const filtered = allData.filter(item =>
                (item.title && item.title.toLowerCase().includes(q)) ||
                (item.name && item.name.toLowerCase().includes(q)) ||
                (item.description && item.description.toLowerCase().includes(q)) ||
                (item.jobTitle && item.jobTitle.toLowerCase().includes(q))
            );

            setResults(filtered);

        } catch (error) {
            console.error("Search error:", error);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Debounce manual implementation
    React.useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
        }, 500);
        return () => clearTimeout(timer);
    }, [query, activeTab]);

    const renderResultItem = ({ item }) => {
        return (
            <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                style={styles.resultCard}
            >
                <TouchableOpacity onPress={() => {
                    // Navigate to details based on type
                    if (item.type === 'JOB' || item.jobTitle) navigation.navigate('JobDetails', { id: item.id });
                    if (item.type === 'PROPERTY' || item.priceAmount) navigation.navigate('PropertyDetails', { id: item.id });
                    if (item.type === 'EVENT' || item.date) navigation.navigate('EventDetails', { id: item.id });
                }}>
                    <View style={styles.resultHeader}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {item.type === 'JOB' || item.jobTitle ? 'JOB' : item.type === 'PROPERTY' || item.priceAmount ? 'PROPERTY' : 'EVENT'}
                            </Text>
                        </View>
                        <Text style={styles.dateText}>{new Date(item.createdAt || item.postedAt || Date.now()).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.resultTitle} numberOfLines={2}>{item.title || item.name || item.jobTitle}</Text>
                    <Text style={styles.resultDesc} numberOfLines={2}>{item.description}</Text>
                </TouchableOpacity>
            </MotiView>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.searchHeader}>
                <TouchableOpacity style={styles.backButton} onPress={() => { if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#6b7280" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for jobs, events, properties..."
                        placeholderTextColor="#9ca3af"
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.content}>
                {isSearching ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color="#047857" />
                        <Text style={styles.loadingText}>Searching...</Text>
                    </View>
                ) : results.length > 0 ? (
                    <FlatList
                        data={results}
                        keyExtractor={item => item.id?.toString() || Math.random().toString()}
                        renderItem={renderResultItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                ) : query.length > 0 ? (
                    <View style={styles.centerBox}>
                        <Ionicons name="search-outline" size={64} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>No results found</Text>
                        <Text style={styles.emptyDesc}>Try adjusting your search terms or filters.</Text>
                    </View>
                ) : (
                    <View style={styles.centerBox}>
                        <Ionicons name="compass-outline" size={64} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>What are you looking for?</Text>
                        <Text style={styles.emptyDesc}>Search across all categories in your local area.</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        paddingHorizontal: 16,
        height: 48,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16, fontFamily: 'Outfit_400Regular',
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
        paddingHorizontal: 20,
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
    content: {
        flex: 1,
    },
    listContainer: {
        padding: 16,
    },
    resultCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
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
        color: '#9ca3af',
        fontSize: 12, fontFamily: 'Outfit_400Regular',
    },
    resultTitle: {
        fontSize: 16,
        color: '#111827',
        marginBottom: 4,
    },
    resultDesc: {
        fontSize: 14, fontFamily: 'Outfit_400Regular',
        color: '#4b5563',
        lineHeight: 20,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16, fontFamily: 'Outfit_400Regular',
        color: '#4b5563',
        fontFamily: 'Outfit_500Medium',
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







