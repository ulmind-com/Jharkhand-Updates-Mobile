import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
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
    const [filteredProperties, setFilteredProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        propertyType: "ALL",
        location: "ALL",
        minPrice: "",
        maxPrice: "",
        bedrooms: "ALL",
        propertyStatus: "ALL",
    });
    const [isFilterVisible, setIsFilterVisible] = useState(false);

    useEffect(() => {
        fetchProperties();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [properties, filters, searchQuery]);

    const fetchProperties = async () => {
        try {
            const timestamp = new Date().getTime();
            const res = await axios.get(`${BASE_URL}/properties?t=${timestamp}`);

            if (res.data.success) {
                const approved = (res.data.data || []).filter(prop => prop.status === 'APPROVED');
                setProperties(approved);
                setFilteredProperties(approved);
            }
        } catch (error) {
            console.error("Error fetching properties:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load properties' });
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...properties];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (prop) =>
                    prop.title?.toLowerCase().includes(query) ||
                    prop.city?.toLowerCase().includes(query) ||
                    prop.district?.toLowerCase().includes(query) ||
                    prop.locality?.toLowerCase().includes(query) ||
                    prop.address?.toLowerCase().includes(query)
            );
        }

        if (filters.propertyType !== "ALL") filtered = filtered.filter((prop) => prop.propertyType === filters.propertyType);
        if (filters.location !== "ALL") filtered = filtered.filter((prop) => prop.city === filters.location || prop.district === filters.location);
        if (filters.minPrice) filtered = filtered.filter((prop) => parseFloat(prop.price) >= parseFloat(filters.minPrice));
        if (filters.maxPrice) filtered = filtered.filter((prop) => parseFloat(prop.price) <= parseFloat(filters.maxPrice));
        if (filters.bedrooms !== "ALL") filtered = filtered.filter((prop) => prop.bedrooms === parseInt(filters.bedrooms));
        if (filters.propertyStatus !== "ALL") filtered = filtered.filter((prop) => prop.propertyStatus === filters.propertyStatus);

        const available = filtered.filter((prop) => !isSoldOrRented(prop));
        const soldOrRented = filtered.filter((prop) => isSoldOrRented(prop));

        available.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        soldOrRented.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setFilteredProperties([...available, ...soldOrRented]);
    };

    const getUniqueLocations = () => {
        const locations = new Set();
        properties.forEach((prop) => {
            if (prop.city) locations.add(prop.city);
            if (prop.district && prop.district !== prop.city) locations.add(prop.district);
        });
        return Array.from(locations).sort();
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({ propertyType: "ALL", location: "ALL", minPrice: "", maxPrice: "", bedrooms: "ALL", propertyStatus: "ALL" });
        setSearchQuery("");
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
                <TouchableOpacity onPress={() => setIsFilterVisible(!isFilterVisible)}>
                    <Ionicons name={isFilterVisible ? "close-circle" : "filter"} size={24} color={isFilterVisible ? colors.primary : colors.textDim} style={{ marginLeft: 'auto', padding: 8 }} />
                </TouchableOpacity>
            </View>

            {isFilterVisible && (
                <MotiView
                    from={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    style={styles.filtersContainer}
                >
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={colors.textDim} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search title, location..."
                            placeholderTextColor={colors.textDim}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={colors.textDim} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                        <View style={styles.filterChip}>
                            <Text style={styles.chipLabel}>Type:</Text>
                            {["ALL", "HOUSE", "FLAT", "APARTMENT", "VILLA", "PLOT", "LAND", "COMMERCIAL"].map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.chipPill, filters.propertyType === type && styles.chipPillActive]}
                                    onPress={() => handleFilterChange('propertyType', type)}
                                >
                                    <Text style={[styles.chipText, filters.propertyType === type && styles.chipTextActive]}>
                                        {type === "ALL" ? "All" : type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                        <View style={styles.filterChip}>
                            <Text style={styles.chipLabel}>Location:</Text>
                            <TouchableOpacity style={[styles.chipPill, filters.location === "ALL" && styles.chipPillActive]} onPress={() => handleFilterChange('location', "ALL")}>
                                <Text style={[styles.chipText, filters.location === "ALL" && styles.chipTextActive]}>All</Text>
                            </TouchableOpacity>
                            {getUniqueLocations().map(loc => (
                                <TouchableOpacity
                                    key={loc}
                                    style={[styles.chipPill, filters.location === loc && styles.chipPillActive]}
                                    onPress={() => handleFilterChange('location', loc)}
                                >
                                    <Text style={[styles.chipText, filters.location === loc && styles.chipTextActive]}>{loc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                        <View style={styles.filterChip}>
                            <Text style={styles.chipLabel}>Beds:</Text>
                            {["ALL", "1", "2", "3", "4"].map(bed => (
                                <TouchableOpacity
                                    key={bed}
                                    style={[styles.chipPill, filters.bedrooms === bed && styles.chipPillActive]}
                                    onPress={() => handleFilterChange('bedrooms', bed)}
                                >
                                    <Text style={[styles.chipText, filters.bedrooms === bed && styles.chipTextActive]}>{bed === "ALL" ? "Any" : bed + (bed === "4" ? "+" : "")}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={[styles.filterChip, { marginLeft: 16 }]}>
                            <Text style={styles.chipLabel}>Status:</Text>
                            {["ALL", "FOR_SALE", "FOR_RENT"].map(status => (
                                <TouchableOpacity
                                    key={status}
                                    style={[styles.chipPill, filters.propertyStatus === status && styles.chipPillActive]}
                                    onPress={() => handleFilterChange('propertyStatus', status)}
                                >
                                    <Text style={[styles.chipText, filters.propertyStatus === status && styles.chipTextActive]}>{status.replace('_', ' ')}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.rowFilters}>
                        <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                            <TextInput
                                style={styles.priceInput}
                                placeholder="Min ₹"
                                placeholderTextColor={colors.textDim}
                                keyboardType="numeric"
                                value={filters.minPrice}
                                onChangeText={(t) => handleFilterChange('minPrice', t)}
                            />
                            <TextInput
                                style={styles.priceInput}
                                placeholder="Max ₹"
                                placeholderTextColor={colors.textDim}
                                keyboardType="numeric"
                                value={filters.maxPrice}
                                onChangeText={(t) => handleFilterChange('maxPrice', t)}
                            />
                        </View>
                        <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
                            <Ionicons name="refresh" size={16} color={isDarkMode ? '#f87171' : '#ef4444'} style={{ marginRight: 4 }} />
                            <Text style={styles.clearFiltersText}>Reset</Text>
                        </TouchableOpacity>
                    </View>
                </MotiView>
            )}

            {loading ? (
                <View style={styles.listContent}>
                    {[...Array(2)].map((_, i) => <PropertySkeleton key={i} />)}
                </View>
            ) : (
                <FlatList
                    data={filteredProperties}
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
    emptyText: { color: colors.textDim, fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginTop: 16 },
    filtersContainer: { backgroundColor: colors.surface, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6', marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 15, fontFamily: 'Outfit_400Regular', color: colors.text },
    chipsScroll: { paddingHorizontal: 16, marginBottom: 12 },
    filterChip: { flexDirection: 'row', alignItems: 'center' },
    chipLabel: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: colors.text, marginRight: 8 },
    chipPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6', marginRight: 8, borderWidth: 1, borderColor: isDarkMode ? colors.border : 'transparent' },
    chipPillActive: { backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.2)' : '#dcfce7', borderColor: colors.primary },
    chipText: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: colors.textDim },
    chipTextActive: { color: colors.primary },
    rowFilters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 4 },
    priceInput: { flex: 1, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: 'Outfit_500Medium', color: colors.text },
    clearFiltersBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2', marginLeft: 12 },
    clearFiltersText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: isDarkMode ? '#f87171' : '#ef4444' }
});







