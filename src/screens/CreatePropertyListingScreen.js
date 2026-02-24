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
import { Picker } from '@react-native-picker/picker';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function CreatePropertyListingScreen() {
    const navigation = useNavigation();

    // Mapping exact web form fields
    const [form, setForm] = useState({
        title: "", description: "", propertyType: "HOUSE", propertyStatus: "FOR_SALE",
        price: "", negotiable: false, address: "", district: "", city: "", state: "Jharkhand",
        pincode: "", locality: "", mapLink: "", latitude: "", longitude: "", totalArea: "",
        bedrooms: "", bathrooms: "", totalFloors: "", floorNumber: "", furnishingStatus: "SEMI_FURNISHED",
        parkingAvailable: false, parkingSpaces: "", amenities: "", propertyAge: "",
        facingDirection: "NORTH", availabilityStatus: "READY_TO_MOVE", contactName: "",
        contactPhone: "", contactEmail: "", postedByType: "OWNER"
    });

    const [propertyImages, setPropertyImages] = useState([]);
    const [floorPlanImages, setFloorPlanImages] = useState([]);
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
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const toggleBoolean = (name) => {
        setForm(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const pickImage = async (isFloorPlan = false) => {
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

            if (isFloorPlan) {
                if (floorPlanImages.length + selectedImages.length > 5) {
                    Toast.show({ type: 'error', text1: 'Limit Exceeded', text2: 'Max 5 floor plans allowed' });
                    return;
                }
                setFloorPlanImages(prev => [...prev, ...selectedImages]);
            } else {
                if (propertyImages.length + selectedImages.length > 10) {
                    Toast.show({ type: 'error', text1: 'Limit Exceeded', text2: 'Max 10 property images allowed' });
                    return;
                }
                setPropertyImages(prev => [...prev, ...selectedImages]);
            }
        }
    };

    const removeImage = (indexToRemove, isFloorPlan = false) => {
        if (isFloorPlan) {
            setFloorPlanImages(prev => prev.filter((_, i) => i !== indexToRemove));
        } else {
            setPropertyImages(prev => prev.filter((_, i) => i !== indexToRemove));
        }
    };

    const handleSubmit = async () => {
        if (form.title.length < 10 || form.title.length > 200) {
            Toast.show({ type: 'error', text1: 'Invalid Title', text2: 'Title must be between 10 and 200 chars' }); return;
        }
        if (form.description.length < 50 || form.description.length > 5000) {
            Toast.show({ type: 'error', text1: 'Invalid Description', text2: 'Description must be between 50 and 5000 chars' }); return;
        }
        if (propertyImages.length === 0) {
            Toast.show({ type: 'error', text1: 'Missing Image', text2: 'At least one property image is required' }); return;
        }
        if (form.contactPhone && !/^[0-9]{10}$/.test(form.contactPhone.replace(/\s+/g, ''))) {
            Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Contact phone must be 10 digits' }); return;
        }
        if (!form.price || parseFloat(form.price) <= 0) {
            Toast.show({ type: 'error', text1: 'Invalid Price', text2: 'Price must be greater than 0' }); return;
        }
        if (!form.totalArea || parseInt(form.totalArea) < 1) {
            Toast.show({ type: 'error', text1: 'Invalid Area', text2: 'Total area must be at least 1 sq ft' }); return;
        }

        setLoading(true);
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');

            if (!token) {
                Toast.show({ type: 'error', text1: 'Unauthorized', text2: 'Please log in again.' }); return;
            }

            const propertyData = {
                ...form,
                contactPhone: form.contactPhone.replace(/\s+/g, ''),
                latitude: form.latitude ? parseFloat(form.latitude) : null,
                longitude: form.longitude ? parseFloat(form.longitude) : null,
                totalArea: parseInt(form.totalArea),
                bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
                bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
                totalFloors: form.totalFloors ? parseInt(form.totalFloors) : null,
                floorNumber: form.floorNumber ? parseInt(form.floorNumber) : null,
                parkingSpaces: form.parkingSpaces ? parseInt(form.parkingSpaces) : null,
                propertyAge: form.propertyAge ? parseInt(form.propertyAge) : null,
                amenities: form.amenities ? form.amenities.split(",").map(a => a.trim()).filter(Boolean) : []
            };

            const formData = new FormData();

            formData.append(
                "property",
                Platform.OS === 'web'
                    ? new Blob([JSON.stringify(propertyData)], { type: "application/json" })
                    : JSON.stringify(propertyData)
            );

            propertyImages.forEach((img) => formData.append("images", { uri: img.uri, type: img.type, name: img.name }));
            floorPlanImages.forEach((img) => formData.append("floorPlans", { uri: img.uri, type: img.type, name: img.name }));

            const res = await axios.post(`${BASE_URL}/properties`, formData, {
                headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
            });

            if (res.data.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Property listed successfully and pending approval!' });
                navigation.goBack();
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: res.data.message || 'Failed to create property' });
            }
        } catch (error) {
            console.error("Property post error:", error);
            Toast.show({ type: 'error', text1: 'Upload Failed', text2: error.response?.data?.message || 'Could not post property.' });
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
                <Text style={styles.headerTitle}>List a Property</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <Text style={styles.sectionHint}>* Required fields</Text>

                    {/* Basic Info */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Basic Details</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Title *</Text>
                            <TextInput style={styles.input} placeholder="E.g. 2BHK Apartment for Sale" value={form.title} onChangeText={(v) => handleChange('title', v)} placeholderTextColor="#9ca3af" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description *</Text>
                            <TextInput style={[styles.input, styles.textArea]} placeholder="Detailed description..." value={form.description} onChangeText={(v) => handleChange('description', v)} multiline numberOfLines={5} textAlignVertical="top" placeholderTextColor="#9ca3af" />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Property Type</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker selectedValue={form.propertyType} onValueChange={(v) => handleChange('propertyType', v)}>
                                        <Picker.Item label="House" value="HOUSE" />
                                        <Picker.Item label="Apartment" value="APARTMENT" />
                                        <Picker.Item label="Villa" value="VILLA" />
                                        <Picker.Item label="Commercial" value="COMMERCIAL" />
                                        <Picker.Item label="Plot/Land" value="PLOT_LAND" />
                                    </Picker>
                                </View>
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Status</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker selectedValue={form.propertyStatus} onValueChange={(v) => handleChange('propertyStatus', v)}>
                                        <Picker.Item label="For Sale" value="FOR_SALE" />
                                        <Picker.Item label="For Rent" value="FOR_RENT" />
                                    </Picker>
                                </View>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Price (₹) *</Text>
                            <TextInput style={styles.input} placeholder="E.g. 5000000" keyboardType="numeric" value={form.price} onChangeText={(v) => handleChange('price', v)} placeholderTextColor="#9ca3af" />
                        </View>

                        <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleBoolean('negotiable')}>
                            <Ionicons name={form.negotiable ? "checkbox" : "square-outline"} size={22} color={form.negotiable ? "#10b981" : "#9ca3af"} />
                            <Text style={styles.checkboxLabel}>Price is Negotiable</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Specifications */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Specifications</Text>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Total Area (sq ft) *</Text>
                                <TextInput style={styles.input} keyboardType="numeric" value={form.totalArea} onChangeText={(v) => handleChange('totalArea', v)} />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Bedrooms</Text>
                                <TextInput style={styles.input} keyboardType="numeric" value={form.bedrooms} onChangeText={(v) => handleChange('bedrooms', v)} />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Bathrooms</Text>
                                <TextInput style={styles.input} keyboardType="numeric" value={form.bathrooms} onChangeText={(v) => handleChange('bathrooms', v)} />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Furnishing</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker selectedValue={form.furnishingStatus} onValueChange={(v) => handleChange('furnishingStatus', v)}>
                                        <Picker.Item label="Fully Furnished" value="FULLY_FURNISHED" />
                                        <Picker.Item label="Semi-Furnished" value="SEMI_FURNISHED" />
                                        <Picker.Item label="Unfurnished" value="UNFURNISHED" />
                                    </Picker>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Images */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Property Images *</Text>
                        <View style={styles.imageGrid}>
                            {propertyImages.map((img, idx) => (
                                <View key={idx} style={styles.imageWrapper}>
                                    <Image source={{ uri: img.uri }} style={styles.previewImage} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(idx, false)}>
                                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(false)}>
                                <Ionicons name="camera-outline" size={32} color="#10b981" />
                                <Text style={styles.uploadText}>Add Photos</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>List Property</Text>}
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
    sectionCard: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    sectionTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#1f2937', marginBottom: 16 },
    inputGroup: { marginBottom: 16 },
    row: { flexDirection: 'row' },
    label: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#4b5563', marginBottom: 6 },
    input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, fontFamily: 'Outfit_400Regular', color: '#1f2937' },
    textArea: { height: 100 },
    pickerContainer: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, backgroundColor: '#f9fafb', overflow: 'hidden' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    checkboxLabel: { marginLeft: 8, fontSize: 15, fontFamily: 'Outfit_400Regular', color: '#4b5563' },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
    imageWrapper: { position: 'relative', width: 90, height: 90, borderRadius: 8, overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 20 },
    uploadBtn: { width: 90, height: 90, borderRadius: 8, borderWidth: 2, borderColor: '#10b981', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
    uploadText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#10b981', marginTop: 4, fontFamily: 'Outfit_600SemiBold' },
    submitBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 10, marginBottom: 40, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
    submitText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' }
});







