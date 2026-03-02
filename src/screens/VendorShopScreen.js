import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Vibration, View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useRoute, useNavigation } from '@react-navigation/native';
import { View as MotiView } from 'moti';
import * as SecureStore from 'expo-secure-store';
import { Share, Modal } from 'react-native';
import CartModal from '../components/CartModal';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

const ProductCard = ({ product, onAdd, isAdding }) => {
    const isOutOfStock = product.stockStatus !== "IN_STOCK" && product.stockStatus !== "In Stock";

    return (
        <MotiView
            style={[styles.productCard, isOutOfStock && { opacity: 0.6 }]}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
        >
            <View style={styles.productImageContainer}>
                {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                ) : (
                    <View style={styles.productImagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#9ca3af" />
                    </View>
                )}
                {product.hasDiscount && !isOutOfStock && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>OFF</Text>
                    </View>
                )}
            </View>

            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{product.productName}</Text>
                <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>

                <View style={styles.priceRow}>
                    <View>
                        {product.hasDiscount && (
                            <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
                        )}
                        <Text style={styles.effectivePrice}>₹{product.effectivePrice || product.originalPrice}</Text>
                    </View>

                    {!isOutOfStock ? (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => onAdd(product)}
                            disabled={isAdding}
                        >
                            {isAdding ? (
                                <ActivityIndicator size="small" color="#047857" />
                            ) : (
                                <>
                                    <Text style={styles.addButtonText}>Add</Text>
                                    <Ionicons name="add" size={16} color="#047857" />
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.outOfStockBadge}>
                            <Text style={styles.outOfStockText}>Out of Stock</Text>
                        </View>
                    )}
                </View>
            </View>
        </MotiView>
    );
};

export default function VendorShopScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    // For now we will hardcode a slug or accept it from params.
    // In a real flow, a "Vendors" directory would pass this.
    const slug = route.params?.vendorSlug || route.params?.slug || 'demo-shop';

    const [vendor, setVendor] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingToCartId, setAddingToCartId] = useState(null);

    // Cart state
    const [cart, setCart] = useState(null);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Fullscreen Image state
    const [fullscreenImage, setFullscreenImage] = useState(null);

    const handleShare = async () => {
        if (!vendor) return;
        try {
            await Share.share({
                message: `Check out ${vendor.shopName} on Jharkhand Updates!`,
                url: `https://jharkhandbiharupdates.com/shop/${slug}`,
                title: vendor.shopName
            });
        } catch (error) {
            console.error("Share error:", error);
        }
    };

    const getSessionId = async () => {
        try {
            return Platform.OS === 'web' ? localStorage.getItem('cart_session_id') || "" : await SecureStore.getItemAsync('cart_session_id') || "";
        } catch (e) {
            return "";
        }
    };

    useEffect(() => {
        fetchShopDetails();
    }, [slug]);

    const fetchShopDetails = async () => {
        try {
            const [vendorRes, prodRes] = await Promise.all([
                axios.get(`${BASE_URL}/vendors/${slug}`),
                axios.get(`${BASE_URL}/products/vendor/${slug}`)
            ]);
            setVendor(vendorRes.data.data);
            setProducts(prodRes.data.data);

            const sessionId = await getSessionId();
            if (sessionId) await refreshCart(sessionId);
        } catch (error) {
            console.error("Error fetching shop details:", error);
            Toast.show({ type: 'error', text1: 'Shop not found' });
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const refreshCart = async (sessionIdParam) => {
        const sid = sessionIdParam || await getSessionId();
        if (!sid) { setCart(null); return; }
        try {
            const res = await axios.get(`${BASE_URL}/cart/${sid}`);
            setCart(res.data.data);
        } catch (err) {
            setCart(null);
            if (Platform.OS === 'web') {
                localStorage.removeItem("cart_session_id");
            } else {
                await SecureStore.deleteItemAsync("cart_session_id");
            }
            setIsCartOpen(false);
        }
    };

    const handleAddToCart = async (product) => {
        setAddingToCartId(product.id);
        try {
            let activeSessionId = await getSessionId();
            const payload = { productId: product.id, quantity: 1, sessionId: activeSessionId };
            const res = await axios.post(`${BASE_URL}/cart/add`, payload);
            const responseData = res.data.data;

            if (!activeSessionId && responseData.sessionId) {
                if (Platform.OS === 'web') {
                    localStorage.setItem("cart_session_id", responseData.sessionId);
                } else {
                    await SecureStore.setItemAsync("cart_session_id", responseData.sessionId);
                }
                activeSessionId = responseData.sessionId;
            }
            await refreshCart(activeSessionId);
            Toast.show({ type: 'success', text1: 'Added to cart' });
        } catch (error) {
            console.error(error);
            Toast.show({ type: 'error', text1: 'Error adding to cart' });
        } finally {
            setAddingToCartId(null);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.headerOverlay}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                </View>
                <MotiView
                    from={{ opacity: 0.5 }} animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true }}
                >
                    <View style={[styles.coverContainer, { backgroundColor: '#e5e7eb' }]} />
                    <View style={styles.profileSection}>
                        <View style={[styles.logoContainer, { backgroundColor: '#d1d5db', borderWidth: 4, borderColor: '#fff' }]} />
                        <View style={[styles.shopInfo, { height: 100, backgroundColor: '#fff', borderRadius: 20 }]}>
                            <View style={{ height: 24, width: '60%', backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 8 }} />
                            <View style={{ height: 14, width: '40%', backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 }} />
                            <View style={{ height: 14, width: '90%', backgroundColor: '#f3f4f6', borderRadius: 4 }} />
                        </View>
                    </View>
                    <View style={styles.productsSection}>
                        {[1, 2, 3, 4].map(i => (
                            <View key={i} style={[styles.productCard, { marginBottom: 16 }]}>
                                <View style={[styles.productImageContainer, { backgroundColor: '#e5e7eb' }]} />
                                <View style={{ flex: 1, paddingVertical: 4 }}>
                                    <View style={{ height: 16, width: '80%', backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 8 }} />
                                    <View style={{ height: 12, width: '100%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 4 }} />
                                    <View style={{ height: 12, width: '60%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 16 }} />
                                    <View style={{ height: 20, width: '30%', backgroundColor: '#e5e7eb', borderRadius: 4 }} />
                                </View>
                            </View>
                        ))}
                    </View>
                </MotiView>
            </SafeAreaView>
        );
    }

    if (!vendor) return null;

    const discountedProducts = products.filter(p => p.hasDiscount);
    const regularProducts = products.filter(p => !p.hasDiscount);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header Back Button Overlay */}
            <View style={styles.headerOverlay}>
                <TouchableOpacity style={styles.backButton} onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Cover Image */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => vendor.shopCoverUrl && setFullscreenImage(vendor.shopCoverUrl)}
                    style={styles.coverContainer}
                >
                    {vendor.shopCoverUrl ? (
                        <Image source={{ uri: vendor.shopCoverUrl }} style={styles.coverImage} />
                    ) : (
                        <View style={styles.coverPlaceholder}>
                            <Ionicons name="storefront" size={64} color="#dcfce7" />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => vendor.shopLogoUrl && setFullscreenImage(vendor.shopLogoUrl)}
                        style={styles.logoContainer}
                    >
                        {vendor.shopLogoUrl ? (
                            <Image source={{ uri: vendor.shopLogoUrl }} style={styles.logoImage} />
                        ) : (
                            <Ionicons name="storefront" size={40} color="#9ca3af" />
                        )}
                        {vendor.userId?.role === 'ADMIN' && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.shopInfo}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.shopName}>{vendor.shopName}</Text>
                                <View style={styles.locationRow}>
                                    <Ionicons name="location" size={14} color="#6b7280" />
                                    <Text style={styles.locationText}>{vendor.shopAddress || "Local Vendor"}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                                <Ionicons name="share-social-outline" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.shopDescription}>{vendor.shopDescription || "Welcome to our shop! We provide high-quality products for our local community. Browse our collection below."}</Text>
                    </View>
                </View>

                {/* Products Section */}
                <View style={styles.productsSection}>
                    {products.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: '#fff', borderRadius: 16, padding: 32, borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' }]}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Ionicons name="bag-handle" size={32} color="#d1d5db" />
                            </View>
                            <Text style={{ fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#1f2937' }}>No products found</Text>
                            <Text style={[styles.emptyText, { marginTop: 4 }]}>This shop hasn't added any products yet.</Text>
                        </View>
                    ) : (
                        <>
                            {discountedProducts.length > 0 && (
                                <View style={styles.categoryBlock}>
                                    <View style={styles.categoryHeader}>
                                        <Ionicons name="pricetag" size={20} color="#dc2626" />
                                        <Text style={styles.categoryTitle}>Best Offers</Text>
                                    </View>
                                    <View style={styles.grid}>
                                        {discountedProducts.map(p => (
                                            <ProductCard key={p.id} product={p} onAdd={handleAddToCart} isAdding={addingToCartId === p.id} />
                                        ))}
                                    </View>
                                </View>
                            )}

                            {regularProducts.length > 0 && (
                                <View style={styles.categoryBlock}>
                                    <View style={styles.categoryHeader}>
                                        <Ionicons name="bag-handle" size={20} color="#2563eb" />
                                        <Text style={styles.categoryTitle}>All Products</Text>
                                    </View>
                                    <View style={styles.grid}>
                                        {regularProducts.map(p => (
                                            <ProductCard key={p.id} product={p} onAdd={handleAddToCart} isAdding={addingToCartId === p.id} />
                                        ))}
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </View>

            </ScrollView>

            {/* Floating Cart Button */}
            {cart && cart.totalItems > 0 && (
                <MotiView
                    style={styles.floatingCartContainer}
                    from={{ opacity: 0, scale: 0.8, translateY: 20 }}
                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                >
                    <TouchableOpacity
                        style={styles.floatingCartButton}
                        onPress={() => setIsCartOpen(true)}
                        activeOpacity={0.9}
                    >
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{cart.totalItems}</Text>
                        </View>
                        <View style={styles.cartTextInfo}>
                            <Text style={styles.viewCartText}>View Cart</Text>
                            <Text style={styles.cartTotalText}>Total: ₹{cart.totalAmount}</Text>
                        </View>
                        <Ionicons name="cart" size={24} color="#fff" />
                    </TouchableOpacity>
                </MotiView>
            )}

            <CartModal
                isVisible={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cart={cart}
                refreshCart={() => refreshCart()}
            />

            {/* Fullscreen Image Modal */}
            <Modal visible={!!fullscreenImage} transparent={true} animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
                <View style={styles.fullscreenModal}>
                    <TouchableOpacity style={styles.fullscreenCloseArea} activeOpacity={1} onPress={() => setFullscreenImage(null)} />
                    <TouchableOpacity style={styles.closeFullscreenBtn} onPress={() => setFullscreenImage(null)}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <MotiView
                        from={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        style={styles.fullscreenImageWrapper}
                        pointerEvents="none"
                    >
                        <Image source={{ uri: fullscreenImage }} style={styles.fullscreenImage} resizeMode="contain" />
                    </MotiView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#f9fafb' },
    headerOverlay: { position: 'absolute', top: 40, left: 16, zIndex: 10 },
    backButton: { backgroundColor: '#fff', borderRadius: 20, padding: 8, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    scrollContent: { paddingBottom: 40 },

    coverContainer: { width: '100%', height: 200, backgroundColor: '#e5e7eb' },
    coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    coverPlaceholder: { flex: 1, backgroundColor: '#047857', alignItems: 'center', justifyContent: 'center', opacity: 0.8 },

    profileSection: { paddingHorizontal: 16, marginTop: -40, zIndex: 2 },
    logoContainer: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff',
        borderWidth: 4, borderColor: '#fff', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
        alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden'
    },
    logoImage: { width: '100%', height: '100%', borderRadius: 50, resizeMode: 'cover' },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 20 },

    shopInfo: { backgroundColor: '#fff', padding: 16, borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    shopName: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: '#111827', marginBottom: 4 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    locationText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: '#6b7280' },
    shopDescription: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#4b5563', lineHeight: 20 },
    shareButton: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 12 },

    fullscreenModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    fullscreenCloseArea: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    closeFullscreenBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 20 },
    fullscreenImageWrapper: { width: '100%', height: '80%', alignItems: 'center', justifyContent: 'center' },
    fullscreenImage: { width: '100%', height: '100%' },

    productsSection: { padding: 16, marginTop: 8 },
    categoryBlock: { marginBottom: 24 },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    categoryTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#111827' },
    grid: { gap: 16 },

    productCard: {
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 12, gap: 12,
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4
    },
    productImageContainer: { width: 100, height: 100, borderRadius: 20, backgroundColor: '#f3f4f6', overflow: 'hidden' },
    productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    productImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    discountBadge: { position: 'absolute', top: 0, left: 0, backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderBottomRightRadius: 8 },
    discountText: { color: '#fff', fontSize: 10, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' },

    productInfo: { flex: 1, justifyContent: 'space-between' },
    productName: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#111827', marginBottom: 4 },
    productDesc: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#6b7280', lineHeight: 16 },

    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', mt: 8 },
    originalPrice: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#9ca3af', textDecorationLine: 'line-through' },
    effectivePrice: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#111827' },

    addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    addButtonText: { color: '#047857', fontFamily: 'Outfit_700Bold', fontSize: 14 },
    outOfStockBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    outOfStockText: { color: '#ef4444', fontSize: 10, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' },

    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#6b7280', marginTop: 12, fontSize: 16 },

    floatingCartContainer: { position: 'absolute', bottom: 30, left: 16, right: 16, zIndex: 20, alignItems: 'center' },
    floatingCartButton: {
        flexDirection: 'row', backgroundColor: '#047857', paddingVertical: 14, paddingHorizontal: 24,
        borderRadius: 30, alignItems: 'center', justifyContent: 'space-between', gap: 16,
        elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8
    },
    cartBadge: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20 },
    cartBadgeText: { color: '#047857', fontFamily: 'Outfit_700Bold', fontSize: 14 },
    cartTextInfo: { flex: 1 },
    viewCartText: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },
    cartTotalText: { color: '#d1fae5', fontSize: 12, fontFamily: 'Outfit_600SemiBold', marginTop: 2 }
});








