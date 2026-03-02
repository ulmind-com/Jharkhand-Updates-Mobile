import React, { useState, useContext } from 'react';
import { Vibration, View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function EmailServiceScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = useContext(ThemeContext);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [unsubscribeEmail, setUnsubscribeEmail] = useState('');
    const [isUnsubscribing, setIsUnsubscribing] = useState(false);

    const handleSubscribe = async () => {
        if (!email.trim() || !email.includes('@')) {
            Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
            return;
        }

        setIsLoading(true);
        try {
            const url = `https://api.jharkhandbiharupdates.com/api/v1/subscribe?email=${encodeURIComponent(email)}`;
            const response = await axios.post(url);
            if (response.status === 200 || response.status === 201) {
                Toast.show({ type: 'success', text1: 'Subscribed Successfully!', text2: 'You will receive updates soon.' });
                setEmail('');
            }
        } catch (error) {
            console.log("Sub Error:", error);
            Toast.show({ type: 'error', text1: 'Subscription Failed', text2: 'Please try again later.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnsubscribe = async () => {
        if (!unsubscribeEmail.trim() || !unsubscribeEmail.includes('@')) {
            Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
            return;
        }

        setIsUnsubscribing(true);
        try {
            const url = `https://api.jharkhandbiharupdates.com/api/v1/subscribe?email=${encodeURIComponent(unsubscribeEmail)}`;
            const response = await axios.delete(url);
            if (response.status === 200) {
                Toast.show({ type: 'success', text1: 'Unsubscribed', text2: "You've been removed from our list." });
                setModalVisible(false);
                setUnsubscribeEmail('');
            }
        } catch (error) {
            console.log("Unsub Error:", error);
            Toast.show({ type: 'error', text1: 'Action Failed', text2: 'Could not unsubscribe, try again.' });
        } finally {
            setIsUnsubscribing(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Email Service</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>
                        Get personalised <Text style={{ color: '#10b981' }}>local news</Text> to your <Text style={{ color: '#10b981' }}>inbox</Text>
                    </Text>
                    <Text style={styles.heroSubText}>To get started enter your email below</Text>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Your email:</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#374151' : '#ffffff', color: colors.text, borderColor: colors.border }]}
                            placeholder="Enter your email"
                            placeholderTextColor={colors.textDim}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                            onSubmitEditing={handleSubscribe}
                        />

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: isLoading ? '#9ca3af' : '#10b981' }]}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                handleSubscribe();
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionBtnText}>Subscribe</Text>}
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.termsText}>
                        By signing up, you agree to the Terms of Service and How we use your data. Jharkhand Updates will use your sign-up to email content, improve understanding of you. These may include adverts from us and 3rd parties based on our understanding.{" "}
                        <Text style={styles.unsubLink} onPress={() => setModalVisible(true)}>You can unsubscribe at any time.</Text>
                    </Text>
                </View>

                {/* Features Section */}
                <View style={styles.featuresSection}>
                    <View style={styles.featureCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#10b981' }]}>
                            <Ionicons name="newspaper-outline" size={32} color="#fff" />
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={[styles.featureTitle, { color: colors.text }]}>News Updates</Text>
                            <Text style={[styles.featureDesc, { color: colors.textDim }]}>Everytime, you'll get the latest local news delivered straight to your inbox. This means you'll never miss a beat when it comes to knowing exactly what's happening where you live, day and night.</Text>
                        </View>
                    </View>

                    <View style={styles.featureCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#3b82f6' }]}>
                            <Ionicons name="cloudy-night-outline" size={32} color="#fff" />
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={[styles.featureTitle, { color: colors.text }]}>Weather and Travel</Text>
                            <Text style={[styles.featureDesc, { color: colors.textDim }]}>Making sure you're prepared for the day ahead is paramount, and is why we provide a daily weather forecast PLUS the latest updates on your local transport networks. So whether you're travelling to work or travelling home, we'll help you get there.</Text>
                        </View>
                    </View>

                    <View style={styles.featureCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#f59e0b' }]}>
                            <Ionicons name="navigate-outline" size={32} color="#fff" />
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={[styles.featureTitle, { color: colors.text }]}>Discover other news nearby</Text>
                            <Text style={[styles.featureDesc, { color: colors.textDim }]}>If knowing what's happening on your doorstep isn't enough, your twice daily newsletter will even show you the latest news from nearby districts as well. This gives you an even greater idea of what's happening in and around your area.</Text>
                        </View>
                    </View>

                    <View style={styles.featureCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#8b5cf6' }]}>
                            <Ionicons name="megaphone-outline" size={32} color="#fff" />
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={[styles.featureTitle, { color: colors.text }]}>Public Notices</Text>
                            <Text style={[styles.featureDesc, { color: colors.textDim }]}>Due to popular demand, we've recently added Public Notices to your daily newsletters. Whether it's being informed about recently deceased local residents, recent planning permissions or legal notices, we'll make sure you're the first to know.</Text>
                        </View>
                    </View>
                </View>

                {/* Why Subscribe Section */}
                <View style={[styles.whySubscribeSection, { backgroundColor: isDarkMode ? '#1f2937' : '#f8fdff' }]}>
                    <Text style={[styles.whyTitle, { color: colors.text }]}>Why Subscribe?</Text>
                    <Text style={[styles.whyDesc, { color: colors.textDim }]}>
                        We're proud to provide our valued and loyal subscribers with the very best in local news and relevant local information every single day. It's easy to see why we send over 10 million emails every month!{"\n\n"}
                        Our twice daily email newsletters will ultimately save you a bundle of time and effort. In the fast paced world we now live in, having only the very best pieces of information delivered straight to your inbox rather than having to go and search for it all, will definitely make your life that little bit easier.{"\n\n"}
                        Sign up for free today to see what the fuss is all about and we guarantee you'll never miss a local news story again.
                    </Text>

                    <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.infoText, { color: colors.textDim }]}>• Please remember that you can unsubscribe from our daily newsletter at any time. Simply click the unsubscribe link at the very bottom of the email.</Text>
                        <Text style={[styles.infoText, { color: colors.textDim, marginTop: 10 }]}>• If there is any information you think we should included in our daily newsletters that we currently don't, then we would love to hear about it. You can email us at support@jharkhandbiharupdates.com with your suggestions.</Text>
                    </View>
                </View>

            </ScrollView>

            {/* Unsubscribe Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalDismissArea} onPress={() => setModalVisible(false)} activeOpacity={1} />
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Unsubscribe</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textDim} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalSubtitle, { color: colors.textDim }]}>Enter your email address to unsubscribe from our newsletter.</Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#374151' : '#ffffff', color: colors.text, borderColor: colors.border, marginTop: 16 }]}
                            placeholder="Enter your email"
                            placeholderTextColor={colors.textDim}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={unsubscribeEmail}
                            onChangeText={setUnsubscribeEmail}
                            onSubmitEditing={handleUnsubscribe}
                        />

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#ef4444', marginTop: 16 }]}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                handleUnsubscribe();
                            }}
                            disabled={isUnsubscribing}
                        >
                            {isUnsubscribing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionBtnText}>Unsubscribe</Text>}
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
    backButton: { padding: 8, marginLeft: -8, width: 40 },
    headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold' },
    scrollContent: { paddingBottom: 40 },

    heroSection: { padding: 24, paddingVertical: 32 },
    heroTitle: { fontSize: 36, fontFamily: 'Outfit_700Bold', lineHeight: 44, marginBottom: 12 },
    heroSubText: { fontSize: 16, fontFamily: 'Outfit_400Regular', color: '#6b7280', marginBottom: 24 },
    inputContainer: { marginBottom: 24 },
    inputLabel: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, fontFamily: 'Outfit_400Regular' },
    actionBtn: { padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 16 },
    actionBtnText: { color: '#ffffff', fontSize: 16, fontFamily: 'Outfit_700Bold' },
    termsText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#6b7280', lineHeight: 18 },
    unsubLink: { fontFamily: 'Outfit_700Bold', color: '#111827', textDecorationLine: 'underline' },

    featuresSection: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
    featureCard: { flexDirection: 'row', marginBottom: 32 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
    featureContent: { flex: 1, justifyContent: 'center' },
    featureTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', marginBottom: 8 },
    featureDesc: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 22 },

    whySubscribeSection: { padding: 24, marginTop: 10 },
    whyTitle: { fontSize: 28, fontFamily: 'Outfit_700Bold', marginBottom: 16 },
    whyDesc: { fontSize: 15, fontFamily: 'Outfit_400Regular', lineHeight: 24 },
    infoBox: { marginTop: 24, padding: 16, borderRadius: 12, borderWidth: 1 },
    infoText: { fontSize: 13, fontFamily: 'Outfit_400Regular', lineHeight: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalDismissArea: { ...StyleSheet.absoluteFillObject },
    modalContent: { width: '85%', borderRadius: 16, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold' },
    modalSubtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 20 },
});

