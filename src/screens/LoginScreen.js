import React, { useState } from 'react';
import {
    Vibration,
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, Dimensions, Platform, KeyboardAvoidingView, Image
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import LottieView from 'lottie-react-native';
import { OneSignal } from 'react-native-onesignal';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, MotiText } from 'moti';
import * as Haptics from 'expo-haptics';

// ✅ Required for expo-web-browser OAuth — must be called at module level
// Completes the auth session on the first attempt, preventing the "first tap does nothing" bug
WebBrowser.maybeCompleteAuthSession();

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

const ErrorBanner = ({ msg, onDismiss }) => (
    <MotiView
        from={{ opacity: 0, translateY: -6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 250 }}
        style={styles.errorBanner}
    >
        <Ionicons name="alert-circle" size={16} color="#dc2626" style={{ marginRight: 8 }} />
        <Text style={styles.errorBannerText}>{msg}</Text>
        <TouchableOpacity onPress={onDismiss} style={{ marginLeft: 'auto', padding: 2 }}>
            <Ionicons name="close" size={16} color="#dc2626" />
        </TouchableOpacity>
    </MotiView>
);

// ─── Animated Emoji — each emoji has its own character animation ──────────
const AnimatedEmoji = ({ emoji, type = 'wave', size = 30 }) => {
    const animations = {
        // 👋 Waving hand — side-to-side rotation
        wave: {
            from: { rotate: '0deg' },
            animate: { rotate: ['0deg', '25deg', '-10deg', '25deg', '0deg'] },
            transition: { type: 'timing', duration: 1800, loop: true, delay: 400 },
        },
        // ✨ Sparkle — scale pulse + opacity flash
        sparkle: {
            from: { scale: 1, opacity: 1 },
            animate: { scale: [1, 1.35, 0.9, 1.35, 1], opacity: [1, 0.6, 1, 0.6, 1] },
            transition: { type: 'timing', duration: 2000, loop: true },
        },
        // 🛡️ Shield thump — confident scale bounce
        shield: {
            from: { scale: 1 },
            animate: { scale: [1, 1.2, 0.95, 1.05, 1] },
            transition: { type: 'timing', duration: 2200, loop: true, delay: 600 },
        },
        // 🚀 Rocket — tilts and lifts diagonally
        rocket: {
            from: { translateY: 0, rotate: '-10deg' },
            animate: { translateY: [-4, -10, -4, 0, -4], rotate: ['-10deg', '0deg', '-10deg', '-15deg', '-10deg'] },
            transition: { type: 'timing', duration: 1600, loop: true },
        },
        // 🔑 Key jingle — quick rotation shake
        key: {
            from: { rotate: '-15deg' },
            animate: { rotate: ['-15deg', '10deg', '-15deg', '10deg', '-15deg'] },
            transition: { type: 'timing', duration: 1200, loop: true, delay: 800 },
        },
        // 🔐 Lock click — scale pulse + micro shake
        lock: {
            from: { scale: 1, rotate: '0deg' },
            animate: { scale: [1, 1.15, 1, 1.15, 1], rotate: ['0deg', '-5deg', '5deg', '0deg', '0deg'] },
            transition: { type: 'timing', duration: 2000, loop: true, delay: 300 },
        },
    };
    const anim = animations[type] || animations.wave;
    return (
        <MotiView from={anim.from} animate={anim.animate} transition={anim.transition}>
            <Text style={{ fontSize: size }}>{emoji}</Text>
        </MotiView>
    );
};

// ─── Google Button (Lottie animated logo) ────────────────────────────
const GoogleButton = ({ onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={gBtn.wrap}
    >
        <View style={gBtn.inner}>
            {/* Left: Lottie Google logo — loops forever */}
            <View style={gBtn.lottieWrap}>
                <LottieView
                    source={require('../../assets/animations/google.json')}
                    autoPlay
                    loop={true}
                    speed={0.9}
                    style={gBtn.lottie}
                />
            </View>

            {/* Right: Text */}
            <View style={gBtn.textWrap}>
                <Text style={gBtn.title}>Continue with Google</Text>
                <Text style={gBtn.sub}>Quick • Secure • No password</Text>
            </View>

            {/* Right arrow */}
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </View>
    </TouchableOpacity>
);
const gBtn = StyleSheet.create({
    wrap: {
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#4285f4',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#e8f0fe',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 12,
    },
    lottieWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f8f9ff',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    lottie: { width: 38, height: 38 },
    textWrap: { flex: 1 },
    title: {
        fontSize: 15,
        fontFamily: 'Outfit_700Bold',
        color: '#1f2937',
        letterSpacing: 0.1,
    },
    sub: {
        fontSize: 11,
        fontFamily: 'Outfit_400Regular',
        color: '#9ca3af',
        marginTop: 1,
    },
});

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

    // ✅ Smart post-login redirect:
    // If user had previously selected a state → go to State News tab
    // If no state selected before → go to Home (Select Your Region) screen
    const navigateAfterLogin = async () => {
        try {
            const savedState = Platform.OS === 'web'
                ? localStorage.getItem('selectedState')
                : await SecureStore.getItemAsync('selectedState');
            if (savedState) {
                navigation.navigate('Main', { screen: 'State News' });
            } else {
                navigation.navigate('Home');
            }
        } catch (_) {
            // Fallback: go Home if SecureStore fails
            navigation.navigate('Home');
        }
    };


    // Screen States: 'signin', 'forgot', 'reset', 'signup_email', 'signup_otp', 'signup_details'
    const [currentScreen, setCurrentScreen] = useState('signin');

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Forms
    const [signinForm, setSigninForm] = useState({ email: '', password: '' });
    const [otpForm, setOtpForm] = useState({ email: '', otp: '' });
    const [signupForm, setSignupForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
    const [forgotForm, setForgotForm] = useState({ email: '' });
    const [resetForm, setResetForm] = useState({ email: '', token: '', newPassword: '' });

    const triggerHaptic = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const otpInputRef = React.useRef(null);

    const switchScreen = (screen) => {
        triggerHaptic();
        clearError();
        setCurrentScreen(screen);
    };

    const showError = (msg) => setErrorMsg(msg);
    const clearError = () => setErrorMsg('');

    const handleGoogleLogin = async () => {
        triggerHaptic();
        clearError();

        // Web fallback — just open in browser as before
        if (Platform.OS === 'web') {
            await WebBrowser.openBrowserAsync(`${BASE_URL}/auth/mobile-google-start`);
            return;
        }

        try {
            // Linking.createURL gives:
            //   Expo Go  → exp://192.168.x.x:8081/--/auth
            //   Prod build → jharkhand://auth
            const redirectUri = Linking.createURL('auth');

            // openAuthSessionAsync closes browser when it sees a URL starting with redirectUri
            const result = await WebBrowser.openAuthSessionAsync(
                `${BASE_URL}/auth/mobile-google-start?redirect=${encodeURIComponent(redirectUri)}`,
                redirectUri
            );

            if (result.type !== 'success' || !result.url) {
                // User dismissed or cancelled — no error shown
                return;
            }

            // Parse token from jharkhand://auth?accessToken=JWT&role=ROLE_USER
            const url = new URL(result.url);
            const token = url.searchParams.get('accessToken');
            const roleRaw = url.searchParams.get('role') || '';
            const role = roleRaw === 'ROLE_ADMIN' ? 'admin' : 'user';

            if (!token) {
                showError('Google login failed. Please try again.');
                return;
            }

            // Store token
            await SecureStore.setItemAsync('accessToken', token);
            await SecureStore.setItemAsync('role', role);
            await SecureStore.deleteItemAsync('userName');

            // Sync OneSignal ID in background
            setTimeout(async () => {
                try {
                    let subscriptionId = null;
                    try { subscriptionId = OneSignal.User.pushSubscription.getId(); } catch (_) { }
                    if (!subscriptionId) {
                        try { subscriptionId = await OneSignal.User.pushSubscription.getIdAsync(); } catch (_) { }
                    }
                    if (subscriptionId) {
                        await axios.put(`${BASE_URL}/user/onesignal-id`,
                            { playerId: subscriptionId },
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                    }
                } catch (e) {
                    console.warn('[OneSignal] Failed to sync ID:', e.message);
                }
            }, 3000);

            navigateAfterLogin();
        } catch (err) {
            console.warn('[GoogleAuth]', err.message);
            showError('Could not complete Google login. Please try again.');
        }
    };

    // ===== API CALLS =====
    const handleSignin = async () => {
        triggerHaptic();
        clearError();
        if (!signinForm.email || !signinForm.password) { return showError('Please fill all fields'); }
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

                // Sync Onesignal push ID
                if (Platform.OS !== 'web') {
                    setTimeout(async () => {
                        try {
                            let subscriptionId = null;
                            try { subscriptionId = OneSignal.User.pushSubscription.getId(); } catch (_) { }
                            if (!subscriptionId) {
                                try { subscriptionId = await OneSignal.User.pushSubscription.getIdAsync(); } catch (_) { }
                            }
                            if (subscriptionId) {
                                await axios.put(`${BASE_URL}/user/onesignal-id`,
                                    { playerId: subscriptionId },
                                    { headers: { Authorization: `Bearer ${token}` } }
                                );
                            }
                        } catch (e) {
                            console.warn('[OneSignal] Failed to sync ID:', e.message);
                        }
                    }, 3000);
                }

                navigateAfterLogin();
            } else {
                showError(res.data?.message || 'Invalid credentials');
            }
        } catch (err) {
            showError(err.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async () => {
        triggerHaptic();
        clearError();
        if (!otpForm.email) { return showError('Please enter your email'); }
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/auth/send-otp`, { email: otpForm.email });
            setCurrentScreen('signup_otp');
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        triggerHaptic();
        clearError();
        if (!otpForm.otp) { return showError('Please enter the OTP'); }
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/auth/verify-otp`, otpForm);
            setSignupForm({ ...signupForm, email: otpForm.email });
            setCurrentScreen('signup_details');
        } catch (err) {
            showError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        triggerHaptic();
        clearError();
        if (!signupForm.firstName || !signupForm.password) { return showError('Please fill all fields'); }
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/auth/signup`, signupForm);
            setCurrentScreen('signin');
        } catch (err) {
            showError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        triggerHaptic();
        clearError();
        if (!forgotForm.email) return showError('Please enter your email');
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/auth/forgot-password`, forgotForm);
            setResetForm(prev => ({ ...prev, email: forgotForm.email }));
            setCurrentScreen('reset');
        } catch (err) {
            showError(err.response?.data?.message || 'Email not found');
        } finally { setLoading(false); }
    };

    const handleResetPassword = async () => {
        triggerHaptic();
        clearError();
        if (!resetForm.token || !resetForm.newPassword) return showError('Please fill all fields');
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/auth/reset-password`, resetForm);
            setCurrentScreen('signin');
        } catch (err) {
            showError(err.response?.data?.message || 'Reset failed');
        } finally { setLoading(false); }
    };

    // ==========================================

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            {/* Background Graphic */}
            <View style={styles.topCurve}>
                <Image
                    source={require('../../assets/illustration2.png')}
                    style={styles.bgIllustration}
                    resizeMode="cover"
                />
                <View style={styles.bgOverlay} />
                <View style={styles.heroContent}>
                    <Image source={require('../../assets/julogo.png')} style={styles.heroLogo} resizeMode="contain" />
                    <MotiText
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 200 }}
                        style={styles.brandTitle}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        Jharkhand Updates
                    </MotiText>
                </View>
            </View>

            {/* Bottom Premium Emerald Illustration */}
            <View style={styles.bottomIllustrationContainer} pointerEvents="none">
                <Image
                    source={require('../../assets/illustration3.png')}
                    style={styles.bottomIllustration}
                    resizeMode="cover"
                />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {currentScreen === 'signin' && (
                        <FormContainer>
                            <Text style={styles.headerText}>Welcome Back</Text>
                            <Text style={styles.subHeaderText}>Sign in to your account</Text>

                            <InputField icon="mail-outline" placeholder="Email Address" value={signinForm.email} onChangeText={t => setSigninForm({ ...signinForm, email: t })} keyboardType="email-address" />
                            <InputField icon="lock-closed-outline" placeholder="Password" value={signinForm.password} onChangeText={t => setSigninForm({ ...signinForm, password: t })} secureTextEntry={!showPassword} isPassword showPassword={showPassword} onTogglePassword={() => { triggerHaptic(); setShowPassword(!showPassword); }} />

                            <TouchableOpacity style={styles.alignRight} onPress={() => switchScreen('forgot')}>
                                <Text style={styles.forgotText}>Forgot Password?</Text>
                            </TouchableOpacity>

                            {errorMsg ? <ErrorBanner msg={errorMsg} onDismiss={clearError} /> : null}
                            <PrimaryButton title="Login" onPress={handleSignin} loading={loading} />

                            <View style={styles.divider}>
                                <View style={styles.line} />
                                <Text style={styles.orText}>OR</Text>
                                <View style={styles.line} />
                            </View>

                            <GoogleButton onPress={handleGoogleLogin} />

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
                            <View style={styles.screenHeader}>
                                <TouchableOpacity onPress={() => switchScreen('signin')} style={styles.backBtn}>
                                    <Ionicons name="arrow-back" size={24} color="#059669" />
                                </TouchableOpacity>
                                <Text style={styles.headerText}>Create Account</Text>
                                <View style={styles.backBtn} />
                            </View>
                            <Text style={styles.subHeaderText}>Enter your email to get started</Text>

                            <InputField icon="mail-outline" placeholder="Email Address" value={otpForm.email} onChangeText={t => setOtpForm({ ...otpForm, email: t })} keyboardType="email-address" />

                            {errorMsg ? <ErrorBanner msg={errorMsg} onDismiss={clearError} /> : null}
                            <PrimaryButton title="Send OTP" onPress={handleSendOtp} loading={loading} />

                            <View style={styles.divider}>
                                <View style={styles.line} />
                                <Text style={styles.orText}>OR</Text>
                                <View style={styles.line} />
                            </View>

                            <GoogleButton onPress={handleGoogleLogin} />

                            <View style={styles.bottomLinkContainer}>
                                <Text style={styles.grayText}>Already have an account? </Text>
                                <TouchableOpacity onPress={() => switchScreen('signin')}>
                                    <Text style={styles.linkText}>Sign In</Text>
                                </TouchableOpacity>
                            </View>
                        </FormContainer>
                    )}

                    {currentScreen === 'signup_otp' && (
                        <FormContainer>
                            <View style={styles.screenHeader}>
                                <TouchableOpacity onPress={() => switchScreen('signup_email')} style={styles.backBtn}>
                                    <Ionicons name="arrow-back" size={24} color="#059669" />
                                </TouchableOpacity>
                                <Text style={styles.headerText}>Verify Email</Text>
                                <View style={styles.backBtn} />
                            </View>
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

                            {errorMsg ? <ErrorBanner msg={errorMsg} onDismiss={clearError} /> : null}
                            <PrimaryButton title="Verify" onPress={handleVerifyOtp} loading={loading} />
                        </FormContainer>
                    )}

                    {currentScreen === 'signup_details' && (
                        <FormContainer>
                            <View style={styles.screenHeader}>
                                <TouchableOpacity onPress={() => switchScreen('signin')} style={styles.backBtn}>
                                    <Ionicons name="arrow-back" size={24} color="#059669" />
                                </TouchableOpacity>
                                <Text style={styles.headerText}>Almost Done</Text>
                                <View style={styles.backBtn} />
                            </View>
                            <Text style={styles.subHeaderText}>Complete your profile</Text>

                            <InputField icon="person-outline" placeholder="First Name" value={signupForm.firstName} onChangeText={t => setSignupForm({ ...signupForm, firstName: t })} />
                            <InputField icon="person-outline" placeholder="Last Name" value={signupForm.lastName} onChangeText={t => setSignupForm({ ...signupForm, lastName: t })} />
                            <InputField icon="lock-closed-outline" placeholder="Create Password" value={signupForm.password} onChangeText={t => setSignupForm({ ...signupForm, password: t })} secureTextEntry={!showPassword} isPassword showPassword={showPassword} onTogglePassword={() => { triggerHaptic(); setShowPassword(!showPassword); }} />

                            {errorMsg ? <ErrorBanner msg={errorMsg} onDismiss={clearError} /> : null}
                            <PrimaryButton title="Complete Setup" onPress={handleSignup} loading={loading} />
                        </FormContainer>
                    )}

                    {currentScreen === 'forgot' && (
                        <FormContainer>
                            <View style={styles.screenHeader}>
                                <TouchableOpacity onPress={() => switchScreen('signin')} style={styles.backBtn}>
                                    <Ionicons name="arrow-back" size={24} color="#059669" />
                                </TouchableOpacity>
                                <Text style={styles.headerText}>Forgot Password?</Text>
                                <View style={styles.backBtn} />
                            </View>
                            <Text style={styles.subHeaderText}>We'll send you a reset token</Text>

                            <InputField icon="mail-outline" placeholder="Registered Email" value={forgotForm.email} onChangeText={t => setForgotForm({ ...forgotForm, email: t })} keyboardType="email-address" />

                            {errorMsg ? <ErrorBanner msg={errorMsg} onDismiss={clearError} /> : null}
                            <PrimaryButton title="Send Token" onPress={handleForgotPassword} />
                        </FormContainer>
                    )}

                    {currentScreen === 'reset' && (
                        <FormContainer>
                            <View style={styles.screenHeader}>
                                <TouchableOpacity onPress={() => switchScreen('signin')} style={styles.backBtn}>
                                    <Ionicons name="arrow-back" size={24} color="#059669" />
                                </TouchableOpacity>
                                <Text style={styles.headerText}>Reset Password</Text>
                                <View style={styles.backBtn} />
                            </View>
                            <Text style={styles.subHeaderText}>Enter token and new password</Text>

                            <InputField icon="key-outline" placeholder="Reset Token" value={resetForm.token} onChangeText={t => setResetForm({ ...resetForm, token: t })} />
                            <InputField icon="lock-closed-outline" placeholder="New Password" value={resetForm.newPassword} onChangeText={t => setResetForm({ ...resetForm, newPassword: t })} secureTextEntry={!showPassword} isPassword />

                            {errorMsg ? <ErrorBanner msg={errorMsg} onDismiss={clearError} /> : null}
                            <PrimaryButton title="Update Password" onPress={handleResetPassword} />
                        </FormContainer>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
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
        overflow: 'hidden', // Add overflow hidden for the illustration
        zIndex: 0,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    bgIllustration: {
        width: '100%',
        height: '120%',
        position: 'absolute',
        top: 0,
        opacity: 0.35,
    },
    bgOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#059669',
        opacity: 0.65,
    },
    heroContent: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 30 : 10,
        paddingBottom: 60,
    },
    bottomIllustrationContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.35,
        zIndex: -1,
    },
    bottomIllustration: {
        width: '100%',
        height: '100%',
        opacity: 0.2,
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 8,
    },
    headerText: {
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
        color: '#1f2937',
        textAlign: 'center',
    },
    subHeaderText: {
        fontSize: 15,
        fontFamily: 'Outfit_400Regular',
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 30,
    },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        width: '100%',
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    titleCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
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
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 14,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Outfit_500Medium',
        color: '#dc2626',
        lineHeight: 18,
    },
});




