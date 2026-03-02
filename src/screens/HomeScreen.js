import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Platform, ActivityIndicator, Modal } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { MotiView, MotiText } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../context/LocationContext';
import { ThemeContext } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const states = [
    "Bihar",
    "Jharkhand",
];

export default function HomeScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    const { selectedState, setLocation } = useLocation();
    const [ads, setAds] = useState([]);
    const [loadingAds, setLoadingAds] = useState(true);
    const [isSelectorVisible, setSelectorVisible] = useState(false);

    useEffect(() => {
        fetch("https://api.jharkhandbiharupdates.com/api/v1/banner-ads/active/small")
            .then((res) => res.json())
            .then((data) => {
                if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
                    setAds(data.data);
                }
            })
            .catch((err) => console.error("Error fetching ads:", err))
            .finally(() => setLoadingAds(false));
    }, []);

    const onSubmit = () => {
        if (!selectedState) {
            Toast.show({ type: 'error', text1: 'Missing Selection', text2: 'Please select your state!' });
            return;
        }
        navigation.navigate('Main', { screen: 'State News' });
    };

    const adToShow = ads.length > 0 ? ads[0] : null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Top Premium Emerald Background Sweep with Illustration */}
            <View style={styles.topBackground}>
                <Image
                    source={require('../../assets/illustration2.png')}
                    style={styles.bgIllustration}
                    resizeMode="cover"
                />
                {/* Gradient/Overlay to ensure text readability */}
                <View style={styles.bgOverlay} />
            </View>

            <View style={styles.content}>
                {/* Brand Identity / Welcome Area */}
                <MotiView
                    from={{ opacity: 0, translateY: -30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 800 }}
                    style={styles.brandContainer}
                >
                    <View style={styles.logoIconWrapper}>
                        <Image
                            source={require('../../assets/julogo.png')}
                            style={{ width: 48, height: 48, borderRadius: 24 }}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.brandTitle}>Jharkhand Updates</Text>
                    <Text style={styles.brandSubtitle}>Your trusted local network</Text>
                </MotiView>

                {/* Form Card */}
                <MotiView
                    from={{ opacity: 0, scale: 0.95, translateY: 40 }}
                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 90, delay: 300 }}
                    style={styles.formCard}
                >
                    <Text style={styles.cardHeader}>Select Your Region</Text>
                    <Text style={styles.cardInstruction}>Choose a state to view local content</Text>

                    <TouchableOpacity
                        style={styles.pickerWrapper}
                        onPress={() => setSelectorVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="location" size={20} color="#059669" style={styles.pickerIcon} />
                        <Text style={[styles.pickerText, !selectedState && styles.pickerTextPlaceholder]}>
                            {selectedState ? selectedState : "-- Select State --"}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={colors.textDim} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.continueButton}
                        onPress={onSubmit}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => navigation.navigate('Login')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.loginButtonText}>Login / Signup</Text>
                    </TouchableOpacity>
                </MotiView>

                {/* Banner Ad */}
                {loadingAds ? (
                    <ActivityIndicator size="small" color="#059669" style={{ marginTop: 40 }} />
                ) : adToShow ? (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', delay: 600 }}
                        style={styles.adContainer}
                    >
                        <Image source={{ uri: adToShow.image }} style={styles.adImage} resizeMode="contain" />
                    </MotiView>
                ) : null}

            </View>
            <Toast />
            {/* Custom Bottom Sheet Selector */}
            <Modal
                visible={isSelectorVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectorVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalDismissArea} onPress={() => setSelectorVisible(false)} activeOpacity={1} />
                    <MotiView
                        from={{ opacity: 0, translateY: 80 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 280 }}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Region</Text>
                            <TouchableOpacity onPress={() => setSelectorVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textDim} />
                            </TouchableOpacity>
                        </View>
                        {states.map((state) => (
                            <TouchableOpacity
                                key={state}
                                style={[
                                    styles.stateOption,
                                    selectedState === state && styles.stateOptionSelected
                                ]}
                                onPress={() => {
                                    setLocation(state);
                                    setSelectorVisible(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.stateOptionText,
                                    selectedState === state && styles.stateOptionTextSelected
                                ]}>{state}</Text>
                                {selectedState === state && (
                                    <Ionicons name="checkmark-circle" size={24} color="#059669" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </MotiView>
                </View>
            </Modal>

            {/* Bottom Premium Emerald Illustration */}
            <View style={styles.bottomIllustrationContainer} pointerEvents="none">
                <Image
                    source={require('../../assets/illustration3.png')}
                    style={styles.bottomIllustration}
                    resizeMode="cover"
                />
            </View>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.45,
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 60,
        borderBottomRightRadius: 60,
        overflow: 'hidden',
    },
    bgIllustration: {
        width: '100%',
        height: '120%', // Make it taller to fit the character better
        position: 'absolute',
        top: 0,
        opacity: 0.35, // Adjust opacity for better blend
    },
    bgOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.primary,
        opacity: 0.65, // Adjust this to balance illustration visibility vs text readability
    },
    bottomIllustrationContainer: {
        position: 'absolute',
        bottom: 0, // This will now go all the way to the screen edge since we removed bottom SafeAreaView padding
        left: 0,
        right: 0,
        height: height * 0.35, // Give it more space upwards to meet the card
        zIndex: -1, // Ensure it stays behind the card
    },
    bottomIllustration: {
        width: '100%',
        height: '100%',
        opacity: 0.2, // "opacity change karo low karo pura"
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: height * 0.08,
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: 36,
    },
    logoIconWrapper: {
        width: 80,
        height: 80,
        backgroundColor: colors.surface,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        elevation: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDarkMode ? 0.4 : 0.15,
        shadowRadius: 10,
    },
    brandTitle: {
        fontSize: width > 380 ? 28 : 24,
        fontFamily: 'Outfit_700Bold',
        color: '#ffffff',
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    brandSubtitle: {
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        color: '#d1fae5',
        letterSpacing: 0.5,
    },
    formCard: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: 28,
        padding: 30,
        elevation: 10,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDarkMode ? 0.3 : 0.08,
        shadowRadius: 20,
        borderWidth: isDarkMode ? 1 : 0,
        borderColor: colors.border
    },
    cardHeader: {
        fontSize: 22,
        fontFamily: 'Outfit_600SemiBold',
        color: colors.text,
        marginBottom: 6,
        textAlign: 'center',
    },
    cardInstruction: {
        fontSize: 14,
        fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
        textAlign: 'center',
        marginBottom: 24,
    },
    pickerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        marginBottom: 24,
        backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f9fafb',
        paddingHorizontal: 16,
        paddingVertical: 18,
    },
    pickerIcon: {
        marginRight: 0,
    },
    pickerText: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        color: colors.text,
        marginLeft: 12,
    },
    pickerTextPlaceholder: {
        color: colors.textDim,
    },
    continueButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
        letterSpacing: 0.5,
    },
    loginButton: {
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
    },
    adContainer: {
        marginTop: 30,
        width: '100%',
        height: 80,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        elevation: 3,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.05,
        shadowRadius: 6,
    },
    adImage: {
        width: '100%',
        height: '100%',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalDismissArea: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: isDarkMode ? 0.4 : 0.1,
        shadowRadius: 20,
        elevation: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontFamily: 'Outfit_600SemiBold',
        color: colors.text,
    },
    stateOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginBottom: 12,
        backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f9fafb',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    stateOptionSelected: {
        backgroundColor: isDarkMode ? colors.iconBg : '#ecfdf5',
        borderColor: colors.primaryLight,
    },
    stateOptionText: {
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
        color: colors.text,
    },
    stateOptionTextSelected: {
        color: colors.primary,
        fontFamily: 'Outfit_700Bold',
    }
});




