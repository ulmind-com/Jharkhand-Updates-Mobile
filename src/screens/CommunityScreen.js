import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Platform, TextInput, Vibration } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { View as MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { PostSkeleton } from '../components/Skeletons';
import TopHeader from '../components/TopHeader';
import { ThemeContext } from '../context/ThemeContext';

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

    useFocusEffect(
        useCallback(() => {
            fetchPosts(0, false);
        }, [])
    );

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
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load community posts' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
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

    const renderPost = ({ item }) => {
        const hasImage = item.imageUrls && item.imageUrls.length > 0;
        const authorName = `${item.author.firstName} ${item.author.lastName}`;
        const dateStr = new Date(item.createdAt).toLocaleDateString();

        return (
            <MotiView
                style={styles.card}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400 }}
            >
                <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('CommunityPostDetails', { postId: item.id })}>
                    {/* Header */}
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

                    {/* Content */}
                    {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}

                    {hasImage && (
                        <AutoSizedImage
                            uri={item.imageUrls[0]}
                            style={styles.postImage}
                        />
                    )}

                    <Text style={styles.postContent} numberOfLines={4}>{item.content}</Text>
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
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <TopHeader />

            {loading && !loadingMore ? (
                <View style={styles.listContent}>
                    {[...Array(4)].map((_, i) => <PostSkeleton key={i} />)}
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderPost}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() =>
                        loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} /> : null
                    }
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No community posts yet.</Text>
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



