import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Modal, TextInput } from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { View as MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { ProfileSkeleton } from '../components/Skeletons';
import { ThemeContext } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function UserProfileScreen() {
    const navigation = useNavigation();
    const { isDarkMode, toggleTheme, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [formData, setFormData] = useState({ firstName: '', lastName: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [successPopup, setSuccessPopup] = useState({ visible: false, title: '', message: '' });

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            let token = null;
            if (Platform.OS === 'web') {
                token = localStorage.getItem('accessToken');
            } else {
                token = await SecureStore.getItemAsync('accessToken');
            }

            if (!token) {
                navigation.replace('Login');
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };

            const [profileRes, statsRes] = await Promise.all([
                axios.get(`${BASE_URL}/user/profile`, { headers }),
                axios.get(`${BASE_URL}/user/stats`, { headers })
            ]);

            const userData = profileRes.data.data;
            setProfile(userData);
            setStats(statsRes.data.data);
            setFormData({ firstName: userData.firstName || '', lastName: userData.lastName || '' });

            // Sync User Name for Weather Widget
            if (userData?.fullName) {
                if (Platform.OS === 'web') {
                    localStorage.setItem('userName', userData.fullName);
                } else {
                    await SecureStore.setItemAsync('userName', userData.fullName);
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load profile data' });
            if (error.response?.status === 401) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Need gallery access to upload photo' });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadProfileImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Toast.show({ type: 'error', text1: 'Error picking image' });
        }
    };

    const uploadProfileImage = async (uri) => {
        setIsUploadingImage(true);
        try {
            let token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const data = new FormData();
            const fileName = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(fileName);
            const type = match ? `image/${match[1]}` : `image`;

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                data.append('image', blob, fileName);
            } else {
                data.append('image', { uri, name: fileName, type });
            }

            await axios.put(`${BASE_URL}/user/profile/image`, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                }
            });

            // Re-fetch profile to get updated image URL
            const profileRes = await axios.get(`${BASE_URL}/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const newImageUrl = profileRes.data.data.profileImageUrl + "?t=" + Date.now();
            setProfile(prev => ({ ...prev, ...profileRes.data.data, profileImageUrl: newImageUrl }));

            setSuccessPopup({ visible: true, title: 'Updated Successfully', message: 'Your profile photo has been updated!' });
        } catch (error) {
            console.error("Error uploading image:", error);
            Toast.show({ type: 'error', text1: 'Failed to upload photo' });
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!formData.firstName.trim()) {
            Toast.show({ type: 'error', text1: 'First Name is required' });
            return;
        }

        setIsSubmitting(true);
        try {
            let token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const res = await axios.put(`${BASE_URL}/user/profile`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setProfile(res.data.data);
                setEditModalVisible(false);
                setSuccessPopup({ visible: true, title: 'Profile Updated', message: 'Your personal details have been saved.' });

                if (Platform.OS === 'web') {
                    localStorage.setItem('userName', res.data.data.fullName);
                } else {
                    await SecureStore.setItemAsync('userName', res.data.data.fullName);
                }
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            Toast.show({ type: 'error', text1: 'Failed to update account', text2: error.response?.data?.message || 'Something went wrong' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('role');
            localStorage.removeItem('userName');
        } else {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('role');
            await SecureStore.deleteItemAsync('userName');
        }

        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Toast.show({ type: 'success', text1: 'Logged out successfully' });
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

    const confirmLogout = () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to log out?")) handleLogout();
        } else {
            Alert.alert("Logout", "Are you sure you want to log out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", onPress: handleLogout, style: "destructive" }
            ]);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.logoutButton}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>My Profile</Text>
                    </View>
                    <TouchableOpacity onPress={confirmLogout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={24} color={colors.danger} />
                    </TouchableOpacity>
                </View>
                <ProfileSkeleton />
            </SafeAreaView>
        );
    }

    if (!profile) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.logoutButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Profile</Text>
                </View>
                <TouchableOpacity onPress={confirmLogout} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={24} color={colors.danger} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Profile Card */}
                <MotiView
                    style={styles.profileCard}
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring' }}
                >
                    <View style={styles.avatarContainer}>
                        {profile.profileImageUrl ? (
                            <Image source={{ uri: profile.profileImageUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={40} color={colors.primary} />
                            </View>
                        )}
                        <TouchableOpacity style={styles.editAvatarBadge} onPress={handlePickImage} disabled={isUploadingImage}>
                            {isUploadingImage ? <ActivityIndicator size="small" color={colors.surface} /> : <Ionicons name="camera" size={16} color={colors.surface} />}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.profileInfo}>
                        <Text style={styles.name}>{profile.fullName}</Text>
                        <Text style={styles.email}>{profile.email}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{profile.role}</Text>
                        </View>
                    </View>
                </MotiView>

                {/* Statistics Grid */}
                <Text style={styles.sectionTitle}>My Activity</Text>

                {stats && (
                    <MotiView
                        style={styles.statsGrid}
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 400, delay: 100 }}
                    >
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{stats.totalCommunityPosts}</Text>
                            <Text style={styles.statLabel}>Posts</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{stats.totalEvents}</Text>
                            <Text style={styles.statLabel}>Events</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{stats.totalJobs}</Text>
                            <Text style={styles.statLabel}>Jobs</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{stats.totalProperties || 0}</Text>
                            <Text style={styles.statLabel}>Properties</Text>
                        </View>
                    </MotiView>
                )}

                {/* Menu Options */}

                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyPosts')}>
                        <View style={[styles.menuIconBox, { backgroundColor: '#dcfce7' }]}>
                            <Ionicons name="document-text" size={20} color="#059669" />
                        </View>
                        <Text style={styles.menuText}>My Posts & Listings</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('History')}>
                        <View style={[styles.menuIconBox, { backgroundColor: '#ccfbf1' }]}>
                            <Ionicons name="time" size={20} color="#0d9488" />
                        </View>
                        <Text style={styles.menuText}>History</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => setEditModalVisible(true)}>
                        <View style={[styles.menuIconBox, { backgroundColor: '#e0e7ff' }]}>
                            <Ionicons name="settings" size={20} color="#4f46e5" />
                        </View>
                        <Text style={styles.menuText}>Account Settings</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>

                    <View style={styles.menuItem}>
                        <View style={[styles.menuIconBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f1f5f9' }]}>
                            <Ionicons name="moon" size={20} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                        </View>
                        <Text style={styles.menuText}>Dark Mode</Text>
                        <Switch
                            trackColor={{ false: '#e2e8f0', true: colors.primary }}
                            thumbColor={colors.surface}
                            value={isDarkMode}
                            onValueChange={toggleTheme}
                        />
                    </View>
                </View>

            </ScrollView>

            <Modal
                visible={isEditModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalDismissArea} onPress={() => setEditModalVisible(false)} activeOpacity={1} />
                    <MotiView
                        from={{ opacity: 0, translateY: 100 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textDim} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>First Name</Text>
                        <TextInput
                            style={styles.inputField}
                            value={formData.firstName}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                            placeholder="Enter first name"
                            placeholderTextColor={colors.textDim}
                        />

                        <Text style={styles.inputLabel}>Last Name</Text>
                        <TextInput
                            style={styles.inputField}
                            value={formData.lastName}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                            placeholder="Enter last name"
                            placeholderTextColor={colors.textDim}
                        />

                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleUpdateProfile}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </MotiView>
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal
                visible={successPopup.visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSuccessPopup({ ...successPopup, visible: false })}
            >
                <View style={styles.successModalOverlay}>
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={styles.successModalContent}
                    >
                        <View style={styles.successIconBox}>
                            <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                        </View>
                        <Text style={styles.successModalTitle}>{successPopup.title}</Text>
                        <Text style={styles.successModalMessage}>{successPopup.message}</Text>
                        <TouchableOpacity
                            style={styles.successModalBtn}
                            onPress={() => setSuccessPopup({ ...successPopup, visible: false })}
                        >
                            <Text style={styles.successModalBtnText}>Awesome</Text>
                        </TouchableOpacity>
                    </MotiView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 15, backgroundColor: colors.surface,
        borderBottomWidth: 1, borderBottomColor: colors.border
    },
    headerTitle: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: colors.text },
    logoutButton: { padding: 4 },
    scrollContent: { padding: 16 },

    profileCard: {
        backgroundColor: colors.surface, borderRadius: 24, padding: 20,
        flexDirection: 'row', alignItems: 'center', gap: 16,
        marginBottom: 24, elevation: 4, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 8,
        borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border
    },
    avatarContainer: { position: 'relative' },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    avatarPlaceholder: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#d1fae5',
        alignItems: 'center', justifyContent: 'center'
    },
    editAvatarBadge: {
        position: 'absolute', bottom: -4, right: -4, backgroundColor: colors.primary,
        width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.surface
    },
    profileInfo: { flex: 1 },
    name: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 4 },
    email: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.textDim, marginBottom: 8 },
    roleBadge: {
        alignSelf: 'flex-start', backgroundColor: colors.surfaceDeeper,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20
    },
    roleText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: colors.text, textTransform: 'uppercase' },

    sectionTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 12, marginLeft: 4 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
    statBox: {
        flex: 1, minWidth: '45%', backgroundColor: colors.surface, padding: 16, borderRadius: 20,
        alignItems: 'center', elevation: 2, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 4,
        borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border
    },
    statValue: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: colors.primary, marginBottom: 4 },
    statLabel: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim, fontFamily: 'Outfit_500Medium' },

    menuContainer: { backgroundColor: colors.surface, borderRadius: 24, padding: 8, elevation: 2, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 4, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
    menuIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? colors.surfaceDeeper : undefined },
    menuText: { flex: 1, fontSize: 16, fontFamily: 'Outfit_500Medium', color: colors.text },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalDismissArea: { flex: 1 },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: colors.shadow, shadowOffset: { width: 0, height: -10 }, shadowOpacity: isDarkMode ? 0.3 : 0.1, shadowRadius: 20, elevation: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.text },
    inputLabel: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: colors.text, marginBottom: 8, marginLeft: 4 },
    inputField: { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6', borderRadius: 16, padding: 16, fontSize: 16, fontFamily: 'Outfit_400Regular', color: colors.text, marginBottom: 20, borderWidth: 1, borderColor: isDarkMode ? colors.border : 'transparent' },
    saveBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    saveBtnText: { color: '#ffffff', fontSize: 16, fontFamily: 'Outfit_600SemiBold', letterSpacing: 0.5 },

    successModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
    successModalContent: { backgroundColor: colors.surface, borderRadius: 24, padding: 32, width: '80%', maxWidth: 340, alignItems: 'center', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    successIconBox: { marginBottom: 16 },
    successModalTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 8, textAlign: 'center' },
    successModalMessage: { fontSize: 15, fontFamily: 'Outfit_400Regular', color: colors.textDim, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    successModalBtn: { backgroundColor: '#10b981', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, width: '100%', alignItems: 'center' },
    successModalBtnText: { color: '#ffffff', fontSize: 16, fontFamily: 'Outfit_600SemiBold' }
});







