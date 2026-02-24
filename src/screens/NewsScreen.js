import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { View as MotiView } from 'moti';
import { NewsSkeleton } from '../components/Skeletons';
import TopHeader from '../components/TopHeader';
import WeatherWidget from '../components/WeatherWidget';
import { useLocation } from '../context/LocationContext';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function NewsScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    const { selectedState } = useLocation();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        setPage(0);
        setHasMore(true);
        fetchNews(0, false, selectedState);
    }, [selectedState]);

    const fetchNews = async (pageNum, append = false, targetState = selectedState) => {
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const res = await axios.get(`${BASE_URL}/state-news/${targetState}`, {
                params: { page: pageNum, size: 10 }
            });

            if (res.data.success) {
                const pageData = res.data.data;
                const fetchedNews = pageData.content || [];

                if (append) {
                    setNews(prev => [...prev, ...fetchedNews]);
                } else {
                    setNews(fetchedNews);
                }

                setPage(pageData.number);
                setHasMore(!pageData.last);
            }
        } catch (error) {
            console.error("Error fetching news:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load news' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            fetchNews(page + 1, true);
        }
    };

    const renderNewsItem = ({ item }) => {
        const authorName = item.author ? `${item.author.firstName} ${item.author.lastName}` : 'Unknown';
        const dateStr = new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        const isVideo = item.imageUrls?.[0]?.match(/\.(mp4|webm|ogg)$/i) || item.imageUrls?.[0]?.includes('video');

        return (
            <MotiView
                style={styles.card}
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400 }}
            >
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={() => navigation.navigate('StateNewsDetails', { newsId: item.id })}>
                    <View style={styles.imageContainer}>
                        {item.imageUrls?.length > 0 && !isVideo ? (
                            <Image
                                source={{ uri: item.imageUrls[0] }}
                                style={styles.newsImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.placeholderContainer}>
                                <Ionicons name={isVideo ? "play-circle" : "newspaper"} size={48} color="#9ca3af" />
                            </View>
                        )}
                        <View style={styles.overlay} />
                        <View style={styles.cardContent}>
                            <Text style={styles.title} numberOfLines={2}>
                                {item.title.replace(/<[^>]*>?/gm, "")}
                            </Text>

                            <View style={styles.metaContainer}>
                                <View style={styles.metaRow}>
                                    <Text style={styles.authorText}>{authorName}</Text>
                                    {item.author?.role === 'ADMIN' && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" style={{ marginLeft: 4 }} />}
                                </View>
                                <View style={styles.metaRow}>
                                    <Ionicons name="time-outline" size={14} color="#d1d5db" />
                                    <Text style={styles.dateText}>{dateStr}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </MotiView>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <TopHeader />

            {loading && !loadingMore ? (
                <View style={styles.listContent}>
                    <View style={{ marginBottom: 20 }}>
                        <WeatherWidget />
                    </View>
                    {[...Array(3)].map((_, i) => <NewsSkeleton key={i} />)}
                </View>
            ) : (
                <FlatList
                    ListHeaderComponent={() => (
                        <View style={{ marginBottom: 20 }}>
                            <WeatherWidget />
                            <Text style={styles.feedTitle}>Top Stories in {selectedState}</Text>
                        </View>
                    )}
                    data={news}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderNewsItem}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() =>
                        loadingMore ? <ActivityIndicator size="small" color="#047857" style={{ marginVertical: 20 }} /> : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="newspaper-outline" size={64} color="#d1d5db" />
                            <Text style={styles.emptyText}>No news found for {selectedState}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    feedTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.text, marginTop: 16, marginBottom: 4 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },
    card: {
        backgroundColor: colors.surface, borderRadius: 20, marginBottom: 20, overflow: 'hidden',
        elevation: 6, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDarkMode ? 0.3 : 0.15, shadowRadius: 8,
        height: 300, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border
    },
    imageContainer: { flex: 1, position: 'relative', backgroundColor: isDarkMode ? colors.surfaceDeeper : '#e5e7eb' },
    newsImage: { width: '100%', height: '100%' },
    placeholderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? colors.surfaceDeeper : '#e5e7eb' },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    cardContent: {
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20,
    },
    title: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#fff', marginBottom: 12, lineHeight: 28 },
    metaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    authorText: { color: '#e5e7eb', fontSize: 13, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_600SemiBold' },
    dateText: { color: '#d1d5db', fontSize: 12, fontFamily: 'Outfit_400Regular', marginLeft: 6 },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { color: colors.textDim, fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginTop: 16 }
});



