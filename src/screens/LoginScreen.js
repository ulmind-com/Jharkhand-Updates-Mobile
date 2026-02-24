import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, Dimensions, Platform
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

const { width } = Dimensions.get('window');

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

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

    const showPopup = (msg, type = 'success') => {
        Toast.show({ type: type, text1: type === 'success' ? 'Success' : 'Error', text2: msg });
    };

    const handleGoogleLogin = async () => {
        // In a real RN app, we'd use expo-auth-session, but here we clone simple behavior by opening the browser
        const GOOGLE_AUTH_URL = `${BASE_URL}/oauth2/authorization/google`;
        await WebBrowser.openBrowserAsync(GOOGLE_AUTH_URL);
    };

    // ===== SIGN IN =====
    const handleSignin = async () => {
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
                showPopup('Login successful!');
                // Note: Onesignal push ID logic could be added here
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

    // ===== OTP FLOW =====
    const handleSendOtp = async () => {
        if (!otpForm.email) { return showPopup('Enter an email', 'error'); }
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/auth/send-otp`, { email: otpForm.email });
            showPopup('OTP sent to your email!');
            setCurrentScreen('signup_otp');
        } catch (err) {
            showPopup(err.response?.data?.message || err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpForm.otp) { return showPopup('Enter OTP', 'error'); }
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/auth/verify-otp`, otpForm);
            setSignupForm({ ...signupForm, email: otpForm.email });
            showPopup('OTP verified successfully!');
            setCurrentScreen('signup_details');
        } catch (err) {
            showPopup(err.response?.data?.message || 'Invalid OTP', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        if (!signupForm.firstName || !signupForm.password) { return showPopup('Fill all fields', 'error'); }
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/auth/signup`, signupForm);
            showPopup('Signup successful!');
            setCurrentScreen('signin');
        } catch (err) {
            showPopup(err.response?.data?.message || err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // ===== FORGOT/RESET =====
    const handleForgotPassword = async () => {
        if (!forgotForm.email) return showPopup('Enter email', 'error');
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/auth/forgot-password`, forgotForm);
            setResetForm(prev => ({ ...prev, email: forgotForm.email }));
            showPopup('Reset token sent to your email!');
            setCurrentScreen('reset');
        } catch (err) {
            showPopup(err.response?.data?.message || 'Email not found', 'error');
        } finally { setLoading(false); }
    };

    const handleResetPassword = async () => {
        if (!resetForm.token || !resetForm.newPassword) return showPopup('Fill all fields', 'error');
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/auth/reset-password`, resetForm);
            showPopup('Password reset successful!');
            setCurrentScreen('signin');
        } catch (err) {
            showPopup(err.response?.data?.message || 'Reset failed', 'error');
        } finally { setLoading(false); }
    };

    const TitleHeader = ({ title, subtitle }) => (
        <View style={styles.headerContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.card}>
                    {currentScreen === 'signin' && (
                        <View style={styles.innerCard}>
                            <TitleHeader title="Welcome Back" subtitle="Sign in to continue your journey" />

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput style={styles.input} placeholder="Enter your email" value={signinForm.email} onChangeText={t => setSigninForm({ ...signinForm, email: t })} keyboardType="email-address" autoCapitalize="none" />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput style={styles.input} placeholder="Enter your password" value={signinForm.password} onChangeText={t => setSigninForm({ ...signinForm, password: t })} secureTextEntry={!showPassword} />
                                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                        <Text>{showPassword ? 'Hide' : 'Show'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.primaryButton} onPress={handleSignin} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
                            </TouchableOpacity>

                            <View style={styles.dividerContainer}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>or</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                                <Text style={styles.googleBtnText}>G Continue with Google</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setCurrentScreen('forgot')} style={styles.linkButton}>
                                <Text style={styles.linkText}>Forgot Password?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setCurrentScreen('signup_email')} style={styles.linkButton}>
                                <Text style={styles.linkTextBase}>No account yet? <Text style={styles.linkTextStrong}>Sign Up</Text></Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {currentScreen === 'signup_email' && (
                        <View style={styles.innerCard}>
                            <TitleHeader title="Sign Up - Send OTP" subtitle="Get your verification code to continue" />
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput style={styles.input} placeholder="Enter your email" value={otpForm.email} onChangeText={t => setOtpForm({ ...otpForm, email: t })} keyboardType="email-address" autoCapitalize="none" />
                            </View>
                            <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setCurrentScreen('signin')} style={styles.linkButtonBack}>
                                <Text style={styles.linkTextStrong}>Back to Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {currentScreen === 'signup_otp' && (
                        <View style={styles.innerCard}>
                            <TitleHeader title="Verify OTP" subtitle="Enter the code sent to your email" />
                            <View style={styles.inputGroup}>
                                <TextInput style={styles.input} placeholder="123456" value={otpForm.otp} onChangeText={t => setOtpForm({ ...otpForm, otp: t })} keyboardType="number-pad" maxLength={6} textAlign="center" fontSize={24} />
                            </View>
                            <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify OTP</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setCurrentScreen('signup_email')} style={styles.linkButtonBack}>
                                <Text style={styles.linkTextStrong}>Back to Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {currentScreen === 'signup_details' && (
                        <View style={styles.innerCard}>
                            <TitleHeader title="Create Account" subtitle="Fill in your details to complete registration" />
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>First Name</Text>
                                <TextInput style={styles.input} placeholder="First Name" value={signupForm.firstName} onChangeText={t => setSignupForm({ ...signupForm, firstName: t })} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Last Name</Text>
                                <TextInput style={styles.input} placeholder="Last Name" value={signupForm.lastName} onChangeText={t => setSignupForm({ ...signupForm, lastName: t })} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput style={styles.input} placeholder="Password" value={signupForm.password} onChangeText={t => setSignupForm({ ...signupForm, password: t })} secureTextEntry={!showPassword} />
                                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                        <Text>{showPassword ? 'Hide' : 'Show'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.primaryButton} onPress={handleSignup} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setCurrentScreen('signin')} style={styles.linkButtonBack}>
                                <Text style={styles.linkTextStrong}>Back to Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {currentScreen === 'forgot' && (
                        <View style={styles.innerCard}>
                            <TitleHeader title="Forgot Password" subtitle="Enter your registered email to receive a reset link" />
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput style={styles.input} placeholder="Enter your email" value={forgotForm.email} onChangeText={t => setForgotForm({ ...forgotForm, email: t })} keyboardType="email-address" />
                            </View>

                            <TouchableOpacity style={styles.primaryButton} onPress={handleForgotPassword} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Token</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setCurrentScreen('signin')} style={styles.linkButtonBack}>
                                <Text style={styles.linkTextStrong}>Back to Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {currentScreen === 'reset' && (
                        <View style={styles.innerCard}>
                            <TitleHeader title="Reset Password" subtitle="Enter the token and your new password" />
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Reset Token</Text>
                                <TextInput style={styles.input} placeholder="Enter token" value={resetForm.token} onChangeText={t => setResetForm({ ...resetForm, token: t })} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>New Password</Text>
                                <TextInput style={styles.input} placeholder="New Password" value={resetForm.newPassword} onChangeText={t => setResetForm({ ...resetForm, newPassword: t })} secureTextEntry={true} />
                            </View>

                            <TouchableOpacity style={styles.primaryButton} onPress={handleResetPassword} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Reset</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setCurrentScreen('signin')} style={styles.linkButtonBack}>
                                <Text style={styles.linkTextStrong}>Back to Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

            </ScrollView>
            <Toast />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
    card: { width: '100%', maxWidth: 400, backgroundColor: '#ffffff', borderRadius: 20, padding: 24, shadowColor: '#047857', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5, borderWidth: 1, borderColor: '#d1fae5' },
    innerCard: { width: '100%' },
    headerContainer: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontFamily: 'Outfit_700Bold', color: '#047857', marginBottom: 4 },
    subtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#4b5563', textAlign: 'center' },
    inputGroup: { width: '100%', marginBottom: 16 },
    label: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#047857', marginBottom: 6 },
    input: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', padding: 14, borderRadius: 20, fontSize: 15, fontFamily: 'Outfit_400Regular', color: '#111827' },
    passwordContainer: { position: 'relative', width: '100%' },
    eyeIcon: { position: 'absolute', right: 14, top: 16 },
    primaryButton: { width: '100%', backgroundColor: '#059669', padding: 16, borderRadius: 20, alignItems: 'center', marginTop: 8 },
    btnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#d1d5db' },
    dividerText: { marginHorizontal: 10, color: '#6b7280', fontSize: 13 },
    googleButton: { width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', padding: 14, borderRadius: 20, marginBottom: 16 },
    googleBtnText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#374151', marginLeft: 8 },
    linkButton: { marginTop: 12, alignItems: 'center' },
    linkButtonBack: { marginTop: 20, alignItems: 'center' },
    linkText: { color: '#059669', fontSize: 13, fontFamily: 'Outfit_400Regular', textDecorationLine: 'underline' },
    linkTextBase: { color: '#047857', fontSize: 14 },
    linkTextStrong: { fontFamily: 'Outfit_700Bold', color: '#059669' }
});



