import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, ActivityIndicator, Image, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function CartModal({ isVisible, onClose, cart, refreshCart }) {
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [formData, setFormData] = useState({ name: '', phone: '', address: '', mapLink: '' });
    const [submitting, setSubmitting] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    React.useEffect(() => {
        if (isVisible) {
            fetchUserProfile();
        }
    }, [isVisible]);

    const fetchUserProfile = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            if (!token) return;
            const res = await axios.get(`${BASE_URL}/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) {
                const user = res.data.data;
                setFormData(prev => ({
                    ...prev,
                    name: prev.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                    phone: prev.phone || user.phone || ''
                }));
            }
        } catch (e) {
            // Ignore error if profile can't be fetched
        }
    };

    if (!cart) return null;

    const updateQty = async (itemId, newQty) => {
        if (newQty < 1) return;
        try {
            await axios.put(`${BASE_URL}/cart/${cart.sessionId}/items/${itemId}?quantity=${newQty}`);
            refreshCart();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Failed to update quantity' });
        }
    };

    const removeItem = async (itemId) => {
        try {
            const res = await axios.delete(`${BASE_URL}/cart/${cart.sessionId}/items/${itemId}`);
            if (res.data.data && (!res.data.data.sessionId || res.data.data.items.length === 0)) {
                Toast.show({ type: 'success', text1: 'Cart is empty' });
                onClose();
            }
            refreshCart();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Failed to remove item' });
        }
    };

    const handleCheckout = async () => {
        if (!formData.name || !formData.phone || !formData.address) {
            Toast.show({ type: 'error', text1: 'Please fill in all required fields' });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                sessionId: cart.sessionId,
                customerName: formData.name,
                customerPhone: formData.phone,
                deliveryAddress: formData.address,
                exactLocation: formData.mapLink
            };

            const res = await axios.post(`${BASE_URL}/whatsapp/generate-order`, payload);
            const { whatsappUrl } = res.data.data;

            // For React Native, we use Linking to open WhatsApp
            const canOpen = await Linking.canOpenURL(whatsappUrl);
            if (canOpen) {
                await Linking.openURL(whatsappUrl);
                // Clear cart locally
                onClose();
                refreshCart();
            } else {
                Toast.show({ type: 'error', text1: 'WhatsApp is not installed' });
            }
        } catch (error) {
            console.error(error);
            Toast.show({ type: 'error', text1: 'Checkout failed' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.drawerContainer}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}><Ionicons name="cart" size={20} /> Your Cart</Text>
                            {cart.vendor && <Text style={styles.headerSubtitle}>Ordering from {cart.vendor.shopName}</Text>}
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        {/* Cart Items */}
                        <View style={styles.itemsList}>
                            {cart.items.map((item) => (
                                <View key={item.itemId} style={styles.cartItem}>
                                    <View style={styles.itemImageContainer}>
                                        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                                    </View>

                                    <View style={styles.itemDetails}>
                                        <View style={styles.itemHeader}>
                                            <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
                                            <Text style={styles.itemPrice}>₹{item.subtotal}</Text>
                                        </View>
                                        <Text style={styles.unitPrice}>₹{item.priceAtAddition} / unit</Text>

                                        <View style={styles.itemActions}>
                                            <View style={styles.qtyControl}>
                                                <TouchableOpacity onPress={() => updateQty(item.itemId, item.quantity - 1)} style={styles.qtyButton}>
                                                    <Text style={styles.qtyBtnText}>-</Text>
                                                </TouchableOpacity>
                                                <Text style={styles.qtyText}>{item.quantity}</Text>
                                                <TouchableOpacity onPress={() => updateQty(item.itemId, item.quantity + 1)} style={styles.qtyButton}>
                                                    <Text style={styles.qtyBtnText}>+</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <TouchableOpacity onPress={() => removeItem(item.itemId)} style={styles.removeButton}>
                                                <Ionicons name="trash" size={20} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Checkout Form */}
                        <View style={styles.checkoutForm}>
                            <Text style={styles.formTitle}>Delivery Details</Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Your Name *"
                                value={formData.name}
                                onChangeText={(t) => setFormData({ ...formData, name: t })}
                                placeholderTextColor={colors.textDim}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number *"
                                keyboardType="phone-pad"
                                value={formData.phone}
                                onChangeText={(t) => setFormData({ ...formData, phone: t })}
                                placeholderTextColor={colors.textDim}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Full Delivery Address *"
                                multiline
                                value={formData.address}
                                onChangeText={(t) => setFormData({ ...formData, address: t })}
                                placeholderTextColor={colors.textDim}
                            />
                        </View>
                    </ScrollView>

                    {/* Footer Totals */}
                    <View style={styles.footer}>
                        {cart.deliveryMessage && (
                            <View style={styles.deliveryMsgBox}>
                                <Ionicons name="car" size={16} color="#1d4ed8" />
                                <Text style={styles.deliveryMsgText}>{cart.deliveryMessage}</Text>
                            </View>
                        )}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Item Total</Text>
                            <Text style={styles.totalValue}>₹{cart.itemTotal}</Text>
                        </View>

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Delivery Charge</Text>
                            <Text style={[styles.totalValue, cart.deliveryCharge === 0 && { color: '#059669' }]}>
                                {cart.deliveryCharge > 0 ? `+ ₹${cart.deliveryCharge}` : 'FREE'}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.totalRow}>
                            <Text style={styles.grandTotalLabel}>Total Amount</Text>
                            <Text style={styles.grandTotalValue}>₹{cart.totalAmount}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.checkoutBtn, submitting && styles.checkoutBtnDisabled]}
                            onPress={handleCheckout}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                                    <Text style={styles.checkoutBtnText}>Send Order on WhatsApp</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    drawerContainer: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    headerTextContainer: { flex: 1 },
    headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text },
    headerSubtitle: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim, marginTop: 2 },
    closeButton: { padding: 4, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#e5e7eb', borderRadius: 20 },

    scrollArea: { flexShrink: 1 },
    scrollContent: { padding: 16, paddingBottom: 24 },

    itemsList: { marginBottom: 24 },
    cartItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    itemImageContainer: { width: 64, height: 64, borderRadius: 8, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6', overflow: 'hidden', marginRight: 12 },
    itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },

    itemDetails: { flex: 1, justifyContent: 'space-between' },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    itemName: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: colors.text, flex: 1 },
    itemPrice: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: colors.text },
    unitPrice: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim, marginTop: 2 },

    itemActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    qtyControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.surface },
    qtyButton: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f9fafb' },
    qtyBtnText: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: colors.text },
    qtyText: { paddingHorizontal: 12, fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: colors.text },
    removeButton: { padding: 4 },

    checkoutForm: { backgroundColor: colors.surface, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    formTitle: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: colors.textDim, textTransform: 'uppercase', marginBottom: 12 },
    input: { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 12, fontSize: 14, fontFamily: 'Outfit_400Regular', marginBottom: 10, color: colors.text },
    textArea: { height: 80, textAlignVertical: 'top' },

    footer: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, shadowColor: colors.shadow, shadowOffset: { width: 0, height: -4 }, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 8, elevation: 10 },
    deliveryMsgBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : '#eff6ff', padding: 8, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: isDarkMode ? '#1e3a8a' : '#bfdbfe' },
    deliveryMsgText: { color: isDarkMode ? '#60a5fa' : '#1d4ed8', fontSize: 12, fontFamily: 'Outfit_600SemiBold', marginLeft: 6 },

    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    totalLabel: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.textDim },
    totalValue: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: colors.text },
    divider: { height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, marginVertical: 8, borderRadius: 1 },
    grandTotalLabel: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text },
    grandTotalValue: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text },

    checkoutBtn: { flexDirection: 'row', backgroundColor: colors.primary, padding: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8 },
    checkoutBtnDisabled: { opacity: 0.7 },
    checkoutBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold' }
});
