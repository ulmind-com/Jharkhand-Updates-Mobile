import React, { useState, useRef, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
    Image, KeyboardAvoidingView, Platform, ActivityIndicator,
    Dimensions, Animated, FlatList, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { MotiView } from 'moti';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPER_H = SCREEN_H - 320; // explicit height: total minus header/steps/thumbs/actions

export default function CreateStateNewsScreen() {
    const navigation = useNavigation();
    const [step, setStep] = useState(0); // 0 = Images, 1 = Details
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [stateName, setStateName] = useState('');
    const [images, setImages] = useState([]);
    const [videoFile, setVideoFile] = useState(null); // For reel uploads
    const [loading, setLoading] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const flatListRef = useRef(null);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                await ImagePicker.requestMediaLibraryPermissionsAsync();
            }
        })();
    }, []);

    useEffect(() => {
        Animated.spring(progressAnim, {
            toValue: step === 0 ? 0.5 : 1,
            useNativeDriver: false,
        }).start();
    }, [step]);

    const goToStep1 = () => {
        if (images.length === 0) {
            Alert.alert("Select Image", "Please select at least one image to continue.");
            return;
        }
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.timing(slideAnim, {
            toValue: -SCREEN_W,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setStep(1));
    };

    const goBack = () => {
        if (step === 0) {
            navigation.goBack();
        } else {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setStep(0);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };

    const pickFromGallery = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            quality: 0.85,
            selectionLimit: 10,
        });
        if (!result.canceled) {
            const picked = result.assets.map(a => ({
                uri: a.uri,
                type: a.mimeType || 'image/jpeg',
                name: a.fileName || `img_${Date.now()}.jpg`,
                isVideo: (a.mimeType || '').startsWith('video'),
            }));
            // Separate videos from images
            const videos = picked.filter(p => p.isVideo);
            const imgs = picked.filter(p => !p.isVideo);
            if (videos.length > 0) {
                setVideoFile(videos[0]); // Only 1 video per reel
                Toast.show({ type: 'info', text1: '🎬 Video Selected', text2: 'This post will be published as a Reel.' });
            }
            if (imgs.length > 0) {
                setImages(prev => [...prev, ...imgs]);
            }
        }
    };

    const pickFromCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Camera access is required.");
            return;
        }
        let result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
        if (!result.canceled) {
            const a = result.assets[0];
            setImages(prev => [...prev, { uri: a.uri, type: a.mimeType || 'image/jpeg', name: a.fileName || `img_${Date.now()}.jpg` }]);
        }
    };

    const removeImage = (idx) => {
        const next = images.filter((_, i) => i !== idx);
        setImages(next);
        // Stay in bounds
        if (previewIndex >= next.length) setPreviewIndex(Math.max(0, next.length - 1));
    };

    const setCover = (idx) => {
        if (idx === 0) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setImages(prev => {
            const next = [...prev];
            const [picked] = next.splice(idx, 1);
            next.unshift(picked);
            return next;
        });
        // Scroll back to first
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
        setPreviewIndex(0);
    };

    const scrollToThumb = (idx) => {
        setPreviewIndex(idx);
        flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Toast.show({ type: 'error', text1: 'Missing Title', text2: 'Please enter a news headline.' });
            return;
        }
        if (!stateName) {
            Toast.show({ type: 'error', text1: 'Select State', text2: 'Please select a state.' });
            return;
        }
        if (!content.trim() && !videoFile) {
            Toast.show({ type: 'error', text1: 'Missing Content', text2: 'Please write the news article content.' });
            return;
        }

        setLoading(true);
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');

            // ── SMART ROUTING ──
            if (videoFile) {
                // VIDEO → goes to REELS API
                const formData = new FormData();
                formData.append("reel", JSON.stringify({ title: title.trim(), stateName }));
                formData.append("video", { uri: videoFile.uri, type: videoFile.type || 'video/mp4', name: videoFile.name || `reel_${Date.now()}.mp4` });

                const res = await axios.post(`${BASE_URL}/reels`, formData, {
                    headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
                });

                if (res.data.success) {
                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Toast.show({ type: 'success', text1: '🎬 Reel Published!', text2: 'Your video is now live in Reels.' });
                    setTimeout(() => navigation.navigate('Main', { screen: 'Reels' }), 1200);
                }
            } else {
                // IMAGES → goes to NEWS API (existing flow, untouched)
                const formData = new FormData();
                formData.append("news", JSON.stringify({ title: title.trim(), content: content.trim(), stateName }));
                images.forEach(img => formData.append("images", { uri: img.uri, type: img.type, name: img.name }));

                const res = await axios.post(`${BASE_URL}/state-news`, formData, {
                    headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
                });

                if (res.data.success) {
                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Toast.show({ type: 'success', text1: '🎉 Published!', text2: 'News is now live on the feed.' });
                    setTimeout(() => navigation.navigate('Main', { screen: 'State News' }), 1200);
                }
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Upload Failed', text2: err.response?.data?.message || 'Could not post.' });
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────────────────────
    // STEP 0: IMAGE PICKER
    // ──────────────────────────────────────────────
    const renderImageStep = () => (
        <View style={styles.stepContainer}>
            {/* Thumbnails Row */}
            {images.length > 0 && (
                <View style={styles.thumbsRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                        {images.map((img, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    styles.selectedThumb,
                                    idx === previewIndex && styles.selectedThumbActive,
                                    idx === 0 && styles.selectedThumbCover,
                                ]}
                                onPress={() => scrollToThumb(idx)}
                                activeOpacity={0.75}
                            >
                                <Image source={{ uri: img.uri }} style={styles.thumbImg} />
                                <TouchableOpacity
                                    style={styles.thumbRemove}
                                    onPress={() => removeImage(idx)}
                                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                >
                                    <Ionicons name="close-circle" size={19} color="#fff" />
                                </TouchableOpacity>
                                {idx === 0 && (
                                    <View style={styles.coverBadge}>
                                        <Ionicons name="star" size={9} color="#fbbf24" />
                                        <Text style={styles.coverText}> Cover</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                        {/* Add More Button */}
                        <TouchableOpacity style={styles.addMoreThumb} onPress={pickFromGallery}>
                            <Ionicons name="add" size={28} color="#10b981" />
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}

            {/* Big Preview or Empty State */}
            {images.length === 0 ? (
                <View style={styles.emptyPickerArea}>
                    <Ionicons name="images-outline" size={80} color="#d1fae5" />
                    <Text style={styles.emptyPickerTitle}>Add Photos</Text>
                    <Text style={styles.emptyPickerSub}>Pick from gallery or use camera</Text>
                </View>
            ) : (
                <View style={styles.swiperWrap}>
                    <FlatList
                        ref={flatListRef}
                        data={images}
                        keyExtractor={(_, i) => i.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                            setPreviewIndex(idx);
                        }}
                        renderItem={({ item }) => (
                            <View style={styles.swiperSlide}>
                                <Image
                                    source={{ uri: item.uri }}
                                    style={styles.swiperImage}
                                    resizeMode="contain"
                                />
                            </View>
                        )}
                    />
                    {/* Page dots */}
                    {images.length > 1 && (
                        <View style={styles.pageDots}>
                            {images.map((_, i) => (
                                <View key={i} style={[styles.dot, i === previewIndex && styles.dotActive]} />
                            ))}
                        </View>
                    )}
                    {/* Set as Cover pill (only shown for non-cover images) */}
                    {previewIndex > 0 && (
                        <TouchableOpacity style={styles.setCoverPill} onPress={() => setCover(previewIndex)} activeOpacity={0.85}>
                            <Ionicons name="star" size={15} color="#fbbf24" />
                            <Text style={styles.setCoverText}>Set as Cover</Text>
                        </TouchableOpacity>
                    )}
                    {/* Counter */}
                    <View style={styles.previewCountBadge}>
                        <Text style={styles.previewCountText}>{previewIndex + 1} / {images.length}</Text>
                    </View>
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.pickerActions}>
                <TouchableOpacity style={styles.pickerBtn} onPress={pickFromCamera}>
                    <Ionicons name="camera" size={22} color="#fff" />
                    <Text style={styles.pickerBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: '#047857' }]} onPress={pickFromGallery}>
                    <Ionicons name="images" size={22} color="#fff" />
                    <Text style={styles.pickerBtnText}>Gallery</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ──────────────────────────────────────────────
    // STEP 1: DETAILS
    // ──────────────────────────────────────────────
    const renderDetailsStep = () => (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.detailsScroll} showsVerticalScrollIndicator={false}>

                {/* Image Strip */}
                {images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageStrip}>
                        {images.map((img, idx) => (
                            <TouchableOpacity key={idx} onPress={() => setPreviewIndex(idx)}>
                                <Image
                                    source={{ uri: img.uri }}
                                    style={[styles.stripImg, idx === previewIndex && styles.stripImgActive]}
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Title */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Headline *</Text>
                    <TextInput
                        style={styles.fieldInput}
                        placeholder="Write a compelling headline..."
                        placeholderTextColor="#9ca3af"
                        value={title}
                        onChangeText={setTitle}
                        returnKeyType="next"
                    />
                </View>

                {/* State Chip Tabs */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>State *</Text>
                    <View style={styles.chipRow}>
                        {['Jharkhand', 'Bihar', 'West Bengal'].map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.chip, stateName === s && styles.chipActive]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setStateName(s);
                                }}
                            >
                                <Text style={[styles.chipText, stateName === s && styles.chipTextActive]}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Content */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Article Content *</Text>
                    <TextInput
                        style={[styles.fieldInput, styles.textArea]}
                        placeholder="Write the full news article here..."
                        placeholderTextColor="#9ca3af"
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.publishBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="send" size={20} color="#fff" />
                            <Text style={styles.publishBtnText}>Publish News</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.headerBtn}>
                    <Ionicons name={step === 0 ? "close" : "arrow-back"} size={26} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Post State News</Text>
                {step === 0 ? (
                    <TouchableOpacity
                        style={[styles.nextBtn, images.length === 0 && { opacity: 0.4 }]}
                        onPress={goToStep1}
                        disabled={images.length === 0}
                    >
                        <Text style={styles.nextBtnText}>Next</Text>
                        <Ionicons name="arrow-forward" size={18} color="#10b981" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 60 }} />
                )}
            </View>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
                <Animated.View
                    style={[
                        styles.progressFill,
                        { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }
                    ]}
                />
            </View>

            {/* Step Labels */}
            <View style={styles.stepLabels}>
                <Text style={[styles.stepLabel, step === 0 && styles.stepLabelActive]}>① Select Photos</Text>
                <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>② Add Details</Text>
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
                {step === 0 ? renderImageStep() : renderDetailsStep()}
            </View>

            <Toast />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0fdf4' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    },
    headerBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontFamily: 'Outfit_700Bold', color: '#1f2937' },
    nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    nextBtnText: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#10b981' },
    progressTrack: { height: 4, backgroundColor: '#d1fae5' },
    progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 2 },
    stepLabels: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    stepLabel: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#9ca3af' },
    stepLabelActive: { color: '#047857', fontFamily: 'Outfit_700Bold' },

    // Picker Step styles
    stepContainer: { flex: 1, backgroundColor: '#fff' },
    thumbsRow: { backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    selectedThumb: { width: 66, height: 66, marginRight: 8, borderRadius: 10, overflow: 'hidden', position: 'relative', borderWidth: 2, borderColor: 'transparent' },
    selectedThumbActive: { borderColor: '#fff' },
    selectedThumbCover: { borderColor: '#10b981' },
    thumbImg: { width: '100%', height: '100%' },
    thumbRemove: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20 },
    coverBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(16,185,129,0.88)', paddingVertical: 3, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    coverText: { color: '#fff', fontSize: 9, fontFamily: 'Outfit_700Bold' },
    addMoreThumb: { width: 66, height: 66, borderRadius: 10, borderWidth: 2, borderColor: '#10b981', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a2e1a' },
    // Swiper
    swiperWrap: { height: SWIPER_H, backgroundColor: '#fff', position: 'relative' },
    swiperSlide: { width: SCREEN_W, height: SWIPER_H, justifyContent: 'center', alignItems: 'center' },
    swiperImage: { width: SCREEN_W, height: SWIPER_H },
    pageDots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
    dotActive: { backgroundColor: '#fff', width: 18 },
    setCoverPill: { position: 'absolute', top: 12, left: '50%', transform: [{ translateX: -65 }], backgroundColor: 'rgba(0,0,0,0.72)', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: '#fbbf24' },
    setCoverText: { color: '#fbbf24', fontSize: 14, fontFamily: 'Outfit_700Bold' },
    previewCountBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    previewCountText: { color: '#fff', fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
    emptyPickerArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#fff' },
    emptyPickerTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#1f2937' },
    emptyPickerSub: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#9ca3af' },
    pickerActions: { flexDirection: 'row', gap: 16, padding: 16 },
    pickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#374151', paddingVertical: 14, borderRadius: 14 },
    pickerBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },

    // Step 1 - Details
    detailsScroll: { padding: 20, paddingBottom: 60 },
    imageStrip: { marginBottom: 20 },
    stripImg: { width: 80, height: 80, borderRadius: 10, marginRight: 8, opacity: 0.6 },
    stripImgActive: { opacity: 1, borderWidth: 2.5, borderColor: '#10b981' },
    fieldGroup: { marginBottom: 20 },
    fieldLabel: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#374151', marginBottom: 8 },
    fieldInput: { backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, padding: 14, fontSize: 16, fontFamily: 'Outfit_400Regular', color: '#1f2937' },
    textArea: { height: 180, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 30, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
    chipActive: { backgroundColor: '#047857', borderColor: '#047857' },
    chipText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#6b7280' },
    chipTextActive: { color: '#fff' },
    publishBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 30, marginTop: 10,
        shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    publishBtnText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_700Bold' },
});
