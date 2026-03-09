import React, { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, TextInput, Platform, Alert, KeyboardAvoidingView, Vibration, Share, FlatList } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const [showReplies, setShowReplies] = useState(true);
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
                    <Text style={styles.commentContent}>{comment.content}</Text>

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

export default function CommunityPostDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { postId } = route.params;
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    const insets = useSafeAreaInsets();

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [imageRatio, setImageRatio] = useState(null);
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(0);
    const postCarouselRef = useRef(null);
    const [processingAdmin, setProcessingAdmin] = useState(false);

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
        fetchCurrentUser();
        fetchPostDetails();
        fetchComments();
    }, [postId]);

    useEffect(() => {
        if (post?.imageUrls?.[0]) {
            Image.getSize(post.imageUrls[0], (w, h) => {
                if (w && h) setImageRatio(w / h);
            }, () => { });
        }
    }, [post]);

    const fetchPostDetails = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.get(`${BASE_URL}/community/${postId}`, { headers });
            if (res.data.success) {
                setPost(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching post details:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Post not found or deleted.' });
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };


    const handleAdminAction = async (action) => {
        try {
            setProcessingAdmin(true);
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            await axios.post(`${BASE_URL}/community/${postId}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Toast.show({ type: 'success', text1: 'Success', text2: `Post ${action}d successfully` });
            navigation.goBack();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: `Failed to ${action} post` });
            setProcessingAdmin(false);
        }
    };

    const fetchComments = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.get(`${BASE_URL}/comments/community-posts/${postId}`, { headers });
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
                await axios.post(`${BASE_URL}/comments/community-posts/${postId}`, payload, { headers });
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

    if (!post) return null;

    const authorName = `${post.author.firstName} ${post.author.lastName}`;
    const _pd = new Date(post.createdAt);
    const _ordp = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
    const _monthsp = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateStr = `${_ordp(_pd.getDate())} ${_monthsp[_pd.getMonth()]} ${_pd.getFullYear()}`;

    const handleShare = async () => {
        try {
            const webUrl = `https://jharkhandupdates.com/citizen-news/${post.id || post._id}`;
            const title = post.title || 'Community Post';
            const snippet = (post.content || '').trim().slice(0, 100);
            await Share.share({
                title,
                message: `${title}\n\n${snippet}${snippet.length >= 100 ? '...' : ''}\n\nRead more: ${webUrl}`,
            });
        } catch (e) { /* dismissed */ }
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
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Post</Text>
                    <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.8}>
                        <Ionicons name="arrow-redo-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.postSection}>
                        {/* Author Info */}
                        <View style={styles.postHeaderRow}>
                            <View style={styles.avatarPlaceholder}>
                                {post.author.profileImageUrl ? (
                                    <Image source={{ uri: post.author.profileImageUrl }} style={styles.avatarImage} />
                                ) : (
                                    <Ionicons name="person" size={24} color={colors.textDim} />
                                )}
                            </View>
                            <View style={styles.headerText}>
                                <Text style={styles.authorName}>{authorName} {post.author?.role === 'ADMIN' && <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />}</Text>
                                <Text style={styles.dateText}>{dateStr}</Text>
                            </View>
                        </View>

                        {/* Post Content */}
                        {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}

                        {post.imageUrls && post.imageUrls.length > 0 && (
                            <>
                                {(() => {
                                    const imgs = post.imageUrls;
                                    return (
                                        <FlatList
                                            data={imgs}
                                            horizontal
                                            pagingEnabled
                                            showsHorizontalScrollIndicator={false}
                                            scrollEventThrottle={16}
                                            keyExtractor={(_, idx) => `p-img-${idx}`}
                                            onScroll={(e) => {
                                                if (imgs.length <= 1) return;
                                                const rawIdx = Math.round(e.nativeEvent.contentOffset.x / width);
                                                if (rawIdx >= 0 && rawIdx < imgs.length && rawIdx !== currentImage) {
                                                    setCurrentImage(rawIdx);
                                                }
                                            }}
                                            renderItem={({ item: uri, index }) => (
                                                <TouchableOpacity
                                                    activeOpacity={0.9}
                                                    onPress={() => { setCurrentImage(index); setIsImageViewVisible(true); }}
                                                    style={{ width }}
                                                >
                                                    <Image
                                                        source={{ uri }}
                                                        style={[styles.postImage, { aspectRatio: imageRatio || 1.5, width }]}
                                                        resizeMode="contain"
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        />
                                    );
                                })()}
                                {post.imageUrls.length > 1 && (
                                    <View style={styles.dotRow}>
                                        {post.imageUrls.map((_, idx) => (
                                            <View
                                                key={idx}
                                                style={[
                                                    styles.dotIndicator,
                                                    idx === currentImage && styles.dotIndicatorActive,
                                                ]}
                                            />
                                        ))}
                                    </View>
                                )}
                            </>
                        )}

                        <LinkedText style={styles.postContent}>{post.content}</LinkedText>
                    </View>

                    {/* Comments Section */}
                    <View style={styles.commentsSection}>
                        <Text style={styles.commentsHeader}>Comments</Text>

                        {rootComments.length > 0 ? (
                            rootComments.map(comment => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onReply={handleReplyClick}
                                    onEdit={handleEditClick}
                                    onDelete={handleDeleteClick}
                                    currentUser={currentUser}
                                    postOwnerId={post?.author?.id}
                                    colors={colors}
                                    isDarkMode={isDarkMode}
                                    styles={styles}
                                />
                            ))
                        ) : (<View style={styles.emptyComments}>
                            <Ionicons name="chatbubbles-outline" size={40} color={colors.border} />
                            <Text style={styles.emptyCommentsText}>No comments yet. Be the first to start the conversation!</Text>
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
                            <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingComment(null); setCommentText(""); }}>
                                <Ionicons name="close-circle" size={20} color={colors.textDim} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={[styles.inputContainer, { paddingBottom: Math.max(12, insets.bottom) }]}>
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
                    images={post?.imageUrls ? post.imageUrls.map(uri => ({ uri })) : []}
                    imageIndex={currentImage}
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

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text },
    shareBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 2 },

    scrollContent: { paddingBottom: 24 },

    postSection: { backgroundColor: colors.surface, padding: 20, marginBottom: 16, borderBottomWidth: isDarkMode ? 1 : 0, borderBottomColor: colors.border },
    postHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceDeeper, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    headerText: { justifyContent: 'center' },
    authorName: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.text },
    dateText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim, marginTop: 2 },

    postTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 12, lineHeight: 28 },
    postImage: { width: width, backgroundColor: 'transparent', alignSelf: 'center', marginBottom: 16 },
    dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: -8, marginBottom: 12 },
    dotIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db' },
    dotIndicatorActive: { backgroundColor: colors.primary, width: 8, height: 8, borderRadius: 4 },
    multiImageBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: 5 },
    postContent: { fontSize: 16, fontFamily: 'Outfit_400Regular', color: colors.text, lineHeight: 24, textAlign: 'justify' },

    commentsSection: { paddingHorizontal: 16, backgroundColor: colors.surface, borderRadius: 20, marginHorizontal: 16, paddingVertical: 20, elevation: 1, shadowColor: colors.shadow, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 2, marginBottom: 20, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    commentsHeader: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 20 },

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

    emptyComments: { alignItems: 'center', paddingVertical: 30 },
    emptyCommentsText: { color: colors.textDim, fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 12, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },

    inputAreaWrapper: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, elevation: 10, shadowColor: colors.shadow, shadowOffset: { width: 0, height: -2 }, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 8 },
    replyingBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceDeeper, paddingHorizontal: 16, paddingVertical: 8 },
    replyingText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12 },
    inputField: { flex: 1, backgroundColor: colors.surfaceDeeper, color: colors.text, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15, fontFamily: 'Outfit_400Regular' },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginBottom: 2 },
});







