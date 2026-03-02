import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Platform, Linking, Dimensions, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');

const StatusBadge = ({ status }) => {
    let style = { bg: '#e0e7ff', text: '#3730a3', icon: 'ellipse' };
    if (status === 'APPROVED') style = { bg: '#dcfce7', text: '#166534', icon: 'checkmark-circle' };
    if (status === 'PENDING') style = { bg: '#fef3c7', text: '#92400e', icon: 'time' };
    if (status === 'REJECTED') style = { bg: '#fee2e2', text: '#991b1b', icon: 'close-circle' };

    return (
        <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
            <Ionicons name={style.icon} size={14} color={style.text} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: style.text }]}>{status}</Text>
        </View>
    );
};

export default function AdminPropertyDetailsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const property = route.params?.property;

    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    if (!property) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Error</Text>
                </View>
                <View style={styles.centerError}>
                    <Text style={{ color: colors.text }}>Property not found.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const formatPrice = (price) => {
        if (!price) return "N/A";
        const priceNum = Number(price);
        if (priceNum >= 10000000) return `₹${(priceNum / 10000000).toFixed(2)}Cr`;
        if (priceNum >= 100000) return `₹${(priceNum / 100000).toFixed(2)}L`;
        return `₹${priceNum.toLocaleString()}`;
    };

    const handleCall = (phone) => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`);
    };

    const handleMap = (mapLink, lat, lng) => {
        if (mapLink) return Linking.openURL(mapLink);
        if (lat && lng) return Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    };

    const renderImageGallery = () => {
        const images = property.imageUrls?.length > 0 ? property.imageUrls : (property.mainImageUrl ? [property.mainImageUrl] : []);
        if (images.length === 0) return null;

        return (
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    <Ionicons name="images" size={20} color="#3b82f6" /> Property Images
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                    {images.map((url, idx) => (
                        <TouchableOpacity
                            key={idx}
                            activeOpacity={0.8}
                            onPress={() => {
                                setSelectedImage(url);
                                setImageViewerVisible(true);
                            }}
                        >
                            <Image source={{ uri: url }} style={styles.galleryImage} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderBasicInfo = () => (
        <View style={styles.gridSection}>
            <View style={[styles.gridBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f0fdf4' }]}>
                <Text style={styles.gridLabel}>Price</Text>
                <Text style={[styles.gridValue, { color: '#059669' }]}>{formatPrice(property.price)}</Text>
                {property.negotiable && <Text style={styles.gridSubTextOk}>✓ Negotiable</Text>}
            </View>

            <View style={[styles.gridBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6' }]}>
                <Text style={styles.gridLabel}>Location</Text>
                <Text style={[styles.gridValue, { color: colors.text }]}>{property.city}</Text>
                <Text style={[styles.gridSubText, { color: colors.textDim }]}>{property.state}</Text>
            </View>

            <View style={[styles.gridBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6' }]}>
                <Text style={styles.gridLabel}>Type</Text>
                <Text style={[styles.gridValue, { color: colors.text }]}>{property.propertyType}</Text>
                <Text style={[styles.gridSubText, { color: colors.textDim }]}>{property.propertyStatus}</Text>
            </View>

            <View style={[styles.gridBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6' }]}>
                <Text style={styles.gridLabel}>Status</Text>
                <View style={{ marginTop: 4, alignItems: 'flex-start' }}><StatusBadge status={property.approvalStatus} /></View>
                <Text style={[styles.gridSubText, { marginTop: 8, color: colors.textDim }]}><Ionicons name="eye" size={12} /> {property.viewCount || 0} views</Text>
            </View>
        </View>
    );

    const renderAddress = () => (
        <View style={[styles.section, { borderTopColor: isDarkMode ? colors.border : '#e5e7eb', borderTopWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="location" size={20} color="#ef4444" /> Full Address
            </Text>
            <View style={[styles.infoCard, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fef2f2' }]}>
                {property.address && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Complete Address</Text>
                        <Text style={[styles.infoValue, { color: isDarkMode ? colors.text : '#111827' }]}>{property.address}</Text>
                    </View>
                )}
                {property.locality && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Locality</Text>
                        <Text style={[styles.infoValue, { color: isDarkMode ? colors.text : '#111827' }]}>{property.locality}</Text>
                    </View>
                )}

                <View style={[styles.addressGrid, { borderTopColor: isDarkMode ? colors.border : '#fecaca' }]}>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>City</Text>
                        <Text style={[styles.addressSubVal, { color: colors.text }]}>{property.city || 'N/A'}</Text>
                    </View>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>District</Text>
                        <Text style={[styles.addressSubVal, { color: colors.text }]}>{property.district || 'N/A'}</Text>
                    </View>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>State</Text>
                        <Text style={[styles.addressSubVal, { color: colors.text }]}>{property.state || 'N/A'}</Text>
                    </View>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>Pincode</Text>
                        <Text style={[styles.addressSubVal, { color: colors.text }]}>{property.pincode || 'N/A'}</Text>
                    </View>
                </View>

                {(property.mapLink || (property.latitude && property.longitude)) && (
                    <TouchableOpacity
                        style={styles.mapBtn}
                        onPress={() => handleMap(property.mapLink, property.latitude, property.longitude)}
                    >
                        <Ionicons name="map" size={18} color="#2563eb" />
                        <Text style={styles.mapBtnText}>Open in Google Maps</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderSpecs = () => (
        <View style={[styles.section, { borderTopColor: isDarkMode ? colors.border : '#e5e7eb', borderTopWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="business" size={20} color="#9333ea" /> Specifications
            </Text>

            <View style={styles.specGrid}>
                {property.bedrooms && (
                    <View style={[styles.specBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#faf5ff', borderColor: isDarkMode ? colors.border : '#e9d5ff' }]}>
                        <Text style={[styles.specVal, { color: '#9333ea' }]}>{property.bedrooms}</Text>
                        <Text style={styles.specLabel}>Bedrooms</Text>
                    </View>
                )}
                {property.bathrooms && (
                    <View style={[styles.specBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#eff6ff', borderColor: isDarkMode ? colors.border : '#bfdbfe' }]}>
                        <Text style={[styles.specVal, { color: '#2563eb' }]}>{property.bathrooms}</Text>
                        <Text style={styles.specLabel}>Bathrooms</Text>
                    </View>
                )}
                {property.totalArea && (
                    <View style={[styles.specBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f0fdf4', borderColor: isDarkMode ? colors.border : '#bbf7d0' }]}>
                        <Text style={[styles.specVal, { color: '#16a34a' }]}>{property.totalArea}</Text>
                        <Text style={styles.specLabel}>Sq.ft Area</Text>
                    </View>
                )}
                {property.parkingSpaces && (
                    <View style={[styles.specBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fefce8', borderColor: isDarkMode ? colors.border : '#fef08a' }]}>
                        <Text style={[styles.specVal, { color: '#ca8a04' }]}><Ionicons name="car" size={18} /> {property.parkingSpaces}</Text>
                        <Text style={styles.specLabel}>Parking</Text>
                    </View>
                )}
                {property.totalFloors && (
                    <View style={[styles.specBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#eef2ff', borderColor: isDarkMode ? colors.border : '#c7d2fe' }]}>
                        <Text style={[styles.specVal, { color: '#4f46e5' }]}><Ionicons name="layers" size={18} /> {property.totalFloors}</Text>
                        <Text style={styles.specLabel}>Total Floors</Text>
                    </View>
                )}
                {property.floorNumber && (
                    <View style={[styles.specBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fdf2f8', borderColor: isDarkMode ? colors.border : '#fbcfe8' }]}>
                        <Text style={[styles.specVal, { color: '#db2777' }]}>{property.floorNumber}</Text>
                        <Text style={styles.specLabel}>Floor No.</Text>
                    </View>
                )}
                {property.propertyAge && (
                    <View style={[styles.specBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fff7ed', borderColor: isDarkMode ? colors.border : '#fed7aa' }]}>
                        <Text style={[styles.specVal, { color: '#ea580c' }]}>{property.propertyAge}</Text>
                        <Text style={styles.specLabel}>Years Old</Text>
                    </View>
                )}
                {property.facingDirection && (
                    <View style={[styles.specBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f0fdfa', borderColor: isDarkMode ? colors.border : '#ccfbf1' }]}>
                        <Text style={[styles.specVal, { color: '#0d9488', fontSize: 16 }]}>{property.facingDirection}</Text>
                        <Text style={styles.specLabel}>Facing</Text>
                    </View>
                )}
            </View>

            {(property.furnishingStatus || property.availabilityStatus || property.parkingAvailable !== undefined) && (
                <View style={styles.extraSpecsRow}>
                    {property.furnishingStatus && (
                        <View style={[styles.extraSpecBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f9fafb', borderColor: isDarkMode ? colors.border : '#e5e7eb' }]}>
                            <Text style={styles.extraSpecLabel}>Furnishing</Text>
                            <Text style={[styles.extraSpecVal, { color: colors.text }]}>{property.furnishingStatus}</Text>
                        </View>
                    )}
                    {property.availabilityStatus && (
                        <View style={[styles.extraSpecBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f9fafb', borderColor: isDarkMode ? colors.border : '#e5e7eb' }]}>
                            <Text style={styles.extraSpecLabel}>Availability</Text>
                            <Text style={[styles.extraSpecVal, { color: colors.text }]}>{property.availabilityStatus}</Text>
                        </View>
                    )}
                    {property.parkingAvailable !== undefined && (
                        <View style={[styles.extraSpecBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f9fafb', borderColor: isDarkMode ? colors.border : '#e5e7eb' }]}>
                            <Text style={styles.extraSpecLabel}>Parking Available</Text>
                            <Text style={[styles.extraSpecVal, { color: property.parkingAvailable ? '#16a34a' : '#dc2626' }]}>
                                {property.parkingAvailable ? '✓ Yes' : '✗ No'}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    const renderAmenities = () => {
        if (!property.amenities || property.amenities.length === 0) return null;
        return (
            <View style={[styles.section, { borderTopColor: isDarkMode ? colors.border : '#e5e7eb', borderTopWidth: 1 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities & Features</Text>
                <View style={styles.amenitiesWrap}>
                    {property.amenities.map((am, idx) => (
                        <View key={idx} style={[styles.amenityChip, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#dcfce7', borderColor: isDarkMode ? colors.border : '#bbf7d0' }]}>
                            <Text style={[styles.amenityText, { color: isDarkMode ? '#4ade80' : '#15803d' }]}>✓ {am}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderCreatorAndContact = () => (
        <View style={[styles.section, { borderTopColor: isDarkMode ? colors.border : '#e5e7eb', borderTopWidth: 1 }]}>
            {/* Creator */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
                <Ionicons name="person" size={20} color="#2563eb" /> Posted By (Creator)
            </Text>
            <View style={[styles.infoCard, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#eff6ff', borderColor: isDarkMode ? colors.border : '#bfdbfe', borderWidth: 1, marginBottom: 20 }]}>
                <View style={styles.addressGrid}>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>Name</Text>
                        <Text style={[styles.addressSubVal, { color: isDarkMode ? colors.text : '#111827' }]}>{property.creator?.name || 'N/A'}</Text>
                    </View>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>Email</Text>
                        <Text style={[styles.addressSubVal, { color: isDarkMode ? colors.text : '#111827' }]}>{property.creator?.email || 'N/A'}</Text>
                    </View>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>Role</Text>
                        <View style={{ alignSelf: 'flex-start', backgroundColor: '#bfdbfe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 }}>
                            <Text style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#1e40af' }}>{property.creator?.role || 'USER'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Contact */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
                <Ionicons name="call" size={20} color="#16a34a" /> Contact Details
            </Text>
            <View style={[styles.infoCard, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f0fdf4', borderColor: isDarkMode ? colors.border : '#bbf7d0', borderWidth: 1 }]}>
                <View style={styles.addressGrid}>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>Name</Text>
                        <Text style={[styles.addressSubVal, { color: isDarkMode ? colors.text : '#111827' }]}>{property.contact?.name || 'N/A'}</Text>
                    </View>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>Email</Text>
                        <Text style={[styles.addressSubVal, { color: isDarkMode ? colors.text : '#111827' }]}>{property.contact?.email || 'N/A'}</Text>
                    </View>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>Phone</Text>
                        {property.contact?.phone ? (
                            <TouchableOpacity onPress={() => handleCall(property.contact.phone)}>
                                <Text style={[styles.addressSubVal, { color: '#16a34a', fontWeight: 'bold' }]}>📞 {property.contact.phone}</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={[styles.addressSubVal, { color: colors.textDim }]}>Not provided</Text>
                        )}
                    </View>
                    <View style={styles.addressCol}>
                        <Text style={styles.addressSubLabel}>Posted By Type</Text>
                        <Text style={[styles.addressSubVal, { color: isDarkMode ? colors.text : '#111827' }]}>{property.contact?.postedByType || 'N/A'}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.goBack();
                }}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                        #{property.propertyId} - {property.title}
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {renderImageGallery()}
                {renderBasicInfo()}
                {renderAddress()}
                {renderSpecs()}
                {renderAmenities()}
                {renderCreatorAndContact()}

                {property.description ? (
                    <View style={[styles.section, { borderTopColor: isDarkMode ? colors.border : '#e5e7eb', borderTopWidth: 1 }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                        <View style={[styles.descBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f9fafb', borderColor: isDarkMode ? colors.border : '#e5e7eb' }]}>
                            <Text style={[styles.descText, { color: colors.text }]}>{property.description}</Text>
                        </View>
                    </View>
                ) : null}
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                {property.contact?.phone && (
                    <TouchableOpacity
                        style={[styles.footerBtn, { backgroundColor: '#16a34a', marginRight: 12 }]}
                        onPress={() => handleCall(property.contact.phone)}
                    >
                        <Ionicons name="call" size={18} color="#fff" />
                        <Text style={styles.footerBtnText}>Call Owner</Text>
                    </TouchableOpacity>
                )}
                {property.mapLink && (
                    <TouchableOpacity
                        style={[styles.footerBtn, { backgroundColor: '#2563eb' }]}
                        onPress={() => handleMap(property.mapLink)}
                    >
                        <Ionicons name="location" size={18} color="#fff" />
                        <Text style={styles.footerBtnText}>View Map</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Modal visible={imageViewerVisible} transparent={true} onRequestClose={() => setImageViewerVisible(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setImageViewerVisible(false)}>
                        <Ionicons name="close-circle" size={40} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    headerTitleWrap: { flex: 1, paddingHorizontal: 12 },
    headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold' },
    centerError: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 40 },
    section: { padding: 16, paddingTop: 20 },
    sectionTitle: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginBottom: 16 },
    galleryScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
    galleryImage: { width: 140, height: 100, borderRadius: 12, marginRight: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    gridSection: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
    gridBox: { width: (width - 44) / 2, padding: 16, borderRadius: 16 },
    gridLabel: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#6b7280', marginBottom: 6 },
    gridValue: { fontSize: 18, fontFamily: 'Outfit_700Bold' },
    gridSubText: { fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 4 },
    gridSubTextOk: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#16a34a', marginTop: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    statusText: { fontSize: 12, fontFamily: 'Outfit_700Bold', letterSpacing: 0.5 },
    infoCard: { padding: 16, borderRadius: 16 },
    infoRow: { marginBottom: 12 },
    infoLabel: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 },
    infoValue: { fontSize: 15, fontFamily: 'Outfit_500Medium' },
    addressGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 12, borderTopWidth: 1, marginTop: 4 },
    addressCol: { width: '50%', marginBottom: 12 },
    addressSubLabel: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#6b7280', marginBottom: 2 },
    addressSubVal: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
    mapBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8 },
    mapBtnText: { color: '#2563eb', fontSize: 14, fontFamily: 'Outfit_600SemiBold', marginLeft: 8 },
    specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    specBox: { width: (width - 68) / 4, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
    specVal: { fontSize: 20, fontFamily: 'Outfit_700Bold', marginBottom: 4 },
    specLabel: { fontSize: 11, fontFamily: 'Outfit_400Regular', color: '#6b7280', textAlign: 'center' },
    extraSpecsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
    extraSpecBox: { flex: 1, minWidth: '40%', padding: 12, borderRadius: 12, borderWidth: 1 },
    extraSpecLabel: { fontSize: 11, fontFamily: 'Outfit_400Regular', color: '#6b7280', marginBottom: 4 },
    extraSpecVal: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
    amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    amenityChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    amenityText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
    descBox: { padding: 16, borderRadius: 16, borderWidth: 1 },
    descText: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 22 },
    footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1 },
    footerBtn: { flex: 1, flexDirection: 'row', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    footerBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Outfit_600SemiBold', marginLeft: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    fullImage: { width: '100%', height: '80%' }
});
