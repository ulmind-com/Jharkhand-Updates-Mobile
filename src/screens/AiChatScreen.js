import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Image,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import LottieView from 'lottie-react-native';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';
const AI_LOGO = require('../../assets/julogo.png');

// Map source type to icon, screen, and color
const SOURCE_CONFIG = {
    StateNews: { icon: 'newspaper', screen: 'StateNewsDetails', paramKey: 'newsId', color: '#2563eb' },
    Job: { icon: 'briefcase', screen: 'JobDetails', paramKey: 'jobId', color: '#059669' },
    Event: { icon: 'calendar', screen: 'EventDetails', paramKey: 'eventId', color: '#d97706' },
    Property: { icon: 'home', screen: 'PropertyDetails', paramKey: 'propertyId', color: '#7c3aed' },
    CommunityPost: { icon: 'people', screen: 'CommunityPostDetails', paramKey: 'postId', color: '#dc2626' }
};

export default function AiChatScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [userToken, setUserToken] = useState(null);
    const [userAvatar, setUserAvatar] = useState(null);
    const [hasSeenWelcome, setHasSeenWelcome] = useState(true);
    const flatListRef = useRef(null);

    const initialMessage = {
        id: 'welcome_msg',
        type: 'ai',
        text: "Namaste! \ud83d\ude4f\nI'm Jharkhand Updates AI. Ask me anything about the latest news, jobs, events, or properties in Jharkhand!",
        sources: null,
    };

    // Only run once on mount — NOT on every focus (so messages survive back-navigation)
    useEffect(() => {
        fetchTokenAndHistory();
    }, []);

    const fetchTokenAndHistory = async () => {
        try {
            const onboardData = Platform.OS === 'web'
                ? localStorage.getItem('ai_chat_onboarded')
                : await SecureStore.getItemAsync('ai_chat_onboarded');

            if (onboardData !== 'true') {
                setHasSeenWelcome(false);
            }

            const token = Platform.OS === 'web'
                ? localStorage.getItem('accessToken')
                : await SecureStore.getItemAsync('accessToken');

            if (token) {
                setUserToken(token);
                // Only set initial message if chat is fresh (no existing messages)
                setMessages(prev => prev.length === 0 ? [initialMessage] : prev);
                // Fetch user profile image
                try {
                    const res = await axios.get(`${BASE_URL}/user/profile`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data?.data?.profileImageUrl) {
                        setUserAvatar(res.data.data.profileImageUrl);
                    }
                } catch (_) { }
            } else {
                // Not logged in — redirect to Login
                Alert.alert(
                    'Login Required',
                    'Please log in to use the AI Assistant.',
                    [
                        {
                            text: 'Go to Login',
                            onPress: () => navigation.replace('Login')
                        },
                        {
                            text: 'Go Back',
                            onPress: () => navigation.goBack(),
                            style: 'cancel'
                        }
                    ]
                );
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleGetStarted = async () => {
        setHasSeenWelcome(true);
        if (Platform.OS === 'web') {
            localStorage.setItem('ai_chat_onboarded', 'true');
        } else {
            await SecureStore.setItemAsync('ai_chat_onboarded', 'true');
        }
        // focus the input nicely after dismissing the welcome if possible
        setTimeout(() => setIsInputFocused(true), 300);
    };

    const handleSend = async () => {
        if (!question.trim() || !userToken) return;

        const userMsg = {
            id: Date.now().toString(),
            type: 'user',
            text: question.trim(),
        };

        setMessages(prev => [...prev, userMsg]);
        setQuestion('');
        setIsLoading(true);

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);

        try {
            const payload = { question: userMsg.text, sessionId };
            const { data } = await axios.post(`${BASE_URL}/ai/chat`, payload, {
                headers: { Authorization: `Bearer ${userToken}` },
                timeout: 120000 // 2 minute timeout
            });

            if (data.sessionId && !sessionId) {
                setSessionId(data.sessionId);
            }

            // Handle null/empty answer gracefully
            const answerText = data.answer && data.answer !== 'null'
                ? data.answer
                : 'Sorry, I could not generate a response right now. Please try again!';

            // Filter out sources with no title
            const validSources = (data.sources || []).filter(s => s && s.title && s.title.trim());

            const aiMsg = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                text: answerText,
                sources: validSources.length > 0 ? validSources : null,
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                text: "Oops! Technical snag. Please try again!",
                sources: null
            }]);
        } finally {
            setIsLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
        }
    };

    const handleSourcePress = (source) => {
        const config = SOURCE_CONFIG[source.type];
        if (!config || !source.id) return;
        try {
            navigation.navigate(config.screen, { [config.paramKey]: source.id });
        } catch (e) {
            console.log("Navigation error:", e);
        }
    };

    // ─── Typing Bubble (inline in chat) ─────────────────────────────────────
    const TypingBubble = () => (
        <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={[styles.messageRow, styles.messageRowAi]}
        >
            <View style={styles.avatarContainer}>
                <Image source={AI_LOGO} style={styles.avatarImg} />
            </View>
            <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
                <View style={styles.typingDots}>
                    <MotiView
                        from={{ opacity: 0.3, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 500, loop: true, repeatReverse: true }}
                        style={[styles.dot, { backgroundColor: colors.primary }]}
                    />
                    <MotiView
                        from={{ opacity: 0.3, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 500, loop: true, repeatReverse: true, delay: 150 }}
                        style={[styles.dot, { backgroundColor: colors.primary }]}
                    />
                    <MotiView
                        from={{ opacity: 0.3, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 500, loop: true, repeatReverse: true, delay: 300 }}
                        style={[styles.dot, { backgroundColor: colors.primary }]}
                    />
                </View>
                <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
        </MotiView>
    );

    // ─── Message Renderer ───────────────────────────────────────────────────
    const renderMessage = ({ item }) => {
        const isUser = item.type === 'user';
        return (
            <MotiView
                from={{ opacity: 0, translateY: 10, scale: 0.95 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{ type: 'timing', duration: 300 }}
                style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowAi
                ]}
            >
                {/* AI Avatar */}
                {!isUser && (
                    <View style={styles.avatarContainer}>
                        <Image source={AI_LOGO} style={styles.avatarImg} />
                    </View>
                )}

                <View style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleAi
                ]}>
                    <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAi]}>
                        {item.text}
                    </Text>

                    {/* Clickable Sources */}
                    {item.sources && item.sources.length > 0 && (
                        <View style={styles.sourcesContainer}>
                            <Text style={styles.sourceHeader}>SOURCES:</Text>
                            {item.sources.map((src, idx) => {
                                const config = SOURCE_CONFIG[src.type] || { icon: 'document', color: colors.primary };
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.sourceChip}
                                        activeOpacity={0.7}
                                        onPress={() => handleSourcePress(src)}
                                    >
                                        <View style={[styles.sourceIconBg, { backgroundColor: config.color + '20' }]}>
                                            <Ionicons name={config.icon} size={14} color={config.color} />
                                        </View>
                                        <Text style={styles.sourceText} numberOfLines={1}>{src.title}</Text>
                                        <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* User Avatar */}
                {isUser && (
                    <View style={styles.userAvatarContainer}>
                        {userAvatar ? (
                            <Image source={{ uri: userAvatar }} style={styles.avatarImg} />
                        ) : (
                            <Ionicons name="person" size={18} color={colors.primary} />
                        )}
                    </View>
                )}
            </MotiView>
        );
    };

    const QuickAskChips = () => {
        const chips = [
            { text: "Aaj ki taza khabar", emoji: "📰" },
            { text: "Latest jobs in Ranchi", emoji: "💼" },
            { text: "Upcoming events", emoji: "🗓️" },
            { text: "Flats on rent", emoji: "🏘️" }
        ];
        return (
            <View style={styles.chipsWrapContainer}>
                {chips.map((chip, idx) => (
                    <TouchableOpacity key={idx} style={styles.chipOutline} onPress={() => setQuestion(chip.text)}>
                        <Text style={styles.chipTextOutline}>{chip.text}</Text>
                        <Text style={styles.chipEmoji}>{chip.emoji}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    // ─── Build data for FlatList (messages + typing indicator) ──────────────
    const listData = isLoading
        ? [...messages, { id: '__typing__', type: 'typing' }]
        : messages;

    if (!hasSeenWelcome) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.welcomeContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.welcomeBackBtn}>
                        <Ionicons name="arrow-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.welcomeContent}>
                        <LottieView
                            source={require('../../assets/animations/Hello Chat Bot.json')}
                            autoPlay
                            loop
                            style={styles.lottieBot}
                        />
                        <Text style={styles.welcomeTitle}>Your <Text style={{ color: colors.primary }}>Smart Assistant</Text> for Jharkhand</Text>
                        <Text style={styles.welcomeSubtitle}>Get instant help and support with news, jobs, properties, and citizen news updates!</Text>

                        <View style={styles.welcomeRulesBox}>
                            <View style={styles.ruleRow}><Text style={styles.ruleIcon}>🟢</Text><Text style={styles.ruleText}>Keep queries related to Jharkhand</Text></View>
                            <View style={styles.ruleRow}><Text style={styles.ruleIcon}>🟢</Text><Text style={styles.ruleText}>Ask for "Aaj ki taza khabar" or latest jobs</Text></View>
                            <View style={styles.ruleRow}><Text style={styles.ruleIcon}>🔴</Text><Text style={styles.ruleText}>Adult, violent or abusive content is blocked</Text></View>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.getStartedBtn} activeOpacity={0.8} onPress={handleGetStarted}>
                        <Text style={styles.getStartedTxt}>Get started</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Image source={AI_LOGO} style={styles.headerLogo} />
                    <View style={styles.headerTitles}>
                        <Text style={styles.headerTitle}>AI Assistant</Text>
                        <View style={styles.onlineRow}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.headerSub}>Online</Text>
                        </View>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Chat List */}
                <FlatList
                    ref={flatListRef}
                    data={listData}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => {
                        if (item.type === 'typing') return <TypingBubble />;
                        return renderMessage({ item });
                    }}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                />

                {/* Quick Ask Chips (Bottom of Chat, Above Input) */}
                {messages.length === 1 && <QuickAskChips />}

                {/* Input Area */}
                <View style={[styles.inputContainer, isInputFocused && styles.inputContainerFocused]}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask about news, jobs, events..."
                        placeholderTextColor={colors.textDim}
                        value={question}
                        onChangeText={setQuestion}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        multiline
                        maxLength={300}
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                        blurOnSubmit={false}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!question.trim() || isLoading) && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={!question.trim() || isLoading}
                    >
                        <Ionicons name="send" size={20} color={!question.trim() || isLoading ? colors.textDim : '#fff'} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        elevation: 2,
        gap: 10,
    },
    backBtn: {
        padding: 6,
    },
    headerLogo: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: colors.primary + '40',
    },
    headerTitles: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        color: colors.text,
    },
    onlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 1,
    },
    onlineDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    headerSub: {
        fontSize: 11,
        fontFamily: 'Outfit_400Regular',
        color: '#22c55e',
    },
    listContent: {
        padding: 16,
        paddingBottom: 10,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '100%',
        alignItems: 'flex-end',
    },
    messageRowUser: {
        justifyContent: 'flex-end',
    },
    messageRowAi: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f0fdf4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.primary + '30',
        overflow: 'hidden',
    },
    userAvatarContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: isDarkMode ? colors.surfaceDeeper : '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        borderWidth: 1,
        borderColor: colors.primary + '30',
        overflow: 'hidden',
    },
    avatarImg: {
        width: 30,
        height: 30,
        borderRadius: 15,
        resizeMode: 'cover',
    },
    bubble: {
        padding: 12,
        borderRadius: 18,
        maxWidth: '78%',
        elevation: 1,
        shadowColor: colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    bubbleUser: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    bubbleAi: {
        backgroundColor: 'transparent',
        borderBottomLeftRadius: 4,
        borderWidth: 0,
        borderColor: 'transparent',
    },
    messageText: {
        fontSize: 14.5,
        fontFamily: 'Outfit_400Regular',
        lineHeight: 21,
    },
    messageTextUser: {
        color: '#ffffff',
    },
    messageTextAi: {
        color: colors.text,
    },
    // Typing bubble
    typingBubble: {
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    typingDots: {
        flexDirection: 'row',
        gap: 5,
        marginBottom: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    typingText: {
        fontSize: 12,
        fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
        fontStyle: 'italic',
        marginTop: 2,
    },
    // Sources
    sourcesContainer: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    sourceHeader: {
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        color: colors.textDim,
        marginBottom: 8,
        letterSpacing: 1,
    },
    sourceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderRadius: 10,
        marginBottom: 5,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    sourceIconBg: {
        width: 26,
        height: 26,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    sourceText: {
        fontSize: 12.5,
        fontFamily: 'Outfit_500Medium',
        color: colors.text,
        flex: 1,
    },
    // Chips
    chipsWrapContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 16,
        paddingBottom: 20,
        justifyContent: 'flex-end',
    },
    chipOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: 'transparent',
    },
    chipTextOutline: {
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
        color: colors.primary,
        marginRight: 6,
    },
    chipEmoji: {
        fontSize: 14,
    },
    // Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 8,
    },
    inputContainerFocused: {
        borderTopColor: colors.primary,
    },
    input: {
        flex: 1,
        backgroundColor: isDarkMode ? colors.background : '#f1f5f9',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        paddingTop: Platform.OS === 'ios' ? 12 : 8,
        fontSize: 15,
        fontFamily: 'Outfit_400Regular',
        color: colors.text,
        minHeight: 42,
        maxHeight: 100,
    },
    sendBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    sendBtnDisabled: {
        backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
        elevation: 0,
        shadowOpacity: 0,
    },
    welcomeContainer: {
        flex: 1,
        backgroundColor: isDarkMode ? colors.background : '#fafafa',
        padding: 24,
    },
    welcomeBackBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 20,
        zIndex: 10,
        padding: 8,
    },
    welcomeContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    lottieBot: {
        width: 280,
        height: 280,
    },
    welcomeTitle: {
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
        color: colors.text,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 12,
        lineHeight: 36,
    },
    welcomeSubtitle: {
        fontSize: 16,
        fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
        lineHeight: 24,
    },
    welcomeRulesBox: {
        backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fff',
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        width: '100%',
    },
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    ruleIcon: {
        fontSize: 14,
    },
    ruleText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
        color: colors.text,
    },
    getStartedBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 100, // completely rounded pill
        elevation: 4,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        gap: 8,
        marginBottom: Platform.OS === 'ios' ? 10 : 20,
    },
    getStartedTxt: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
    }
});
