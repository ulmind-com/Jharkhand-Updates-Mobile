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

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function CreatePromotionScreen() {
    const navigation = useNavigation();

    const [formData, setFormData] = useState({
        shopName: '',
        shopDescription: '',
        shopAddress: '',
        vendorPhone: ''
    });

    const [shopLogo, setShopLogo] = useState(null);
    const [shopCover, setShopCover] = useState(null);
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

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const pickImage = async (type) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === 'logo' ? [1, 1] : [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            const selectedImage = {
                uri: result.assets[0].uri,
                type: result.assets[0].mimeType || 'image/jpeg',
                name: result.assets[0].fileName || `image_${new Date().getTime()}.jpg`
            };

            if (type === 'logo') {
                setShopLogo(selectedImage);
            } else {
                setShopCover(selectedImage);
            }
        }
    };

    const removeImage = (type) => {
        if (type === 'logo') setShopLogo(null);
        else setShopCover(null);
    };

    const handleSubmit = async () => {
        if (!formData.shopName.trim()) {
            Toast.show({ type: 'error', text1: 'Missing Field', text2: 'Shop name is required' }); return;
        }
        if (!formData.shopAddress.trim()) {
            Toast.show({ type: 'error', text1: 'Missing Field', text2: 'Shop address is required' }); return;
        }
        if (!formData.vendorPhone.trim() || !/^[6-9]\d{9}$/.test(formData.vendorPhone)) {
            Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Please enter a valid 10-digit WhatsApp number' }); return;
        }

        setLoading(true);
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');

            if (!token) {
                Toast.show({ type: 'error', text1: 'Unauthorized', text2: 'Please log in to register as a vendor.' }); return;
            }

            const vendorData = {
                shopName: formData.shopName.trim(),
                shopDescription: formData.shopDescription.trim() || null,
                shopAddress: formData.shopAddress.trim(),
                vendorPhone: formData.vendorPhone.trim(),
            };

            const formDataToSend = new FormData();

            formDataToSend.append(
                "vendor",
                Platform.OS === 'web'
                    ? new Blob([JSON.stringify(vendorData)], { type: "application/json" })
                    : JSON.stringify(vendorData)
            );

            if (shopLogo) formDataToSend.append("shopLogo", shopLogo);
            if (shopCover) formDataToSend.append("shopCover", shopCover);

            const res = await axios.post(`${BASE_URL}/vendors/register`, formDataToSend, {
                headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
            });

            if (res.data.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Vendor registration submitted! Awaiting admin approval.' });
                navigation.goBack();
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: res.data.message || 'Failed to register vendor' });
            }
        } catch (error) {
            console.error("Promotion post error:", error);
            Toast.show({ type: 'error', text1: 'Registration Failed', text2: error.response?.data?.message || 'Could not register vendor.' });
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
                <Text style={styles.headerTitle}>Register as Vendor</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <Text style={styles.sectionHint}>* Required fields</Text>

                    <View style={styles.imagesRow}>
                        {/* Logo Upload */}
                        <View style={styles.imageUploadContainer}>
                            <Text style={styles.label}>Shop Logo</Text>
                            {shopLogo ? (
                                <View style={styles.previewWrapperSquare}>
                                    <Image source={{ uri: shopLogo.uri }} style={styles.previewImage} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage('logo')}>
                                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.uploadBtnSquare} onPress={() => pickImage('logo')}>
                                    <Ionicons name="business-outline" size={28} color="#9ca3af" />
                                    <Text style={styles.uploadText}>Add Logo</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Cover Photo Upload */}
                        <View style={[styles.imageUploadContainer, { flex: 1 }]}>
                            <Text style={styles.label}>Cover Photo</Text>
                            {shopCover ? (
                                <View style={styles.previewWrapperWide}>
                                    <Image source={{ uri: shopCover.uri }} style={styles.previewImage} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage('cover')}>
                                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.uploadBtnWide} onPress={() => pickImage('cover')}>
                                    <Ionicons name="image-outline" size={28} color="#9ca3af" />
                                    <Text style={styles.uploadText}>Add Cover</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Shop Name *</Text>
                        <TextInput style={styles.input} placeholder="Enter your shop name" value={formData.shopName} onChangeText={(v) => handleChange('shopName', v)} placeholderTextColor="#9ca3af" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Shop Address / Location *</Text>
                        <TextInput style={[styles.input, { height: 80 }]} placeholder="Main Road, Ranchi, Jharkhand" value={formData.shopAddress} onChangeText={(v) => handleChange('shopAddress', v)} multiline textAlignVertical="top" placeholderTextColor="#9ca3af" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Shop Description</Text>
                        <TextInput style={[styles.input, { height: 100 }]} placeholder="Describe your shop and products..." value={formData.shopDescription} onChangeText={(v) => handleChange('shopDescription', v)} multiline textAlignVertical="top" placeholderTextColor="#9ca3af" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>WhatsApp Number *</Text>
                        <TextInput style={styles.input} placeholder="10-digit mobile number" value={formData.vendorPhone} onChangeText={(v) => handleChange('vendorPhone', v)} keyboardType="numeric" maxLength={10} placeholderTextColor="#9ca3af" />
                        <Text style={styles.helperText}>Orders will be sent to this WhatsApp number</Text>
                    </View>

                    <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit for Approval</Text>}
                    </TouchableOpacity>

                    <Text style={styles.footerText}>Your vendor application will be reviewed by admin before approval</Text>

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
    imagesRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    imageUploadContainer: { alignItems: 'flex-start' },
    label: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#374151', marginBottom: 8 },
    uploadBtnSquare: { width: 100, height: 100, borderRadius: 20, borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
    previewWrapperSquare: { width: 100, height: 100, borderRadius: 20, overflow: 'hidden', position: 'relative' },
    uploadBtnWide: { flex: 1, height: 100, borderRadius: 20, borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
    previewWrapperWide: { flex: 1, height: 100, borderRadius: 20, overflow: 'hidden', position: 'relative' },
    previewImage: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 20 },
    uploadText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#6b7280', marginTop: 4, fontFamily: 'Outfit_500Medium' },
    inputGroup: { marginBottom: 16 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, fontFamily: 'Outfit_400Regular', color: '#1f2937' },
    helperText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#6b7280', marginTop: 4 },
    submitBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 10, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
    submitText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' },
    footerText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#6b7280', textAlign: 'center', marginTop: 16, marginBottom: 40 }
});







