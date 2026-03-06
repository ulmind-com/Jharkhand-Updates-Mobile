import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';

export default function NewsArticleScreen({ route, navigation }) {
    const { url, title, sourceName } = route.params;
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const [loading, setLoading] = useState(true);
    const [canGoBack, setCanGoBack] = useState(false);
    const webViewRef = useRef(null);
    const styles = getStyles(colors, isDarkMode);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* Custom Browser-Style Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.urlBar}>
                    <Ionicons name="lock-closed" size={12} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.urlText} numberOfLines={1}>
                        {sourceName || new URL(url).hostname}
                    </Text>
                </View>

                <TouchableOpacity onPress={() => { if (canGoBack) webViewRef.current?.goBack(); }} style={styles.headerBtn}>
                    <Ionicons name="refresh" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* WebView */}
            <WebView
                ref={webViewRef}
                source={{ uri: url }}
                style={styles.webview}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Loading article...</Text>
                    </View>
                )}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onNavigationStateChange={(navState) => {
                    setCanGoBack(navState.canGoBack);
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                allowsFullscreenVideo={true}
                scalesPageToFit={true}
            />

            {/* Loading indicator on top of the page */}
            {loading && (
                <View style={styles.progressBar}>
                    <View style={styles.progressFill} />
                </View>
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 6,
    },
    headerBtn: {
        padding: 8,
        borderRadius: 20,
    },
    urlBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    urlText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
    },
    progressBar: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 96 : 56,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'transparent',
    },
    progressFill: {
        height: 3,
        width: '30%',
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
});
