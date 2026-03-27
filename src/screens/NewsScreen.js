import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { View as MotiView } from 'moti';
import { NewsSkeleton } from '../components/Skeletons';
import TopHeader from '../components/TopHeader';
import WeatherWidget from '../components/WeatherWidget';
import { useLocation } from '../context/LocationContext';
import { ThemeContext } from '../context/ThemeContext';
import FestivalBanner from '../components/FestivalBanner';
import NewsCard from '../components/NewsCard';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle — returns a NEW array */
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Inject property "ads" into a news list.
 * Every 3–5 news items a property card is inserted.
 * Each property appears AT MOST ONCE per render.
 */
function buildFeedWithProperties(newsItems, properties) {
    if (!properties.length) return newsItems.map(n => ({ ...n, _type: 'news' }));

    const result = [];
    const pool = shuffleArray(properties); // shuffle for variety
    let poolIdx = 0;
    let countdown = 3 + Math.floor(Math.random() * 3); // first gap: 3–5

    newsItems.forEach((item, i) => {
        result.push({ ...item, _type: 'news' });
        countdown--;
        if (countdown === 0 && poolIdx < pool.length) {
            result.push({ ...pool[poolIdx], _type: 'property' });
            poolIdx++;
            countdown = 3 + Math.floor(Math.random() * 3); // next gap: 3–5
        }
    });
    return result;
}

function formatPrice(price) {
    if (!price) return null;
    const num = parseFloat(price);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
    return `₹${num.toLocaleString('en-IN')}`;
}

// ─── Inline Property Ad Card ─────────────────────────────────────────────────
const PropertyAdCard = ({ item, navigation, colors, isDarkMode }) => {
    const styles = adStyles(colors, isDarkMode);
    const isInactive = item.propertyStatus === 'SOLD' || item.propertyStatus === 'RENTED';
    const statusLabel = item.propertyStatus === 'FOR_SALE' ? 'For Sale'
        : item.propertyStatus === 'FOR_RENT' ? 'For Rent'
            : item.propertyStatus || '';
    const price = formatPrice(item.price);

    return (
        <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 350 }}
        >
            <TouchableOpacity
                activeOpacity={0.88}
                style={styles.card}
                onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
            >
                {/* Sponsored label */}
                <View style={styles.sponsoredRow}>
                    <Ionicons name="home" size={12} color={isDarkMode ? '#6ee7b7' : '#059669'} />
                    <Text style={styles.sponsoredTxt}>Real Estate · Featured</Text>
                </View>

                <View style={styles.row}>
                    {/* Thumbnail */}
                    <View style={styles.thumb}>
                        {item.imageUrls && item.imageUrls.length > 0 ? (
                            <Image source={{ uri: item.imageUrls[0] }} style={styles.thumbImg} resizeMode="cover" />
                        ) : (
                            <View style={[styles.thumbImg, styles.thumbPlaceholder]}>
                                <Ionicons name="home-outline" size={28} color={colors.textDim} />
                            </View>
                        )}
                        {/* Status badge on image */}
                        {!isInactive && statusLabel ? (
                            <View style={[styles.imgBadge, item.propertyStatus === 'FOR_SALE' ? styles.badgeBlue : styles.badgeOrange]}>
                                <Text style={styles.imgBadgeTxt}>{statusLabel}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Details */}
                    <View style={styles.details}>
                        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={13} color={isDarkMode ? '#6ee7b7' : '#059669'} />
                            <Text style={styles.locationTxt} numberOfLines={1}>
                                {[item.locality, item.city, item.district].filter(Boolean).join(', ')}
                            </Text>
                        </View>

                        {/* Features pills */}
                        <View style={styles.features}>
                            {item.propertyType ? (
                                <View style={styles.pill}>
                                    <Text style={styles.pillTxt}>{item.propertyType}</Text>
                                </View>
                            ) : null}
                            {item.totalArea ? (
                                <View style={styles.pill}>
                                    <Text style={styles.pillTxt}>{item.totalArea} sq.ft</Text>
                                </View>
                            ) : null}
                            {item.bedrooms ? (
                                <View style={styles.pill}>
                                    <Ionicons name="bed-outline" size={11} color={isDarkMode ? '#94a3b8' : '#6b7280'} />
                                    <Text style={styles.pillTxt}>{item.bedrooms}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Price + CTA */}
                        <View style={styles.footer}>
                            {price ? (
                                <Text style={[styles.price, isInactive && styles.priceInactive]}>{price}</Text>
                            ) : null}
                            <View style={styles.cta}>
                                <Text style={styles.ctaTxt}>View</Text>
                                <Ionicons name="arrow-forward" size={13} color={isDarkMode ? '#6ee7b7' : '#059669'} />
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </MotiView>
    );
};

const adStyles = (colors, isDarkMode) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 18,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: isDarkMode ? '#134e2b' : '#bbf7d0',
        elevation: 4,
        shadowColor: '#059669',
        shadowOpacity: isDarkMode ? 0.15 : 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    sponsoredRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: isDarkMode ? 'rgba(5,150,105,0.12)' : '#f0fdf4',
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#134e2b' : '#bbf7d0',
    },
    sponsoredTxt: {
        fontSize: 11,
        fontFamily: 'Outfit_600SemiBold',
        color: isDarkMode ? '#6ee7b7' : '#059669',
        letterSpacing: 0.5,
    },
    row: { flexDirection: 'row', padding: 12, gap: 12 },
    thumb: { width: 110, height: 110, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    thumbImg: { width: '100%', height: '100%' },
    thumbPlaceholder: {
        backgroundColor: isDarkMode ? colors.surfaceDeeper : '#dcfce7',
        alignItems: 'center', justifyContent: 'center',
    },
    imgBadge: {
        position: 'absolute', bottom: 6, left: 6,
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
    },
    badgeBlue: { backgroundColor: '#2563eb' },
    badgeOrange: { backgroundColor: '#ea580c' },
    imgBadgeTxt: { color: '#fff', fontSize: 10, fontFamily: 'Outfit_700Bold' },
    details: { flex: 1, justifyContent: 'space-between' },
    title: {
        fontSize: 14, fontFamily: 'Outfit_700Bold',
        color: colors.text, lineHeight: 20, marginBottom: 4,
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
    locationTxt: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim, flex: 1 },
    features: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    pillTxt: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: colors.textDim },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    price: { fontSize: 15, fontFamily: 'Outfit_800ExtraBold', color: isDarkMode ? '#34d399' : '#047857' },
    priceInactive: { textDecorationLine: 'line-through', color: colors.textDim },
    cta: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: isDarkMode ? 'rgba(5,150,105,0.15)' : '#dcfce7',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },
    ctaTxt: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: isDarkMode ? '#6ee7b7' : '#059669' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function NewsScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
    const { selectedState } = useLocation();

    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Persistent property injection pool — survives across page loads
    const propPoolRef = useRef([]);    // shuffled APPROVED properties
    const propIdxRef = useRef(0);      // pointer to next unused property
    const nextGapRef = useRef(3 + Math.floor(Math.random() * 3)); // 3–5
    const gapCountRef = useRef(0);    // how many news since last injection
    const lastShownIdRef = useRef(null); // track last shown prop id (avoid back-to-back)

    // Fetch properties once (or when state changes)
    // Fetch properties once (or when state changes), reset pool
    const fetchProperties = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/properties`);
            if (res.data.success) {
                const approved = (res.data.data || []).filter(p => p.status === 'APPROVED');
                propPoolRef.current = shuffleArray(approved); // shuffle once
                propIdxRef.current = 0;
                gapCountRef.current = 0;
                nextGapRef.current = 3 + Math.floor(Math.random() * 3);
            }
        } catch (_) { /* silently fail – properties are non-critical */ }
    }, []);

    // Re-fetch when selected state changes (or on first mount)
    useEffect(() => {
        if (!selectedState) return; // Don't fetch until a state is available
        propIdxRef.current = 0;
        gapCountRef.current = 0;
        lastShownIdRef.current = null;
        nextGapRef.current = 3 + Math.floor(Math.random() * 3);
        setPage(0);
        setHasMore(true);
        fetchProperties().then(() => fetchNews(0, false, selectedState));
    }, [selectedState]);

    // Restore scroll position when navigating back from details
    const flatListRef = useRef(null);
    const scrollOffset = useRef(0);
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

    // Inject properties into a news batch, continuing from where the pool left off.
    // When pool exhausts, reshuffle avoiding back-to-back with the last shown property.
    const injectBatch = (newsBatch, propPool) => {
        if (!propPool.length) return newsBatch.map(n => ({ ...n, _type: 'news' }));
        const result = [];
        newsBatch.forEach(item => {
            result.push({ ...item, _type: 'news' });
            gapCountRef.current++;
            if (gapCountRef.current >= nextGapRef.current) {
                // If pool is exhausted, reshuffle for another cycle
                if (propIdxRef.current >= propPool.length) {
                    let reshuffled = shuffleArray(propPool);
                    // Ensure no back-to-back: if first item same as last shown, rotate it to end
                    if (lastShownIdRef.current && reshuffled.length > 1 && reshuffled[0].id === lastShownIdRef.current) {
                        reshuffled = [...reshuffled.slice(1), reshuffled[0]];
                    }
                    propPoolRef.current = reshuffled;
                    propIdxRef.current = 0;
                }
                const prop = propPoolRef.current[propIdxRef.current];
                result.push({ ...prop, _type: 'property' });
                lastShownIdRef.current = prop.id;
                propIdxRef.current++;
                gapCountRef.current = 0;
                nextGapRef.current = 3 + Math.floor(Math.random() * 3); // next gap: 3–5
            }
        });
        return result;
    };

    const fetchNews = async (pageNum, append = false, targetState = selectedState) => {
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const res = await axios.get(`${BASE_URL}/state-news/${targetState}`, {
                params: { page: pageNum, size: 10 }
            });

            if (res.data.success) {
                const pageData = res.data.data;
                const fetchedNews = pageData.content || [];
                const batchWithProps = injectBatch(fetchedNews, propPoolRef.current);

                if (append) {
                    setFeed(prev => [...prev, ...batchWithProps]);
                } else {
                    setFeed(batchWithProps);
                }

                setPage(pageData.number);
                setHasMore(!pageData.last);
            }
        } catch (error) {
            console.error('Error fetching news:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load news' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading && !refreshing) {
            fetchNews(page + 1, true);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        // Reset pool pointers
        propIdxRef.current = 0;
        gapCountRef.current = 0;
        lastShownIdRef.current = null;
        nextGapRef.current = 3 + Math.floor(Math.random() * 3);
        setPage(0);
        setHasMore(true);
        await fetchProperties();
        await fetchNews(0, false, selectedState);
        setRefreshing(false);
    };

    const renderItem = ({ item }) => {
        if (item._type === 'property') {
            return (
                <PropertyAdCard
                    item={item}
                    navigation={navigation}
                    colors={colors}
                    isDarkMode={isDarkMode}
                />
            );
        }
        return (
            <NewsCard
                item={item}
                navigation={navigation}
                colors={colors}
                isDarkMode={isDarkMode}
            />
        );
    };

    // ✅ Memoized header — stable reference prevents WeatherWidget/FestivalBanner remounting
    const renderFeedHeader = useCallback(() => (
        <View style={{ marginBottom: 20 }}>
            <FestivalBanner isDarkMode={isDarkMode} colors={colors} />
            <WeatherWidget />
            <Text style={styles.feedTitle}>Top Stories in {selectedState}</Text>
        </View>
    ), [isDarkMode, selectedState]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <TopHeader />
            {loading && !loadingMore ? (
                <View style={styles.listContent}>
                    {/* ✅ Show immediately — no refresh needed */}
                    <FestivalBanner isDarkMode={isDarkMode} colors={colors} />
                    <View style={{ marginBottom: 20 }}>
                        <WeatherWidget />
                    </View>
                    {[...Array(3)].map((_, i) => <NewsSkeleton key={i} />)}
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    ListHeaderComponent={renderFeedHeader}
                    data={feed}
                    keyExtractor={(item, index) => (item._type === 'property' ? `prop_${item.id}_${index}` : item.id ? item.id.toString() : index.toString())}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    onScroll={(e) => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#047857"
                            colors={['#047857', '#059669', '#34d399']}
                            progressBackgroundColor="#fff"
                        />
                    }
                    ListFooterComponent={() =>
                        loadingMore ? <ActivityIndicator size="small" color="#047857" style={{ marginVertical: 20 }} /> : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="newspaper-outline" size={64} color="#d1d5db" />
                            <Text style={styles.emptyText}>No news found for {selectedState}</Text>
                        </View>
                    }
                />
            )}

            {/* Floating AI Chat Bot */}
            <View style={styles.aiButtonContainer}>
                <MotiView
                    from={{ opacity: 0, scale: 0.8, translateY: 10 }}
                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                    transition={{
                        type: 'spring',
                        damping: 10,
                        stiffness: 100,
                        delay: 500
                    }}
                    style={styles.aiTooltipContainer}
                    pointerEvents="none"
                >
                    <View style={styles.aiTooltip}>
                        <Text style={styles.aiTooltipText}>Need to know</Text>
                        <Text style={[styles.aiTooltipText, { color: '#fbbf24', fontWeight: 'bold' }]}>Aaj ki taja khabar?</Text>
                        <View style={styles.aiTooltipArrow} />
                    </View>
                </MotiView>
                <TouchableOpacity
                    style={styles.aiButton}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('AiChat')}
                >
                    <MotiView
                        from={{ scale: 1 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{
                            type: 'timing',
                            duration: 2000,
                            loop: true
                        }}
                    >
                        <MaterialCommunityIcons name="robot-outline" size={28} color="#ffffff" />
                    </MotiView>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    feedTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.text, marginTop: 16, marginBottom: 4 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },
    card: {
        backgroundColor: colors.surface, borderRadius: 20, marginBottom: 20, overflow: 'hidden',
        elevation: 6, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDarkMode ? 0.3 : 0.15, shadowRadius: 8,
        borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border, minHeight: 250,
    },
    imageContainer: { flex: 1, position: 'relative', backgroundColor: isDarkMode ? colors.surfaceDeeper : '#1f2937' },
    newsImage: { width: '100%' },
    placeholderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? colors.surfaceDeeper : '#1f2937' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    cardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
    title: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#fff', marginBottom: 12, lineHeight: 28 },
    metaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    authorText: { color: '#e5e7eb', fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
    dateText: { color: '#d1d5db', fontSize: 12, fontFamily: 'Outfit_400Regular', marginLeft: 6 },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { color: colors.textDim, fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginTop: 16 },
    aiButtonContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 130 : 110,
        right: 20,
        alignItems: 'center',
        zIndex: 999,
    },
    aiButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#10b981', // Emerald green
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 2,
        borderColor: '#34d399',
    },
    aiTooltipContainer: {
        position: 'absolute',
        bottom: 65, // Position above the button
        right: 0,   // Align slightly to have arrow point at button
        alignItems: 'flex-end',
        width: 140,
    },
    aiTooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)', // Dark slate background
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiTooltipText: {
        color: '#ffffff',
        fontSize: 11,
        fontFamily: 'Outfit_500Medium',
        textAlign: 'center',
    },
    aiTooltipArrow: {
        position: 'absolute',
        bottom: -6,
        right: 22, // Align with the button center
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'rgba(15, 23, 42, 0.9)',
    }
});
