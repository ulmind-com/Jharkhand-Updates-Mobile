import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Platform, TextInput, Vibration, RefreshControl } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { View as MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { PostSkeleton } from '../components/Skeletons';
import TopHeader from '../components/TopHeader';
import { ThemeContext } from '../context/ThemeContext';
import LinkedText from '../components/LinkedText';
import ExternalNewsCard from '../components/ExternalNewsCard';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

const AutoSizedImage = ({ uri, style }) => {
    const [aspectRatio, setAspectRatio] = useState(4 / 3);

    useEffect(() => {
        if (!uri) return;
        Image.getSize(uri, (width, height) => {
            if (width && height) {
                setAspectRatio(width / height);
            }
        }, () => { });
    }, [uri]);

    return (
        <Image
            source={{ uri }}
            style={[style, { aspectRatio, height: undefined }]}
            resizeMode="contain"
        />
    );
};

// ─── Community Post Card with Image Carousel ──────────────────────────────────
function CommunityPostCard({ item, navigation, colors, isDarkMode, styles,
    commentsMap, showCommentInput, setShowCommentInput, fetchComments,
    commentText, setCommentText }) {

    const [currentImg, setCurrentImg] = useState(0);
    const [aspectRatios, setAspectRatios] = useState({});

    const allImages = item.imageUrls || [];
    const hasImage = allImages.length > 0;
    const hasMultiple = allImages.length > 1;
    const imageWidth = width - 56;

    useEffect(() => {
        let mounted = true;
        allImages.forEach((uri, index) => {
            if (!uri) return;
            Image.getSize(uri, (w, h) => {
                if (mounted && w && h) {
                    setAspectRatios(prev => ({ ...prev, [index]: w / h }));
                }
            }, () => { });
        });
        return () => { mounted = false; };
    }, [allImages]);

    const currentAspectRatio = aspectRatios[currentImg] || aspectRatios[0] || (4 / 3);
    const currentImageHeight = imageWidth / currentAspectRatio;

    const authorName = `${item.author.firstName} ${item.author.lastName}`;
    const _cd = new Date(item.createdAt);
    const _ord = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
    const _months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateStr = `${_ord(_cd.getDate())} ${_months[_cd.getMonth()]} ${_cd.getFullYear()}`;

    return (
        <MotiView
            style={styles.card}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
        >
            {/* Header — tappable to details */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('CommunityPostDetails', { postId: item.id })}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarPlaceholder}>
                        {item.author.profileImageUrl ? (
                            <Image source={{ uri: item.author.profileImageUrl }} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="person" size={20} color={colors.textDim} />
                        )}
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.authorName}>{authorName} {item.author.role === 'ADMIN' && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}</Text>
                        <Text style={styles.dateText}>{dateStr}</Text>
                    </View>
                </View>
                {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}
            </TouchableOpacity>

            {/* ── Image Carousel (swipe) ────────────────────── */}
            {hasImage && (
                <MotiView
                    style={{ position: 'relative', marginBottom: 10, overflow: 'hidden', borderRadius: 8, backgroundColor: colors.surfaceDeeper }}
                    animate={{ height: currentImageHeight }}
                    transition={{ type: 'timing', duration: 300 }}
                >
                    <FlatList
                        data={allImages}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        nestedScrollEnabled={true}
                        keyExtractor={(_, idx) => `ci-${item.id}-${idx}`}
                        onScroll={(e) => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / imageWidth);
                            if (idx >= 0 && idx < allImages.length && idx !== currentImg) {
                                setCurrentImg(idx);
                            }
                        }}
                        renderItem={({ item: uri, index }) => {
                            const itemRatio = aspectRatios[index] || currentAspectRatio;
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => navigation.navigate('CommunityPostDetails', { postId: item.id })}
                                    style={{ width: imageWidth, height: imageWidth / itemRatio, justifyContent: 'center' }}
                                >
                                    <Image
                                        source={{ uri }}
                                        style={{ width: imageWidth, height: imageWidth / itemRatio }}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />

                    {/* Badge: 1/N */}
                    {hasMultiple && (
                        <View style={{
                            position: 'absolute', top: 8, right: 8,
                            backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
                            paddingHorizontal: 8, paddingVertical: 3,
                            flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 20,
                        }} pointerEvents="none">
                            <Ionicons name="copy-outline" size={12} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Outfit_600SemiBold' }}>
                                {currentImg + 1}/{allImages.length}
                            </Text>
                        </View>
                    )}

                    {/* Dots */}
                    {hasMultiple && (
                        <View style={{
                            position: 'absolute', bottom: 8, left: 0, right: 0,
                            flexDirection: 'row', justifyContent: 'center', gap: 5, zIndex: 20,
                        }} pointerEvents="none">
                            {allImages.map((_, idx) => (
                                <View key={idx} style={{
                                    width: idx === currentImg ? 8 : 6,
                                    height: idx === currentImg ? 8 : 6,
                                    borderRadius: idx === currentImg ? 4 : 3,
                                    backgroundColor: idx === currentImg ? '#fff' : 'rgba(255,255,255,0.5)',
                                }} />
                            ))}
                        </View>
                    )}
                </MotiView>
            )}

            {/* Text content — tappable to details */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('CommunityPostDetails', { postId: item.id })}>
                <LinkedText style={styles.postContent} numberOfLines={4}>{item.content}</LinkedText>
            </TouchableOpacity>

            {/* Actions */}
            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => {
                    setShowCommentInput(prev => {
                        const newState = { ...prev, [item.id]: !prev[item.id] };
                        if (newState[item.id] && !commentsMap[item.id]) {
                            fetchComments(item.id);
                        }
                        return newState;
                    });
                }}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                    <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>
            </View>

            {/* Inline Comments */}
            {showCommentInput[item.id] && (
                <View style={styles.inlineCommentContainer}>
                    {commentsMap[item.id]?.slice(0, 3).map((comment) => (
                        <View key={comment.id} style={styles.inlineCommentCard}>
                            <View style={styles.inlineCommentAvatar}>
                                {comment.author.profileImageUrl ? (
                                    <Image source={{ uri: comment.author.profileImageUrl }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={{ fontFamily: 'Outfit_700Bold', color: colors.textDim, fontSize: 12, marginTop: 4 }}>
                                        {comment.author.firstName?.charAt(0) || 'U'}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.inlineCommentBody}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.inlineCommentAuthor}>
                                        {comment.author.firstName} {comment.author.lastName}
                                    </Text>
                                    {comment.author.role === 'ADMIN' && <Ionicons name="checkmark-circle" size={12} color="#3b82f6" style={{ marginLeft: 4 }} />}
                                </View>
                                <Text style={styles.inlineCommentText}>{comment.content}</Text>
                            </View>
                        </View>
                    ))}

                    <View style={styles.inlineCommentInputContainer}>
                        <TextInput
                            style={styles.inlineCommentInputField}
                            placeholder="Write a comment..."
                            placeholderTextColor={colors.textDim}
                            value={commentText[item.id] || ""}
                            onChangeText={(text) => setCommentText(prev => ({ ...prev, [item.id]: text }))}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.inlineSendButton, !(commentText[item.id] || "").trim() && { opacity: 0.5 }]}
                            onPress={async () => {
                                if (Platform.OS !== 'web') {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }
                                try {
                                    const { sound } = await Audio.Sound.createAsync(
                                        require('../../assets/sounds/pop.mp3'),
                                        { shouldPlay: true }
                                    );
                                    sound.setOnPlaybackStatusUpdate(status => {
                                        if (status.didJustFinish) sound.unloadAsync();
                                    });
                                } catch (e) {
                                    console.log(e);
                                }
                                navigation.navigate('CommunityPostDetails', { postId: item.id });
                            }}
                            disabled={!(commentText[item.id] || "").trim()}
                        >
                            <Ionicons name="send" size={16} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </MotiView>
    );
}

export default function CommunityScreen() {
    const navigation = useNavigation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [commentsMap, setCommentsMap] = useState({});
    const [showCommentInput, setShowCommentInput] = useState({});
    const [commentText, setCommentText] = useState({});
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    const flatListRef = useRef(null);
    const scrollOffset = useRef(0);
    const [refreshing, setRefreshing] = useState(false);
    const [externalNews, setExternalNews] = useState([]);

    // Persistent external news injection pool
    const extNewsPoolRef = useRef([]);
    const extNewsIdxRef = useRef(0);
    const extNextGapRef = useRef(1 + Math.floor(Math.random() * 2)); // 1-2
    const extGapCountRef = useRef(0);

    // Fetch once on mount
    useEffect(() => {
        fetchExternalNews().then(() => fetchPosts(0, false));
    }, []);

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

    const fetchPosts = async (pageNum, append = false) => {
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.get(`${BASE_URL}/community`, {
                params: { page: pageNum, size: 10 },
                headers
            });

            if (res.data.success) {
                const pageData = res.data.data;
                const fetchedPosts = pageData.content || [];

                if (append) {
                    setPosts(prev => [...prev, ...fetchedPosts]);
                } else {
                    setPosts(fetchedPosts);

                    // Auto-show comments for 2-3 random posts (only on first load)
                    if (pageNum === 0 && fetchedPosts.length > 0) {
                        const numberOfPostsToShow = Math.min(Math.floor(Math.random() * 2) + 2, fetchedPosts.length);
                        const shuffledPosts = [...fetchedPosts].sort(() => Math.random() - 0.5);
                        const selectedPosts = shuffledPosts.slice(0, numberOfPostsToShow);

                        const autoShowComments = {};
                        selectedPosts.forEach((post) => {
                            autoShowComments[post.id] = true;
                            fetchComments(post.id);
                        });
                        setShowCommentInput(autoShowComments);
                    }
                }

                setPage(pageData.number);
                setHasMore(!pageData.last);
            }
        } catch (error) {
            console.error("Error fetching community posts:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load citizen news' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const fetchExternalNews = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/external-news/top-headlines`);
            const data = res.data?.data || res.data;
            // GNews.io uses 'articles', same key as NewsAPI
            const rawArticles = data?.articles || [];
            const articles = rawArticles.filter(a => a.title && a.url);
            extNewsPoolRef.current = articles; // Keep original order (latest first)
            extNewsIdxRef.current = 0;
            extGapCountRef.current = 0;
            extNextGapRef.current = 2 + Math.floor(Math.random() * 2); // insert a community post every 2-3 news items
        } catch (e) {
            console.log('External news fetch failed:', e?.message);
        }
    };

    // Build feed: NEWS is PRIMARY, only RECENT community posts are interleaved
    const buildMergedFeed = (communityPosts, newsPool) => {
        if (!newsPool || !newsPool.length) {
            return communityPosts.map(p => ({ ...p, _type: 'community' }));
        }

        // Split community posts: recent (within 4 days) vs older
        const now = Date.now();
        const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;
        const recentPosts = [];
        const olderPosts = [];
        communityPosts.forEach(p => {
            const postTime = p.createdAt ? new Date(p.createdAt).getTime() : 0;
            if (now - postTime <= FOUR_DAYS) {
                recentPosts.push(p);
            } else {
                olderPosts.push(p);
            }
        });

        const result = [];
        let recentIdx = 0;
        let newsCount = 0;
        const insertEvery = 2 + Math.floor(Math.random() * 2); // every 2-3 news

        // News articles first, with only RECENT community posts interleaved
        newsPool.forEach((newsItem, idx) => {
            result.push({
                ...newsItem,
                id: 'news_' + idx + '_' + (newsItem.url || Date.now()),
                _type: 'external_news'
            });
            newsCount++;

            if (newsCount >= insertEvery && recentIdx < recentPosts.length) {
                result.push({ ...recentPosts[recentIdx], _type: 'community' });
                recentIdx++;
                newsCount = 0;
            }
        });

        // Remaining recent posts
        while (recentIdx < recentPosts.length) {
            result.push({ ...recentPosts[recentIdx], _type: 'community' });
            recentIdx++;
        }

        // Older community posts go at the very end
        olderPosts.forEach(p => {
            result.push({ ...p, _type: 'community' });
        });

        return result;
    };

    const fetchComments = async (postId) => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get(`${BASE_URL}/comments/community-posts/${postId}`, { headers });
            if (res.data.success) {
                setCommentsMap(prev => ({ ...prev, [postId]: res.data.data }));
            }
        } catch (error) {
            console.error("Error fetching comments for post", postId);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            fetchPosts(page + 1, true);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        extNewsIdxRef.current = 0;
        extGapCountRef.current = 0;
        setPage(0);
        setHasMore(true);
        await fetchExternalNews();
        await fetchPosts(0, false);
        setRefreshing(false);
    };

    const renderPost = ({ item }) => {
        if (item._type === 'external_news') {
            return (
                <ExternalNewsCard
                    item={item}
                    colors={colors}
                    isDarkMode={isDarkMode}
                />
            );
        }

        return (
            <CommunityPostCard
                item={item}
                navigation={navigation}
                colors={colors}
                isDarkMode={isDarkMode}
                styles={styles}
                commentsMap={commentsMap}
                showCommentInput={showCommentInput}
                setShowCommentInput={setShowCommentInput}
                fetchComments={fetchComments}
                commentText={commentText}
                setCommentText={setCommentText}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <TopHeader showBackButton={true} title="Citizen News" />

            {loading && !loadingMore ? (
                <View style={styles.listContent}>
                    {[...Array(4)].map((_, i) => <PostSkeleton key={i} />)}
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={buildMergedFeed(posts, extNewsPoolRef.current)}
                    keyExtractor={(item, index) => item.id ? item.id.toString() + index : index.toString()}
                    renderItem={renderPost}
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
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No citizen news posts yet.</Text>
                    }
                />
            )}
            <Toast />
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContent: {
        padding: 12,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceDeeper,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    headerText: {
        justifyContent: 'center',
    },
    authorName: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14, fontFamily: 'Outfit_400Regular',
        color: colors.text,
    },
    dateText: {
        fontSize: 12, fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
        marginTop: 2,
    },
    postTitle: {
        fontSize: 16,
        color: colors.text,
        marginBottom: 8,
    },
    postImage: {
        width: '100%',
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: colors.surfaceDeeper,
    },
    postContent: {
        fontSize: 14, fontFamily: 'Outfit_400Regular',
        color: colors.text,
        lineHeight: 20,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        marginLeft: 6,
        fontSize: 14,
        color: colors.primary,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textDim,
        marginTop: 40,
        fontSize: 16, fontFamily: 'Outfit_400Regular',
    },
    inlineCommentContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
    inlineCommentCard: { flexDirection: 'row', marginBottom: 12 },
    inlineCommentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceDeeper, alignItems: 'center', overflow: 'hidden', marginRight: 8 },
    inlineCommentBody: { flex: 1 },
    inlineCommentAuthor: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.text, marginBottom: 2 },
    inlineCommentText: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: colors.text, lineHeight: 18 },
    inlineCommentInputContainer: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
    inlineCommentInputField: { flex: 1, backgroundColor: colors.surfaceDeeper, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 80, fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.text },
    inlineSendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginBottom: 2 },
});



