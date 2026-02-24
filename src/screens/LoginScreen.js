import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, Dimensions, Platform, KeyboardAvoidingView, Image
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { OneSignal } from 'react-native-onesignal';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, MotiText } from 'moti';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

// ===== EXTRACTED UI COMPONENTS (To prevent re-renders losing focus) =====
const TitleHeader = ({ title, subtitle }) => (
    <View style={styles.headerContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
);

const FormContainer = ({ children }) => (
    <View style={styles.formCard}>
        {children}
    </View>
);

const PrimaryButton = ({ title, onPress, loading }) => (
    <TouchableOpacity
        style={styles.primaryButton}
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.8}
    >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <Text style={styles.primaryButtonText}>{title}</Text>
        )}
        {!loading && <Ionicons name="arrow-forward-outline" size={20} color="#fff" style={styles.btnIcon} />}
    </TouchableOpacity>
);

const InputField = ({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, maxLength, isPassword, showPassword, onTogglePassword }) => (
    <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color="#059669" style={styles.inputIcon} />
        <TextInput
            style={[styles.input, isPassword && { paddingRight: 50 }]}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            maxLength={maxLength}
            autoCapitalize="none"
        />
        {isPassword && (
            <TouchableOpacity style={styles.eyeIcon} onPress={onTogglePassword}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#6b7280" />
            </TouchableOpacity>
        )}
    </View>
);

export default function LoginScreen() {
    const navigation = useNavigation();

    // Screen States: 'signin', 'forgot', 'reset', 'signup_email', 'signup_otp', 'signup_details'
    const [currentScreen, setCurrentScreen] = useState('signin');

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Forms
    const [signinForm, setSigninForm] = useState({ email: '', password: '' });
    const [otpForm, setOtpForm] = useState({ email: '', otp: '' });
    const [signupForm, setSignupForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
    const [forgotForm, setForgotForm] = useState({ email: '' });
    const [resetForm, setResetForm] = useState({ email: '', token: '', newPassword: '' });

    const triggerHaptic = () => {
        if (Platform.OS !== 'web') {
            Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const otpInputRef = React.useRef(null);

    const switchScreen = (screen) => {
        triggerHaptic();
        setCurrentScreen(screen);
    };

    const showPopup = (msg, type = 'success') => {
        Toast.show({ type: type, text1: type === 'success' ? 'Success' : 'Oops!', text2: msg });
    };

    const handleGoogleLogin = async () => {
        triggerHaptic();
        const GOOGLE_AUTH_URL = `${BASE_URL}/oauth2/authorization/google`;
        await WebBrowser.openBrowserAsync(GOOGLE_AUTH_URL);
    };

    // ===== API CALLS =====
    const handleSignin = async () => {
        triggerHaptic();
        if (!signinForm.email || !signinForm.password) { return showPopup('Fill all fields', 'error'); }
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/auth/login`, signinForm);
            const token = res.data?.accessToken;
            const role = res.data?.role === 'ROLE_ADMIN' ? 'admin' : 'user';

            if (token) {
                if (Platform.OS === 'web') {
                    localStorage.setItem('accessToken', token);
                    localStorage.setItem('role', role);
                    localStorage.removeItem('userName');
                } else {
                    await SecureStore.setItemAsync('accessToken', token);
                    await SecureStore.setItemAsync('role', role);
                    await SecureStore.deleteItemAsync('userName');
                }
                showPopup('Logged in successfully! 🎉');

                // Sync Onesignal push ID
                if (Platform.OS !== 'web') {
                    setTimeout(async () => {
                        try {
                            const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync() || await OneSignal.User.pushSubscription.getPushSubscriptionId();
                            if (subscriptionId) {
                                await axios.post(`${BASE_URL}/user/onesignal-id`, { onesignalPlayerId: subscriptionId }, {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                            }
                        } catch (e) {
                            console.log("Failed to sync OneSignal ID:", e);
                        }
                    }, 2000);
                }

                setTimeout(() => navigation.navigate('Main'), 1000);
            } else {
                showPopup(res.data?.message || 'Invalid credentials', 'error');
            }
        } catch (err) {
            showPopup(err.response?.data?.message || err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async () => {
        triggerHaptic();
        if (!otpForm.email) { return showPopup('Enter an email', 'error'); }
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/auth/send-otp`, { email: otpForm.email });
            showPopup('OTP sent to your email! 📩');
            setCurrentScreen('signup_otp');
        } catch (err) {
            showPopup(err.response?.data?.message || err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        triggerHaptic();
        if (!otpForm.otp) { return showPopup('Enter OTP', 'error'); }
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/auth/verify-otp`, otpForm);
            setSignupForm({ ...signupForm, email: otpForm.email });
            showPopup('Email verified! ✅');
            setCurrentScreen('signup_details');
        } catch (err) {
            showPopup(err.response?.data?.message || 'Invalid OTP', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        triggerHaptic();
        if (!signupForm.firstName || !signupForm.password) { return showPopup('Fill all fields', 'error'); }
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/auth/signup`, signupForm);
            showPopup('Account created! Welcome! 🎊');
            setCurrentScreen('signin');
        } catch (err) {
            showPopup(err.response?.data?.message || err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        triggerHaptic();
        if (!forgotForm.email) return showPopup('Enter email', 'error');
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/auth/forgot-password`, forgotForm);
            setResetForm(prev => ({ ...prev, email: forgotForm.email }));
            showPopup('Reset link sent! 🔗');
            setCurrentScreen('reset');
        } catch (err) {
            showPopup(err.response?.data?.message || 'Email not found', 'error');
        } finally { setLoading(false); }
    };

    const handleResetPassword = async () => {
        triggerHaptic();
        if (!resetForm.token || !resetForm.newPassword) return showPopup('Fill all fields', 'error');
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/auth/reset-password`, resetForm);
            showPopup('Password updated successfully! 🔐');
            setCurrentScreen('signin');
        } catch (err) {
            showPopup(err.response?.data?.message || 'Reset failed', 'error');
        } finally { setLoading(false); }
    };

    // ==========================================

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            {/* Background Graphic */}
            <View style={styles.topCurve}>
                <Image source={require('../../assets/logo.png')} style={styles.heroLogo} />
                <MotiText
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: 200 }}
                    style={styles.brandTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                >
                    Jharkhand Bihar Updates
                </MotiText>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {currentScreen === 'signin' && (
                        <FormContainer>
                            <Text style={styles.headerText}>Welcome Back 👋</Text>
                            <Text style={styles.subHeaderText}>Sign in to your account</Text>

                            <InputField icon="mail-outline" placeholder="Email Address" value={signinForm.email} onChangeText={t => setSigninForm({ ...signinForm, email: t })} keyboardType="email-address" />
                            <InputField icon="lock-closed-outline" placeholder="Password" value={signinForm.password} onChangeText={t => setSigninForm({ ...signinForm, password: t })} secureTextEntry={!showPassword} isPassword showPassword={showPassword} onTogglePassword={() => { triggerHaptic(); setShowPassword(!showPassword); }} />

                            <TouchableOpacity style={styles.alignRight} onPress={() => switchScreen('forgot')}>
                                <Text style={styles.forgotText}>Forgot Password?</Text>
                            </TouchableOpacity>

                            <PrimaryButton title="Login" onPress={handleSignin} loading={loading} />

                            <View style={styles.divider}>
                                <View style={styles.line} />
                                <Text style={styles.orText}>OR</Text>
                                <View style={styles.line} />
                            </View>

                            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} activeOpacity={0.8}>
                                <Ionicons name="logo-google" size={20} color="#ea4335" />
                                <Text style={styles.googleBtnText}>Continue with Google</Text>
                            </TouchableOpacity>

                            <View style={styles.bottomLinkContainer}>
                                <Text style={styles.grayText}>Don't have an account? </Text>
                                <TouchableOpacity onPress={() => switchScreen('signup_email')}>
                                    <Text style={styles.linkText}>Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                        </FormContainer>
                    )}

                    {currentScreen === 'signup_email' && (
                        <FormContainer>
                            <TouchableOpacity onPress={() => switchScreen('signin')} style={styles.backArrow}>
                                <Ionicons name="arrow-back" size={24} color="#059669" />
                            </TouchableOpacity>
                            <Text style={styles.headerText}>Create Account ✨</Text>
                            <Text style={styles.subHeaderText}>Enter your email to get started</Text>

                            <InputField icon="mail-outline" placeholder="Email Address" value={otpForm.email} onChangeText={t => setOtpForm({ ...otpForm, email: t })} keyboardType="email-address" />

                            <PrimaryButton title="Send OTP" onPress={handleSendOtp} loading={loading} />
                        </FormContainer>
                    )}

                    {currentScreen === 'signup_otp' && (
                        <FormContainer>
                            <TouchableOpacity onPress={() => switchScreen('signup_email')} style={styles.backArrow}>
                                <Ionicons name="arrow-back" size={24} color="#059669" />
                            </TouchableOpacity>
                            <Text style={styles.headerText}>Verify Email 🛡️</Text>
                            <Text style={styles.subHeaderText}>Enter the 6-digit code sent to you</Text>

                            <TouchableOpacity
                                activeOpacity={1}
                                style={styles.otpBoxContainer}
                                onPress={() => otpInputRef.current?.focus()}
                            >
                                {[0, 1, 2, 3, 4, 5].map((index) => {
                                    const digit = otpForm.otp[index] || '';
                                    const isFocused = otpForm.otp.length === index;
                                    return (
                                        <View key={index} style={[styles.otpBox, isFocused && styles.otpBoxFocused]}>
                                            <Text style={styles.otpDigit}>{digit}</Text>
                                        </View>
                                    );
                                })}
                                <TextInput
                                    ref={otpInputRef}
                                    style={styles.hiddenOtpInput}
                                    value={otpForm.otp}
                                    onChangeText={t => {
                                        const numericCode = t.replace(/[^0-9]/g, '');
                                        setOtpForm({ ...otpForm, otp: numericCode });
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    caretHidden={true}
                                />
                            </TouchableOpacity>

                            <PrimaryButton title="Verify" onPress={handleVerifyOtp} loading={loading} />
                        </FormContainer>
                    )}

                    {currentScreen === 'signup_details' && (
                        <FormContainer>
                            <TouchableOpacity onPress={() => switchScreen('signin')} style={styles.backArrow}>
                                <Ionicons name="arrow-back" size={24} color="#059669" />
                            </TouchableOpacity>
                            <Text style={styles.headerText}>Almost Done 🚀</Text>
                            <Text style={styles.subHeaderText}>Complete your profile</Text>

                            <InputField icon="person-outline" placeholder="First Name" value={signupForm.firstName} onChangeText={t => setSignupForm({ ...signupForm, firstName: t })} />
                            <InputField icon="person-outline" placeholder="Last Name" value={signupForm.lastName} onChangeText={t => setSignupForm({ ...signupForm, lastName: t })} />
                            <InputField icon="lock-closed-outline" placeholder="Create Password" value={signupForm.password} onChangeText={t => setSignupForm({ ...signupForm, password: t })} secureTextEntry={!showPassword} isPassword showPassword={showPassword} onTogglePassword={() => { triggerHaptic(); setShowPassword(!showPassword); }} />

                            <PrimaryButton title="Complete Setup" onPress={handleSignup} loading={loading} />
                        </FormContainer>
                    )}

                    {currentScreen === 'forgot' && (
                        <FormContainer>
                            <TouchableOpacity onPress={() => switchScreen('signin')} style={styles.backArrow}>
                                <Ionicons name="arrow-back" size={24} color="#059669" />
                            </TouchableOpacity>
                            <Text style={styles.headerText}>Forgot Password? 🔑</Text>
                            <Text style={styles.subHeaderText}>We'll send you a reset token</Text>

                            <InputField icon="mail-outline" placeholder="Registered Email" value={forgotForm.email} onChangeText={t => setForgotForm({ ...forgotForm, email: t })} keyboardType="email-address" />

                            <PrimaryButton title="Send Token" onPress={handleForgotPassword} />
                        </FormContainer>
                    )}

                    {currentScreen === 'reset' && (
                        <FormContainer>
                            <TouchableOpacity onPress={() => switchScreen('signin')} style={styles.backArrow}>
                                <Ionicons name="arrow-back" size={24} color="#059669" />
                            </TouchableOpacity>
                            <Text style={styles.headerText}>Reset Password 🔐</Text>
                            <Text style={styles.subHeaderText}>Enter token and new password</Text>

                            <InputField icon="key-outline" placeholder="Reset Token" value={resetForm.token} onChangeText={t => setResetForm({ ...resetForm, token: t })} />
                            <InputField icon="lock-closed-outline" placeholder="New Password" value={resetForm.newPassword} onChangeText={t => setResetForm({ ...resetForm, newPassword: t })} secureTextEntry={!showPassword} isPassword />

                            <PrimaryButton title="Update Password" onPress={handleResetPassword} />
                        </FormContainer>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
            <Toast />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0fdf4' }, // emerald-50 base
    topCurve: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: height * 0.38,
        backgroundColor: '#059669', // emerald-600
        borderBottomLeftRadius: 60,
        borderBottomRightRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 30 : 10,
        paddingBottom: 60, // Pushed higher off the bottom edge
        zIndex: 0,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    heroLogo: {
        width: 70, height: 70,
        borderRadius: 35,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#a7f3d0',
        marginBottom: 8,
    },
    brandTitle: {
        color: '#fff',
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.5,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: height * 0.28, // Pushed card slightly lower so it doesn't overlap title
        paddingBottom: 40,
    },
    formCard: {
        backgroundColor: '#ffffff',
        borderRadius: 30,
        padding: 24,
        paddingTop: 30,
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        elevation: 15,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
    },
    backArrow: {
        position: 'absolute',
        top: 24,
        left: 20,
        zIndex: 10,
        padding: 4,
        backgroundColor: '#ecfdf5',
        borderRadius: 12,
    },
    headerText: {
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    subHeaderText: {
        fontSize: 15,
        fontFamily: 'Outfit_400Regular',
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 30,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 18,
        paddingHorizontal: 16,
        marginBottom: 16,
        height: 60,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Outfit_500Medium',
        color: '#111827',
        height: '100%',
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
    alignRight: {
        alignSelf: 'flex-end',
        marginBottom: 20,
    },
    forgotText: {
        color: '#059669',
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
    },
    primaryButton: {
        flexDirection: 'row',
        backgroundColor: '#059669',
        borderRadius: 20,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        marginTop: 8,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 17,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.5,
    },
    btnIcon: {
        marginLeft: 8,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#e5e7eb',
    },
    orText: {
        marginHorizontal: 16,
        color: '#9ca3af',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 20,
        height: 56,
        marginBottom: 24,
    },
    googleBtnText: {
        marginLeft: 12,
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        color: '#374151',
    },
    bottomLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    grayText: {
        color: '#6b7280',
        fontSize: 15,
        fontFamily: 'Outfit_400Regular',
    },
    linkText: {
        color: '#059669',
        fontSize: 15,
        fontFamily: 'Outfit_700Bold',
    },
    otpBoxContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 30,
        position: 'relative',
    },
    otpBox: {
        width: 48,
        height: 56,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpBoxFocused: {
        borderColor: '#059669',
        backgroundColor: '#ecfdf5',
        borderWidth: 2,
    },
    otpDigit: {
        fontSize: 24,
        fontFamily: 'Outfit_700Bold',
        color: '#1f2937',
    },
    hiddenOtpInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
    }
});



