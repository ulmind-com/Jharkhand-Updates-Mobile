import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { View as MotiView } from 'moti';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * Premium RSS News Card — styled to match the existing NewsCard layout.
 * Full-width image on top, title below, source badge, and read-more CTA.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 0) return 'Just now';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getSourceColor(sourceName) {
    if (!sourceName) return '#6366f1';
    const name = sourceName.toLowerCase();
    if (name.includes('news18')) return '#e11d48';
    if (name.includes('inext')) return '#0891b2';
    if (name.includes('abp')) return '#dc2626';
    if (name.includes('zee') || name.includes('24 ghanta')) return '#7c3aed';
    if (name.includes('sangbad')) return '#0891b2';
    return '#6366f1';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RssNewsCard({ item, navigation, colors, isDarkMode }) {
    const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
    const sourceColor = getSourceColor(item.sourceName);
    const timeAgo = formatTimeAgo(item.publishedAt);
    const imageCardWidth = SCREEN_W - 32;

    // Dynamic image height based on aspect ratio
    const [imageHeight, setImageHeight] = useState(210);
    useEffect(() => {
        if (item.imageUrl) {
            Image.getSize(item.imageUrl, (w, h) => {
                if (w && h) {
                    const ratio = w / h;
                    setImageHeight(imageCardWidth / ratio);
                }
            }, () => {});
        }
    }, [item.imageUrl]);

    const handlePress = () => {
        if (item.sourceUrl) {
            navigation.navigate('NewsArticle', {
                url: item.sourceUrl,
                title: item.title,
                sourceName: item.sourceName,
            });
        }
    };

    return (
        <MotiView
            style={styles.card}
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 380 }}
        >
            {/* ── Image Section (same as NewsCard) ────────────────── */}
            <MotiView
                style={[styles.imageWrapper, { overflow: 'hidden' }]}
                animate={{ height: item.imageUrl ? imageHeight : 210 }}
                transition={{ type: 'timing', duration: 300 }}
            >
                {item.imageUrl ? (
                    <TouchableOpacity activeOpacity={0.95} onPress={handlePress} style={{ width: imageCardWidth, height: imageHeight }}>
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={{ width: imageCardWidth, height: imageHeight }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity activeOpacity={0.95} onPress={handlePress} style={styles.imagePlaceholder}>
                        <Ionicons name="newspaper" size={48} color="#9ca3af" />
                    </TouchableOpacity>
                )}

                {/* Source badge overlay on image */}
                <View style={[styles.sourceBadge, { backgroundColor: sourceColor }]}>
                    <Ionicons name="open-outline" size={11} color="#fff" />
                    <Text style={styles.sourceBadgeText}>{item.sourceName}</Text>
                </View>
            </MotiView>

            {/* ── Content Section (matches NewsCard) ──────────────── */}
            <View style={styles.content}>
                {/* Title */}
                <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
                    <Text style={styles.title}>
                        {item.title?.replace(/<[^>]*>?/gm, '')}
                    </Text>
                </TouchableOpacity>

                {/* Description snippet */}
                {item.description ? (
                    <Text style={styles.description} numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}

                {/* Author + time row (same layout as NewsCard metaRow) */}
                <View style={styles.metaRow}>
                    {item.sourceLogo ? (
                        <Image source={{ uri: item.sourceLogo }} style={styles.sourceIcon} />
                    ) : (
                        <View style={[styles.sourceIconFallback, { backgroundColor: sourceColor }]}>
                            <Text style={styles.sourceInitial}>{item.sourceName?.[0] || 'N'}</Text>
                        </View>
                    )}
                    <Text style={styles.authorText}>{item.author || item.sourceName}</Text>
                    <Text style={styles.dotSeparator}>·</Text>
                    <Text style={styles.metaText}>{timeAgo}</Text>
                    <Text style={styles.dotSeparator}>·</Text>
                    <Text style={styles.metaText}>{item.stateName || ''}</Text>
                </View>

                {/* ── Divider ──────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Read Full Article CTA (replaces comment section) ─── */}
                <TouchableOpacity style={styles.readMoreRow} activeOpacity={0.7} onPress={handlePress}>
                    <Ionicons name="book-outline" size={15} color={isDarkMode ? '#6ee7b7' : '#059669'} />
                    <Text style={styles.readMoreText}>Read full article</Text>
                    <Ionicons name="arrow-forward" size={14} color={isDarkMode ? '#6ee7b7' : '#059669'} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
            </View>
        </MotiView>
    );
}

// ─── Styles (matching NewsCard exactly) ───────────────────────────────────────
const getStyles = (colors, isDarkMode) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.2 : 0.07,
        shadowRadius: 8,
    },

    // Image — same as NewsCard
    imageWrapper: {
        width: '100%',
        height: 210,
        position: 'relative',
        backgroundColor: colors.surfaceDeeper,
        overflow: 'hidden',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    imagePlaceholder: {
        width: '100%', height: '100%',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surfaceDeeper,
    },

    // Source badge on image
    sourceBadge: {
        position: 'absolute',
        top: 10, left: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        elevation: 3,
    },
    sourceBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.3,
    },

    // Content — same as NewsCard
    content: { padding: 14 },

    title: {
        fontSize: 17,
        fontFamily: 'Outfit_700Bold',
        fontWeight: 'bold',
        color: colors.text,
        lineHeight: 24,
        marginBottom: 6,
    },
    description: {
        fontSize: 13,
        fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
        lineHeight: 19,
        marginBottom: 10,
    },

    // Author row — same as NewsCard metaRow
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 5,
        marginBottom: 12,
    },
    sourceIcon: {
        width: 22, height: 22, borderRadius: 11,
    },
    sourceIconFallback: {
        width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
    },
    sourceInitial: {
        color: '#fff', fontSize: 11, fontFamily: 'Outfit_700Bold',
    },
    authorText: {
        fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: colors.text,
    },
    dotSeparator: { color: colors.textDim, fontSize: 12 },
    metaText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim },

    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 12,
    },

    // Read more CTA — replaces comment input area
    readMoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
    },
    readMoreText: {
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
        color: isDarkMode ? '#6ee7b7' : '#059669',
    },
});
