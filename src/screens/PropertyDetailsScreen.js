import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Vibration, View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Modal, TextInput, Platform, Linking, FlatList, Share } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useRoute, useNavigation } from '@react-navigation/native';
import { View as MotiView, AnimatePresence } from 'moti';
import ImageViewing from '../components/ImageViewer';
import { WebView } from 'react-native-webview';
import { DetailSkeleton } from '../components/Skeletons';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

const formatPropertyDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export default function PropertyDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { propertyId } = route.params;
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    const [imageIndex, setImageIndex] = useState(0);

    const [isFloorPlanVisible, setIsFloorPlanVisible] = useState(false);
    const [floorPlanIndex, setFloorPlanIndex] = useState(0);

    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [inquiryLoading, setInquiryLoading] = useState(false);
    const [hasClickedButton, setHasClickedButton] = useState(false);

    const [processingAdmin, setProcessingAdmin] = useState(false);

    useEffect(() => {
        fetchPropertyDetails();
    }, [propertyId]);

    const fetchPropertyDetails = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.get(`${BASE_URL}/properties/${propertyId}`, { headers });
            if (res.data.success) {
                setProperty(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching property details:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Property not found or deleted.' });
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleGetInTouch = async () => {
        if (hasClickedButton) {
            setShowInquiryModal(true);
            return;
        }
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            if (token) {
                await axios.post(`${BASE_URL}/properties/${propertyId}/inquiries/click`, {}, { headers: { Authorization: `Bearer ${token}` } });
                setHasClickedButton(true);
            }
        } catch (error) {
            console.log("Click tracking failed", error);
        } finally {
            setShowInquiryModal(true);
        }
    };

    const handleAdminAction = async (action) => {
        try {
            setProcessingAdmin(true);
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            await axios.post(`${BASE_URL}/properties/${propertyId}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Toast.show({ type: 'success', text1: 'Success', text2: `Property ${action}d successfully` });
            navigation.goBack();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: `Failed to ${action} property` });
            setProcessingAdmin(false);
        }
    };

    const submitInquiry = async () => {
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Enter a valid 10-digit Indian number' });
            return;
        }

        setInquiryLoading(true);
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.post(`${BASE_URL}/properties/${propertyId}/inquiries`, { phoneNumber }, { headers });
            if (res.data.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: 'Agent will contact you soon!' });
                setPhoneNumber('');
                setShowInquiryModal(false);
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'Failed to submit inquiry' });
        } finally {
            setInquiryLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <DetailSkeleton />
            </SafeAreaView>
        );
    }

    if (!property) return null;

    const handleShare = async () => {
        try {
            const webUrl = `https://jharkhandupdates.com/properties/details/${property.id || property._id}`;
            const snippet = (property.description || '').trim().slice(0, 100);
            const priceStr = property.price ? ` — ${formatPrice(property.price)}` : '';
            await Share.share({
                title: property.title,
                message: `${property.title}${priceStr}\n\n${snippet ? snippet + '...' : ''}\n\nRead more: ${webUrl}`,
                url: webUrl,
            });
        } catch (error) {
            console.log('Error sharing property:', error.message);
        }
    };

    const formatPrice = (price) => {
        if (!price) return "N/A";
        const num = parseFloat(price);
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
        return `₹${num.toLocaleString("en-IN")}`;
    };

    const formatAddress = () => {
        const parts = [];
        if (property.address) parts.push(property.address);
        if (property.locality) parts.push(property.locality);
        if (property.city) parts.push(property.city);
        if (property.district) parts.push(property.district);
        return parts.join(', ');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Property Details</Text>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Ionicons name="arrow-redo-outline" size={22} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Meta Header Block */}
                <View style={styles.metaContainer}>
                    <Text style={styles.propertyTitleMain}>{property.title}</Text>
                    <View style={styles.locationRowMain}>
                        <Ionicons name="location-outline" size={16} color="#059669" />
                        <Text style={styles.locationTextMain}>{formatAddress()}</Text>
                    </View>
                    <View style={styles.statsRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textDim} />
                        <Text style={styles.statsText}>Posted {formatPropertyDate(property.createdAt)}</Text>
                    </View>
                </View>

                {/* Image Gallery */}
                <View style={styles.galleryContainer}>
                    {property.imageUrls && property.imageUrls.length > 0 ? (
                        <>
                            <FlatList
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                data={property.imageUrls}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity activeOpacity={0.9} onPress={() => { setImageIndex(index); setIsImageViewVisible(true); }}>
                                        <Image
                                            source={{ uri: item }}
                                            style={styles.carouselImage}
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                )}
                            />
                            <TouchableOpacity style={styles.viewPhotosBtn} onPress={() => { setImageIndex(0); setIsImageViewVisible(true); }}>
                                <Ionicons name="expand" size={16} color="#111827" />
                                <Text style={styles.viewPhotosText}>View All {property.imageUrls.length} Photos</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons name="home" size={60} color={colors.border} />
                        </View>
                    )}
                </View>

                <MotiView style={styles.contentBlock} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }}>

                    {/* Price Block */}
                    <View style={styles.priceContainer}>
                        <View style={styles.priceRowWrapper}>
                            <Text style={styles.priceTextMain}>{formatPrice(property.price)}</Text>
                            {property.isNegotiable && (
                                <Text style={styles.negotiableText}>Negotiable</Text>
                            )}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: property.propertyStatus === 'FOR_SALE' ? '#ecfccb' : '#ffedd5' }]}>
                            <Text style={[styles.statusText, { color: property.propertyStatus === 'FOR_SALE' ? '#4d7c0f' : '#c2410c' }]}>
                                {property.propertyStatus === 'FOR_SALE' ? 'For Sale' : 'For Rent'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionHeader}>Property Overview</Text>
                    <View style={styles.overviewGrid}>
                        {property.totalArea && (
                            <View style={styles.overviewCard}>
                                <Ionicons name="stop-outline" size={24} color="#059669" />
                                <Text style={styles.overviewLabel}>Area</Text>
                                <Text style={styles.overviewValue}>{property.totalArea} sq.ft</Text>
                            </View>
                        )}
                        {property.bedrooms !== undefined && (
                            <View style={styles.overviewCard}>
                                <Ionicons name="bed-outline" size={24} color="#059669" />
                                <Text style={styles.overviewLabel}>Bedrooms</Text>
                                <Text style={styles.overviewValue}>{property.bedrooms}</Text>
                            </View>
                        )}
                        {property.bathrooms !== undefined && (
                            <View style={styles.overviewCard}>
                                <Ionicons name="water-outline" size={24} color="#059669" />
                                <Text style={styles.overviewLabel}>Bathrooms</Text>
                                <Text style={styles.overviewValue}>{property.bathrooms}</Text>
                            </View>
                        )}
                        {property.parkingSpaces !== undefined && (
                            <View style={styles.overviewCard}>
                                <Ionicons name="car-outline" size={24} color="#059669" />
                                <Text style={styles.overviewLabel}>Parking</Text>
                                <Text style={styles.overviewValue}>{property.parkingSpaces}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {property.description && (
                        <>
                            <Text style={styles.sectionHeader}>Description</Text>
                            <View style={styles.descriptionCard}>
                                <Text style={styles.descriptionText}>{property.description}</Text>
                            </View>
                            <View style={styles.divider} />
                        </>
                    )}

                    <Text style={styles.sectionHeader}>Property Details</Text>
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailColumn}>
                            <Text style={styles.detailGridLabel}>Property Type</Text>
                            <Text style={styles.detailGridValue}>{property.propertyType?.replace('_', ' ')}</Text>
                        </View>
                        <View style={styles.detailColumn}>
                            <Text style={styles.detailGridLabel}>Furnishing</Text>
                            <Text style={styles.detailGridValue}>{property.furnishingStatus?.replace('_', ' ')}</Text>
                        </View>
                        <View style={styles.detailColumn}>
                            <Text style={styles.detailGridLabel}>Total Floors</Text>
                            <Text style={styles.detailGridValue}>{property.totalFloors || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailColumn}>
                            <Text style={styles.detailGridLabel}>Floor Number</Text>
                            <Text style={styles.detailGridValue}>{property.floorNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailColumn}>
                            <Text style={styles.detailGridLabel}>Property Age</Text>
                            <Text style={styles.detailGridValue}>{property.propertyAge ? `${property.propertyAge} years` : 'N/A'}</Text>
                        </View>
                        <View style={styles.detailColumn}>
                            <Text style={styles.detailGridLabel}>Facing</Text>
                            <Text style={styles.detailGridValue}>{property.facingDirection?.replace('_', '-') || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailColumn}>
                            <Text style={styles.detailGridLabel}>Availability</Text>
                            <Text style={styles.detailGridValue}>{property.availabilityStatus?.replace('_', ' ') || 'READY TO MOVE'}</Text>
                        </View>
                        <View style={styles.detailColumn}>
                            <Text style={styles.detailGridLabel}>Posted By</Text>
                            <Text style={styles.detailGridValue}>{property.listedBy || 'N/A'}</Text>
                        </View>
                    </View>

                    {property.amenities && property.amenities.length > 0 && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.sectionHeader}>Amenities</Text>
                            <View style={styles.amenitiesGrid}>
                                {property.amenities.map((item, idx) => (
                                    <View key={idx} style={styles.amenityChipNew}>
                                        <View style={styles.checkmarkCircle}>
                                            <Ionicons name="checkmark" size={14} color="#059669" />
                                        </View>
                                        <Text style={styles.amenityTextNew}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {property.floorPlanUrls && property.floorPlanUrls.length > 0 && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.sectionHeader}>Floor Plans</Text>
                            <View style={styles.floorPlanContainer}>
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    data={property.floorPlanUrls}
                                    keyExtractor={(item, index) => index.toString()}
                                    contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingVertical: 16 }}
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            style={styles.floorPlanCard}
                                            onPress={() => { setFloorPlanIndex(index); setIsFloorPlanVisible(true); }}
                                        >
                                            <Image source={{ uri: item }} style={styles.floorPlanThumbnail} resizeMode="cover" />
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </>
                    )}

                    {property.address && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.sectionHeader}>Location</Text>
                            <View style={styles.locationCard}>
                                <View style={styles.locationCardRow}>
                                    <Ionicons name="location-outline" size={20} color="#059669" style={{ marginTop: 2 }} />
                                    <Text style={styles.locationCardText}>{formatAddress()}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.mapLinkBtn}
                                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress())}`)}
                                >
                                    <Ionicons name="open-outline" size={16} color="#059669" />
                                    <Text style={styles.mapLinkText}>Open in Google Maps</Text>
                                </TouchableOpacity>

                                {Platform.OS !== 'web' ? (
                                    <View style={styles.mapContainer}>
                                        <WebView
                                            originWhitelist={['*']}
                                            source={{
                                                html: `
                                                <html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;}iframe{width:100%;height:100%;border:0;}</style></head>
                                                <body><iframe src="${property.latitude && property.longitude
                                                        ? `https://maps.google.com/maps?q=${property.latitude},${property.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`
                                                        : `https://maps.google.com/maps?q=${encodeURIComponent(formatAddress())}&t=&z=15&ie=UTF8&iwloc=&output=embed`
                                                    }" allowfullscreen></iframe></body></html>
                                            ` }}
                                            style={{ flex: 1 }}
                                            scrollEnabled={false}
                                            nestedScrollEnabled={true}
                                            javaScriptEnabled={true}
                                        />
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress())}`)}
                                        style={styles.mapContainer}
                                    >
                                        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb', justifyContent: 'center', alignItems: 'center' }}>
                                            <Ionicons name="map-outline" size={40} color={isDarkMode ? '#6ee7b7' : '#059669'} />
                                            <Text style={{ fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: isDarkMode ? '#d1d5db' : '#374151', marginTop: 8 }}>Tap to Open Map</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    )}

                </MotiView>
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.bottomBar}>
                {property.status === 'PENDING' ? (
                    <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                        <TouchableOpacity
                            style={[styles.contactBtn, { flex: 1, backgroundColor: '#10b981' }]}
                            onPress={() => handleAdminAction('approve')}
                            disabled={processingAdmin}
                        >
                            {processingAdmin ? <ActivityIndicator color="#fff" /> : <Text style={styles.contactBtnText}>Approve</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.contactBtn, { flex: 1, backgroundColor: '#ef4444' }]}
                            onPress={() => handleAdminAction('reject')}
                            disabled={processingAdmin}
                        >
                            {processingAdmin ? <ActivityIndicator color="#fff" /> : <Text style={styles.contactBtnText}>Reject</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.contactBtn} onPress={handleGetInTouch}>
                        <Text style={styles.contactBtnText}>Get In Touch</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Inquiry Modal */}
            <Modal visible={showInquiryModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconContainer}>
                                <Ionicons name="call-outline" size={24} color="#059669" />
                            </View>
                            <TouchableOpacity onPress={() => setShowInquiryModal(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.textDim} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalTitleWeb}>Almost There!</Text>
                        <Text style={styles.modalDescWeb}>Share your phone number so our team can reach you</Text>

                        <Text style={styles.inputLabel}>Mobile Number *</Text>
                        <TextInput
                            style={styles.phoneInputWeb}
                            placeholder="Enter 10-digit mobile number"
                            placeholderTextColor={colors.textDim}
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                        />
                        <TouchableOpacity
                            style={[styles.submitBtnWeb, (inquiryLoading || phoneNumber.length !== 10) && { opacity: 0.6 }]}
                            onPress={submitInquiry}
                            disabled={inquiryLoading || phoneNumber.length !== 10}
                        >
                            {inquiryLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnTextWeb}>Submit Inquiry</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ImageViewing
                images={property?.imageUrls ? property.imageUrls.map(uri => ({ uri })) : []}
                imageIndex={imageIndex}
                visible={isImageViewVisible}
                onRequestClose={() => setIsImageViewVisible(false)}
            />

            <ImageViewing
                images={property?.floorPlanUrls ? property.floorPlanUrls.map(uri => ({ uri })) : []}
                imageIndex={floorPlanIndex}
                visible={isFloorPlanVisible}
                onRequestClose={() => setIsFloorPlanVisible(false)}
            />
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text, flex: 1, textAlign: 'center', marginHorizontal: 16 },
    shareButton: { padding: 4 },

    scrollContent: { paddingBottom: 40 },

    metaContainer: { padding: 16, backgroundColor: colors.surface },
    propertyTitleMain: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 8, lineHeight: 32 },
    locationRowMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    locationTextMain: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.textDim, marginLeft: 6, flex: 1 },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statsText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim, marginLeft: 4 },

    galleryContainer: { width: '100%', height: width * 0.65, position: 'relative' },
    carouselImage: { width: width, height: width * 0.65, backgroundColor: colors.surfaceDeeper },
    placeholderImage: { width: '100%', height: width * 0.65, backgroundColor: colors.surfaceDeeper, alignItems: 'center', justifyContent: 'center' },
    viewPhotosBtn: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, elevation: 4 },
    viewPhotosText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#111827', marginLeft: 6 },

    contentBlock: { padding: 20 },

    priceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    priceRowWrapper: { flexDirection: 'row', alignItems: 'baseline' },
    priceTextMain: { fontSize: 26, fontFamily: 'Outfit_700Bold', color: colors.text },
    negotiableText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#059669', marginLeft: 8 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusText: { fontFamily: 'Outfit_700Bold', fontSize: 12 },

    divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
    sectionHeader: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 16 },

    overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
    overviewCard: { width: '48%', backgroundColor: isDarkMode ? '#1f2937' : '#f8fafc', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    overviewLabel: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim, marginTop: 8 },
    overviewValue: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: colors.text, marginTop: 4 },

    descriptionCard: { padding: 0 },
    descriptionText: { fontSize: 15, fontFamily: 'Outfit_400Regular', color: colors.textDim, lineHeight: 24, textAlign: 'justify' },

    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 },
    detailColumn: { width: '50%', marginBottom: 16 },
    detailGridLabel: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim, marginBottom: 4 },
    detailGridValue: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: colors.text, textTransform: 'capitalize' },

    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 },
    amenityChipNew: { width: '48%', flexDirection: 'row', alignItems: 'center' },
    checkmarkCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    amenityTextNew: { color: colors.text, fontFamily: 'Outfit_500Medium', fontSize: 14 },

    floorPlanContainer: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginHorizontal: -20, overflow: 'hidden' },
    floorPlanCard: { width: width * 0.7, height: width * 0.5, backgroundColor: colors.surfaceDeeper, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, elevation: 2 },
    floorPlanThumbnail: { width: '100%', height: '100%' },

    locationCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, paddingBottom: 0, overflow: 'hidden' },
    locationCardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    locationCardText: { flex: 1, fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.text, marginLeft: 8, lineHeight: 22 },
    mapLinkBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    mapLinkText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#059669', marginLeft: 6 },
    mapContainer: { width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', marginTop: 4 },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, elevation: 10 },
    contactBtn: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 20, alignItems: 'center' },
    contactBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.surface, width: '100%', borderRadius: 20, padding: 24, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    modalIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
    closeBtn: { padding: 4 },
    modalTitleWeb: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 8, textAlign: 'center' },
    modalDescWeb: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.textDim, textAlign: 'center', marginBottom: 24 },
    inputLabel: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: colors.text, marginBottom: 8 },
    phoneInputWeb: { backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: 'Outfit_400Regular', marginBottom: 24 },
    submitBtnWeb: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    submitBtnTextWeb: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold' }
});
