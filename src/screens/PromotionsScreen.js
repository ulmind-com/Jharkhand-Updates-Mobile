import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, Dimensions, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { PromotionSkeleton } from '../components/Skeletons';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

export default function PromotionsScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchShops(0, false);
    }, []);

    const fetchShops = async (pageNum, append = false) => {
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const res = await axios.get(`${BASE_URL}/vendors`, {
                params: { page: pageNum, size: 10 }
            });

            const pageData = res.data.data;
            const newShops = pageData.content || [];

            if (append) {
                setShops(prev => [...prev, ...newShops]);
            } else {
                setShops(newShops);
            }

            setPage(pageData.number);
            setHasMore(!pageData.last);
        } catch (error) {
            console.error("Error fetching shops:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            fetchShops(page + 1, true);
        }
    };

    const filteredShops = shops.filter(shop =>
        shop.shopName?.toLowerCase().includes(search.toLowerCase())
    );

    const renderHeader = () => (
        <View style={styles.heroSection}>
            <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>
                    Discover Local Shops & <Text style={{ color: '#fde047' }}>Trusted Vendors</Text>
                </Text>
                <Text style={styles.heroSubtitle}>
                    Find the best products, services, and deals from verified sellers in your neighborhood.
                </Text>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={colors.textDim} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search shops..."
                        placeholderTextColor={colors.textDim}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>
        </View>
    );

    const renderCard = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('VendorShop', { vendorSlug: item.vendorSlug })}
        >
            <View style={styles.imageContainer}>
                {item.shopLogoUrl ? (
                    <Image
                        source={{ uri: item.shopLogoUrl }}
                        style={styles.shopImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Ionicons name="storefront" size={40} color={colors.textDim} />
                    </View>
                )}
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.shopName} numberOfLines={1}>{item.shopName}</Text>

                <View style={styles.badgesRow}>
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={10} color={isDarkMode ? colors.primaryLight : '#006A4E'} />
                        <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                    <Text style={styles.productsCount}>{item.productsCount || 0} Products</Text>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={12} color={colors.textDim} />
                        <Text style={styles.locationText}>Local Vendor</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>Promotions</Text>
                <Ionicons name="options-outline" size={24} color={colors.primary} style={{ marginLeft: 'auto' }} />
            </View>

            {loading && !loadingMore ? (
                <View style={styles.listContent}>
                    {[1, 2, 3, 4, 5, 6].map(key => <PromotionSkeleton key={key} />)}
                </View>
            ) : (
                <FlatList
                    data={filteredShops}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderCard}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} /> : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={48} color={colors.textDim} />
                            <Text style={styles.emptyText}>No shops found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background }, // Using the green-50 base or background
    navbar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border
    },
    backButton: { padding: 8, marginLeft: -8, marginRight: 8 },
    navbarTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.primary },
    heroSection: { backgroundColor: colors.primary, paddingBottom: 24, paddingTop: 16, borderRadius: 24, marginBottom: 20, elevation: 8, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDarkMode ? 0.3 : 0.15, shadowRadius: 10, marginHorizontal: -16, paddingHorizontal: 16 },
    heroContent: { alignItems: 'center' },
    heroTitle: { fontSize: 28, fontFamily: 'Outfit_700Bold', color: '#fff', textAlign: 'center', marginBottom: 8, lineHeight: 34 },
    heroSubtitle: { color: isDarkMode ? colors.surface : '#dcfce7', textAlign: 'center', fontSize: 13, fontFamily: 'Outfit_400Regular', marginBottom: 20, paddingHorizontal: 10 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 100, paddingHorizontal: 16, width: '100%', height: 46, elevation: 5 },
    searchInput: { flex: 1, marginLeft: 8, color: colors.text, fontSize: 15 },
    listContent: { padding: 16, paddingBottom: 100 },
    row: { justifyContent: 'space-between' },
    card: {
        width: '100%', backgroundColor: colors.surface, borderRadius: 20, marginBottom: 16,
        overflow: 'hidden', elevation: 3, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDarkMode ? 0.3 : 0.1, shadowRadius: 4,
        borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', padding: 12
    },
    imageContainer: { width: 90, height: 90, borderRadius: 20, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f9fafb', marginRight: 16, overflow: 'hidden' },
    shopImage: { width: '100%', height: '100%' },
    placeholderImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cardContent: { flex: 1, paddingVertical: 4 },
    shopName: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 6 },
    badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? colors.surfaceDeeper : '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: colors.border, gap: 4 },
    verifiedText: { color: isDarkMode ? colors.primaryLight : '#006A4E', fontSize: 10, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' },
    productsCount: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim, fontFamily: 'Outfit_600SemiBold' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationText: { fontSize: 10, fontFamily: 'Outfit_400Regular', color: colors.textDim, fontFamily: 'Outfit_500Medium' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { marginTop: 12, fontSize: 16, fontFamily: 'Outfit_400Regular', color: colors.textDim, fontFamily: 'Outfit_500Medium' }
});







