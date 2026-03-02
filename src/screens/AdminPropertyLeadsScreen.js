import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Platform, RefreshControl, TextInput, ScrollView, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ThemeContext } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const BASE_API = 'https://api.jharkhandbiharupdates.com/api/v1';

const StatCard = ({ title, count, subtext, icon, colors, delay, isDarkMode, bgColors }) => (
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
            <View style={{ flex: 1 }}>
                <Text style={[styles.statTitle, { color: isDarkMode ? colors.textDim : bgColors.textDim }]}>{title}</Text>
                <Text style={[styles.statCount, { color: isDarkMode ? colors.text : bgColors.text }]}>{count}</Text>
                <Text style={[styles.statSubText, { color: isDarkMode ? colors.textDim : bgColors.textDim }]}>{subtext}</Text>
            </View>
            <View style={[styles.statIconWrap, { backgroundColor: isDarkMode ? colors.surfaceDeeper : bgColors.iconBg }]}>
                <Ionicons name={icon} size={28} color={bgColors.icon} />
            </View>
        </View>
    </MotiView>
);

const InquiryStatusBadge = ({ status }) => {
    let style = { bg: '#f3f4f6', text: '#374151', icon: 'ellipse' };
    if (status === 'NEW') style = { bg: '#dcfce7', text: '#15803d', icon: 'alert-circle' };
    if (status === 'CLICKED') style = { bg: '#fef08a', text: '#a16207', icon: 'eye' };
    if (status === 'CONTACTED') style = { bg: '#dbeafe', text: '#1d4ed8', icon: 'call' };
    if (status === 'INTERESTED') style = { bg: '#f3e8ff', text: '#7e22ce', icon: 'trending-up' };
    if (status === 'NOT_INTERESTED') style = { bg: '#f1f5f9', text: '#475569', icon: 'close-outline' };
    if (status === 'CLOSED') style = { bg: '#fee2e2', text: '#b91c1c', icon: 'checkmark-done' };

    return (
        <View style={[styles.statusBadge, { backgroundColor: style.bg, borderColor: style.text }]}>
            <Ionicons name={style.icon} size={12} color={style.text} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: style.text }]}>{status.replace('_', ' ')}</Text>
        </View>
    );
};

export default function AdminPropertyLeadsScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);

    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // API State
    const [stats, setStats] = useState({ newCount: 0, clickedCount: 0 });
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal State
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);

    const fetchInquiries = async (pageNum = 0, status = filterStatus, isRefresh = false) => {
        try {
            if (pageNum === 0 && !isRefresh) setLoading(true);
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');

            let endpoint = `${BASE_API}/admin/inquiries?page=${pageNum}&size=20`;
            if (status !== 'ALL') {
                endpoint = `${BASE_API}/admin/inquiries/status/${status}?page=${pageNum}&size=20`;
            }

            const res = await axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });

            const data = res.data.data;
            const newInquiries = data.content || [];

            if (pageNum === 0) {
                setInquiries(newInquiries);
            } else {
                setInquiries(prev => [...prev, ...newInquiries]);
            }

            setTotalPages(data.totalPages || 0);
            setPage(pageNum);
        } catch (error) {
            console.error("Fetch inquiries error:", error);
            Alert.alert("Error", "Failed to fetch property leads.");
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const res = await axios.get(`${BASE_API}/admin/inquiries/counts`, { headers: { Authorization: `Bearer ${token}` } });
            setStats(res.data.data || { newCount: 0, clickedCount: 0 });
        } catch (error) {
            console.error("Fetch stats error:", error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStats();
            fetchInquiries(0, filterStatus);
        }, [filterStatus])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
        fetchInquiries(0, filterStatus, true);
    };

    const loadMore = () => {
        if (!loadingMore && page < totalPages - 1) {
            setLoadingMore(true);
            fetchInquiries(page + 1, filterStatus);
        }
    };

    const handleStatusUpdate = async (status) => {
        if (!selectedInquiry) return;
        try {
            setActionLoading(true);
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            await axios.put(
                `${BASE_API}/admin/inquiries/${selectedInquiry.id}/status`,
                { status: status },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowStatusModal(false);
            fetchStats();
            // Optimistic Update
            setInquiries(prev => prev.map(inq => inq.id === selectedInquiry.id ? { ...inq, status } : inq));
            setSelectedInquiry(null);
        } catch (error) {
            console.error("Update status error:", error);
            Alert.alert("Error", "Failed to update status.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            "Delete Inquiry",
            "Are you sure you want to delete this property inquiry? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
                            await axios.delete(`${BASE_API}/admin/inquiries/${id}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            fetchStats();
                            setInquiries(prev => prev.filter(inq => inq.id !== id));
                        } catch (error) {
                            console.error("Delete inquiry error:", error);
                            Alert.alert("Error", "Failed to delete inquiry.");
                        }
                    }
                }
            ]
        );
    };

    const exportToCSV = async () => {
        if (inquiries.length === 0) {
            Alert.alert("No Data", "There are no inquiries to export.");
            return;
        }

        const csvRows = [
            ["ID", "User Name", "User Email", "Phone", "Property", "Status", "Date"]
        ];

        filteredInquiries.forEach(inq => {
            csvRows.push([
                inq.id,
                `"${inq.userName || "N/A"}"`,
                `"${inq.userEmail || "N/A"}"`,
                `"${inq.phoneNumber || "Not Provided"}"`,
                `"${inq.propertyTitle || "N/A"}"`,
                inq.status,
                new Date(inq.createdAt).toLocaleDateString()
            ]);
        });

        const csvString = csvRows.map(row => row.join(",")).join("\n");
        const fileName = `property-inquiries-${new Date().toISOString().split('T')[0]}.csv`;

        if (Platform.OS === 'web') {
            const blob = new Blob([csvString], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
        } else {
            try {
                const fileUri = FileSystem.documentDirectory + fileName;
                await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: 'utf8' });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri);
                } else {
                    Alert.alert("Info", "Sharing is not available on this device");
                }
            } catch (error) {
                console.error("CSV Export error", error);
                Alert.alert("Error", "Could not export CSV file.");
            }
        }
    };

    const filteredInquiries = inquiries.filter(inq =>
        [
            inq.userName, inq.userEmail, inq.phoneNumber, inq.propertyTitle
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Stats Row */}
            <View style={styles.statsRow}>
                <StatCard
                    title="New Inquiries" count={stats.newCount} subtext="With phone info" icon="people" colors={colors} delay={100} isDarkMode={isDarkMode}
                    bgColors={{ bg: '#f0fdf4', border: '#bbf7d0', text: '#14532d', textDim: '#22c55e', icon: '#16a34a', iconBg: '#dcfce7' }}
                />
                <StatCard
                    title="Just Clicked" count={stats.clickedCount} subtext="No phone yet" icon="eye" colors={colors} delay={200} isDarkMode={isDarkMode}
                    bgColors={{ bg: '#fffbeb', border: '#fef08a', text: '#78350f', textDim: '#eab308', icon: '#d97706', iconBg: '#fef3c7' }}
                />
                <StatCard
                    title="Total Leads" count={stats.newCount + stats.clickedCount} subtext="All inquiries" icon="document-text" colors={colors} delay={300} isDarkMode={isDarkMode}
                    bgColors={{ bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a', textDim: '#3b82f6', icon: '#2563eb', iconBg: '#dbeafe' }}
                />
            </View>

            {/* Search & Filter */}
            <View style={[styles.searchFilterContainer, { backgroundColor: colors.surface }]}>
                <View style={styles.actionRow}>
                    <View style={[styles.searchBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6', flex: 1 }]}>
                        <Ionicons name="search" size={20} color={colors.textDim} style={{ marginHorizontal: 12 }} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Search user or property..."
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
                    <TouchableOpacity
                        style={[styles.exportBtn, { backgroundColor: '#16a34a' }]}
                        onPress={exportToCSV}
                    >
                        <Ionicons name="download-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Status Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
                    {['ALL', 'NEW', 'CLICKED', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'CLOSED'].map((status) => {
                        const isSelected = filterStatus === status;
                        return (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.tab,
                                    { backgroundColor: isSelected ? colors.primary : (isDarkMode ? colors.surfaceDeeper : '#f3f4f6') },
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
                                ]}>
                                    {status === 'ALL' ? 'All Status' : status.replace('_', ' ')}
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
            style={[styles.inquiryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
            <View style={styles.cardHeader}>
                <Text style={[styles.inquiryId, { color: colors.textDim }]}>#{item.id}</Text>
                <InquiryStatusBadge status={item.status} />
            </View>

            <View style={styles.cardBody}>
                <View style={styles.userDetails}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.avatarText}>
                            {item.userName ? item.userName.substring(0, 2).toUpperCase() : 'NA'}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{item.userName || 'No Name'}</Text>
                        <Text style={[styles.userEmail, { color: colors.textDim }]} numberOfLines={1}>{item.userEmail || 'No Email'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <Ionicons name="business" size={16} color="#6b7280" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={2}>{item.propertyTitle || 'N/A'}</Text>
                        {(item.propertyCity && item.propertyState) && (
                            <Text style={[styles.propertyLocation, { color: colors.textDim }]}>{item.propertyCity}, {item.propertyState}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="call" size={16} color="#6b7280" />
                    {item.phoneNumber ? (
                        <Text style={[styles.phoneText, { color: '#2563eb' }]}>{item.phoneNumber}</Text>
                    ) : (
                        <Text style={[styles.phoneText, { color: colors.textDim, fontStyle: 'italic' }]}>Not provided yet</Text>
                    )}
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="calendar" size={16} color="#6b7280" />
                    <Text style={[styles.dateText, { color: colors.textDim }]}>
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>

            <View style={[styles.cardFooter, { borderTopColor: isDarkMode ? colors.border : '#f3f4f6' }]}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#dbeafe', borderColor: '#bfdbfe' }]}
                    onPress={() => {
                        setSelectedInquiry(item);
                        setShowStatusModal(true);
                    }}
                >
                    <Ionicons name="chatbubbles" size={18} color="#2563eb" />
                    <Text style={[styles.actionBtnText, { color: '#2563eb' }]}>Update Status</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: '#fee2e2' }]}
                    onPress={() => handleDelete(item.id)}
                >
                    <Ionicons name="trash" size={18} color="#dc2626" />
                </TouchableOpacity>
            </View>
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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Property Leads</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading && page === 0 ? (
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredInquiries}
                    keyExtractor={(item) => item.id.toString()}
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
                            <Ionicons name="document-text-outline" size={64} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.text }]}>No inquiries found</Text>
                            <Text style={[styles.emptySub, { color: colors.textDim }]}>Try adjusting your filters.</Text>
                        </View>
                    )}
                />
            )}

            {/* Status Update Modal */}
            <Modal visible={showStatusModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDarkMode ? colors.surface : '#fff' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Update Status</Text>
                            <TouchableOpacity onPress={() => setShowStatusModal(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.textDim} />
                            </TouchableOpacity>
                        </View>

                        {selectedInquiry && (
                            <View style={[styles.modalInquiryInfo, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6' }]}>
                                <Text style={styles.modalLabel}>User:</Text>
                                <Text style={[styles.modalValue, { color: colors.text }]}>{selectedInquiry.userName || 'No Name'}</Text>
                                <Text style={[styles.modalLabel, { marginTop: 8 }]}>Property:</Text>
                                <Text style={[styles.modalValue, { color: colors.text }]}>{selectedInquiry.propertyTitle || 'N/A'}</Text>
                            </View>
                        )}

                        <View style={styles.statusOptionsContainer}>
                            {["NEW", "CONTACTED", "INTERESTED", "NOT_INTERESTED", "CLOSED"].map((status) => {
                                const isActive = selectedInquiry?.status === status;
                                return (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            styles.statusOptionBtn,
                                            {
                                                backgroundColor: isActive ? '#dcfce7' : (isDarkMode ? colors.surfaceDeeper : '#fff'),
                                                borderColor: isActive ? '#22c55e' : (isDarkMode ? colors.border : '#e5e7eb')
                                            }
                                        ]}
                                        onPress={() => handleStatusUpdate(status)}
                                        disabled={actionLoading}
                                    >
                                        <Text style={[
                                            styles.statusOptionText,
                                            { color: isActive ? '#15803d' : colors.text }
                                        ]}>
                                            {status.replace('_', ' ')}
                                        </Text>
                                        {isActive && <Ionicons name="checkmark-circle" size={20} color="#15803d" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {actionLoading && (
                            <View style={styles.actionLoader}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={{ marginLeft: 8, color: colors.textDim }}>Updating...</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    headerTitleWrap: { flex: 1, paddingHorizontal: 16 },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold' },
    centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingBottom: 100 },
    headerContainer: { padding: 16 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
    statCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
    statContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    statTitle: { fontSize: 13, fontFamily: 'Outfit_500Medium', marginBottom: 4 },
    statCount: { fontSize: 24, fontFamily: 'Outfit_700Bold' },
    statSubText: { fontSize: 10, fontFamily: 'Outfit_400Regular', marginTop: 4 },
    statIconWrap: { padding: 8, borderRadius: 12 },
    searchFilterContainer: { borderRadius: 16, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    actionRow: { flexDirection: 'row', gap: 8 },
    searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 46 },
    searchInput: { flex: 1, height: '100%', fontFamily: 'Outfit_400Regular', fontSize: 15 },
    exportBtn: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    tabsScroll: { marginTop: 12 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    tabText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
    inquiryCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    inquiryId: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    statusText: { fontSize: 10, fontFamily: 'Outfit_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
    cardBody: { gap: 12 },
    userDetails: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold' },
    userName: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', marginBottom: 2 },
    userEmail: { fontSize: 13, fontFamily: 'Outfit_400Regular' },
    divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    propertyTitle: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', lineHeight: 20 },
    propertyLocation: { fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 2 },
    phoneText: { fontSize: 14, fontFamily: 'Outfit_500Medium' },
    dateText: { fontSize: 13, fontFamily: 'Outfit_500Medium' },
    cardFooter: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 10, borderWidth: 1 },
    actionBtnText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', marginLeft: 8 },
    iconBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    footerLoader: { padding: 20 },
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    emptyText: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginTop: 16 },
    emptySub: { fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 8 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold' },
    closeBtn: { padding: 4 },
    modalInquiryInfo: { padding: 16, borderRadius: 12, marginBottom: 24 },
    modalLabel: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#6b7280', marginBottom: 2 },
    modalValue: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
    statusOptionsContainer: { gap: 12 },
    statusOptionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 2 },
    statusOptionText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
    actionLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 }
});
