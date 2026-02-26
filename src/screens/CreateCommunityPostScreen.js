import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { View as MotiView } from 'moti';
import { Audio } from 'expo-av';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function CreateCommunityPostScreen() {
    const navigation = useNavigation();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [location, setLocation] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'We need camera roll permissions to upload images.' });
                }
            }
        })();
    }, []);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const selectedImages = result.assets.map(asset => ({
                uri: asset.uri,
                type: asset.mimeType || 'image/jpeg',
                name: asset.fileName || `image_${new Date().getTime()}.jpg`
            }));
            setImages(prev => [...prev, ...selectedImages]);
        }
    };

    const removeImage = (indexToRemove) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = async () => {
        if (!content.trim()) {
            Toast.show({ type: 'error', text1: 'Missing Content', text2: 'Please write something for your post.' });
            return;
        }

        setLoading(true);
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');

            if (!token) {
                Toast.show({ type: 'error', text1: 'Unauthorized', text2: 'Please log in again.' });
                navigation.navigate('Login');
                return;
            }

            const formData = new FormData();

            const postPayload = { content: content.trim() };
            if (title.trim()) postPayload.title = title.trim();
            if (location.trim()) postPayload.location = location.trim();

            formData.append(
                "post",
                Platform.OS === 'web'
                    ? new Blob([JSON.stringify(postPayload)], { type: "application/json" })
                    : JSON.stringify(postPayload)
            );

            if (images.length > 0) {
                images.forEach((img) => {
                    formData.append("images", {
                        uri: img.uri,
                        type: img.type,
                        name: img.name,
                    });
                });
            }

            const res = await axios.post(`${BASE_URL}/community`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.data.success) {
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                const isPending = res.data.data && res.data.data.status === 'PENDING';
                Toast.show({ 
                    type: 'success', 
                    text1: isPending ? 'Pending Approval' : 'Success', 
                    text2: isPending ? 'Your post is waiting for admin approval.' : 'Community post created successfully!' 
                });

                try {
                    const { sound } = await Audio.Sound.createAsync(
                        require('../../assets/sounds/success.mp3'),
                        { shouldPlay: true }
                    );
                    sound.setOnPlaybackStatusUpdate(status => {
                        if (status.didJustFinish) sound.unloadAsync();
                    });
                } catch (audioErr) {
                    console.log("Audio play error", audioErr);
                }

                setTimeout(() => {
                    navigation.navigate('Main', { screen: 'Community' });
                }, 1000);
            }
        } catch (error) {
            console.error("Post creation error:", error);
            Toast.show({ type: 'error', text1: 'Upload Failed', text2: error.response?.data?.message || 'Could not create post.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#047857" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Community Post</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Title (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="What's this about?"
                            value={title}
                            onChangeText={setTitle}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Content *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Share something with your community..."
                            value={content}
                            onChangeText={setContent}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Location (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Add a location"
                            value={location}
                            onChangeText={setLocation}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Images</Text>
                        <View style={styles.imageGrid}>
                            {images.map((img, idx) => (
                                <View key={idx} style={styles.imageWrapper}>
                                    <Image source={{ uri: img.uri }} style={styles.previewImage} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(idx)}>
                                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                                <Ionicons name="cloud-upload-outline" size={32} color="#10b981" />
                                <Text style={styles.uploadText}>Select Files</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            handleSubmit();
                        }}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitText}>Post Community</Text>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
            <Toast />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#047857' },
    scrollContent: { padding: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#374151', marginBottom: 8 },
    input: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
        borderRadius: 8, padding: 12, fontSize: 16, fontFamily: 'Outfit_400Regular', color: '#1f2937',
    },
    textArea: { height: 120 },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    imageWrapper: { position: 'relative', width: 100, height: 100, borderRadius: 8, overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 20 },
    uploadBtn: {
        width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderColor: '#10b981', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4'
    },
    uploadText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#10b981', marginTop: 4, fontFamily: 'Outfit_600SemiBold' },
    submitBtn: {
        backgroundColor: '#10b981', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 10,
        shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5
    },
    submitText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' }
});







