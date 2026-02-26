import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator,
    Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Dimensions, Share, Switch, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { View as MotiView } from 'moti';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';
const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;

// ─────────────────────────────────────────────
// Helper: get auth token
// ─────────────────────────────────────────────
const getToken = async () => {
    try {
        if (Platform.OS === 'web') return localStorage.getItem('accessToken') || '';
        return await SecureStore.getItemAsync('accessToken') || '';
    } catch { return ''; }
};

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────
const DashboardSkeleton = () => (
    <MotiView
        from={{ opacity: 0.4 }} animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 900, loop: true }}
        style={{ padding: 16 }}
    >
        <View style={{ height: 160, backgroundColor: '#e5e7eb', borderRadius: 20, marginBottom: 12 }} />
        <View style={{ height: 80, backgroundColor: '#f3f4f6', borderRadius: 16, marginBottom: 24 }} />
        {[1, 2, 3].map(i => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ width: 70, height: 70, backgroundColor: '#e5e7eb', borderRadius: 16 }} />
                <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
                    <View style={{ height: 14, backgroundColor: '#e5e7eb', borderRadius: 4, width: '70%' }} />
                    <View style={{ height: 12, backgroundColor: '#f3f4f6', borderRadius: 4, width: '45%' }} />
                    <View style={{ height: 20, backgroundColor: '#f3f4f6', borderRadius: 8, width: '55%' }} />
                </View>
            </View>
        ))}
    </MotiView>
);

// ─────────────────────────────────────────────
// Product Card
// ─────────────────────────────────────────────
const ProductCard = ({ product, onToggle, onEdit, onDelete, togglingId }) => {
    const isInStock = product.stockStatus === 'IN_STOCK' || product.stockStatus === 'In Stock';
    const isToggling = togglingId === product.id;

    return (
        <View style={pStyles.card}>
            <View style={pStyles.imageBox}>
                {product.imageUrl
                    ? <Image source={{ uri: product.imageUrl }} style={pStyles.image} />
                    : <View style={[pStyles.image, pStyles.imgPlaceholder]}><Ionicons name="image-outline" size={28} color="#9ca3af" /></View>
                }
                {product.hasDiscount && (
                    <View style={pStyles.saleBadge}><Text style={pStyles.saleTxt}>SALE</Text></View>
                )}
            </View>

            <View style={pStyles.info}>
                <Text style={pStyles.name} numberOfLines={2}>{product.productName}</Text>
                <View style={pStyles.priceRow}>
                    <Text style={pStyles.price}>₹{product.effectivePrice || product.originalPrice}</Text>
                    {product.hasDiscount && <Text style={pStyles.origPrice}>₹{product.originalPrice}</Text>}
                </View>
                <View style={pStyles.bottomRow}>
                    <View style={[pStyles.stockBadge, { backgroundColor: isInStock ? '#dcfce7' : '#fee2e2' }]}>
                        <Text style={[pStyles.stockTxt, { color: isInStock ? '#15803d' : '#dc2626' }]}>
                            {isInStock ? 'In Stock' : 'No Stock'}
                        </Text>
                    </View>
                    <View style={pStyles.actions}>
                        <TouchableOpacity
                            style={[pStyles.actionBtn, { backgroundColor: product.isActive ? '#dcfce7' : '#f3f4f6', borderColor: product.isActive ? '#86efac' : '#e5e7eb' }]}
                            onPress={() => onToggle(product.id)}
                            disabled={isToggling}
                        >
                            {isToggling
                                ? <ActivityIndicator size={14} color="#6b7280" />
                                : <Ionicons name={product.isActive ? 'eye' : 'eye-off'} size={16} color={product.isActive ? '#16a34a' : '#9ca3af'} />}
                        </TouchableOpacity>
                        <TouchableOpacity style={[pStyles.actionBtn, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]} onPress={() => onEdit(product)}>
                            <Ionicons name="create-outline" size={16} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[pStyles.actionBtn, { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }]} onPress={() => onDelete(product)}>
                            <Ionicons name="trash-outline" size={16} color="#e11d48" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};
const pStyles = StyleSheet.create({
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 1, borderColor: '#f3f4f6' },
    imageBox: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f9fafb', flexShrink: 0 },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    saleBadge: { position: 'absolute', top: 0, left: 0, backgroundColor: '#ef4444', paddingHorizontal: 5, paddingVertical: 2, borderBottomRightRadius: 8 },
    saleTxt: { color: '#fff', fontSize: 9, fontFamily: 'Outfit_700Bold' },
    info: { flex: 1, marginLeft: 12 },
    name: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#111827', lineHeight: 18, marginBottom: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    price: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#111827' },
    origPrice: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#9ca3af', textDecorationLine: 'line-through' },
    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    stockTxt: { fontSize: 10, fontFamily: 'Outfit_700Bold' },
    actions: { flexDirection: 'row', gap: 6 },
    actionBtn: { padding: 6, borderRadius: 8, borderWidth: 1 },
});

// ─────────────────────────────────────────────
// Bottom Sheet wrapper – THE FIX: fixed pixel height 
// ─────────────────────────────────────────────
const BottomSheetModal = ({ visible, onClose, title, children }) => (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
        <View style={sh.overlay}>
            <TouchableOpacity style={sh.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={[sh.sheet, { height: SHEET_HEIGHT }]}>
                <View style={sh.handle} />
                <View style={sh.header}>
                    <Text style={sh.headerTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose} style={sh.closeBtn}>
                        <Ionicons name="close" size={22} color="#374151" />
                    </TouchableOpacity>
                </View>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {children}
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </View>
    </Modal>
);

const sh = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    handle: { width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#111827' },
    closeBtn: { padding: 6, backgroundColor: '#f3f4f6', borderRadius: 10 },
});

// ─────────────────────────────────────────────
// Reusable form elements
// ─────────────────────────────────────────────
const FieldLabel = ({ label }) => <Text style={f.label}>{label}</Text>;
const FieldInput = ({ style, ...props }) => <TextInput style={[f.input, style]} {...props} />;
const f = StyleSheet.create({
    label: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#374151', marginBottom: 6 },
    input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#111827' },
});

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function VendorDashboardScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);

    const [vendor, setVendor] = useState(null);
    const [products, setProducts] = useState([]);
    const [quota, setQuota] = useState(100);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    const [shopModalVisible, setShopModalVisible] = useState(false);
    const [shopSaving, setShopSaving] = useState(false);
    const [shopForm, setShopForm] = useState({ shopName: '', shopDescription: '', vendorPhone: '', shopAddress: '', deliveryType: 'FREE', deliveryCharge: '', minFreeDeliveryAmount: '' });
    const [newLogo, setNewLogo] = useState(null);
    const [newCover, setNewCover] = useState(null);

    const [productModalVisible, setProductModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [productSaving, setProductSaving] = useState(false);
    const [productForm, setProductForm] = useState({ productName: '', description: '', originalPrice: '', discountedPrice: '', stockStatus: 'IN_STOCK', hasDiscount: false });
    const [productImage, setProductImage] = useState(null);

    // ── Data Fetch ──
    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const token = await getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [productsRes, userRes, vendorRes] = await Promise.allSettled([
                axios.get(`${BASE_URL}/products/my-products`, config),
                axios.get(`${BASE_URL}/users/my-profile`, config),
                axios.get(`${BASE_URL}/vendors/me`, config),
            ]);
            if (vendorRes.status === 'fulfilled') setVendor(vendorRes.value.data.data);
            if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data.data || []);
            if (userRes.status === 'fulfilled') {
                const q = userRes.value.data.data?.listing_quota;
                if (q) setQuota(q);
            }
        } catch { Toast.show({ type: 'error', text1: 'Failed to load dashboard' }); }
        finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { fetchData(); }, []);

    // ── Share ──
    const handleShare = async () => {
        if (!vendor) return;
        try {
            await Share.share({
                message: `Check out ${vendor.shopName} on Jharkhand Bihar Updates! https://jharkhandbiharupdates.com/shop/${vendor.vendorSlug}`,
                title: vendor.shopName,
            });
        } catch (e) { console.error(e); }
    };

    // ── Image picker ──
    const pickImage = async (setter) => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Toast.show({ type: 'error', text1: 'Gallery permission required' }); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true });
        if (!result.canceled && result.assets?.length) setter(result.assets[0]);
    };

    // ── Open Shop Modal ──
    const openShopModal = () => {
        if (vendor) {
            setShopForm({
                shopName: vendor.shopName || '', shopDescription: vendor.shopDescription || '',
                vendorPhone: vendor.vendorPhone || '', shopAddress: vendor.shopAddress || '',
                deliveryType: vendor.deliveryType || 'FREE',
                deliveryCharge: vendor.deliveryCharge ? String(vendor.deliveryCharge) : '',
                minFreeDeliveryAmount: vendor.minFreeDeliveryAmount ? String(vendor.minFreeDeliveryAmount) : '',
            });
        }
        setNewLogo(null); setNewCover(null); setShopModalVisible(true);
    };

    // ── Save Shop ──
    const handleSaveShop = async () => {
        if (!shopForm.shopName.trim()) { Toast.show({ type: 'error', text1: 'Shop name is required' }); return; }
        if (shopForm.deliveryType === 'FIXED' && !shopForm.deliveryCharge) { Toast.show({ type: 'error', text1: 'Enter delivery charge' }); return; }
        if (shopForm.deliveryType === 'CONDITIONAL' && (!shopForm.deliveryCharge || !shopForm.minFreeDeliveryAmount)) { Toast.show({ type: 'error', text1: 'Fill all delivery fields' }); return; }
        setShopSaving(true);
        try {
            const token = await getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(`${BASE_URL}/vendors/me/details`, shopForm, config);
            if (newLogo) {
                const fd = new FormData();
                fd.append('shopLogo', { uri: newLogo.uri, name: 'logo.jpg', type: 'image/jpeg' });
                await axios.put(`${BASE_URL}/vendors/me/logo`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
            }
            if (newCover) {
                const fd = new FormData();
                fd.append('shopCover', { uri: newCover.uri, name: 'cover.jpg', type: 'image/jpeg' });
                await axios.put(`${BASE_URL}/vendors/me/cover`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
            }
            Toast.show({ type: 'success', text1: 'Shop updated! 🎉' });
            setShopModalVisible(false); fetchData(true);
        } catch (e) { Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to update shop' }); }
        finally { setShopSaving(false); }
    };

    // ── Open Product Modal ──
    const openAddProduct = () => {
        if (products.length >= quota) { Toast.show({ type: 'error', text1: `Quota reached (${quota} max)` }); return; }
        setIsEditing(false); setEditingId(null);
        setProductForm({ productName: '', description: '', originalPrice: '', discountedPrice: '', stockStatus: 'IN_STOCK', hasDiscount: false });
        setProductImage(null); setProductModalVisible(true);
    };
    const openEditProduct = (product) => {
        setIsEditing(true); setEditingId(product.id);
        setProductForm({ productName: product.productName, description: product.description || '', originalPrice: String(product.originalPrice), discountedPrice: product.discountedPrice ? String(product.discountedPrice) : '', stockStatus: product.stockStatus || 'IN_STOCK', hasDiscount: product.hasDiscount || false });
        setProductImage(null); setProductModalVisible(true);
    };

    // ── Save Product ──
    const handleSaveProduct = async () => {
        if (!productForm.productName.trim()) { Toast.show({ type: 'error', text1: 'Product name required' }); return; }
        if (!productForm.originalPrice) { Toast.show({ type: 'error', text1: 'Price is required' }); return; }
        if (!isEditing && !productImage) { Toast.show({ type: 'error', text1: 'Please select a product image' }); return; }
        setProductSaving(true);
        try {
            const token = await getToken();
            if (isEditing) {
                const res = await axios.put(`${BASE_URL}/products/${editingId}`, productForm, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
                setProducts(prev => prev.map(p => p.id === editingId ? res.data.data : p));
                Toast.show({ type: 'success', text1: 'Product updated!' });
            } else {
                const fd = new FormData();
                fd.append('product', JSON.stringify(productForm));
                fd.append('productImage', { uri: productImage.uri, name: 'product.jpg', type: 'image/jpeg' });
                const res = await axios.post(`${BASE_URL}/products`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
                setProducts(prev => [...prev, res.data.data]);
                Toast.show({ type: 'success', text1: 'Product added! 🛍️' });
            }
            setProductModalVisible(false);
        } catch (e) { Toast.show({ type: 'error', text1: e.response?.data?.message || 'Operation failed' }); }
        finally { setProductSaving(false); }
    };

    // ── Toggle ──
    const handleToggle = async (id) => {
        setTogglingId(id);
        try {
            const token = await getToken();
            await axios.patch(`${BASE_URL}/products/${id}/toggle-status`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch { Toast.show({ type: 'error', text1: 'Failed to update status' }); }
        finally { setTogglingId(null); }
    };

    // ── Delete ──
    const handleDelete = (product) => {
        Alert.alert('Delete Product', `Delete "${product.productName}"?\nThis cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        const token = await getToken();
                        await axios.delete(`${BASE_URL}/products/${product.id}`, { headers: { Authorization: `Bearer ${token}` } });
                        setProducts(prev => prev.filter(p => p.id !== product.id));
                        Toast.show({ type: 'success', text1: 'Product deleted' });
                    } catch { Toast.show({ type: 'error', text1: 'Failed to delete' }); }
                }
            }
        ]);
    };

    // ── Loading state ──
    if (loading) {
        return (
            <SafeAreaView style={s.container} edges={['top']}>
                <View style={s.navbar}>
                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={22} color="#111827" />
                    </TouchableOpacity>
                    <Text style={s.navTitle}>My Shop</Text>
                    <View style={{ width: 40 }} />
                </View>
                <DashboardSkeleton />
            </SafeAreaView>
        );
    }

    const coverUri = newCover?.uri || vendor?.shopCoverUrl;
    const logoUri = newLogo?.uri || vendor?.shopLogoUrl;

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Navbar */}
            <View style={s.navbar}>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#111827" />
                </TouchableOpacity>
                <Text style={s.navTitle}>My Shop</Text>
                <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
                    <Ionicons name="share-social-outline" size={20} color="#3b82f6" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#006A4E']} />}
            >
                {/* Shop Card */}
                <View style={s.shopCard}>
                    {/* Cover */}
                    <TouchableOpacity style={s.coverBox} activeOpacity={0.9} onPress={() => coverUri && setFullscreenImage(coverUri)}>
                        {coverUri
                            ? <Image source={{ uri: coverUri }} style={s.coverImage} />
                            : <View style={s.coverPlaceholder}><Ionicons name="storefront" size={48} color="#dcfce7" /></View>
                        }
                    </TouchableOpacity>

                    {/* Logo + Info */}
                    <View style={s.shopInfoRow}>
                        <TouchableOpacity style={s.logoContainer} activeOpacity={0.9} onPress={() => logoUri && setFullscreenImage(logoUri)}>
                            {logoUri
                                ? <Image source={{ uri: logoUri }} style={s.logoImage} />
                                : <Ionicons name="storefront" size={30} color="#9ca3af" />
                            }
                        </TouchableOpacity>
                        <View style={{ flex: 1, paddingTop: 4 }}>
                            <Text style={s.shopName} numberOfLines={1}>{vendor?.shopName || 'My Shop'}</Text>
                            <View style={s.addrRow}>
                                <Ionicons name="location-outline" size={13} color="#6b7280" />
                                <Text style={s.addrText} numberOfLines={1}>{vendor?.shopAddress || 'Local Vendor'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={s.statsRow}>
                        <View style={s.statItem}><Text style={s.statNum}>{products.length}</Text><Text style={s.statLbl}>Products</Text></View>
                        <View style={s.statDiv} />
                        <View style={s.statItem}><Text style={s.statNum}>{products.filter(p => p.isActive).length}</Text><Text style={s.statLbl}>Live</Text></View>
                    </View>

                    {/* Actions */}
                    <View style={s.headerActions}>
                        <TouchableOpacity style={s.editShopBtn} onPress={openShopModal}>
                            <Ionicons name="settings-outline" size={16} color="#374151" />
                            <Text style={s.editShopTxt}>Edit Shop</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.addProductBtn, products.length >= quota && { backgroundColor: '#9ca3af' }]}
                            onPress={openAddProduct}
                            disabled={products.length >= quota}
                        >
                            <Ionicons name="add" size={18} color="#fff" />
                            <Text style={s.addProductTxt}>Add Product</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Products */}
                <View style={s.productsSection}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>My Products</Text>
                        <Text style={s.sectionCount}>{products.length}</Text>
                    </View>
                    {products.length === 0 ? (
                        <View style={s.emptyBox}>
                            <View style={s.emptyIconBox}><Ionicons name="bag-handle-outline" size={36} color="#d1d5db" /></View>
                            <Text style={s.emptyTitle}>No products yet</Text>
                            <Text style={s.emptyText}>Tap "Add Product" to list your first item.</Text>
                            <TouchableOpacity style={s.emptyAddBtn} onPress={openAddProduct}>
                                <Ionicons name="add-circle" size={16} color="#fff" />
                                <Text style={s.emptyAddTxt}>Add First Product</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        products.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onToggle={handleToggle}
                                onEdit={openEditProduct}
                                onDelete={handleDelete}
                                togglingId={togglingId}
                            />
                        ))
                    )}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ═══ EDIT SHOP MODAL ═══ */}
            <BottomSheetModal visible={shopModalVisible} onClose={() => setShopModalVisible(false)} title="Edit Shop & Settings">
                {/* Images */}
                <Text style={m.sectionLabel}>SHOP IMAGES</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                    <TouchableOpacity style={m.coverPicker} onPress={() => pickImage(setNewCover)}>
                        {(newCover?.uri || vendor?.shopCoverUrl)
                            ? <Image source={{ uri: newCover?.uri || vendor.shopCoverUrl }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                            : <><Ionicons name="image-outline" size={24} color="#9ca3af" /><Text style={m.pickerHint}>Cover Photo</Text></>
                        }
                        <View style={m.pickerOverlay}><Ionicons name="camera" size={16} color="#fff" /></View>
                    </TouchableOpacity>
                    <TouchableOpacity style={m.logoPicker} onPress={() => pickImage(setNewLogo)}>
                        {(newLogo?.uri || vendor?.shopLogoUrl)
                            ? <Image source={{ uri: newLogo?.uri || vendor.shopLogoUrl }} style={{ width: '100%', height: '100%', borderRadius: 50 }} />
                            : <><Ionicons name="camera-outline" size={24} color="#9ca3af" /><Text style={m.pickerHint}>Logo</Text></>
                        }
                        <View style={m.pickerOverlay}><Ionicons name="camera" size={14} color="#fff" /></View>
                    </TouchableOpacity>
                </View>

                {/* Basic Info */}
                <Text style={m.sectionLabel}>SHOP DETAILS</Text>
                <View style={m.field}>
                    <FieldLabel label="Shop Name *" />
                    <FieldInput value={shopForm.shopName} onChangeText={v => setShopForm(f => ({ ...f, shopName: v }))} placeholder="Your shop name" />
                </View>
                <View style={m.field}>
                    <FieldLabel label="Phone Number *" />
                    <FieldInput value={shopForm.vendorPhone} onChangeText={v => setShopForm(f => ({ ...f, vendorPhone: v }))} keyboardType="phone-pad" placeholder="10-digit mobile" />
                </View>
                <View style={m.field}>
                    <FieldLabel label="Shop Address" />
                    <FieldInput style={{ height: 72, textAlignVertical: 'top' }} value={shopForm.shopAddress} onChangeText={v => setShopForm(f => ({ ...f, shopAddress: v }))} multiline placeholder="e.g. Main Road, Ranchi" />
                </View>
                <View style={m.field}>
                    <FieldLabel label="Description" />
                    <FieldInput style={{ height: 90, textAlignVertical: 'top' }} value={shopForm.shopDescription} onChangeText={v => setShopForm(f => ({ ...f, shopDescription: v }))} multiline placeholder="Tell customers about your shop..." />
                </View>

                {/* Delivery */}
                <Text style={[m.sectionLabel, { marginTop: 12 }]}>DELIVERY SETTINGS</Text>
                <View style={m.deliveryRow}>
                    {['FREE', 'FIXED', 'CONDITIONAL'].map(type => (
                        <TouchableOpacity key={type} style={[m.delivOpt, shopForm.deliveryType === type && m.delivOptActive]} onPress={() => setShopForm(f => ({ ...f, deliveryType: type }))}>
                            <Text style={[m.delivOptTxt, shopForm.deliveryType === type && m.delivOptTxtActive]}>
                                {type === 'FREE' ? '🎉 Free' : type === 'FIXED' ? '📦 Fixed' : '🔀 Mixed'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {shopForm.deliveryType === 'FREE' && (
                    <View style={m.infoBanner}><Text style={m.infoBannerTxt}>Customers get free delivery on all orders.</Text></View>
                )}
                {(shopForm.deliveryType === 'FIXED' || shopForm.deliveryType === 'CONDITIONAL') && (
                    <View style={m.field}>
                        <FieldLabel label="Delivery Charge (₹) *" />
                        <FieldInput keyboardType="numeric" value={shopForm.deliveryCharge} onChangeText={v => setShopForm(f => ({ ...f, deliveryCharge: v }))} placeholder="e.g. 40" />
                    </View>
                )}
                {shopForm.deliveryType === 'CONDITIONAL' && (
                    <View style={m.field}>
                        <FieldLabel label="Free Delivery Above (₹) *" />
                        <FieldInput keyboardType="numeric" value={shopForm.minFreeDeliveryAmount} onChangeText={v => setShopForm(f => ({ ...f, minFreeDeliveryAmount: v }))} placeholder="e.g. 500" />
                    </View>
                )}
                <TouchableOpacity style={[m.saveBtn, shopSaving && { opacity: 0.7 }]} onPress={handleSaveShop} disabled={shopSaving}>
                    {shopSaving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={m.saveBtnTxt}>Save Changes</Text></>}
                </TouchableOpacity>
            </BottomSheetModal>

            {/* ═══ ADD/EDIT PRODUCT MODAL ═══ */}
            <BottomSheetModal visible={productModalVisible} onClose={() => setProductModalVisible(false)} title={isEditing ? 'Edit Product' : 'Add New Product'}>
                <View style={m.field}>
                    <FieldLabel label="Product Name *" />
                    <FieldInput value={productForm.productName} onChangeText={v => setProductForm(f => ({ ...f, productName: v }))} placeholder="e.g. Fresh Mango Pickle" />
                </View>
                <View style={m.field}>
                    <FieldLabel label="Description *" />
                    <FieldInput style={{ height: 90, textAlignVertical: 'top' }} value={productForm.description} onChangeText={v => setProductForm(f => ({ ...f, description: v }))} multiline placeholder="Describe your product..." />
                </View>

                {/* Stock */}
                <View style={m.field}>
                    <FieldLabel label="Stock Status" />
                    <View style={m.stockRow}>
                        {['IN_STOCK', 'OUT_OF_STOCK'].map(sv => (
                            <TouchableOpacity key={sv} style={[m.stockOpt, productForm.stockStatus === sv && m.stockOptActive]} onPress={() => setProductForm(f => ({ ...f, stockStatus: sv }))}>
                                <Text style={[m.stockOptTxt, productForm.stockStatus === sv && m.stockOptTxtActive]}>{sv === 'IN_STOCK' ? '✅ In Stock' : '❌ Out of Stock'}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Prices */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[m.field, { flex: 1 }]}>
                        <FieldLabel label="Price (₹) *" />
                        <FieldInput keyboardType="numeric" value={productForm.originalPrice} onChangeText={v => setProductForm(f => ({ ...f, originalPrice: v }))} placeholder="e.g. 199" />
                    </View>
                    <View style={[m.field, { flex: 1 }]}>
                        <FieldLabel label="Discount Price (₹)" />
                        <FieldInput style={!productForm.hasDiscount && { backgroundColor: '#f9fafb', color: '#9ca3af' }} keyboardType="numeric" value={productForm.discountedPrice} editable={productForm.hasDiscount} onChangeText={v => setProductForm(f => ({ ...f, discountedPrice: v }))} placeholder="e.g. 149" />
                    </View>
                </View>

                {/* Discount toggle */}
                <View style={m.toggleRow}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={f.label}>Enable Discount?</Text>
                        <Text style={m.subLbl}>Shows original price struck through</Text>
                    </View>
                    <Switch value={productForm.hasDiscount} onValueChange={v => setProductForm(f => ({ ...f, hasDiscount: v }))} trackColor={{ true: '#006A4E' }} thumbColor="#fff" />
                </View>

                {/* Image picker */}
                {!isEditing && (
                    <View style={m.field}>
                        <FieldLabel label="Product Image *" />
                        <TouchableOpacity style={m.imagePicker} onPress={() => pickImage(setProductImage)}>
                            {productImage
                                ? <Image source={{ uri: productImage.uri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                                : <><Ionicons name="cloud-upload-outline" size={32} color="#9ca3af" /><Text style={m.pickerHint}>Tap to select from gallery</Text></>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={[m.saveBtn, productSaving && { opacity: 0.7 }]} onPress={handleSaveProduct} disabled={productSaving}>
                    {productSaving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={m.saveBtnTxt}>{isEditing ? 'Update Product' : 'Add Product'}</Text></>}
                </TouchableOpacity>
            </BottomSheetModal>

            {/* Fullscreen Lightbox */}
            <Modal visible={!!fullscreenImage} transparent animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
                <View style={s.fsModal}>
                    <TouchableOpacity style={s.fsClose} onPress={() => setFullscreenImage(null)}>
                        <Ionicons name="close" size={26} color="#fff" />
                    </TouchableOpacity>
                    <Image source={{ uri: fullscreenImage }} style={s.fsImage} resizeMode="contain" />
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    backBtn: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 12 },
    navTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#111827' },
    shareBtn: { padding: 8, backgroundColor: '#eff6ff', borderRadius: 12 },

    shopCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
    coverBox: { height: 150, backgroundColor: '#e5e7eb' },
    coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    coverPlaceholder: { flex: 1, backgroundColor: '#006A4E', alignItems: 'center', justifyContent: 'center' },
    shopInfoRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: -28, gap: 12, marginBottom: 12 },
    logoContainer: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    logoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    shopName: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#111827', marginBottom: 2 },
    addrRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addrText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#6b7280', flex: 1 },

    statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f3f4f6', marginHorizontal: 16, paddingVertical: 12 },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#111827' },
    statLbl: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: '#6b7280', marginTop: 2 },
    statDiv: { width: 1, backgroundColor: '#f3f4f6' },

    headerActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
    editShopBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: '#f9fafb', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb' },
    editShopTxt: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#374151' },
    addProductBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: '#006A4E', borderRadius: 14 },
    addProductTxt: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#fff' },

    productsSection: { paddingHorizontal: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sectionTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#111827' },
    sectionCount: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },

    emptyBox: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' },
    emptyIconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontFamily: 'Outfit_700Bold', color: '#111827', marginBottom: 6 },
    emptyText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: '#6b7280', textAlign: 'center', marginBottom: 16 },
    emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#006A4E', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    emptyAddTxt: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },

    fsModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    fsClose: { position: 'absolute', top: 60, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 20 },
    fsImage: { width: width, height: width, maxHeight: '80%' },
});

// Modal internal styles
const m = StyleSheet.create({
    sectionLabel: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#9ca3af', letterSpacing: 1, marginBottom: 10 },
    field: { marginBottom: 14 },
    subLbl: { fontSize: 11, fontFamily: 'Outfit_400Regular', color: '#9ca3af' },

    coverPicker: { flex: 2, height: 100, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 4 },
    logoPicker: { width: 100, height: 100, backgroundColor: '#f9fafb', borderRadius: 50, borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 4 },
    pickerHint: { fontSize: 10, color: '#9ca3af', textAlign: 'center', fontFamily: 'Outfit_400Regular' },
    pickerOverlay: { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#006A4E', borderRadius: 20, padding: 4 },
    imagePicker: { height: 130, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 6 },

    deliveryRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    delivOpt: { flex: 1, paddingVertical: 10, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
    delivOptActive: { backgroundColor: '#006A4E', borderColor: '#006A4E' },
    delivOptTxt: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#374151', textAlign: 'center' },
    delivOptTxtActive: { color: '#fff' },

    infoBanner: { backgroundColor: '#ecfdf5', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#a7f3d0' },
    infoBannerTxt: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#065f46', textAlign: 'center' },

    stockRow: { flexDirection: 'row', gap: 10 },
    stockOpt: { flex: 1, paddingVertical: 10, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
    stockOptActive: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
    stockOptTxt: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#6b7280' },
    stockOptTxtActive: { color: '#15803d' },

    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', padding: 14, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' },

    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#006A4E', borderRadius: 14, paddingVertical: 16, marginTop: 8 },
    saveBtnTxt: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 16 },
});
