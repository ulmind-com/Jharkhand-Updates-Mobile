import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { View as MotiView, AnimatePresence } from 'moti';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

export default function CreatePostModal({ visible, onClose }) {
    const navigation = useNavigation();
    const [userRole, setUserRole] = useState('USER');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        if (visible) {
            checkAuth();
        }
    }, [visible]);

    const checkAuth = async () => {
        try {
            const token = Platform.OS === 'web'
                ? localStorage.getItem('accessToken')
                : await SecureStore.getItemAsync('accessToken');
            const role = Platform.OS === 'web'
                ? localStorage.getItem('role')
                : await SecureStore.getItemAsync('role');
            setIsLoggedIn(!!token);
            if (role) setUserRole(role.toUpperCase());
        } catch (e) {
            setIsLoggedIn(false);
        }
    };

    const handleAction = (screenName) => {
        // Auth guard — redirect to login if not logged in
        if (!isLoggedIn) {
            onClose();
            Toast.show({
                type: 'info',
                text1: '🔒 Login Required',
                text2: 'Please sign in to create a post.',
            });
            setTimeout(() => navigation.navigate('Login'), 350);
            return;
        }

        onClose();
        if (screenName === 'Community Post') {
            navigation.navigate('CreateCommunityPost');
        } else if (screenName === 'Job') {
            navigation.navigate('CreateJobPost');
        } else if (screenName === 'Event') {
            navigation.navigate('CreateEventPost');
        } else if (screenName === 'Property') {
            navigation.navigate('CreatePropertyListing');
        } else if (screenName === 'Promotion') {
            navigation.navigate('CreatePromotion');
        } else if (screenName === 'State News') {
            navigation.navigate('CreateStateNews');
        } else {
            Toast.show({ type: 'info', text1: 'Coming Soon', text2: `Navigating to Create ${screenName}...` });
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <AnimatePresence>
                {visible && (
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.overlay}
                    >
                        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                        <MotiView
                            from={{ translateY: 400, opacity: 0 }}
                            animate={{ translateY: 0, opacity: 1 }}
                            exit={{ translateY: 400, opacity: 0 }}
                            transition={{ type: 'timing', duration: 300 }}
                            style={styles.sheet}
                        >
                            {/* Close Button Header */}
                            <View style={styles.header}>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Text style={styles.closeText}>Close</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                                <View style={styles.titleContainer}>
                                    <Text style={styles.titleText}>Start a post</Text>
                                    <Text style={styles.subtitleText}>Share local information with neighbours</Text>
                                </View>

                                {/* Login CTA Banner */}
                                {!isLoggedIn && (
                                    <TouchableOpacity
                                        style={styles.loginBanner}
                                        onPress={() => { onClose(); setTimeout(() => navigation.navigate('Login'), 350); }}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="lock-closed" size={18} color="#059669" />
                                        <Text style={styles.loginBannerText}>Sign in to start posting</Text>
                                        <Ionicons name="arrow-forward" size={16} color="#059669" />
                                    </TouchableOpacity>
                                )}

                                {/* Options */}
                                <View style={styles.optionsList}>
                                    <TouchableOpacity style={styles.optionCard} onPress={() => handleAction('Job')}>
                                        <Ionicons name="briefcase-outline" size={24} color="#111827" style={styles.optionIcon} />
                                        <Text style={styles.optionText}>Jobs</Text>
                                        {isLoggedIn
                                            ? <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                                            : <Ionicons name="lock-closed-outline" size={18} color="#10b981" />}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.optionCard} onPress={() => handleAction('Event')}>
                                        <Ionicons name="calendar-outline" size={24} color="#111827" style={styles.optionIcon} />
                                        <Text style={styles.optionText}>Events</Text>
                                        {isLoggedIn
                                            ? <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                                            : <Ionicons name="lock-closed-outline" size={18} color="#10b981" />}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.optionCard} onPress={() => handleAction('Community Post')}>
                                        <Ionicons name="chatbubble-outline" size={24} color="#111827" style={styles.optionIcon} />
                                        <Text style={styles.optionText}>Community</Text>
                                        {isLoggedIn
                                            ? <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                                            : <Ionicons name="lock-closed-outline" size={18} color="#10b981" />}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.optionCard} onPress={() => handleAction('Property')}>
                                        <Ionicons name="home-outline" size={24} color="#111827" style={styles.optionIcon} />
                                        <Text style={styles.optionText}>Properties</Text>
                                        {isLoggedIn
                                            ? <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                                            : <Ionicons name="lock-closed-outline" size={18} color="#10b981" />}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.optionCard} onPress={() => handleAction('Promotion')}>
                                        <Ionicons name="megaphone-outline" size={24} color="#111827" style={styles.optionIcon} />
                                        <Text style={styles.optionText}>Promotion</Text>
                                        {isLoggedIn
                                            ? <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                                            : <Ionicons name="lock-closed-outline" size={18} color="#10b981" />}
                                    </TouchableOpacity>

                                    {/* Admin Only Options */}
                                    {userRole === 'ADMIN' && (
                                        <TouchableOpacity style={[styles.optionCard, styles.adminCard]} onPress={() => handleAction('State News')}>
                                            <Ionicons name="newspaper-outline" size={24} color="#111827" style={styles.optionIcon} />
                                            <Text style={[styles.optionText, { color: '#111827', fontFamily: 'Outfit_600SemiBold' }]}>Post State News</Text>
                                            <Ionicons name="chevron-forward" size={20} color="#111827" />
                                        </TouchableOpacity>
                                    )}

                                </View>
                            </ScrollView>
                        </MotiView>
                    </MotiView>
                )}
            </AnimatePresence>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '85%',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    closeButton: {
        padding: 8,
        marginLeft: -8,
    },
    closeText: {
        color: '#047857',
        fontSize: 16, fontFamily: 'Outfit_400Regular',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    titleContainer: {
        alignItems: 'center',
        marginVertical: 24,
    },
    titleText: {
        fontSize: 28, fontFamily: 'Outfit_400Regular',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitleText: {
        fontSize: 16, fontFamily: 'Outfit_400Regular',
        color: '#4b5563',
        textAlign: 'center',
    },
    optionsList: {
        gap: 12,
        marginTop: 10,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f0fdf4', // very light green
        borderRadius: 20,
    },
    optionIcon: {
        marginRight: 16,
    },
    optionText: {
        flex: 1,
        fontSize: 16, fontFamily: 'Outfit_400Regular',
        color: '#1f2937',
    },
    noticeboardCard: {
        backgroundColor: '#a16207', // Brownish color matching the screenshot
    },
    loginBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#ecfdf5',
        borderWidth: 1.5,
        borderColor: '#a7f3d0',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
    },
    loginBannerText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
        color: '#047857',
    },
    adminCard: {
        backgroundColor: 'rgb(250, 208, 0)',
        marginTop: 10,
    }
});
