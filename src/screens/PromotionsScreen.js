import React, { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, Dimensions, TouchableOpacity, TextInput, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { View as MotiView } from 'moti';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';
const { width } = Dimensions.get('window');

// --- Skeleton Card ---
const ShopCardSkeleton = ({ colors }) => (
    <MotiView
        style={[styles.card, { borderWidth: 0, backgroundColor: colors.surface }]}
        from={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 800, loop: true }}
    >
        <View style={[styles.imageContainer, { backgroundColor: colors.border }]} />
        <View style={{ flex: 1, paddingVertical: 4, gap: 8 }}>
            <View style={{ height: 16, width: '70%', backgroundColor: colors.border, borderRadius: 4 }} />
            <View style={{ height: 12, width: '40%', backgroundColor: colors.border, borderRadius: 4 }} />
            <View style={{ height: 12, width: '90%', backgroundColor: colors.border, borderRadius: 4, marginTop: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <View style={{ height: 12, width: '30%', backgroundColor: colors.border, borderRadius: 4 }} />
                <View style={{ height: 12, width: '20%', backgroundColor: colors.border, borderRadius: 4 }} />
            </View>
        </View>
    </MotiView>
);

export default function PromotionsScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [myVendor, setMyVendor] = useState(null);
    const flatListRef = useRef(null);
    const scrollOffset = useRef(0);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchShops(0, false);
        checkMyVendor();
    }, []);

    // Restore scroll position when navigating back from details
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (scrollOffset.current > 0 && flatListRef.current) {
                setTimeout(() => {
                    flatListRef.current?.scrollToOffset({ offset: scrollOffset.current, animated: false });
                }, 50);
            }
        });
        return unsubscribe;
    }, [navigation]);

    const checkMyVendor = async () => {
        try {
            const token = Platform.OS === 'web'
                ? localStorage.getItem('accessToken')
                : await SecureStore.getItemAsync('accessToken');
            if (!token) return;
            const res = await axios.get(`${BASE_URL}/vendors/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) setMyVendor(res.data.data);
        } catch { /* not a vendor or not logged in */ }
    };

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
            console.error('Error fetching shops:', error);
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

    const handleRefresh = async () => {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
        await fetchShops(0, false);
        setRefreshing(false);
    };

    const filteredShops = shops.filter(shop =>
        shop.shopName?.toLowerCase().includes(search.toLowerCase())
    );

    const renderHeader = () => (
        <View style={[styles.heroSection, { backgroundColor: colors.primary }]}>
            <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>
                    Discover Local Shops &{' '}
                    <Text style={{ color: '#fde047' }}>Trusted Vendors</Text>
                </Text>
                <Text style={[styles.heroSubtitle, { color: isDarkMode ? colors.surface : '#dcfce7' }]}>
                    Find the best products, services, and deals from verified sellers in your neighborhood.
                </Text>

                <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
                    <Ionicons name="search" size={20} color={colors.textDim} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search shops..."
                        placeholderTextColor={colors.textDim}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textDim} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );

    const renderCard = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, {
                backgroundColor: colors.surface,
                borderWidth: isDarkMode ? 1 : 0,
                borderColor: colors.border,
                shadowColor: colors.shadow,
            }]}
            activeOpacity={0.85}
            onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('VendorShop', { vendorSlug: item.vendorSlug });
            }}
        >
            <View style={[styles.imageContainer, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f9fafb' }]}>
                {item.shopLogoUrl ? (
                    <Image
                        source={{ uri: item.shopLogoUrl }}
                        style={styles.shopImage}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Ionicons name="storefront" size={40} color={colors.textDim} />
                    </View>
                )}
            </View>

            <View style={styles.cardContent}>
                <Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>
                    {item.shopName}
                </Text>

                <View style={styles.badgesRow}>
                    <View style={[styles.verifiedBadge, {
                        backgroundColor: isDarkMode ? colors.surfaceDeeper : '#ecfdf5',
                        borderColor: colors.border,
                    }]}>
                        <Ionicons name="shield-checkmark" size={10} color={isDarkMode ? colors.primaryLight : '#006A4E'} />
                        <Text style={[styles.verifiedText, { color: isDarkMode ? colors.primaryLight : '#006A4E' }]}>
                            Verified Seller
                        </Text>
                    </View>
                    <Text style={[styles.productsCount, { color: colors.textDim }]}>
                        {item.productsCount || 0} Products
                    </Text>
                </View>

                {item.shopDescription ? (
                    <Text style={[styles.shopDesc, { color: colors.textDim }]} numberOfLines={2}>
                        {item.shopDescription}
                    </Text>
                ) : (
                    <Text style={[styles.shopDesc, { color: colors.textDim }]} numberOfLines={2}>
                        Visit this shop to see their amazing products and deals.
                    </Text>
                )}

                <View style={styles.cardFooter}>
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={12} color={colors.textDim} />
                        <Text style={[styles.locationText, { color: colors.textDim }]}>Local Vendor</Text>
                    </View>
                    <View style={[styles.visitBtn, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f0fdf4' }]}>
                        <Text style={[styles.visitBtnText, { color: colors.primary }]}>Visit Store</Text>
                        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyComponent = () => (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6' }]}>
                <Ionicons name="search" size={32} color={colors.textDim} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No shops found</Text>
            <Text style={[styles.emptyText, { color: colors.textDim }]}>
                {search.length > 0
                    ? 'Try searching for a different name.'
                    : 'No shops available right now. Check back later!'}
            </Text>
        </View>
    );

    const renderFooter = () => {
        if (loadingMore) {
            return <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />;
        }
        if (!hasMore && shops.length > 0) {
            return (
                <View style={styles.endOfListRow}>
                    <View style={[styles.endDivider, { backgroundColor: colors.border }]} />
                    <Text style={[styles.endText, { color: colors.textDim }]}>You've seen all shops</Text>
                    <View style={[styles.endDivider, { backgroundColor: colors.border }]} />
                </View>
            );
        }
        return null;
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.navbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.goBack();
                    }}
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={28} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.navbarTitle, { color: colors.primary }]}>Local Market</Text>
                {myVendor ? (
                    <TouchableOpacity
                        style={styles.manageShopBtn}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate('VendorDashboard');
                        }}
                    >
                        <Ionicons name="storefront" size={14} color="#fff" />
                        <Text style={styles.manageShopText}>My Shop</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {loading ? (
                <View style={styles.listContent}>
                    {[1, 2, 3, 4, 5].map(key => <ShopCardSkeleton key={key} colors={colors} />)}
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={filteredShops}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderCard}
                    ListHeaderComponent={renderHeader()}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    onScroll={(e) => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderEmptyComponent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    navbar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottomWidth: 1,
    },
    backButton: { padding: 8, marginLeft: -8 },
    navbarTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold' },

    heroSection: {
        paddingBottom: 28, paddingTop: 20, borderRadius: 24, marginBottom: 20,
        elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10,
        marginHorizontal: -16, paddingHorizontal: 16,
    },
    heroContent: { alignItems: 'center' },
    heroTitle: { fontSize: 26, fontFamily: 'Outfit_700Bold', color: '#fff', textAlign: 'center', marginBottom: 8, lineHeight: 32 },
    heroSubtitle: { textAlign: 'center', fontSize: 13, fontFamily: 'Outfit_400Regular', marginBottom: 20, paddingHorizontal: 10 },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 100, paddingHorizontal: 16, width: '100%', height: 48, elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 15, fontFamily: 'Outfit_400Regular' },

    listContent: { padding: 16, paddingBottom: 100 },

    card: {
        width: '100%', borderRadius: 20, marginBottom: 16, overflow: 'hidden',
        elevation: 3, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
        flexDirection: 'row', alignItems: 'flex-start', padding: 12,
    },
    imageContainer: { width: 90, height: 90, borderRadius: 20, marginRight: 14, overflow: 'hidden', flexShrink: 0 },
    shopImage: { width: '100%', height: '100%' },
    placeholderImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    cardContent: { flex: 1, paddingVertical: 2 },
    shopName: { fontSize: 16, fontFamily: 'Outfit_700Bold', marginBottom: 6 },
    shopDesc: { fontSize: 12, fontFamily: 'Outfit_400Regular', lineHeight: 16, marginBottom: 8 },

    badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    verifiedBadge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
        borderWidth: 1, gap: 4,
    },
    verifiedText: { fontSize: 10, fontFamily: 'Outfit_700Bold' },
    productsCount: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },

    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationText: { fontSize: 11, fontFamily: 'Outfit_500Medium' },
    visitBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    visitBtnText: { fontSize: 12, fontFamily: 'Outfit_700Bold' },

    emptyContainer: {
        alignItems: 'center', marginTop: 20, borderRadius: 16, padding: 32,
        borderWidth: 1, borderStyle: 'dashed',
    },
    emptyIconBox: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', marginBottom: 8 },
    emptyText: { fontSize: 14, fontFamily: 'Outfit_400Regular', textAlign: 'center' },

    endOfListRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20, paddingHorizontal: 16 },
    endDivider: { flex: 1, height: 1 },
    endText: { fontSize: 12, fontFamily: 'Outfit_500Medium' },

    manageShopBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#006A4E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    },
    manageShopText: { color: '#fff', fontSize: 12, fontFamily: 'Outfit_700Bold' },
});
