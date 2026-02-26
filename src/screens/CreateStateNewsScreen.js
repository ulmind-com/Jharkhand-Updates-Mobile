import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Vibration, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { Audio } from 'expo-av';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function CreateStateNewsScreen() {
    const navigation = useNavigation();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [stateName, setStateName] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'We need camera roll permissions.' });
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
        if (!title.trim() || !content.trim()) {
            Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill in the News Title and Content.' });
            return;
        }
        if (!stateName) {
            Toast.show({ type: 'error', text1: 'Missing State', text2: 'Please select a state.' });
            return;
        }
        if (images.length === 0) {
            Toast.show({ type: 'error', text1: 'Missing Image', text2: 'Please upload at least one image.' });
            return;
        }

        setLoading(true);
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');

            if (!token) {
                Toast.show({ type: 'error', text1: 'Unauthorized', text2: 'Please log in again.' });
                return;
            }

            const formData = new FormData();

            const newsPayload = { title: title.trim(), content: content.trim(), stateName };

            formData.append(
                "news",
                Platform.OS === 'web'
                    ? new Blob([JSON.stringify(newsPayload)], { type: "application/json" })
                    : JSON.stringify(newsPayload)
            );

            images.forEach((img) => {
                formData.append("images", { uri: img.uri, type: img.type, name: img.name });
            });

            const res = await axios.post(`${BASE_URL}/state-news`, formData, {
                headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
            });

            if (res.data.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'News posted successfully!' });

                try {
                    const { sound } = await Audio.Sound.createAsync(
                        require('../../assets/sounds/success.mp3'),
                        { shouldPlay: true }
                    );
                    sound.setOnPlaybackStatusUpdate(status => {
                        if (status.didJustFinish) {
                            sound.unloadAsync();
                        }
                    });
                } catch (audioErr) {
                    console.log("Audio play error", audioErr);
                }

                setTimeout(() => {
                    navigation.navigate('Main', { screen: 'State News' });
                }, 1000);
            }
        } catch (error) {
            console.error("News post error:", error);
            Toast.show({ type: 'error', text1: 'Upload Failed', text2: error.response?.data?.message || 'Could not post news.' });
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
                <Text style={styles.headerTitle}>Post State News</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color="#047857" />
                        <Text style={styles.infoText}>This is an Admin-only action. News will be published directly to the selected State's feed.</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>News Title *</Text>
                        <TextInput style={styles.input} placeholder="Enter headline" value={title} onChangeText={setTitle} placeholderTextColor="#9ca3af" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Select State *</Text>
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={stateName} onValueChange={setStateName}>
                                <Picker.Item label="-- Choose a State --" value="" />
                                <Picker.Item label="Bihar" value="Bihar" />
                                <Picker.Item label="Jharkhand" value="Jharkhand" />
                            </Picker>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Content *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Write your news article here..."
                            value={content}
                            onChangeText={setContent}
                            multiline
                            numberOfLines={10}
                            textAlignVertical="top"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Images *</Text>
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
                                <Ionicons name="camera-outline" size={32} color="#10b981" />
                                <Text style={styles.uploadText}>Add Photos</Text>
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
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Publish News</Text>}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
            <Toast />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#047857' },
    scrollContent: { padding: 20 },
    infoBox: { flexDirection: 'row', backgroundColor: '#ecfdf5', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#a7f3d0', marginBottom: 20, alignItems: 'center' },
    infoText: { flex: 1, marginLeft: 8, fontSize: 13, fontFamily: 'Outfit_400Regular', color: '#047857', lineHeight: 18 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, fontFamily: 'Outfit_400Regular', color: '#1f2937' },
    textArea: { height: 180 },
    pickerContainer: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden' },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    imageWrapper: { position: 'relative', width: 100, height: 100, borderRadius: 8, overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 20 },
    uploadBtn: { width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderColor: '#10b981', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
    uploadText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#10b981', marginTop: 4, fontFamily: 'Outfit_600SemiBold' },
    submitBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 10, marginBottom: 40, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
    submitText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' }
});







