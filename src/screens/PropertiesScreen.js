import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { View as MotiView } from 'moti';
import { PropertySkeleton } from '../components/Skeletons';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function PropertiesScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        try {
            const timestamp = new Date().getTime();
            const res = await axios.get(`${BASE_URL}/properties?t=${timestamp}`);

            if (res.data.success) {
                const approved = (res.data.data || []).filter(prop => prop.status === 'APPROVED');
                setProperties(approved);
            }
        } catch (error) {
            console.error("Error fetching properties:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load properties' });
        } finally {
            setLoading(false);
        }
    };

    const isSoldOrRented = (property) => {
        const status = property.propertyStatus?.toUpperCase();
        return status === "SOLD" || status === "RENTED";
    };

    const formatPrice = (price) => {
        if (!price) return "N/A";
        const num = parseFloat(price);
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
        return `₹${num.toLocaleString("en-IN")}`;
    };

    const renderProperty = ({ item }) => {
        const inactive = isSoldOrRented(item);

        return (
            <MotiView
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400 }}
            >
                <TouchableOpacity
                    style={[styles.card, inactive && styles.cardInactive]}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
                >
                    <View style={styles.imageContainer}>
                        {item.imageUrls?.length > 0 ? (
                            <Image
                                source={{ uri: item.imageUrls[0] }}
                                style={[styles.propertyImage, inactive ? { opacity: 0.5 } : {}]}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.propertyImage, styles.placeholderImage, inactive && { opacity: 0.5 }]}>
                                <Ionicons name="home" size={48} color={colors.textDim} />
                            </View>
                        )}

                        {inactive && (
                            <View style={styles.stampOverlay}>
                                <View style={[styles.stamp, item.propertyStatus === 'SOLD' ? styles.bgRed : styles.bgOrange]}>
                                    <Text style={styles.stampText}>{item.propertyStatus}</Text>
                                </View>
                            </View>
                        )}

                        {!inactive && item.propertyStatus && (
                            <View style={[styles.statusBadge, item.propertyStatus === 'FOR_SALE' ? styles.bgBlue : styles.bgOrange]}>
                                <Text style={styles.statusText}>
                                    {item.propertyStatus === 'FOR_SALE' ? 'For Sale' : 'For Rent'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.cardContent}>
                        <Text style={[styles.title, inactive && { color: colors.textDim }]} numberOfLines={2}>
                            {item.title}
                        </Text>

                        <View style={styles.locationContainer}>
                            <Ionicons name="location" size={16} color={inactive ? colors.textDim : colors.primary} />
                            <Text style={[styles.locationText, inactive && { color: colors.textDim }]} numberOfLines={1}>
                                {item.city}, {item.district}
                            </Text>
                        </View>

                        <View style={styles.featuresContainer}>
                            {item.totalArea && (
                                <View style={styles.featureItem}>
                                    <Ionicons name="albums-outline" size={14} color={inactive ? colors.textDim : colors.primary} />
                                    <Text style={[styles.featureText, inactive && { color: colors.textDim }]}>{item.totalArea} sq.ft</Text>
                                </View>
                            )}
                            {item.bedrooms && (
                                <View style={styles.featureItem}>
                                    <Ionicons name="bed-outline" size={14} color={inactive ? colors.textDim : colors.primary} />
                                    <Text style={[styles.featureText, inactive && { color: colors.textDim }]}>{item.bedrooms} Beds</Text>
                                </View>
                            )}
                            {item.bathrooms && (
                                <View style={styles.featureItem}>
                                    <Ionicons name="water-outline" size={14} color={inactive ? colors.textDim : colors.primary} />
                                    <Text style={[styles.featureText, inactive && { color: colors.textDim }]}>{item.bathrooms} Baths</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.footer}>
                            <Text style={[styles.priceTag, inactive && { color: colors.textDim, textDecorationLine: 'line-through' }]}>
                                {formatPrice(item.price)}
                            </Text>
                            <View style={[styles.viewButton, inactive ? styles.viewButtonInactive : styles.viewButtonActive]}>
                                <Text style={[styles.viewButtonText, inactive ? { color: colors.textDim } : { color: colors.primary }]}>View Details</Text>
                                <Ionicons name="arrow-forward" size={16} color={inactive ? colors.textDim : colors.primary} />
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </MotiView>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: 8, marginLeft: -8, marginRight: 8 }}>
                    <Ionicons name="chevron-back" size={28} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Real Estate</Text>
                <Ionicons name="options-outline" size={24} color={colors.primary} style={{ marginLeft: 'auto' }} />
            </View>

            {loading ? (
                <View style={styles.listContent}>
                    {[...Array(2)].map((_, i) => <PropertySkeleton key={i} />)}
                </View>
            ) : (
                <FlatList
                    data={properties}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderProperty}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="home-outline" size={64} color={colors.textDim} />
                            <Text style={styles.emptyText}>No properties found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkMode ? colors.background : '#f0fdf4' }, // green-50
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: isDarkMode ? colors.border : '#dcfce7'
    },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: isDarkMode ? colors.primaryLight : '#047857' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },
    card: {
        backgroundColor: colors.surface, borderRadius: 24, marginBottom: 20, overflow: 'hidden',
        elevation: 5, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDarkMode ? 0.3 : 0.1, shadowRadius: 8,
        borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border
    },
    cardInactive: { opacity: 0.8 },
    imageContainer: { width: '100%', height: 220, position: 'relative', backgroundColor: isDarkMode ? colors.surfaceDeeper : '#e5e7eb' },
    propertyImage: { width: '100%', height: '100%' },
    placeholderImage: { alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? colors.surfaceDeeper : '#dcfce7' },
    statusBadge: {
        position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, elevation: 4
    },
    bgBlue: { backgroundColor: '#2563eb' },
    bgOrange: { backgroundColor: '#ea580c' },
    bgRed: { backgroundColor: '#dc2626' },
    statusText: { color: '#fff', fontSize: 12, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' },
    stampOverlay: {
        ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 10
    },
    stamp: {
        paddingHorizontal: 24, paddingVertical: 8, borderWidth: 4, borderColor: '#fff',
        transform: [{ rotate: '-30deg' }], shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 5, elevation: 10
    },
    stampText: { color: '#fff', fontSize: 24, fontFamily: 'Outfit_700Bold', letterSpacing: 4 },
    cardContent: { padding: 20 },
    title: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 12 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 6 },
    locationText: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.textDim, flex: 1 },
    featuresContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    featureText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim, fontFamily: 'Outfit_500Medium' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    priceTag: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.text },
    viewButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    viewButtonActive: { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#dcfce7' },
    viewButtonInactive: { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6' },
    viewButtonText: { fontSize: 14, fontFamily: 'Outfit_400Regular', fontFamily: 'Outfit_700Bold' },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { color: colors.textDim, fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginTop: 16 }
});







