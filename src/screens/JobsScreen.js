import React, { useState, useEffect, useRef } from 'react';
import { Vibration, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, TextInput, RefreshControl } from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { View as MotiView } from 'moti';
import { JobSkeleton } from '../components/Skeletons';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function JobsScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({});
    const flatListRef = useRef(null);
    const scrollOffset = useRef(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch once on mount
    useEffect(() => { fetchJobs(0, false); }, []);

    // Restore scroll position when navigating back from details
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (scrollOffset.current > 0 && flatListRef.current) {
                setTimeout(() => {
                    flatListRef.current?.scrollToOffset({ offset: scrollOffset.current, animated: false });
                }, 50);
            }
        });
        return unsubscribe;
    }, [navigation]);

    const fetchJobs = async (pageNum, append = false) => {
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const res = await axios.get(`${BASE_URL}/jobs`, {
                params: { page: pageNum, size: 10 }
            });

            if (res.data.success) {
                const pageData = res.data.data;
                const newJobs = pageData.content.filter(job => job.status === 'APPROVED');

                if (append) {
                    setJobs(prev => [...prev, ...newJobs]);
                } else {
                    setJobs(newJobs);
                }

                setPage(pageData.number);
                setHasMore(!pageData.last);
            }
        } catch (error) {
            console.error("Error fetching jobs:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load jobs' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            fetchJobs(page + 1, true);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
        await fetchJobs(0, false);
        setRefreshing(false);
    };

    const filteredJobs = jobs.filter(job =>
        job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isJobExpired = (deadline) => {
        if (!deadline) return false;
        return new Date() > new Date(deadline);
    };

    const renderJob = ({ item }) => {
        const expired = isJobExpired(item.applicationDeadline);
        const dateStr = item.applicationDeadline ? new Date(item.applicationDeadline).toLocaleDateString() : '';

        return (
            <MotiView
                style={[styles.card, expired && styles.cardExpired]}
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 350 }}
            >
                {expired && (
                    <View style={styles.expiredBadge}>
                        <Text style={styles.expiredText}>EXPIRED</Text>
                    </View>
                )}

                {item.company && !expired && (
                    <View style={styles.companyBadge}>
                        <Text style={styles.companyText}>{item.company}</Text>
                    </View>
                )}

                {item.imageUrls?.length > 0 && (() => {
                    const imgUri = item.imageUrls[0];
                    if (!imageDimensions[item.id]) {
                        Image.getSize(imgUri, (w, h) => {
                            setImageDimensions(prev => ({ ...prev, [item.id]: h / w }));
                        }, () => {
                            setImageDimensions(prev => ({ ...prev, [item.id]: 0.5625 }));
                        });
                    }
                    return (
                        <Image
                            source={{ uri: imgUri }}
                            style={[
                                styles.jobImage,
                                expired ? { opacity: 0.6 } : {},
                                { aspectRatio: imageDimensions[item.id] ? (1 / imageDimensions[item.id]) : 1.77, height: undefined }
                            ]}
                            resizeMode="contain"
                        />
                    );
                })()}

                <View style={styles.cardContent}>
                    <Text style={[styles.title, expired && { color: '#9ca3af' }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    <View style={styles.detailsContainer}>
                        {item.location && (
                            <View style={styles.detailRow}>
                                <Ionicons name="location" size={16} color={expired ? '#9ca3af' : '#059669'} />
                                <Text style={[styles.detailText, expired && { color: '#9ca3af' }]}>{item.location}</Text>
                            </View>
                        )}

                        {item.salaryRange && (
                            <View style={styles.detailRow}>
                                <Ionicons name="cash" size={16} color={expired ? '#9ca3af' : '#d97706'} />
                                <Text style={[styles.detailText, expired && { color: '#9ca3af' }]}>{item.salaryRange}</Text>
                            </View>
                        )}

                        {item.applicationDeadline && (
                            <View style={styles.detailRow}>
                                <Ionicons name="calendar" size={16} color={expired ? '#ef4444' : '#2563eb'} />
                                <Text style={[styles.detailText, expired && { color: '#ef4444' }]}>
                                    Deadline: {dateStr}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.primaryButton, expired && styles.buttonDisabled]} onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}>
                            <Text style={styles.primaryButtonText}>View Details</Text>
                        </TouchableOpacity>

                        {item.reglink && !expired && (
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => Linking.openURL(item.reglink)}>
                                <Text style={styles.secondaryButtonText}>Apply Now</Text>
                                <Ionicons name="open-outline" size={16} color="#059669" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </MotiView>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: 8, marginLeft: -8, marginRight: 8 }}>
                    <Ionicons name="chevron-back" size={28} color={colors.primary} />
                </TouchableOpacity>
                {showSearch ? (
                    <TextInput
                        style={{ flex: 1, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 10, color: colors.text, fontFamily: 'Outfit_400Regular' }}
                        placeholder="Search jobs..."
                        placeholderTextColor={colors.textDim}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                ) : (
                    <Text style={styles.headerTitle}>Job Board</Text>
                )}
                <TouchableOpacity onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }} style={{ marginLeft: showSearch ? 0 : 'auto', padding: 4 }}>
                    <Ionicons name={showSearch ? "close" : "search"} size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {loading && !loadingMore ? (
                <View style={styles.listContent}>
                    {[...Array(5)].map((_, i) => <JobSkeleton key={i} />)}
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={filteredJobs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderJob}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    onScroll={(e) => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                    ListFooterComponent={() =>
                        loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} /> : null
                    }
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border
    },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.primary },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 12, paddingBottom: 100 },
    card: {
        backgroundColor: colors.surface, borderRadius: 20, marginBottom: 16, overflow: 'hidden',
        elevation: 3, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDarkMode ? 0.3 : 0.1, shadowRadius: 4,
        borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border
    },
    cardExpired: { borderColor: colors.border, borderWidth: 1 },
    expiredBadge: {
        position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444',
        paddingHorizontal: 12, paddingVertical: 4, borderBottomLeftRadius: 12, zIndex: 10
    },
    expiredText: { color: '#fff', fontSize: 10, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' },
    companyBadge: {
        position: 'absolute', top: 12, right: 12, backgroundColor: isDarkMode ? 'rgba(31,41,55,0.9)' : 'rgba(255,255,255,0.9)',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, zIndex: 10, elevation: 2
    },
    companyText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: colors.text },
    jobImage: { width: '100%', backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f9fafb' },
    cardContent: { padding: 16 },
    title: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 12 },
    detailsContainer: { gap: 8, marginBottom: 16 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim, flexShrink: 1 },
    buttonContainer: { flexDirection: 'row', gap: 10 },
    primaryButton: {
        flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center'
    },
    buttonDisabled: { backgroundColor: '#9ca3af' },
    primaryButtonText: { color: '#fff', fontSize: 14, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_600SemiBold' },
    secondaryButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingVertical: 10
    },
    secondaryButtonText: { color: colors.primary, fontSize: 14, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_600SemiBold' }
});







