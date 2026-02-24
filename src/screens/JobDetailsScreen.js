import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, TextInput, Platform, Linking, Alert, KeyboardAvoidingView } from 'react-native';
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
    const [showReplies, setShowReplies] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const hasReplies = comment.replies && comment.replies.length > 0;

    const authorName = comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : 'Anonymous';
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

                {showOptions && Platform.OS === 'web' && (
                    <TouchableOpacity
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                        activeOpacity={1}
                        onPress={() => setShowOptions(false)}
                    />
                )}
            </View>

            {hasReplies && showReplies && (
                <View style={styles.repliesContainer}>
                    <View style={styles.threadLine} />
                    {[...comment.replies].reverse().map(reply => (
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

export default function JobDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { jobId } = route.params;
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [job, setJob] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [imageRatio, setImageRatio] = useState(null);
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
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
        fetchJobDetails();
        fetchComments();
    }, [jobId]);

    useEffect(() => {
        if (job?.imageUrls?.[0]) {
            Image.getSize(job.imageUrls[0], (w, h) => {
                if (w && h) setImageRatio(w / h);
            }, () => { });
        }
    }, [job]);

    const fetchJobDetails = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.get(`${BASE_URL}/jobs/${jobId}`, { headers });
            if (res.data.success) {
                setJob(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching job details:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Job not found or deleted.' });
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.get(`${BASE_URL}/comments/jobs/${jobId}`, { headers });
            if (res.data.success) {
                setComments(res.data.data);
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
                await axios.post(`${BASE_URL}/comments/jobs/${jobId}`, payload, { headers });
                setReplyingTo(null);
                Toast.show({ type: 'success', text1: 'Comment added!' });
            }

            setCommentText("");
            fetchComments();
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

    if (!job) return null;

    const authorName = `${job.author?.firstName || 'User'} ${job.author?.lastName || ''}`.trim();
    const dateStr = new Date(job.createdAt).toLocaleDateString();

    const isJobExpired = (deadline) => {
        if (!deadline) return false;
        return new Date() > new Date(deadline);
    };

    const expired = isJobExpired(job.applicationDeadline);

    const getRootComments = (commentsArray) => {
        if (!commentsArray) return [];
        const replyIds = new Set();
        const traverse = (cmt) => {
            if (cmt.replies) {
                cmt.replies.forEach(r => {
                    replyIds.add(r.id);
                    traverse(r);
                });
            }
        };
        commentsArray.forEach(traverse);
        return commentsArray.filter(c => !replyIds.has(c.id));
    };

    const rootComments = getRootComments(comments);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Job Details</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <MotiView style={styles.jobSection} from={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                        {expired && (
                            <View style={styles.expiredBanner}>
                                <Text style={styles.expiredBannerText}>This job listing has expired</Text>
                            </View>
                        )}

                        {job.imageUrls && job.imageUrls.length > 0 && (
                            <TouchableOpacity activeOpacity={0.9} onPress={() => setIsImageViewVisible(true)}>
                                <Image
                                    source={{ uri: job.imageUrls[0] }}
                                    style={[styles.jobImage, expired && { opacity: 0.5 }, { aspectRatio: imageRatio || 1.5 }]}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        )}

                        <View style={styles.jobInfo}>
                            <Text style={[styles.jobTitle, expired && { color: '#9ca3af' }]}>{job.title}</Text>

                            <View style={styles.tagsRow}>
                                {job.company && (
                                    <View style={styles.tag}>
                                        <Ionicons name="business" size={14} color={isDarkMode ? '#34d399' : '#059669'} />
                                        <Text style={styles.tagText}>{job.company}</Text>
                                    </View>
                                )}
                                {job.salaryRange && (
                                    <View style={styles.tag}>
                                        <Ionicons name="cash" size={14} color={isDarkMode ? '#fbbf24' : '#d97706'} />
                                        <Text style={styles.tagText}>{job.salaryRange}</Text>
                                    </View>
                                )}
                            </View>

                            {job.location && (
                                <View style={styles.iconRow}>
                                    <Ionicons name="location" size={16} color={colors.textDim} />
                                    <Text style={styles.iconText}>{job.location}</Text>
                                </View>
                            )}

                            {job.applicationDeadline && (
                                <View style={styles.iconRow}>
                                    <Ionicons name="calendar" size={16} color={expired ? (isDarkMode ? '#f87171' : '#ef4444') : colors.primary} />
                                    <Text style={[styles.iconText, expired && { color: isDarkMode ? '#f87171' : '#ef4444', fontFamily: 'Outfit_700Bold' }]}>
                                        Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.divider} />

                            <Text style={styles.sectionHeader}>Description</Text>
                            <Text style={styles.jobContent}>{job.description?.replace(/<[^>]*>?/gm, "")}</Text>

                            {job.reglink && !expired && (
                                <TouchableOpacity style={styles.applyBtn} onPress={() => Linking.openURL(job.reglink)}>
                                    <Text style={styles.applyBtnText}>Apply Now</Text>
                                    <Ionicons name="open-outline" size={18} color="#fff" style={{ marginLeft: 6 }} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </MotiView>

                    {/* Comments Section */}
                    <View style={styles.commentsSection}>
                        <Text style={styles.commentsHeader}>Comments ({comments?.length || 0})</Text>

                        {rootComments && rootComments.length > 0 ? (
                            rootComments.map(comment => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onReply={handleReplyClick}
                                    onEdit={handleEditClick}
                                    onDelete={handleDeleteClick}
                                    currentUser={currentUser}
                                    postOwnerId={job?.author?.id}
                                    colors={colors}
                                    isDarkMode={isDarkMode}
                                    styles={styles}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyComments}>
                                <Ionicons name="chatbubbles-outline" size={40} color={colors.border} />
                                <Text style={styles.emptyCommentsText}>Ask a question about this job!</Text>
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
                            onPress={handleAddComment}
                            disabled={!commentText.trim()}
                        >
                            <Ionicons name={editingComment ? "checkmark" : "send"} size={20} color={isDarkMode ? '#000' : '#fff'} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ImageViewing
                    images={job?.imageUrls ? job.imageUrls.map(uri => ({ uri })) : []}
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text },

    scrollContent: { padding: 16, paddingBottom: 40 },

    jobSection: { backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', elevation: 3, shadowColor: colors.shadow, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 10, marginBottom: 20, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    expiredBanner: { backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2', padding: 10, alignItems: 'center' },
    expiredBannerText: { color: isDarkMode ? '#fca5a5' : '#b91c1c', fontFamily: 'Outfit_700Bold', fontSize: 13 },
    jobImage: { width: '100%', backgroundColor: colors.surfaceDeeper },
    jobInfo: { padding: 20 },
    jobTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 12 },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    tagText: { color: isDarkMode ? '#34d399' : '#047857', fontFamily: 'Outfit_600SemiBold', fontSize: 13, marginLeft: 4 },

    iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    iconText: { marginLeft: 8, fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.textDim },

    divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
    sectionHeader: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 8 },
    jobContent: { fontSize: 15, fontFamily: 'Outfit_400Regular', color: colors.textDim, lineHeight: 24, marginBottom: 20 },

    applyBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 20, elevation: 2 },
    applyBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold' },

    commentsSection: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, elevation: 2, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    commentsHeader: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 16 },

    commentCardWrapper: { marginBottom: 16 },
    commentRow: { flexDirection: 'row' },
    commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceDeeper, overflow: 'hidden', marginRight: 12 },
    avatarImage: { width: '100%', height: '100%' },
    commentBody: { flex: 1 },
    commentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    commentAuthor: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: colors.text, flexDirection: 'row', alignItems: 'center' },
    commentDate: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim },
    commentContent: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.text, lineHeight: 20 },

    commentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 16 },
    replyButtonText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: colors.textDim },
    toggleRepliesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    toggleRepliesText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: colors.primary },

    repliesContainer: { marginTop: 12, position: 'relative' },
    threadLine: { position: 'absolute', left: -22, top: 0, bottom: 20, width: 2, backgroundColor: colors.border },

    emptyComments: { alignItems: 'center', paddingVertical: 20 },
    emptyCommentsText: { color: colors.textDim, marginTop: 8 },

    inputAreaWrapper: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, elevation: 10, shadowColor: colors.shadow, shadowOffset: { width: 0, height: -2 }, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 8 },
    replyingBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceDeeper, paddingHorizontal: 16, paddingVertical: 8 },
    replyingText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12 },
    inputField: { flex: 1, backgroundColor: colors.surfaceDeeper, color: colors.text, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15, fontFamily: 'Outfit_400Regular' },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginBottom: 2 }
});







