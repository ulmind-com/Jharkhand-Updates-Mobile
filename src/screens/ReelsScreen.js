import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity,
    ActivityIndicator, Image, Platform, Share, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { MotiView } from 'moti';
import { useLocation } from '../context/LocationContext';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';
import YoutubePlayer from 'react-native-youtube-iframe';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function ReelsScreen() {
    const { selectedState } = useLocation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    const [reels, setReels] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [pausedByUser, setPausedByUser] = useState(false);

    const flatListRef = useRef(null);
    const videoRefs = useRef({});

    // ─── Fetch Reels ──────────────────────────────────────────────────────────
    const fetchReels = useCallback(async (pageNum = 0, isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else if (pageNum === 0) setLoading(true);

            const res = await axios.get(
                `${BASE_URL}/reels/${encodeURIComponent(selectedState)}/merged`,
                { params: { page: pageNum, size: 10 } }
            );

            if (res.data?.success) {
                const data = res.data.data;
                const newItems = data.items || [];
                if (isRefresh || pageNum === 0) {
                    setReels(newItems);
                } else {
                    setReels(prev => [...prev, ...newItems]);
                }
                setHasMore(data.hasMore);
                setPage(pageNum);
            }
        } catch (err) {
            console.error('Failed to fetch reels:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedState]);

    useEffect(() => {
        setPage(0);
        setReels([]);
        fetchReels(0, false);
    }, [selectedState]);

    // Pause all videos when screen loses focus
    useEffect(() => {
        if (!isFocused) {
            Object.values(videoRefs.current).forEach(ref => {
                ref?.pauseAsync?.();
            });
        }
    }, [isFocused]);

    const onRefresh = () => fetchReels(0, true);
    const loadMore = () => {
        if (hasMore && !loading) {
            fetchReels(page + 1, false);
        }
    };

    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setCurrentIndex(viewableItems[0].index);
            setPausedByUser(false); // Reset pause when scrolling to new reel
        }
    }, []);

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const handleShare = async (item) => {
        try {
            if (item.type === 'YOUTUBE' && item.youtubeVideoId) {
                await Share.share({
                    message: `${item.title}\nhttps://youtube.com/watch?v=${item.youtubeVideoId}`,
                });
            } else if (item.videoUrl) {
                await Share.share({ message: `${item.title}\n${item.videoUrl}` });
            }
        } catch (e) {
            console.log('Share error:', e);
        }
    };

    // ─── Render a single Reel ─────────────────────────────────────────────────
    const renderReel = ({ item, index }) => {
        const isActive = index === currentIndex && isFocused;
        const isNearActive = Math.abs(index - currentIndex) <= 1 && isFocused;
        const shouldPlay = isActive && !pausedByUser;

        return (
            <View style={[styles.reelContainer, { height: containerHeight }]}>
                {/* Video / YouTube Thumbnail */}
                {item.type === 'NATIVE_MP4' && item.videoUrl ? (
                    <View style={styles.video}>
                        <Video
                            ref={ref => { videoRefs.current[index] = ref; }}
                            source={{ uri: item.videoUrl }}
                            style={styles.video}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={shouldPlay}
                            isLooping
                            isMuted={false}
                            useNativeControls={false}
                        />
                        {/* Tap to pause/play */}
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => {
                                if (isActive) setPausedByUser(prev => !prev);
                            }}
                        >
                            {isActive && pausedByUser && (
                                <View style={styles.pauseOverlay}>
                                    <Ionicons name="play" size={64} color="rgba(255,255,255,0.85)" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : item.type === 'YOUTUBE' && item.youtubeVideoId ? (
                    <View style={styles.video}>
                        {/* Full-screen blurred thumbnail background - always visible */}
                        <Image
                            source={{ uri: item.thumbnailUrl || `https://i.ytimg.com/vi/${item.youtubeVideoId}/hqdefault.jpg` }}
                            style={[styles.video, { opacity: 0.6 }]}
                            resizeMode="cover"
                            blurRadius={Platform.OS === 'ios' ? 15 : 8}
                        />
                        {/* Sharp thumbnail - hide when YouTube player is loaded */}
                        <Image
                            source={{ uri: item.thumbnailUrl || `https://i.ytimg.com/vi/${item.youtubeVideoId}/hqdefault.jpg` }}
                            style={[styles.video, { opacity: isNearActive ? 0 : 1 }]}
                            resizeMode="cover"
                        />
                        {/* YouTube Player - pre-render for nearby items, play only active */}
                        {isNearActive && (
                            <View style={[styles.video, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }]} pointerEvents="none">
                                {Platform.OS === 'web' ? (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${item.youtubeVideoId}?autoplay=${isActive ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${item.youtubeVideoId}`}
                                        style={{ width: '100%', height: '100%', border: 'none', objectFit: 'contain' }}
                                        allow="autoplay; fullscreen; encrypted-media"
                                    />
                                ) : (
                                    <YoutubePlayer
                                        height={containerHeight > 0 ? containerHeight : SCREEN_HEIGHT}
                                        width={SCREEN_WIDTH}
                                        videoId={item.youtubeVideoId}
                                        play={shouldPlay}
                                        forceAndroidAutoplay={true}
                                        initialPlayerParams={{
                                            modestbranding: true,
                                            controls: false,
                                            rel: false,
                                            loop: true,
                                            fs: false,
                                            playsinline: true,
                                        }}
                                        webViewProps={{
                                            mediaPlaybackRequiresUserAction: false,
                                            allowsInlineMediaPlayback: true,
                                            androidLayerType: 'hardware',
                                            scrollEnabled: false,
                                            nestedScrollEnabled: false,
                                            overScrollMode: 'never',
                                        }}
                                        webViewStyle={{ opacity: 0.99 }}
                                    />
                                )}
                            </View>
                        )}
                        {/* Tap to pause/play overlay */}
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => {
                                if (isActive) setPausedByUser(prev => !prev);
                            }}
                        >
                            {isActive && pausedByUser && (
                                <View style={styles.pauseOverlay}>
                                    <Ionicons name="play" size={64} color="rgba(255,255,255,0.85)" />
                                </View>
                            )}
                        </TouchableOpacity>
                        {/* Gradient overlays for premium look */}
                        <View style={styles.topGradient} pointerEvents="none" />
                        <View style={styles.bottomGradient} pointerEvents="none" />
                        {/* YouTube Badge */}
                        <View style={styles.ytBadge}>
                            <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                            <Text style={styles.ytBadgeText}>YouTube</Text>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.video, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="videocam-off-outline" size={48} color="#555" />
                    </View>
                )}

                {/* Overlay: Bottom Info */}
                <View style={styles.bottomOverlay} pointerEvents="box-none">
                    {/* Source Logo + Name */}
                    <View style={styles.sourceRow}>
                        {item.sourceLogo && (
                            <Image source={{ uri: item.sourceLogo }} style={styles.sourceLogo} />
                        )}
                        <Text style={styles.sourceName} numberOfLines={1}>
                            {item.sourceName || item.author || 'Unknown'}
                        </Text>
                        {item.type === 'NATIVE_MP4' && (
                            <View style={styles.exclusiveBadge}>
                                <Text style={styles.exclusiveText}>EXCLUSIVE</Text>
                            </View>
                        )}
                    </View>
                    {/* Title */}
                    <Text style={styles.reelTitle} numberOfLines={3}>
                        {item.title}
                    </Text>
                    {/* State badge */}
                    <View style={styles.stateBadge}>
                        <Ionicons name="location" size={12} color="#10b981" />
                        <Text style={styles.stateText}>{item.stateName || selectedState}</Text>
                    </View>
                </View>

                {/* Right Action Buttons */}
                <View style={styles.actionColumn} pointerEvents="box-none">
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
                        <MotiView
                            from={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', delay: 200 }}
                        >
                            <Ionicons name="share-social" size={28} color="#fff" />
                            <Text style={styles.actionText}>Share</Text>
                        </MotiView>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // ─── Loading State ────────────────────────────────────────────────────────
    if (loading && reels.length === 0) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: '#ffffff' }]}>
                <MotiView
                    from={{ opacity: 0.4 }}
                    animate={{ opacity: 1 }}
                    transition={{
                        type: 'timing',
                        duration: 800,
                        loop: true,
                    }}
                    style={{ flex: 1, width: '100%', padding: 20, justifyContent: 'flex-end' }}
                >
                    {/* Skeleton Bottom Info */}
                    <View style={{ marginBottom: Platform.OS === 'ios' ? 100 : 80, width: '75%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                            <View style={{ width: 36, height: 36, backgroundColor: '#e0e0e0', borderRadius: 18 }} />
                            <View style={{ width: 120, height: 18, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                        </View>
                        <View style={{ width: '100%', height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 8 }} />
                        <View style={{ width: '85%', height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 8 }} />
                        <View style={{ width: '40%', height: 14, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                    </View>

                    {/* Skeleton Action Buttons (Right Side) */}
                    <View style={{ position: 'absolute', right: 20, bottom: Platform.OS === 'ios' ? 120 : 100, gap: 24, alignItems: 'center' }}>
                        <View style={{ width: 40, height: 40, backgroundColor: '#e0e0e0', borderRadius: 20 }} />
                    </View>
                </MotiView>
            </View>
        );
    }

    // ─── Empty State ──────────────────────────────────────────────────────────
    if (!loading && reels.length === 0) {
        return (
            <SafeAreaView style={[styles.emptyContainer, { backgroundColor: '#000' }]} edges={['top']}>
                <MotiView
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring' }}
                    style={styles.emptyContent}
                >
                    <Ionicons name="videocam-outline" size={64} color="#555" />
                    <Text style={styles.emptyTitle}>No Reels Yet</Text>
                    <Text style={styles.emptySubtitle}>Reels for {selectedState} will appear here</Text>
                </MotiView>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Header overlay */}
            <SafeAreaView style={styles.headerOverlay} edges={['top']} pointerEvents="box-none">
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Reels</Text>
                    <View style={styles.headerStateBadge}>
                        <Ionicons name="location-sharp" size={14} color="#10b981" />
                        <Text style={styles.headerStateText}>{selectedState}</Text>
                    </View>
                </View>
            </SafeAreaView>

            {/* Measure the available space first, then render FlatList */}
            <View
                style={{ flex: 1 }}
                onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    if (h > 0 && containerHeight === 0) {
                        setContainerHeight(h);
                    }
                }}
            >
                {containerHeight > 0 && (
                    <FlatList
                        ref={flatListRef}
                        data={reels}
                        extraData={`${currentIndex}_${pausedByUser}`}
                        renderItem={renderReel}
                        keyExtractor={(item, index) => item.id + '_' + index}
                        pagingEnabled
                        showsVerticalScrollIndicator={false}
                        decelerationRate="fast"
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        initialNumToRender={2}
                        maxToRenderPerBatch={3}
                        windowSize={5}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    reelContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    pauseOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },

    // ─── YouTube Overlay ──────────────────────────
    ytPlayOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ytPlayButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    ytBadge: {
        position: 'absolute',
        top: 60,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    ytBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
    },

    // ─── Bottom Overlay ───────────────────────────
    bottomOverlay: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 120 : 100,
        left: 16,
        right: 80,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    sourceLogo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#333',
    },
    sourceName: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
        flex: 1,
    },
    exclusiveBadge: {
        backgroundColor: '#10b981',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    exclusiveText: {
        color: '#fff',
        fontSize: 9,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 1,
    },
    reelTitle: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Outfit_500Medium',
        lineHeight: 22,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    stateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        backgroundColor: 'rgba(16,185,129,0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.3)',
    },
    stateText: {
        color: '#10b981',
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
    },

    // ─── Right Action Buttons ─────────────────────
    actionColumn: {
        position: 'absolute',
        right: 12,
        bottom: Platform.OS === 'ios' ? 140 : 120,
        alignItems: 'center',
        gap: 24,
    },
    actionBtn: {
        alignItems: 'center',
    },
    actionText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Outfit_500Medium',
        marginTop: 4,
    },

    // ─── Header Overlay ───────────────────────────
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 8,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontFamily: 'Outfit_700Bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    headerStateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.4)',
    },
    headerStateText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Outfit_600SemiBold',
    },

    // ─── Loading & Empty ──────────────────────────
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
        marginTop: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContent: {
        alignItems: 'center',
        gap: 12,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
    },
    emptySubtitle: {
        color: '#777',
        fontSize: 14,
        fontFamily: 'Outfit_400Regular',
    },
});
