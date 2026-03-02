import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Image, Platform, RefreshControl, TextInput, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ThemeContext } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

const StatCard = ({ title, count, icon, colors, delay, isDarkMode, bgColors }) => (
    <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay }}
        style={[
            styles.statCard,
            { backgroundColor: isDarkMode ? colors.surface : bgColors.bg, borderColor: isDarkMode ? colors.border : bgColors.border }
        ]}
    >
        <View style={styles.statContent}>
            <View>
                <Text style={[styles.statTitle, { color: isDarkMode ? colors.textDim : bgColors.textDim }]}>{title}</Text>
                <Text style={[styles.statCount, { color: isDarkMode ? colors.text : bgColors.text }]}>{count}</Text>
            </View>
            <View style={[styles.statIconWrap, { backgroundColor: isDarkMode ? colors.surfaceDeeper : bgColors.iconBg }]}>
                <Ionicons name={icon} size={24} color={bgColors.icon} />
            </View>
        </View>
    </MotiView>
);

const StatusBadge = ({ status }) => {
    let style = { bg: '#e0e7ff', text: '#3730a3', icon: 'ellipse' };
    if (status === 'APPROVED') style = { bg: '#dcfce7', text: '#166534', icon: 'checkmark-circle' };
    if (status === 'PENDING') style = { bg: '#fef3c7', text: '#92400e', icon: 'time' };
    if (status === 'REJECTED') style = { bg: '#fee2e2', text: '#991b1b', icon: 'close-circle' };

    return (
        <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
            <Ionicons name={style.icon} size={12} color={style.text} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: style.text }]}>{status}</Text>
        </View>
    );
};

export default function AdminPropertiesScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);

    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // API State
    const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchProperties = async (pageNum = 0, status = filterStatus, isRefresh = false) => {
        try {
            if (pageNum === 0 && !isRefresh) setLoading(true);
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');

            const res = await axios.get(
                `${BASE_URL}/properties/admin/properties/all-with-creators?page=${pageNum}&size=20&status=${status}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = res.data.data;
            const newProperties = data.content || [];

            if (pageNum === 0) {
                setProperties(newProperties);
                setStats({
                    total: data.totalElements || 0,
                    approved: newProperties.filter(p => p.approvalStatus === 'APPROVED').length || 0,
                    pending: newProperties.filter(p => p.approvalStatus === 'PENDING').length || 0
                });
            } else {
                setProperties(prev => [...prev, ...newProperties]);
            }

            setTotalPages(data.totalPages || 0);
            setPage(pageNum);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProperties(0, filterStatus);
        }, [filterStatus])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchProperties(0, filterStatus, true);
    };

    const loadMore = () => {
        if (!loadingMore && page < totalPages - 1) {
            setLoadingMore(true);
            fetchProperties(page + 1, filterStatus);
        }
    };

    // Client-side filtering for specific text searches
    const filteredProperties = properties.filter(prop =>
        [
            prop.title, prop.city, prop.address, prop.pincode,
            prop.creator?.name, prop.creator?.email, prop.contact?.name, prop.contact?.phone
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
    );

    const formatPrice = (price) => {
        if (!price) return "N/A";
        const priceNum = Number(price);
        if (priceNum >= 10000000) return `₹${(priceNum / 10000000).toFixed(2)}Cr`;
        if (priceNum >= 100000) return `₹${(priceNum / 100000).toFixed(2)}L`;
        return `₹${priceNum.toLocaleString()}`;
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Stats Row */}
            <View style={styles.statsRow}>
                <StatCard
                    title="Total" count={stats.total} icon="home" colors={colors} delay={100} isDarkMode={isDarkMode}
                    bgColors={{ bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a', textDim: '#3b82f6', icon: '#2563eb', iconBg: '#dbeafe' }}
                />
                <StatCard
                    title="Approved" count={stats.approved} icon="checkmark-circle" colors={colors} delay={200} isDarkMode={isDarkMode}
                    bgColors={{ bg: '#f0fdf4', border: '#bbf7d0', text: '#14532d', textDim: '#22c55e', icon: '#16a34a', iconBg: '#dcfce7' }}
                />
                <StatCard
                    title="Pending" count={stats.pending} icon="time" colors={colors} delay={300} isDarkMode={isDarkMode}
                    bgColors={{ bg: '#fffbeb', border: '#fef08a', text: '#78350f', textDim: '#eab308', icon: '#d97706', iconBg: '#fef3c7' }}
                />
            </View>

            {/* Search & Filter */}
            <View style={[styles.searchFilterContainer, { backgroundColor: colors.surface }]}>
                <View style={[styles.searchBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6' }]}>
                    <Ionicons name="search" size={20} color={colors.textDim} style={{ marginHorizontal: 12 }} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search properties, creators..."
                        placeholderTextColor={colors.textDim}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchTerm('')} style={{ padding: 8 }}>
                            <Ionicons name="close-circle" size={18} color={colors.textDim} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Status Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
                    {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map((status) => {
                        const isSelected = filterStatus === status;
                        return (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.tab,
                                    { backgroundColor: isSelected ? colors.primary : (isDarkMode ? colors.surfaceDeeper : '#f3f4f6') },
                                    isSelected && styles.tabSelected
                                ]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setFilterStatus(status);
                                    setPage(0);
                                }}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: isSelected ? '#fff' : colors.textDim },
                                    isSelected && styles.tabTextSelected
                                ]}>
                                    {status === 'ALL' ? 'All Status' : status}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );

    const renderItem = ({ item, index }) => (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index < 10 ? index * 50 : 0 }}
        >
            <TouchableOpacity
                style={[styles.propertyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('AdminPropertyDetails', { property: item })}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <Text style={[styles.propId, { color: colors.textDim }]}>#{item.propertyId}</Text>
                    <StatusBadge status={item.approvalStatus} />
                </View>

                <View style={styles.cardBody}>
                    <Image
                        source={item.mainImageUrl ? { uri: item.mainImageUrl } : require('../../assets/julogo.png')}
                        style={styles.propImage}
                    />
                    <View style={styles.propInfo}>
                        <Text style={[styles.propTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>

                        <View style={styles.propMetaRow}>
                            <View style={styles.metaItem}>
                                <Ionicons name="pricetag" size={14} color="#059669" />
                                <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="location" size={14} color={colors.textDim} />
                                <Text style={[styles.metaText, { color: colors.textDim }]} numberOfLines={1}>
                                    {item.city}, {item.state}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.creatorRow}>
                            <View style={styles.creatorInfo}>
                                <Ionicons name="person-circle" size={16} color="#3b82f6" />
                                <Text style={[styles.creatorText, { color: colors.textDim }]} numberOfLines={1}>
                                    {item.creator?.name || 'Unknown User'}
                                </Text>
                            </View>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{item.creator?.role || 'USER'}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </MotiView>
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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>All Properties</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading && page === 0 ? (
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredProperties}
                    keyExtractor={(item) => item.propertyId.toString()}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() => loadingMore ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : null}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyState}>
                            <Ionicons name="home-outline" size={64} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.text }]}>No properties found</Text>
                            <Text style={[styles.emptySub, { color: colors.textDim }]}>Try adjusting your search or filters.</Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    headerTitleWrap: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold' },
    centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingBottom: 100 },
    headerContainer: { padding: 16 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
    statCard: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1 },
    statContent: { flexDirection: 'column', gap: 8 },
    statTitle: { fontSize: 13, fontFamily: 'Outfit_500Medium', marginBottom: 2 },
    statCount: { fontSize: 22, fontFamily: 'Outfit_700Bold' },
    statIconWrap: { alignSelf: 'flex-start', padding: 6, borderRadius: 10 },
    searchFilterContainer: { borderRadius: 16, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 46 },
    searchInput: { flex: 1, height: '100%', fontFamily: 'Outfit_400Regular', fontSize: 15 },
    tabsScroll: { marginTop: 12 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    tabSelected: {},
    tabText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
    propertyCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    propId: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontFamily: 'Outfit_700Bold', letterSpacing: 0.5 },
    cardBody: { flexDirection: 'row', gap: 12 },
    propImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#e5e7eb' },
    propInfo: { flex: 1, gap: 4 },
    propTitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', lineHeight: 20 },
    propMetaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    priceText: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#059669' },
    metaText: { fontSize: 12, fontFamily: 'Outfit_500Medium', flex: 1 },
    creatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    creatorText: { fontSize: 12, fontFamily: 'Outfit_500Medium' },
    roleBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    roleText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#4338ca' },
    footerLoader: { padding: 20 },
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    emptyText: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginTop: 16 },
    emptySub: { fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 8 }
});
