import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Vibration, View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, TextInput, Platform, Linking, Alert, KeyboardAvoidingView, Share } from 'react-native';
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
import LinkedText from '../components/LinkedText';
import useInterstitialAd from '../hooks/useInterstitialAd';
import AdBannerCard from '../components/AdBannerCard';

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

export default function EventDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { eventId } = route.params;
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [event, setEvent] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [imageRatio, setImageRatio] = useState(null);
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    const [processingAdmin, setProcessingAdmin] = useState(false);

    // ─── AdMob: Interstitial on event open ───
    const { showInterstitial } = useInterstitialAd();
    useEffect(() => {
        const timer = setTimeout(() => showInterstitial(), 1500);
        return () => clearTimeout(timer);
    }, []);

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
        fetchEventDetails();
        fetchComments();
    }, [eventId]);

    useEffect(() => {
        if (event?.imageUrls?.[0]) {
            Image.getSize(event.imageUrls[0], (w, h) => {
                if (w && h) setImageRatio(w / h);
            }, () => { });
        }
    }, [event]);

    const fetchEventDetails = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.get(`${BASE_URL}/events/${eventId}`, { headers });
            if (res.data.success) {
                setEvent(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching event details:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Event not found or deleted.' });
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };


    const handleAdminAction = async (action) => {
        try {
            setProcessingAdmin(true);
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            await axios.post(`${BASE_URL}/events/${eventId}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Toast.show({ type: 'success', text1: 'Success', text2: `Event ${action}d successfully` });
            navigation.goBack();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: `Failed to ${action} event` });
            setProcessingAdmin(false);
        }
    };

    const fetchComments = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.get(`${BASE_URL}/comments/events/${eventId}`, { headers });
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
                await axios.post(`${BASE_URL}/comments/events/${eventId}`, payload, { headers });
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

    if (!event) return null;

    const authorName = `${event.author?.firstName || 'User'} ${event.author?.lastName || ''}`.trim();

    let eventDateStr = "TBA";
    let eventTimeStr = "";
    if (event.eventDate) {
        const d = new Date(event.eventDate);
        eventDateStr = d.toLocaleDateString();
        eventTimeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const isPastEvent = event.eventDate && new Date() > new Date(event.eventDate);

    const handleShare = async () => {
        try {
            const webUrl = `https://jharkhandupdates.com/events/details/${event.id || event._id}`;
            const snippet = (event.description || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 100);
            const dateInfo = eventDateStr !== 'TBA' ? `\nDate: ${eventDateStr}${eventTimeStr ? ' at ' + eventTimeStr : ''}` : '';
            const locationInfo = event.location ? `\nVenue: ${event.location}` : '';
            await Share.share({
                title: event.title,
                message: `${event.title}${dateInfo}${locationInfo}\n\n${snippet}...\n\nRead more: ${webUrl}`,
            });
        } catch (e) { /* dismissed */ }
    };

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
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Event Details</Text>
                    <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.8}>
                        <Ionicons name="arrow-redo-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <MotiView style={styles.eventSection} from={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                        {isPastEvent && (
                            <View style={styles.pastBanner}>
                                <Text style={styles.pastBannerText}>This event has ended</Text>
                            </View>
                        )}

                        {event.imageUrls && event.imageUrls.length > 0 && (
                            <TouchableOpacity activeOpacity={0.9} onPress={() => setIsImageViewVisible(true)}>
                                <Image
                                    source={{ uri: event.imageUrls[0] }}
                                    style={[styles.eventImage, isPastEvent && { opacity: 0.5 }, { aspectRatio: imageRatio || 1.5 }]}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        )}

                        <View style={styles.eventInfo}>
                            <Text style={[styles.eventTitle, isPastEvent && { color: '#9ca3af' }]}>{event.title}</Text>

                            <View style={styles.dateTimeRow}>
                                <View style={[styles.dateBox, isPastEvent && { backgroundColor: colors.surfaceDeeper }]}>
                                    <Text style={[styles.dateBoxMonth, isPastEvent && { color: colors.textDim }]}>
                                        {event.eventDate ? new Date(event.eventDate).toLocaleString('default', { month: 'short' }).toUpperCase() : '-'}
                                    </Text>
                                    <Text style={[styles.dateBoxDay, isPastEvent && { color: colors.textDim }]}>
                                        {event.eventDate ? new Date(event.eventDate).getDate() : '-'}
                                    </Text>
                                </View>
                                <View style={styles.timeLocationGroup}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="time-outline" size={16} color={isPastEvent ? colors.textDim : colors.primary} />
                                        <Text style={[styles.infoText, isPastEvent && { color: colors.textDim }]}>{eventTimeStr || 'Time TBA'}</Text>
                                    </View>
                                    {event.location && (
                                        <View style={styles.infoRow}>
                                            <Ionicons name="location-outline" size={16} color={isPastEvent ? colors.textDim : (isDarkMode ? '#60a5fa' : '#2563eb')} />
                                            <Text style={[styles.infoText, isPastEvent && { color: colors.textDim }]}>{event.location}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {event.price && (
                                <View style={styles.priceContainer}>
                                    <Ionicons name="ticket-outline" size={18} color={isDarkMode ? '#fbbf24' : '#d97706'} />
                                    <Text style={styles.priceText}>Price: {event.price}</Text>
                                </View>
                            )}

                            <View style={styles.divider} />

                            <Text style={styles.sectionHeader}>About This Event</Text>
                            <LinkedText style={styles.eventContent}>{event.description?.replace(/<[^>]*>?/gm, "")}</LinkedText>

                            {event.reglink && !isPastEvent && (
                                <View style={{ marginTop: 10 }}>
                                    <Text style={styles.sectionHeader}>Registration Link / Website</Text>
                                    <LinkedText style={styles.eventContent}>{event.reglink}</LinkedText>
                                    <TouchableOpacity style={{ backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 20, elevation: 2 }} onPress={() => Linking.openURL(event.reglink)}>
                                        <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold' }}>Registration</Text>
                                        <Ionicons name="open-outline" size={18} color="#fff" style={{ marginLeft: 6 }} />
                                    </TouchableOpacity>
                                </View>
                            )}

                        </View>
                    </MotiView>

                    {/* Google AdMob Banner */}
                    <AdBannerCard size="LARGE" />

                    {/* Comments Section */}
                    <View style={styles.commentsSection}>
                        <Text style={styles.commentsHeader}>Comments</Text>

                        {rootComments && rootComments.length > 0 ? (
                            rootComments.map(comment => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onReply={handleReplyClick}
                                    onEdit={handleEditClick}
                                    onDelete={handleDeleteClick}
                                    currentUser={currentUser}
                                    postOwnerId={event?.author?.id}
                                    colors={colors}
                                    isDarkMode={isDarkMode}
                                    styles={styles}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyComments}>
                                <Ionicons name="chatbubbles-outline" size={40} color={colors.border} />
                                <Text style={styles.emptyCommentsText}>Start a discussion about this event!</Text>
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
                    images={event?.imageUrls ? event.imageUrls.map(uri => ({ uri })) : []}
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
    shareBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 2 },

    scrollContent: { padding: 16, paddingBottom: 40 },

    eventSection: { backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', elevation: 3, shadowColor: colors.shadow, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 10, marginBottom: 20, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    pastBanner: { backgroundColor: colors.surfaceDeeper, padding: 10, alignItems: 'center' },
    pastBannerText: { color: colors.textDim, fontFamily: 'Outfit_700Bold', fontSize: 13 },
    eventImage: { width: '100%', backgroundColor: colors.surfaceDeeper },
    eventInfo: { padding: 20 },
    eventTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 16 },

    dateTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    dateBox: { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center', marginRight: 16 },
    dateBoxMonth: { color: isDarkMode ? '#34d399' : '#047857', fontFamily: 'Outfit_700Bold', fontSize: 12, marginBottom: 2 },
    dateBoxDay: { color: isDarkMode ? '#10b981' : '#064e3b', fontFamily: 'Outfit_700Bold', fontSize: 22 },

    timeLocationGroup: { flex: 1, gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoText: { marginLeft: 8, fontSize: 15, fontFamily: 'Outfit_400Regular', color: colors.textDim, flex: 1 },

    priceContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#451a03' : '#fef3c7', padding: 12, borderRadius: 20, marginBottom: 12 },
    priceText: { color: isDarkMode ? '#fbbf24' : '#92400e', fontFamily: 'Outfit_700Bold', fontSize: 15, marginLeft: 8 },

    divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
    sectionHeader: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 8 },
    eventContent: { fontSize: 15, fontFamily: 'Outfit_400Regular', color: colors.textDim, lineHeight: 24, marginBottom: 20, textAlign: 'justify' },

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







