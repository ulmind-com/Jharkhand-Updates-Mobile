import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    TextInput, Platform, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { View as MotiView } from 'moti';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';
const { width: SCREEN_W } = Dimensions.get('window');

// ─── Module-level comment cache (survives scroll) ─────────────────────────────
const _commentCache = {};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function formatTimeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getInitials(name = '') {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function stringToColor(str) {
    const palette = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ uri, name = '', size = 30 }) {
    const color = stringToColor(name);
    const initials = getInitials(name);
    if (uri) {
        return (
            <Image
                source={{ uri }}
                style={{ width: size, height: size, borderRadius: size / 2 }}
            />
        );
    }
    return (
        <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: color, alignItems: 'center', justifyContent: 'center',
        }}>
            <Text style={{ color: '#fff', fontSize: size * 0.38, fontFamily: 'Outfit_700Bold' }}>
                {initials}
            </Text>
        </View>
    );
}

// ─── Main NewsCard ─────────────────────────────────────────────────────────────
export default function NewsCard({ item, navigation, colors, isDarkMode }) {
    const styles = getStyles(colors, isDarkMode);

    const [comments, setComments] = useState(_commentCache[item.id] || []);
    const [commentsLoaded, setCommentsLoaded] = useState(!!_commentCache[item.id]);
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [myProfileImg, setMyProfileImg] = useState(null);
    const tokenRef = useRef(null);
    const fetchedRef = useRef(!!_commentCache[item.id]);

    const authorName = item.author
        ? `${item.author.firstName} ${item.author.lastName}`.trim()
        : 'Jharkhand Updates';
    const timeAgo = formatTimeAgo(item.createdAt);
    const location = item.state || item.location || '';
    const isVideo = item.imageUrls?.[0]?.match(/\.(mp4|webm|ogg)$/i) || item.imageUrls?.[0]?.includes('video');
    const imageUri = !isVideo && item.imageUrls?.length > 0 ? item.imageUrls[0] : null;

    useEffect(() => {
        // Load token + profile image
        const init = async () => {
            try {
                const tok = Platform.OS === 'web'
                    ? localStorage.getItem('accessToken')
                    : await SecureStore.getItemAsync('accessToken');
                tokenRef.current = tok;

                if (tok) {
                    const res = await axios.get(`${BASE_URL}/user/profile`, {
                        headers: { Authorization: `Bearer ${tok}` },
                    });
                    setMyProfileImg(res.data?.data?.profileImageUrl || null);
                }
            } catch (_) { }
        };
        init();

        // Fetch top 3 comments (use cache if available)
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        axios.get(`${BASE_URL}/comments/state-news/${item.id}`)
            .then(res => {
                if (res.data.success) {
                    const sorted = (res.data.data || [])
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .slice(0, 3);
                    _commentCache[item.id] = sorted;
                    setComments(sorted);
                }
            })
            .catch(() => { })
            .finally(() => setCommentsLoaded(true));
    }, [item.id]);

    const handleSubmit = async () => {
        if (!tokenRef.current) {
            Toast.show({ type: 'info', text1: 'Login required', text2: 'Please login to comment' });
            navigation.navigate('Login');
            return;
        }
        if (!commentText.trim()) return;

        setSubmitting(true);
        try {
            await axios.post(
                `${BASE_URL}/comments/state-news/${item.id}`,
                { content: commentText.trim() },
                { headers: { Authorization: `Bearer ${tokenRef.current}` } }
            );
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCommentText('');
            // Invalidate cache + re-fetch
            delete _commentCache[item.id];
            fetchedRef.current = false;
            const res = await axios.get(`${BASE_URL}/comments/state-news/${item.id}`);
            if (res.data.success) {
                const sorted = (res.data.data || [])
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 3);
                _commentCache[item.id] = sorted;
                setComments(sorted);
            }
            fetchedRef.current = true;
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Failed to post comment' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MotiView
            style={styles.card}
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 380 }}
        >
            {/* ── Image ─────────────────────────────────────────── */}
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => navigation.navigate('StateNewsDetails', { newsId: item.id })}
            >
                <View style={styles.imageWrapper}>
                    {imageUri ? (
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name={isVideo ? 'play-circle' : 'newspaper'} size={48} color="#9ca3af" />
                        </View>
                    )}


                </View>
            </TouchableOpacity>

            {/* ── Content ───────────────────────────────────────── */}
            <View style={styles.content}>
                {/* Title */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('StateNewsDetails', { newsId: item.id })}
                >
                    <Text style={styles.title}>
                        {item.title.replace(/<[^>]*>?/gm, '')}
                    </Text>
                </TouchableOpacity>

                {/* Author + time + location */}
                <View style={styles.metaRow}>
                    <Avatar
                        uri={item.author?.profileImageUrl}
                        name={authorName}
                        size={22}
                    />
                    <Text style={styles.authorText}>{authorName}</Text>
                    {item.author?.role === 'ADMIN' && (
                        <Ionicons name="checkmark-circle" size={13} color="#3b82f6" />
                    )}
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.metaText}>{timeAgo}</Text>
                    {location ? (
                        <>
                            <Text style={styles.dot}>·</Text>
                            <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
                        </>
                    ) : null}
                </View>

                {/* ── Divider ──────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Top 3 Comments ───────────────────────────── */}
                {!commentsLoaded ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
                ) : comments.length > 0 ? (
                    <View style={styles.commentsBlock}>
                        {comments.map((cmt) => {
                            const cName = cmt.author
                                ? `${cmt.author.firstName} ${cmt.author.lastName}`.trim()
                                : 'Anonymous';
                            return (
                                <View key={cmt.id} style={styles.commentRow}>
                                    <Avatar uri={cmt.author?.profileImageUrl} name={cName} size={28} />
                                    <View style={styles.commentBubble}>
                                        <View style={styles.commentHeader}>
                                            <Text style={styles.commentAuthor}>{cName}</Text>
                                            {cmt.author?.role === 'ADMIN' && (
                                                <Ionicons name="checkmark-circle" size={12} color="#3b82f6" style={{ marginLeft: 3 }} />
                                            )}
                                            <Text style={styles.commentTime}>{formatTimeAgo(cmt.createdAt)}</Text>
                                        </View>
                                        <Text style={styles.commentText} numberOfLines={2}>{cmt.content}</Text>
                                    </View>
                                </View>
                            );
                        })}
                        {/* See all comments link */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('StateNewsDetails', { newsId: item.id })}
                            style={styles.seeAllBtn}
                        >
                            <Text style={styles.seeAllText}>View all comments →</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* ── Inline Comment Input ─────────────────────── */}
                <View style={styles.inputRow}>
                    <Avatar uri={myProfileImg} name="Me" size={30} />
                    <TextInput
                        style={styles.input}
                        placeholder="Write a comment..."
                        placeholderTextColor={colors.textDim}
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline={false}
                        returnKeyType="send"
                        onSubmitEditing={handleSubmit}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!commentText.trim() || submitting) && { opacity: 0.4 }]}
                        onPress={handleSubmit}
                        disabled={!commentText.trim() || submitting}
                    >
                        {submitting
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name="send" size={14} color="#fff" />
                        }
                    </TouchableOpacity>
                </View>
            </View>
        </MotiView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (colors, isDarkMode) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginBottom: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.2 : 0.07,
        shadowRadius: 8,
    },

    // Image
    imageWrapper: {
        width: '100%',
        height: 210,
        position: 'relative',
        backgroundColor: colors.surfaceDeeper,
    },
    image: { width: '100%', height: '100%' },
    imagePlaceholder: {
        width: '100%', height: '100%',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surfaceDeeper,
    },
    commentBadge: {
        position: 'absolute',
        top: 12, right: 12,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#10b981',
        paddingHorizontal: 9, paddingVertical: 5,
        borderRadius: 20,
        elevation: 3,
    },
    commentBadgeTxt: {
        color: '#fff', fontSize: 12, fontFamily: 'Outfit_700Bold',
    },

    // Content
    content: { padding: 14 },

    title: {
        fontSize: 17,
        fontFamily: 'Outfit_700Bold',
        fontWeight: 'bold',
        color: colors.text,
        lineHeight: 24,
        marginBottom: 10,
    },

    // Author row
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 5,
        marginBottom: 12,
    },
    authorText: {
        fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: colors.text,
    },
    dot: { color: colors.textDim, fontSize: 12 },
    metaText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim },

    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 12,
    },

    // Comments
    commentsBlock: { marginBottom: 10 },
    commentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 9,
        marginBottom: 10,
    },
    commentBubble: { flex: 1 },
    commentHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2,
    },
    commentAuthor: {
        fontSize: 13, fontFamily: 'Outfit_700Bold', color: colors.text,
    },
    commentTime: {
        fontSize: 11, fontFamily: 'Outfit_400Regular', color: colors.textDim,
        marginLeft: 'auto',
    },
    commentText: {
        fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.text, lineHeight: 18,
    },
    seeAllBtn: { marginTop: 2, marginBottom: 4 },
    seeAllText: {
        fontSize: 12, fontFamily: 'Outfit_600SemiBold',
        color: isDarkMode ? '#6ee7b7' : '#059669',
    },
    noCommentsRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginBottom: 10,
    },
    noCommentsText: {
        fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim, fontStyle: 'italic',
    },

    // Comment input
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    input: {
        flex: 1,
        backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        fontSize: 13,
        fontFamily: 'Outfit_400Regular',
        color: colors.text,
        borderWidth: 1,
        borderColor: isDarkMode ? colors.border : 'transparent',
    },
    sendBtn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#10b981',
        alignItems: 'center', justifyContent: 'center',
    },
});
