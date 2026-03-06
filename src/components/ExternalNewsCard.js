import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { View as MotiView } from 'moti';
import { useNavigation } from '@react-navigation/native';

export default function ExternalNewsCard({ item, colors, isDarkMode }) {
    const navigation = useNavigation();
    const styles = getStyles(colors, isDarkMode);

    const publishedAt = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    }) : 'Recent';

    const imageUrl = item.image || item.urlToImage || null;
    const sourceName = item.source?.name || 'Top Headlines';
    const sourceLogo = item.source?.logo || null;
    const isWorld = item.category === 'world';

    const handlePress = () => {
        if (item.url) {
            navigation.navigate('NewsArticle', {
                url: item.url,
                title: item.title,
                sourceName: sourceName,
            });
        }
    };

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 350 }}
            style={styles.cardContainer}
        >
            <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={handlePress}>
                {/* Header with source logo */}
                <View style={styles.cardHeader}>
                    {sourceLogo ? (
                        <Image source={{ uri: sourceLogo }} style={styles.sourceLogoImg} resizeMode="contain" />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="newspaper" size={18} color={colors.primary} />
                        </View>
                    )}
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.authorName} numberOfLines={1}>{sourceName}</Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.dateText}>{publishedAt}</Text>
                            <Text style={styles.dot}>•</Text>
                            <MaterialCommunityIcons name="lightning-bolt" size={11} color={isDarkMode ? '#fbbf24' : '#d97706'} />
                            <Text style={[styles.dateText, styles.trendingLabel]}>
                                {isWorld ? '🌍 World' : 'Trending'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.postTitle} numberOfLines={3}>{item.title}</Text>

                {/* Article Image */}
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
                ) : null}

                {/* Description */}
                {item.description && item.description.length > 10 ? (
                    <Text style={styles.postContent} numberOfLines={2}>{item.description}</Text>
                ) : null}

                {/* Action bar */}
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handlePress}>
                        <Ionicons name="reader-outline" size={16} color={colors.primary} />
                        <Text style={styles.actionText}>Read full article</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </MotiView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    cardContainer: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    },
    card: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    sourceLogoImg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
        marginRight: 10,
    },
    avatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.15)' : '#ecfdf5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    headerTextWrap: {
        flex: 1,
        justifyContent: 'center',
    },
    authorName: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: colors.text,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    dateText: {
        fontSize: 12,
        fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
    },
    dot: {
        fontSize: 10,
        color: colors.textDim,
        marginHorizontal: 4,
    },
    trendingLabel: {
        color: isDarkMode ? '#fbbf24' : '#d97706',
        fontFamily: 'Outfit_600SemiBold',
    },
    postTitle: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        color: colors.text,
        marginBottom: 8,
        lineHeight: 22,
    },
    postImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    },
    postContent: {
        fontSize: 14,
        fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
        lineHeight: 20,
        marginBottom: 4,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        marginLeft: 6,
        fontSize: 13,
        fontFamily: 'Outfit_500Medium',
        color: colors.primary,
    }
});
