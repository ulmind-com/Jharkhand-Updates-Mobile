import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Platform, TextInput, Alert, KeyboardAvoidingView, Vibration, Share } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useRoute, useNavigation } from '@react-navigation/native';
import { View as MotiView } from 'moti';
import ImageViewing from '../components/ImageViewer';
import { DetailSkeleton } from '../components/Skeletons';
import { ThemeContext } from '../context/ThemeContext';
import { Audio } from 'expo-av';
import LinkedText from '../components/LinkedText';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

// ── Fair round-robin property rotation (module-level, survives remounts) ──────
let _propPool = [];
let _propFetchTime = 0;
let _propIndex = 0;

function formatPropertyPrice(price) {
    if (!price) return null;
    const num = parseFloat(price);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
    return `₹${num.toLocaleString('en-IN')}`;
}

// Split text into ~15-line chunks at word boundaries (~750 chars each)
function getContentChunks(text, charsPerChunk = 750) {
    if (!text || text.length <= charsPerChunk) return [text];
    const chunks = [];
    let remaining = text;
    while (remaining.length > charsPerChunk) {
        const slice = remaining.slice(0, charsPerChunk);
        const lastSpace = slice.lastIndexOf(' ');
        const cutAt = lastSpace > 200 ? lastSpace : charsPerChunk;
        chunks.push(remaining.slice(0, cutAt));
        remaining = remaining.slice(cutAt).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
}

const formatCommentDate = (date) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now - commentDate) / 1000);

    if (diffInSeconds < 60) return `${Math.max(0, diffInSeconds)}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w`;

    return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const CommentItem = ({ comment, level = 0, onReply, onEdit, onDelete, currentUser, postOwnerId, colors, isDarkMode, styles }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const hasReplies = comment.replies && comment.replies.length > 0;

    // Safety check for author
    const authorName = comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : 'Anonymous';
    // Provide a default avatar if none exists
    const avatarUrl = comment.author?.profileImageUrl || null;

    const isCommentOwner = currentUser && comment.author?.id === currentUser.id;
    const isPostOwner = currentUser && postOwnerId === currentUser.id;
    const canEdit = isCommentOwner;
    const canDelete = isCommentOwner || isPostOwner;

    return (
        <MotiView
            style={[styles.commentCardWrapper, { marginLeft: level * 30, zIndex: showOptions ? 100 : 1 }]}
            from={{ opacity: 0, translateX: -10 }}
            animate={{ opacity: 1, translateX: 0 }}
        >
            <View style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                        <Image source={{ uri: "https://ui-avatars.com/api/?name=" + encodeURIComponent(authorName) + "&background=d1fae5&color=047857" }} style={styles.avatarImage} />
                    )}
                </View>

                <View style={styles.commentBody}>
                    <View style={styles.commentHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.commentAuthor}>
                                {authorName}
                            </Text>
                            {comment.author?.role === 'ADMIN' && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" style={{ marginLeft: 4 }} />}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: showOptions ? 9999 : 1, position: 'relative' }}>
                            <Text style={styles.commentDate}>{formatCommentDate(comment.createdAt)}</Text>
                            {(canEdit || canDelete) && (
                                <View style={{ position: 'relative', zIndex: showOptions ? 9999 : 1 }}>
                                    <TouchableOpacity onPress={() => setShowOptions(!showOptions)} style={{ marginLeft: 8, paddingHorizontal: 4, zIndex: 2 }}>
                                        <Ionicons name="ellipsis-vertical" size={16} color={colors.textDim} />
                                    </TouchableOpacity>

                                    {showOptions && (
                                        <View style={{
                                            position: 'absolute',
                                            top: 24,
                                            right: 0,
                                            backgroundColor: isDarkMode ? colors.surface : '#ffffff',
                                            borderRadius: 8,
                                            paddingVertical: 4,
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.15,
                                            shadowRadius: 4,
                                            elevation: 5,
                                            zIndex: 9999,
                                            minWidth: 120,
                                            borderWidth: 1,
                                            borderColor: isDarkMode ? colors.border : '#e5e7eb'
                                        }}>
                                            {canEdit && (
                                                <TouchableOpacity
                                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 }}
                                                    onPress={() => { setShowOptions(false); onEdit(comment); }}
                                                >
                                                    <Ionicons name="pencil-outline" size={16} color="#3b82f6" />
                                                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 13, color: '#3b82f6', marginLeft: 8 }}>Edit</Text>
                                                </TouchableOpacity>
                                            )}
                                            {canDelete && (
                                                <TouchableOpacity
                                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 }}
                                                    onPress={() => { setShowOptions(false); onDelete(comment.id || comment._id); }}
                                                >
                                                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                                    <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 13, color: '#ef4444', marginLeft: 8 }}>Delete</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}

                                    {/* Invisible backdrop specific to this comment to catch outside clicks */}
                                    {showOptions && Platform.OS === 'web' && (
                                        <TouchableOpacity
                                            style={{
                                                position: 'fixed',
                                                top: 0,
                                                left: 0,
                                                width: '100vw',
                                                height: '100vh',
                                                zIndex: 9998,
                                                cursor: 'default'
                                            }}
                                            activeOpacity={1}
                                            onPress={() => setShowOptions(false)}
                                        />
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                    <LinkedText style={styles.commentContent}>{comment.content}</LinkedText>

                    <View style={styles.commentActions}>
                        <TouchableOpacity style={styles.replyButton} onPress={() => onReply(comment)}>
                            <Text style={styles.replyButtonText}>Reply</Text>
                        </TouchableOpacity>

                        {hasReplies && (
                            <TouchableOpacity style={styles.toggleRepliesBtn} onPress={() => setShowReplies(!showReplies)}>
                                <Ionicons name={showReplies ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
                                <Text style={styles.toggleRepliesText}>{showReplies ? `Hide ${comment.replies.length}` : `View ${comment.replies.length} replies`}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Render nested replies if expanded */}
            {hasReplies && showReplies && (
                <View style={styles.repliesContainer}>
                    {/* Visual tread line */}
                    <View style={styles.threadLine} />
                    {comment.replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            level={level + 1}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            currentUser={currentUser}
                            postOwnerId={postOwnerId}
                            colors={colors}
                            isDarkMode={isDarkMode}
                            styles={styles}
                        />
                    ))}
                </View>
            )}
        </MotiView>
    );
};

export default function StateNewsDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { newsId } = route.params;
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [news, setNews] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [seeMore, setSeeMore] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [imageRatio, setImageRatio] = useState(null);
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    const [featuredProperty, setFeaturedProperty] = useState(null);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
                if (token) {
                    const res = await axios.get(`${BASE_URL}/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
                    if (res.data.success) setCurrentUser(res.data.data);
                }
            } catch (e) { console.log('Error fetching user profile', e); }
        };

        const fetchFeaturedProperty = async () => {
            try {
                const now = Date.now();
                // Re-fetch pool every 30 minutes
                if (!_propPool.length || (now - _propFetchTime > 30 * 60 * 1000)) {
                    const res = await axios.get(`${BASE_URL}/properties`);
                    if (res.data.success) {
                        // Only active listings
                        _propPool = (res.data.data || []).filter(
                            p => p.propertyStatus !== 'SOLD' && p.propertyStatus !== 'RENTED'
                        );
                        _propFetchTime = now;
                    }
                }
                if (_propPool.length > 0) {
                    // Fair round-robin — cycle through all properties across visits
                    const idx = _propIndex % _propPool.length;
                    _propIndex++;
                    setFeaturedProperty(_propPool[idx]);
                }
            } catch (e) { /* silently fail — ads are non-critical */ }
        };

        fetchCurrentUser();
        fetchNewsDetails();
        fetchComments();
        fetchFeaturedProperty();
    }, [newsId]);

    useEffect(() => {
        if (news?.imageUrls?.[0]) {
            Image.getSize(news.imageUrls[0], (w, h) => {
                if (w && h) setImageRatio(w / h);
            }, () => { });
        }
    }, [news]);

    const fetchNewsDetails = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            // Using a generic GET or specific to state-news
            const res = await axios.get(`${BASE_URL}/state-news/details/${newsId}`, config);
            if (res.data.success) {
                setNews(res.data.data);
            } else {
                // Fallback in case endpoint is just /state-news/{id}
                const fallbackRes = await axios.get(`${BASE_URL}/state-news/${newsId}`, config);
                if (fallbackRes.data.success) {
                    setNews(fallbackRes.data.data);
                }
            }
        } catch (error) {
            console.error("Error fetching news details:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'News not found or deleted.' });
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.get(`${BASE_URL}/comments/state-news/${newsId}`, { headers });
            if (res.data.success) {
                let fetchedComments = res.data.data || [];
                fetchedComments.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                fetchedComments.forEach(cmt => {
                    if (cmt.replies) {
                        cmt.replies.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                    }
                });
                setComments(fetchedComments);
            }
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            if (!token) {
                Toast.show({ type: 'error', text1: 'Please login to comment' });
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };

            if (editingComment) {
                const payload = { content: commentText };
                await axios.put(`${BASE_URL}/comments/${editingComment.id}`, payload, { headers });
                setEditingComment(null);
                Toast.show({ type: 'success', text1: 'Comment updated!' });
            } else {
                const payload = { content: commentText };
                if (replyingTo) {
                    payload.parentId = replyingTo.id;
                }
                await axios.post(`${BASE_URL}/comments/state-news/${newsId}`, payload, { headers });
                setReplyingTo(null);



                Toast.show({ type: 'success', text1: 'Comment added!' });
            }

            setCommentText("");
            await fetchComments();

            try {
                const { sound } = await Audio.Sound.createAsync(
                    require('../../assets/sounds/pop.mp3'),
                    { shouldPlay: true }
                );
                sound.setOnPlaybackStatusUpdate(status => {
                    if (status.didJustFinish) sound.unloadAsync();
                });
            } catch (e) {
                console.log("Audio play error", e);
            }
        } catch (error) {
            console.error("Error adding/editing comment:", error);
            Toast.show({ type: 'error', text1: 'Action failed' });
        }
    };

    const handleEditClick = (comment) => {
        setEditingComment(comment);
        setCommentText(comment.content);
        setReplyingTo(null); // Cancel reply if editing
    };

    const handleDeleteClick = (commentId) => {
        const deleteComment = async () => {
            try {
                const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                await axios.delete(`${BASE_URL}/comments/${commentId}`, { headers });
                Toast.show({ type: 'success', text1: 'Comment deleted' });
                fetchComments();
            } catch (error) {
                Toast.show({ type: 'error', text1: 'Error deleting comment' });
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete this comment?")) {
                deleteComment();
            }
        } else {
            Alert.alert(
                "Delete Comment",
                "Are you sure you want to delete this comment?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: deleteComment }
                ]
            );
        }
    };

    const handleReplyClick = (comment) => {
        const name = comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : 'Anonymous';
        setReplyingTo({ id: comment.id, name: name });
        setEditingComment(null); // Cancel edit if replying
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <DetailSkeleton />
            </SafeAreaView>
        );
    }

    if (!news) return null;

    const authorName = news.author ? `${news.author.firstName} ${news.author.lastName}` : 'Jharkhand Updates';
    const _d = new Date(news.createdAt);
    const _ord = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
    const _months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const _h = _d.getHours(); const _min = _d.getMinutes().toString().padStart(2, '0');
    const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
    const dateStr = `${_ord(_d.getDate())} ${_months[_d.getMonth()]} ${_d.getFullYear()}, ${_h12}:${_min} ${_ampm}`;

    const isVideo = news.imageUrls?.[0]?.match(/\.(mp4|webm|ogg)$/i) || news.imageUrls?.[0]?.includes('video');

    const handleShare = async () => {
        try {
            const webUrl = `https://jharkhandupdates.com/statenews/details/${news.id || news._id}`;
            const snippet = (news.content || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 100);
            await Share.share({
                title: news.title,
                message: `${news.title}\n\n${snippet}...\n\nRead more: ${webUrl}`,
            });
        } catch (e) { /* user dismissed */ }
    };

    const getRootComments = (comments) => {
        if (!comments) return [];
        const replyIds = new Set();
        const traverse = (cmt) => {
            if (cmt.replies) {
                cmt.replies.forEach(r => {
                    replyIds.add(r.id);
                    traverse(r);
                });
            }
        };
        comments.forEach(traverse);
        return comments.filter(c => !replyIds.has(c.id));
    };

    const rootComments = getRootComments(comments);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.primary} />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.8}>
                        <Ionicons name="arrow-redo-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <MotiView
                        style={styles.newsSection}
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 400 }}
                    >
                        {/* ① Title — always first */}
                        <Text style={styles.newsTitle}>{news.title.replace(/<[^>]*>?/gm, "")}</Text>

                        {/* ② Media */}
                        <View style={styles.mediaContainer}>
                            {news.imageUrls?.length > 0 && !isVideo ? (
                                <TouchableOpacity activeOpacity={0.9} onPress={() => setIsImageViewVisible(true)}>
                                    <Image
                                        source={{ uri: news.imageUrls[0] }}
                                        style={[styles.newsImage, { aspectRatio: imageRatio || 1.5 }]}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.placeholderImage}>
                                    <Ionicons name={isVideo ? "play-circle" : "newspaper"} size={64} color={colors.border} />
                                </View>
                            )}
                        </View>

                        {/* Author Info */}
                        <View style={styles.authorRow}>
                            <View style={styles.avatarPlaceholder}>
                                {news.author?.profileImageUrl ? (
                                    <Image source={{ uri: news.author.profileImageUrl }} style={styles.avatarImage} />
                                ) : (
                                    <Image source={{ uri: "https://jharkhandbiharupdates.com/logo.png" }} style={styles.avatarImage} />
                                )}
                            </View>
                            <View style={styles.authorHeaderText}>
                                <Text style={styles.authorName}>{authorName} {news.author?.role === 'ADMIN' && <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />}</Text>
                                <View style={styles.dateRow}>
                                    <Ionicons name="calendar-outline" size={14} color={colors.textDim} />
                                    <Text style={styles.dateText}>{dateStr}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Location */}
                        <View style={styles.metaRow}>
                            <View style={styles.locationContainer}>
                                <Ionicons name="location-outline" size={16} color={colors.primary} />
                                <Text style={styles.locationText}>{news.state || 'Jharkhand'}</Text>
                            </View>
                        </View>

                        {/* Content: chunks of ~15 lines with property ads woven in */}
                        {(() => {
                            const cleanContent = (news.content || '').replace(/<[^>]*>?/gm, '').trim();
                            const chunks = getContentChunks(cleanContent);
                            const hasMore = cleanContent.length > 1000;

                            // Helper: renders one property ad from the cycling pool
                            const renderPropAd = (poolOffset) => {
                                if (!_propPool.length) return null;
                                const prop = _propPool[(_propIndex + poolOffset) % _propPool.length];
                                return (
                                    <TouchableOpacity
                                        key={`prop-${poolOffset}`}
                                        style={[styles.propSpotlight, { marginVertical: 16 }]}
                                        onPress={() => navigation.navigate('PropertyDetails', { propertyId: prop.id })}
                                        activeOpacity={0.88}
                                    >
                                        <View style={styles.propSpotHeader}>
                                            <Ionicons name="home" size={12} color={isDarkMode ? '#6ee7b7' : '#059669'} />
                                            <Text style={styles.propSpotLabel}>Real Estate · Featured</Text>
                                        </View>
                                        <View style={styles.propSpotRow}>
                                            {prop.imageUrls?.length > 0 ? (
                                                <Image source={{ uri: prop.imageUrls[0] }} style={styles.propSpotImg} resizeMode="cover" />
                                            ) : (
                                                <View style={[styles.propSpotImg, { backgroundColor: colors.surfaceDeeper, alignItems: 'center', justifyContent: 'center' }]}>
                                                    <Ionicons name="home-outline" size={28} color={colors.textDim} />
                                                </View>
                                            )}
                                            <View style={styles.propSpotInfo}>
                                                <Text style={styles.propSpotTitle} numberOfLines={2}>{prop.title}</Text>
                                                {prop.price ? <Text style={styles.propSpotPrice}>{formatPropertyPrice(prop.price)}</Text> : null}
                                                <View style={styles.propSpotLoc}>
                                                    <Ionicons name="location-outline" size={12} color={isDarkMode ? '#6ee7b7' : '#059669'} />
                                                    <Text style={styles.propSpotLocTxt} numberOfLines={1}>
                                                        {[prop.locality, prop.city, prop.district].filter(Boolean).join(', ')}
                                                    </Text>
                                                </View>
                                                <View style={styles.propSpotCta}>
                                                    <Text style={styles.propSpotCtaTxt}>View Property</Text>
                                                    <Ionicons name="arrow-forward" size={13} color={isDarkMode ? '#6ee7b7' : '#059669'} />
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            };

                            if (!seeMore) {
                                // COLLAPSED: first chunk (15 lines) + first ad + 5 lines of next chunk + See More
                                return (
                                    <>
                                        <LinkedText style={styles.newsContent}>{chunks[0]}</LinkedText>
                                        {chunks.length > 1 && renderPropAd(0)}
                                        {chunks.length > 1 && (
                                            <LinkedText style={styles.newsContent} numberOfLines={5}>
                                                {chunks[1]}
                                            </LinkedText>
                                        )}
                                        {hasMore && (
                                            <TouchableOpacity onPress={() => setSeeMore(true)} style={styles.seeMoreBtn}>
                                                <Text style={styles.seeMoreText}>See More</Text>
                                            </TouchableOpacity>
                                        )}
                                    </>
                                );
                            }

                            // EXPANDED: all chunks with cycling property ads between them
                            return (
                                <>
                                    {chunks.map((chunk, idx) => (
                                        <React.Fragment key={idx}>
                                            <LinkedText style={styles.newsContent}>{chunk}</LinkedText>
                                            {idx < chunks.length - 1 && renderPropAd(idx)}
                                        </React.Fragment>
                                    ))}
                                    {hasMore && (
                                        <TouchableOpacity onPress={() => setSeeMore(false)} style={styles.seeMoreBtn}>
                                            <Text style={styles.seeMoreText}>See Less</Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            );
                        })()}
                    </MotiView>


                    {/* Comments Section */}
                    <View style={styles.commentsSection}>
                        <View style={styles.commentsHeaderRow}>
                            <Ionicons name="chatbubble-ellipses" size={24} color={isDarkMode ? '#e879f9' : '#c084fc'} />
                            <Text style={styles.commentsHeader}>Comments</Text>
                        </View>

                        {rootComments.length > 0 ? (
                            rootComments.map(comment => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onReply={handleReplyClick}
                                    onEdit={handleEditClick}
                                    onDelete={handleDeleteClick}
                                    currentUser={currentUser}
                                    postOwnerId={news?.author?.id}
                                    colors={colors}
                                    isDarkMode={isDarkMode}
                                    styles={styles}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyComments}>
                                <Text style={styles.emptyCommentsText}>No comments yet.</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Input Box Area */}
                <View style={styles.inputAreaWrapper}>
                    {(replyingTo || editingComment) && (
                        <View style={styles.replyingBanner}>
                            <Text style={styles.replyingText}>
                                {editingComment ? "Editing comment" : `Replying to ${replyingTo.name}`}
                            </Text>
                            <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingComment(null); setCommentText(""); }} style={{ padding: 4 }}>
                                <Ionicons name="close-circle" size={20} color={colors.textDim} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.inputField}
                            placeholder={editingComment ? "Edit your comment..." : (replyingTo ? "Write a reply..." : "Write a comment...")}
                            placeholderTextColor={colors.textDim}
                            value={commentText}
                            onChangeText={setCommentText}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !commentText.trim() && { opacity: 0.5 }]}
                            onPress={async () => {
                                if (Platform.OS !== 'web') {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }

                                handleAddComment();
                            }}
                            disabled={!commentText.trim()}
                        >
                            <Ionicons name={editingComment ? "checkmark" : "send"} size={20} color={isDarkMode ? '#000' : '#fff'} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ImageViewing
                    images={news?.imageUrls ? news.imageUrls.map(uri => ({ uri })) : []}
                    imageIndex={0}
                    visible={isImageViewVisible}
                    onRequestClose={() => setIsImageViewVisible(false)}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, elevation: 2, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { flexDirection: 'row', alignItems: 'center' },
    backText: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: colors.primary, marginLeft: 4 },
    shareBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 2 },

    scrollContent: { padding: 16, paddingBottom: 40 },

    newsSection: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, elevation: 3, shadowColor: colors.shadow, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 8, marginBottom: 24, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },

    mediaContainer: { width: '100%', borderRadius: 20, overflow: 'hidden', marginBottom: 20, backgroundColor: 'transparent' },
    newsImage: { width: '100%', backgroundColor: 'transparent' },
    placeholderImage: { width: '100%', aspectRatio: 1.5, backgroundColor: colors.surfaceDeeper, alignItems: 'center', justifyContent: 'center' },

    authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceDeeper, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    avatarImage: { width: '100%', height: '100%' },
    authorHeaderText: { justifyContent: 'center' },
    authorName: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.text },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    dateText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim },

    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    locationText: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: colors.textDim },
    shareButton: { backgroundColor: colors.primary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', elevation: 2 },

    newsTitle: { fontSize: 24, fontFamily: 'Outfit_700Bold', fontWeight: 'bold', color: colors.text, marginBottom: 16, lineHeight: 34 },
    newsContent: { fontSize: 16, fontFamily: 'Outfit_400Regular', color: colors.text, lineHeight: 26, textAlign: 'justify' },

    // Property Spotlight styles
    propSpotlight: {
        backgroundColor: colors.surface,
        borderRadius: 18,
        marginBottom: 24,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: isDarkMode ? '#134e2b' : '#bbf7d0',
        elevation: 4,
        shadowColor: '#059669',
        shadowOpacity: isDarkMode ? 0.15 : 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    propSpotHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: isDarkMode ? 'rgba(5,150,105,0.12)' : '#f0fdf4',
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#134e2b' : '#bbf7d0',
    },
    propSpotLabel: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: isDarkMode ? '#6ee7b7' : '#059669', letterSpacing: 0.5 },
    propSpotRow: { flexDirection: 'row', padding: 12, gap: 12 },
    propSpotImg: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
    propSpotInfo: { flex: 1, justifyContent: 'space-between' },
    propSpotTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: colors.text, lineHeight: 20, marginBottom: 4 },
    propSpotPrice: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: isDarkMode ? '#34d399' : '#047857', marginBottom: 4 },
    propSpotLoc: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
    propSpotLocTxt: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim, flex: 1 },
    propSpotCta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: isDarkMode ? 'rgba(5,150,105,0.15)' : '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    propSpotCtaTxt: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: isDarkMode ? '#6ee7b7' : '#059669' },

    seeMoreBtn: { marginTop: 12 },
    seeMoreText: { color: colors.primary, fontFamily: 'Outfit_700Bold', fontSize: 15 },

    commentsSection: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, elevation: 3, shadowColor: colors.shadow, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 8, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    commentsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    commentsHeader: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text },

    commentCardWrapper: { marginBottom: 16 },
    commentRow: { flexDirection: 'row' },
    commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceDeeper, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' },
    commentBody: { flex: 1 },
    commentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    commentAuthor: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.text, flexDirection: 'row', alignItems: 'center' },
    commentDate: { fontSize: 11, fontFamily: 'Outfit_400Regular', color: colors.textDim },
    commentContent: { fontSize: 15, fontFamily: 'Outfit_400Regular', color: colors.text, lineHeight: 22, textAlign: 'justify' },

    commentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 16 },
    replyButton: { flexDirection: 'row', alignItems: 'center' },
    replyButtonText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: colors.textDim },
    toggleRepliesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    toggleRepliesText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: colors.primary },

    repliesContainer: { marginTop: 16, position: 'relative' },
    threadLine: { position: 'absolute', left: -22, top: 0, bottom: 20, width: 2, backgroundColor: colors.border, borderRadius: 1 },

    emptyComments: { paddingVertical: 10 },
    emptyCommentsText: { color: colors.textDim, fontSize: 14, fontFamily: 'Outfit_400Regular', fontStyle: 'italic' },

    inputAreaWrapper: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, elevation: 10, shadowColor: colors.shadow, shadowOffset: { width: 0, height: -2 }, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 8 },
    replyingBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceDeeper, paddingHorizontal: 16, paddingVertical: 8 },
    replyingText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12 },
    inputField: { flex: 1, backgroundColor: colors.surfaceDeeper, color: colors.text, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15, fontFamily: 'Outfit_400Regular' },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginBottom: 2 },
});








