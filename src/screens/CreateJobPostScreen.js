import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { Audio } from 'expo-av';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function CreateJobPostScreen() {
    const navigation = useNavigation();
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [location, setLocation] = useState('');
    const [salaryRange, setSalaryRange] = useState('');
    const [description, setDescription] = useState('');
    const [applicationLink, setApplicationLink] = useState('');
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
        if (!title.trim() || !description.trim()) {
            Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill in the Job Title and Description.' });
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

            const jobPayload = { title: title.trim(), description: description.trim() };
            if (company.trim()) jobPayload.company = company.trim();
            if (location.trim()) jobPayload.location = location.trim();
            if (salaryRange.trim()) jobPayload.salaryRange = salaryRange.trim();
            if (applicationLink.trim()) jobPayload.reglink = applicationLink.trim();

            formData.append(
                "job",
                Platform.OS === 'web'
                    ? new Blob([JSON.stringify(jobPayload)], { type: "application/json" })
                    : JSON.stringify(jobPayload)
            );

            images.forEach((img) => {
                formData.append("images", { uri: img.uri, type: img.type, name: img.name });
            });

            const res = await axios.post(`${BASE_URL}/jobs`, formData, {
                headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
            });

            if (res.data.success) {
                if (Platform.OS !== 'web') {
                    Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                const isPending = res.data.data && res.data.data.status === 'PENDING';
                Toast.show({ 
                    type: 'success', 
                    text1: isPending ? 'Pending Approval' : 'Success', 
                    text2: isPending ? 'Your post is waiting for admin approval.' : 'Job posted successfully!' 
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
                    navigation.navigate('Main', { screen: 'Jobs' });
                }, 1000);
            }
        } catch (error) {
            console.error("Job post error:", error);
            Toast.show({ type: 'error', text1: 'Upload Failed', text2: error.response?.data?.message || 'Could not post job.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#047857" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Post a Job</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <Text style={styles.sectionHint}>* Required fields</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Job Title *</Text>
                        <TextInput style={styles.input} placeholder="e.g., Software Developer" value={title} onChangeText={setTitle} placeholderTextColor="#9ca3af" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Job Description *</Text>
                        <TextInput style={[styles.input, styles.textArea]} placeholder="Responsibilities, requirements..." value={description} onChangeText={setDescription} multiline numberOfLines={5} textAlignVertical="top" placeholderTextColor="#9ca3af" />
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
                                <Ionicons name="cloud-upload-outline" size={32} color="#10b981" />
                                <Text style={styles.uploadText}>Select Files</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.divider} />
                    <Text style={[styles.sectionHint, { color: '#6b7280', fontStyle: 'italic', marginBottom: 12 }]}>Optional Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Company Name</Text>
                        <TextInput style={styles.input} placeholder="e.g., Google" value={company} onChangeText={setCompany} placeholderTextColor="#9ca3af" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Location</Text>
                        <TextInput style={styles.input} placeholder="e.g., London, UK" value={location} onChangeText={setLocation} placeholderTextColor="#9ca3af" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Salary Range</Text>
                        <TextInput style={styles.input} placeholder="e.g., $50,000 - $70,000" value={salaryRange} onChangeText={setSalaryRange} placeholderTextColor="#9ca3af" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Application Link</Text>
                        <TextInput style={styles.input} placeholder="https://..." value={applicationLink} onChangeText={setApplicationLink} placeholderTextColor="#9ca3af" autoCapitalize="none" />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') {
                                Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            handleSubmit();
                        }}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Post Job</Text>}
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
    sectionHint: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: '#ef4444', marginBottom: 16 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, fontFamily: 'Outfit_400Regular', color: '#1f2937' },
    textArea: { height: 120 },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    imageWrapper: { position: 'relative', width: 100, height: 100, borderRadius: 8, overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 20 },
    uploadBtn: { width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderColor: '#10b981', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
    uploadText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#10b981', marginTop: 4, fontFamily: 'Outfit_600SemiBold' },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
    submitBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 10, marginBottom: 40, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
    submitText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' }
});







