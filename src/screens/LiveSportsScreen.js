import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
    Dimensions, RefreshControl, Modal, FlatList, Image, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Video, ResizeMode } from 'expo-av';
import Svg, { Path } from 'react-native-svg';
import { ThemeContext } from '../context/ThemeContext';
import TopHeader from '../components/TopHeader';
import {
    startTracking,
    stopTracking,
    isTracking,
} from '../services/ScoreNotificationService';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Local video assets (dark BG videos blend in on dark container)
const VIDEOS = {
    cricket: require('../../assets/videos/cricket.mp4'),
    football: require('../../assets/videos/football.mp4'),
};

// Looping muted sport video widget
const SportVideo = ({ sport, size = 80, bgColor = '#121212' }) => (
    <View style={{ width: size, height: size, backgroundColor: bgColor, borderRadius: size / 2, overflow: 'hidden' }}>
        <Video
            source={VIDEOS[sport]}
            style={{ width: size, height: size }}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted
            shouldPlay
            useNativeControls={false}
        />
    </View>
);

const RAPID_API_KEY = '85b090fb5amshd3e775797ef9765p148b69jsnbc269bf67b6a';
const RAPID_API_HOST = 'cricbuzz-cricket.p.rapidapi.com';
const BASE_URL = 'https://cricbuzz-cricket.p.rapidapi.com';

const apiHeaders = {
    'x-rapidapi-key': RAPID_API_KEY,
    'x-rapidapi-host': RAPID_API_HOST,
};

// ─── Team flag / badge lookup ────────────────────
// Returns a flag emoji for international teams, or a colored short-name badge for clubs
const COUNTRY_FLAGS = {
    'india': '🇮🇳', 'australia': '🇦🇺', 'england': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'pakistan': '🇵🇰', 'south africa': '🇿🇦', 'new zealand': '🇳🇿',
    'west indies': '🇼🇮', 'sri lanka': '🇱🇰', 'bangladesh': '🇧🇩',
    'afghanistan': '🇦🇫', 'zimbabwe': '🇿🇼', 'ireland': '🇮🇪',
    'united states': '🇺🇸', 'usa': '🇺🇸', 'scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'netherlands': '🇳🇱', 'namibia': '🇳🇦', 'oman': '🇴🇲',
    'nepal': '🇳🇵', 'uae': '🇦🇪', 'kenya': '🇰🇪',
    'canada': '🇨🇦', 'hong kong': '🇭🇰', 'singapore': '🇸🇬',
    'png': '🇵🇬', 'papua new guinea': '🇵🇬', 'bermuda': '🇧🇲',
};
const IPL_FLAGS = {
    'mumbai indians': { bg: '#004BA0', short: 'MI' },
    'chennai super kings': { bg: '#F9CD05', short: 'CSK', textColor: '#000' },
    'royal challengers': { bg: '#C8102E', short: 'RCB' },
    'kolkata knight riders': { bg: '#3A225D', short: 'KKR' },
    'delhi capitals': { bg: '#0064B0', short: 'DC' },
    'sunrisers hyderabad': { bg: '#F7A721', short: 'SRH', textColor: '#000' },
    'rajasthan royals': { bg: '#EA1A85', short: 'RR' },
    'punjab kings': { bg: '#ED1F27', short: 'PBKS' },
    'lucknow super giants': { bg: '#A4C8E1', short: 'LSG', textColor: '#000' },
    'gujarat titans': { bg: '#1C2B58', short: 'GT' },
};

const TeamFlag = ({ teamName = '', size = 26 }) => {
    const key = teamName.toLowerCase();
    // Try to match country flag
    const flag = COUNTRY_FLAGS[key] ||
        Object.entries(COUNTRY_FLAGS).find(([k]) => key.includes(k))?.[1];
    if (flag) return <Text style={{ fontSize: size - 4 }}>{flag}</Text>;
    // Try IPL / franchise club
    const iplEntry = Object.entries(IPL_FLAGS).find(([k]) => key.includes(k));
    if (iplEntry) {
        const [, ipl] = iplEntry;
        return (
            <View style={{
                width: size, height: size, borderRadius: 6,
                backgroundColor: ipl.bg, alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 2,
            }}>
                <Text style={{ fontSize: 7, fontFamily: 'Outfit_700Bold', color: ipl.textColor || '#fff' }} numberOfLines={1}>{ipl.short}</Text>
            </View>
        );
    }
    // Generic bat icon fallback
    return <Text style={{ fontSize: size - 4 }}>🏏</Text>;
};

// ─── Status color map ───────────────────────────
const getStatusColor = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('live') || s.includes('in progress')) return '#22c55e';
    if (s.includes('won') || s.includes('complete')) return '#3b82f6';
    if (s.includes('upcoming') || s.includes('yet')) return '#f59e0b';
    return '#6b7280';
};

const getMatchTypeLabel = (matchType) => {
    const t = (matchType || '').toUpperCase();
    if (t.includes('TEST')) return 'TEST';
    if (t.includes('ODI')) return 'ODI';
    if (t.includes('T20')) return 'T20';
    if (t.includes('IPL')) return 'IPL';
    return matchType || 'MATCH';
};

const matchTypeColor = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('TEST')) return ['#7c3aed', '#a855f7'];
    if (t.includes('ODI')) return ['#0369a1', '#0ea5e9'];
    if (t.includes('T20') || t.includes('IPL')) return ['#b45309', '#f59e0b'];
    return ['#333333', '#6b7280'];
};

// ─── Skeleton Card ───────────────────────────────
const SkeletonCard = ({ isDarkMode }) => {
    const bg = isDarkMode ? '#1E1E1E' : '#f3f4f6';
    const shimmer = isDarkMode ? '#333333' : '#e5e7eb';
    return (
        <MotiView
            from={{ opacity: 0.4 }} animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 900, loop: true }}
            style={[sk.card, { backgroundColor: bg }]}
        >
            <View style={sk.topRow}>
                <View style={[sk.badge, { backgroundColor: shimmer }]} />
                <View style={[sk.status, { backgroundColor: shimmer }]} />
            </View>
            <View style={sk.teamRow}>
                <View style={[sk.teamName, { backgroundColor: shimmer }]} />
                <View style={[sk.score, { backgroundColor: shimmer }]} />
            </View>
            <View style={[sk.teamRow, { marginTop: 6 }]}>
                <View style={[sk.teamName, { width: '50%', backgroundColor: shimmer }]} />
                <View style={[sk.score, { width: 60, backgroundColor: shimmer }]} />
            </View>
            <View style={[sk.status, { width: '70%', marginTop: 12, backgroundColor: shimmer }]} />
        </MotiView>
    );
};
const sk = StyleSheet.create({
    card: { backgroundColor: '#f3f4f6', borderRadius: 20, padding: 18, marginBottom: 14, gap: 8 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between' },
    badge: { width: 50, height: 18, backgroundColor: '#e5e7eb', borderRadius: 6 },
    status: { width: 80, height: 14, backgroundColor: '#e5e7eb', borderRadius: 4 },
    teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    teamName: { width: '60%', height: 16, backgroundColor: '#e5e7eb', borderRadius: 4 },
    score: { width: 80, height: 20, backgroundColor: '#e5e7eb', borderRadius: 6 },
});

// ─── Match Card ──────────────────────────────────
const MatchCard = ({ match, onPress, isDarkMode, colors }) => {
    const matchId = String(match.id || match.matchInfo?.matchId || '');
    const [tracking, setTracking] = useState(() => isTracking(matchId));
    const typeColors = matchTypeColor(match.matchType);
    const statusColor = getStatusColor(match.status);
    const isLive = (match.status || '').toLowerCase().includes('live') ||
        (match.matchInfo?.state || '').toLowerCase() === 'in progress';

    const t1 = match.team1 || match.matchInfo?.team1 || {};
    const t2 = match.team2 || match.matchInfo?.team2 || {};
    const score1 = match.score1 || match.teamScore?.team1score || null;
    const score2 = match.score2 || match.teamScore?.team2score || null;
    const venue = match.venue || match.matchInfo?.groundName || '';
    const series = match.series || match.seriesName || '';
    const status = match.status || match.matchInfo?.status || '';

    const formatScore = (sc) => {
        if (!sc?.inngsScore) return null;
        const inns = sc.inngsScore;
        if (!inns?.length) return null;
        const latest = inns[inns.length - 1];
        return `${latest.runs}/${latest.wickets}`;
    };
    const formatOvers = (sc) => {
        if (!sc?.inngsScore?.length) return null;
        const latest = sc.inngsScore[sc.inngsScore.length - 1];
        return `(${latest.overs} ov)`;
    };

    const sc1Display = score1 ? formatScore(score1) : null;
    const sc2Display = score2 ? formatScore(score2) : null;

    const formatStatusToIST = (statusStr = '', epochMs) => {
        let s = statusStr;
        if (s.toUpperCase().includes('GMT')) {
            if (epochMs) {
                const d = new Date(Number(epochMs));
                const istTime = d.toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit', minute: '2-digit', hour12: true
                });
                return s.replace(/.*GMT/gi, `at ${istTime} IST`);
            }
            return s.replace(/GMT/gi, 'IST');
        }
        return s;
    };

    const displayStatus = formatStatusToIST(status, match.matchInfo?.startDate);

    const handleBellPress = async () => {
        if (!matchId) return;
        if (tracking) {
            await stopTracking(matchId);
            setTracking(false);
        } else {
            const ok = await startTracking(match);
            if (ok === false) {
                Alert.alert(
                    'Permission Required',
                    'Please allow notifications in Settings to track live scores.',
                );
            } else {
                setTracking(true);
            }
        }
    };

    return (
        <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[mc.card, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff', borderColor: isLive ? '#22c55e' : (isDarkMode ? '#334155' : '#f0f0f0'), borderWidth: isLive ? 1.5 : 1 }]}>
            {isLive && (
                <MotiView
                    from={{ opacity: 0.4 }} animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 700, loop: true }}
                    style={mc.livePulse}
                />
            )}

            {/* Header row */}
            <View style={mc.headerRow}>
                <View style={[mc.typeBadge, { backgroundColor: typeColors[0] }]}>
                    <Text style={mc.typeTxt}>{getMatchTypeLabel(match.matchType)}</Text>
                </View>
                {series ? <Text style={[mc.seriesTxt, { color: isDarkMode ? '#94a3b8' : '#6b7280' }]} numberOfLines={1}>{series}</Text> : null}
                <View style={[mc.statusDot, { backgroundColor: statusColor }]} />
            </View>

            {/* Team 1 */}
            <View style={mc.teamRow}>
                <View style={mc.teamLeft}>
                    <TeamFlag teamName={t1.teamName || t1.name || ''} size={28} />
                    <Text style={[mc.teamName, { color: isDarkMode ? '#f1f5f9' : '#111827' }]} numberOfLines={1}>{t1.teamName || t1.name || 'Team A'}</Text>
                    {match.battingTeam === t1.teamId && <View style={mc.batIcon} />}
                </View>
                {sc1Display ? (
                    <View style={mc.scoreBox}>
                        <Text style={[mc.scoreMain, { color: isDarkMode ? '#f8fafc' : '#111827' }]}>{sc1Display}</Text>
                        <Text style={[mc.scoreOvers, { color: isDarkMode ? '#64748b' : '#6b7280' }]}>{formatOvers(score1)}</Text>
                    </View>
                ) : <Text style={mc.vsText}>vs</Text>}
            </View>

            {/* Team 2 */}
            <View style={[mc.teamRow, { marginTop: 8 }]}>
                <View style={mc.teamLeft}>
                    <TeamFlag teamName={t2.teamName || t2.name || ''} size={28} />
                    <Text style={[mc.teamName, { color: isDarkMode ? '#f1f5f9' : '#111827' }]} numberOfLines={1}>{t2.teamName || t2.name || 'Team B'}</Text>
                    {match.battingTeam === t2.teamId && <View style={mc.batIcon} />}
                </View>
                {sc2Display ? (
                    <View style={mc.scoreBox}>
                        <Text style={[mc.scoreMain, { color: isDarkMode ? '#f8fafc' : '#111827' }]}>{sc2Display}</Text>
                        <Text style={[mc.scoreOvers, { color: isDarkMode ? '#64748b' : '#6b7280' }]}>{formatOvers(score2)}</Text>
                    </View>
                ) : null}
            </View>

            {/* Divider */}
            <View style={[mc.divider, { backgroundColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]} />

            {/* Footer */}
            <View style={mc.footer}>
                <View style={mc.statusRow}>
                    <View style={[mc.statusDot2, { backgroundColor: statusColor }]} />
                    <Text style={[mc.statusTxt, { color: statusColor }]} numberOfLines={2}>{displayStatus}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Bell button */}
                    <TouchableOpacity
                        onPress={handleBellPress}
                        style={[mc.bellBtn, tracking && mc.bellBtnActive]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons
                            name={tracking ? 'notifications' : 'notifications-outline'}
                            size={15}
                            color={tracking ? '#fff' : '#006A4E'}
                        />
                    </TouchableOpacity>
                    <View style={[mc.scoreCardBtn, { backgroundColor: isDarkMode ? '#2C2C2C' : '#eff6ff' }]}>
                        <Text style={mc.scoreCardTxt}>Scorecard</Text>
                        <Ionicons name="chevron-forward" size={12} color="#3b82f6" />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};
const mc = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden' },
    liveCard: { borderColor: '#bbf7d0', borderWidth: 1.5 },
    livePulse: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#22c55e', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    typeTxt: { color: '#fff', fontSize: 10, fontFamily: 'Outfit_700Bold', letterSpacing: 0.5 },
    seriesTxt: { flex: 1, fontSize: 11, fontFamily: 'Outfit_500Medium', color: '#6b7280' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 'auto' },
    teamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    teamLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    teamFlag: { fontSize: 20 },
    teamName: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#111827', flex: 1 },
    batIcon: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' },
    scoreBox: { alignItems: 'flex-end' },
    scoreMain: { fontSize: 18, fontFamily: 'Outfit_800ExtraBold', color: '#111827' },
    scoreOvers: { fontSize: 11, fontFamily: 'Outfit_400Regular', color: '#6b7280' },
    vsText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#d1d5db' },
    divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
    footer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flex: 1 },
    statusDot2: { width: 7, height: 7, borderRadius: 3.5, marginTop: 3, flexShrink: 0 },
    statusTxt: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', flex: 1, lineHeight: 18 },
    scoreCardBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    scoreCardTxt: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#3b82f6' },
    bellBtn: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#ecfdf5',
        borderWidth: 1, borderColor: '#6ee7b7',
        alignItems: 'center', justifyContent: 'center',
    },
    bellBtnActive: {
        backgroundColor: '#006A4E',
        borderColor: '#006A4E',
    },
});

// ─── Scorecard Modal ─────────────────────────────
const ScorecardModal = ({ visible, matchId, matchTitle, onClose, isDarkMode }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeInnings, setActiveInnings] = useState(0);
    const [activeTab, setActiveTab] = useState('batting');

    useEffect(() => {
        if (visible && matchId) {
            setLoading(true); setData(null); setActiveInnings(0); setActiveTab('batting');
            fetch(`${BASE_URL}/mcenter/v1/${matchId}/hscard`, { headers: apiHeaders })
                .then(r => r.json())
                .then(d => { setData(d); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [visible, matchId]);

    const innings = data?.scorecard || [];
    const currentInnings = innings[activeInnings];

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View style={sm.overlay}>
                <TouchableOpacity style={sm.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[sm.sheet, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff', height: SCREEN_HEIGHT * 0.9 }]}>
                    {/* Handle */}
                    <View style={[sm.handle, { backgroundColor: isDarkMode ? '#475569' : '#d1d5db' }]} />

                    {/* Header */}
                    <View style={[sm.header, { backgroundColor: '#2C2C2C' }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={sm.headerTitle} numberOfLines={2}>{matchTitle || 'Scorecard'}</Text>
                            {data?.status ? <Text style={sm.headerStatus}>{data.status}</Text> : null}
                        </View>
                        <TouchableOpacity onPress={onClose} style={sm.closeBtn}>
                            <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={sm.loadingBox}>
                            <ActivityIndicator size="large" color="#059669" />
                            <Text style={[sm.loadingTxt, { color: isDarkMode ? '#94a3b8' : '#6b7280' }]}>Loading scorecard...</Text>
                        </View>
                    ) : !data || innings.length === 0 ? (
                        <View style={sm.emptyBox}>
                            <Ionicons name="information-circle-outline" size={48} color={isDarkMode ? '#475569' : '#d1d5db'} />
                            <Text style={[sm.emptyTxt, { color: isDarkMode ? '#64748b' : '#9ca3af' }]}>No scorecard available yet</Text>
                        </View>
                    ) : (
                        <>
                            {/* Innings tabs */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[sm.inningsTabs, { borderBottomColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
                                {innings.map((inn, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[sm.innTab, { backgroundColor: isDarkMode ? '#121212' : '#f3f4f6' }, activeInnings === idx && sm.innTabActive]}
                                        onPress={() => { setActiveInnings(idx); setActiveTab('batting'); }}
                                    >
                                        <Text style={[sm.innTabTxt, { color: isDarkMode ? '#94a3b8' : '#333333' }, activeInnings === idx && sm.innTabTxtActive]}>
                                            {inn.batteamsname || `Inn ${idx + 1}`} {inn.score}/{inn.wickets}
                                        </Text>
                                        <Text style={[sm.innOvers, activeInnings === idx && { color: '#93c5fd' }]}>({inn.overs} ov)</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Bat/Bowl tabs */}
                            <View style={[sm.tabRow, { borderBottomColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]}>
                                {['batting', 'bowling', 'fow'].map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[sm.tab, activeTab === t && sm.tabActive]}
                                        onPress={() => setActiveTab(t)}
                                    >
                                        <Text style={[sm.tabTxt, { color: isDarkMode ? '#64748b' : '#9ca3af' }, activeTab === t && sm.tabTxtActive]}>
                                            {t === 'batting' ? '🏏 Batting' : t === 'bowling' ? '⚾ Bowling' : '📉 Fall of Wickets'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                                {activeTab === 'batting' && currentInnings?.batsman && (
                                    <View style={[sm.tableWrap, { borderColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]}>
                                        <View style={[sm.tableRow, sm.tableHeader]}>
                                            <Text style={[sm.thTxt, { flex: 2.5 }]}>BATTER</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>R</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>B</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>4s</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>6s</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>SR</Text>
                                        </View>
                                        {currentInnings.batsman.filter(b => b.balls > 0 || b.outdec).map((b, i) => (
                                            <View key={i} style={[sm.tableRow, i % 2 === 0 && { backgroundColor: isDarkMode ? '#121212' : '#f9fafb' }]}>
                                                <View style={{ flex: 2.5 }}>
                                                    <Text style={[sm.playerName, { color: isDarkMode ? '#e2e8f0' : '#111827' }]}>
                                                        {b.name}{b.iscaptain ? ' (c)' : ''}{b.iskeeper ? ' †' : ''}
                                                    </Text>
                                                    {b.outdec ? <Text style={sm.dismissalTxt} numberOfLines={2}>{b.outdec}</Text> : null}
                                                </View>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }, b.outdec === 'not out' && { color: '#16a34a', fontFamily: 'Outfit_700Bold' }]}>{b.runs}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }]}>{b.balls}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }]}>{b.fours}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }]}>{b.sixes}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }]}>{parseFloat(b.strkrate || 0).toFixed(1)}</Text>
                                            </View>
                                        ))}
                                        {currentInnings.extras && (
                                            <View style={[sm.extrasRow, { backgroundColor: isDarkMode ? '#121212' : '#fafafa', borderTopColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]}>
                                                <Text style={[sm.extrasTxt, { color: isDarkMode ? '#64748b' : '#6b7280' }]}>Extras: <Text style={{ fontFamily: 'Outfit_700Bold' }}>{currentInnings.extras.total}</Text>
                                                    {' '}(W:{currentInnings.extras.wides} NB:{currentInnings.extras.noballs} B:{currentInnings.extras.byes} LB:{currentInnings.extras.legbyes})
                                                </Text>
                                            </View>
                                        )}
                                        <View style={sm.totalRow}>
                                            <Text style={sm.totalTxt}>Total</Text>
                                            <Text style={sm.totalScore}>{currentInnings.score}/{currentInnings.wickets} ({currentInnings.overs} ov, RR: {currentInnings.runrate})</Text>
                                        </View>
                                    </View>
                                )}

                                {activeTab === 'bowling' && currentInnings?.bowler && (
                                    <View style={[sm.tableWrap, { borderColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]}>
                                        <View style={[sm.tableRow, sm.tableHeader]}>
                                            <Text style={[sm.thTxt, { flex: 2 }]}>BOWLER</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>O</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>M</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>R</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>W</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>ECO</Text>
                                        </View>
                                        {currentInnings.bowler.map((b, i) => (
                                            <View key={i} style={[sm.tableRow, i % 2 === 0 && { backgroundColor: isDarkMode ? '#121212' : '#f9fafb' }]}>
                                                <Text style={[sm.playerName, { flex: 2, color: isDarkMode ? '#e2e8f0' : '#111827' }]}>{b.name}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }]}>{b.overs}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }]}>{b.maidens}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }]}>{b.runs}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }, b.wickets > 0 && { color: '#16a34a', fontFamily: 'Outfit_700Bold' }]}>{b.wickets}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }]}>{b.economy}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {activeTab === 'fow' && currentInnings?.fow?.fow && (
                                    <View style={[sm.tableWrap, { borderColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]}>
                                        <View style={[sm.tableRow, sm.tableHeader]}>
                                            <Text style={[sm.thTxt, { flex: 0.6 }]}>#</Text>
                                            <Text style={[sm.thTxt, { flex: 2 }]}>BATTER</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>SCORE</Text>
                                            <Text style={[sm.thTxt, sm.thRight]}>OVER</Text>
                                        </View>
                                        {currentInnings.fow.fow.map((f, i) => (
                                            <View key={i} style={[sm.tableRow, i % 2 === 0 && { backgroundColor: isDarkMode ? '#121212' : '#f9fafb' }]}>
                                                <Text style={[sm.tdTxt, { flex: 0.6, color: isDarkMode ? '#475569' : '#6b7280' }]}>{i + 1}</Text>
                                                <Text style={[sm.playerName, { flex: 2, color: isDarkMode ? '#e2e8f0' : '#111827' }]}>{f.batsmanname}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { fontFamily: 'Outfit_700Bold', color: isDarkMode ? '#f1f5f9' : '#333333' }]}>{f.runs}</Text>
                                                <Text style={[sm.tdTxt, sm.tdRight, { color: isDarkMode ? '#cbd5e1' : '#333333' }]}>{f.overnbr}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const sm = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
    handle: { width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
    header: { flexDirection: 'row', alignItems: 'flex-start', padding: 18, paddingTop: 14, gap: 12 },
    headerTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#fff', lineHeight: 22 },
    headerStatus: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#93c5fd', marginTop: 4 },
    closeBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingTxt: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: '#6b7280' },
    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyTxt: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#9ca3af' },
    inningsTabs: { maxHeight: 56, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    innTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
    innTabActive: { backgroundColor: '#2C2C2C' },
    innTabTxt: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#333333' },
    innTabTxtActive: { color: '#fff' },
    innOvers: { fontSize: 10, fontFamily: 'Outfit_400Regular', color: '#6b7280' },
    tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingHorizontal: 6 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#3b82f6' },
    tabTxt: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#9ca3af' },
    tabTxtActive: { color: '#3b82f6', fontFamily: 'Outfit_700Bold' },
    tableWrap: { margin: 14, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
    tableHeader: { backgroundColor: '#2C2C2C' },
    tableRowAlt: { backgroundColor: '#f9fafb' },
    thTxt: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#93c5fd', flex: 1 },
    thRight: { textAlign: 'right', flex: 1 },
    tdTxt: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#333333', flex: 1 },
    tdRight: { textAlign: 'right', flex: 1 },
    playerName: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#111827' },
    dismissalTxt: { fontSize: 10, fontFamily: 'Outfit_400Regular', color: '#6b7280', marginTop: 1 },
    extrasRow: { backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    extrasTxt: { fontSize: 12, fontFamily: 'Outfit_500Medium', color: '#6b7280' },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#121212', paddingHorizontal: 12, paddingVertical: 10 },
    totalTxt: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#fff' },
    totalScore: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#93c5fd' },
});

// ─── Football Coming Soon ─────────────────────────
const FootballComingSoon = ({ colors }) => (
    <View style={fb.container}>
        <MotiView from={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14, delay: 150 }} style={fb.iconBox}>
            <Text style={{ fontSize: 72 }}>⚽</Text>
            <MotiView
                from={{ opacity: 0.3, scale: 0.9 }} animate={{ opacity: 1, scale: 1.1 }}
                transition={{ type: 'timing', duration: 1000, loop: true }}
                style={[fb.pulse, { borderColor: '#22c55e' }]}
            />
        </MotiView>
        <Text style={[fb.title, { color: colors.text }]}>Football is Coming!</Text>
        <Text style={[fb.subtitle, { color: colors.textDim }]}>Live scores, standings, and match updates from Premier League, La Liga, Bundesliga & more — very soon. 🔥</Text>
        <View style={fb.badge}>
            <MotiView from={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 600, loop: true }}>
                <Text style={fb.badgeTxt}>🔔 COMING SOON</Text>
            </MotiView>
        </View>
        <View style={fb.leagueRow}>
            {['🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League', '🇪🇸 La Liga', '🇩🇪 Bundesliga', '🇮🇳 ISL'].map((l, i) => (
                <View key={i} style={fb.leagueChip}>
                    <Text style={fb.leagueChipTxt}>{l}</Text>
                </View>
            ))}
        </View>
    </View>
);
const fb = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },
    iconBox: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(34,197,94,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
    pulse: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 2, opacity: 0.4 },
    title: { fontSize: 26, fontFamily: 'Outfit_800ExtraBold', marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    badge: { backgroundColor: '#166534', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 28 },
    badgeTxt: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 12, letterSpacing: 1.5 },
    leagueRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    leagueChip: { backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#bbf7d0' },
    leagueChipTxt: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#166534' },
});

// ─── MAIN SCREEN ─────────────────────────────────
export default function LiveSportsScreen() {
    const { isDarkMode, colors } = React.useContext(ThemeContext);

    const [activeTab, setActiveTab] = useState('cricket');
    const [matchFilter, setMatchFilter] = useState('live');
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [scorecardMatch, setScorecardMatch] = useState(null);

    const FILTER_TABS = [
        { key: 'live', label: 'Live', icon: 'radio', color: '#22c55e' },
        { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline', color: '#f59e0b' },
        { key: 'recent', label: 'Recent', icon: 'checkmark-circle-outline', color: '#3b82f6' },
    ];

    const fetchMatches = useCallback(async (filter = matchFilter, isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            // Cricbuzz matches/v1/{filter} - live | upcoming | recent
            const res = await fetch(`${BASE_URL}/matches/v1/${filter}`, { headers: apiHeaders });
            const json = await res.json();

            // Cricbuzz response structure: { typeMatches: [{ matchType, seriesMatches: [...] }] }
            const all = [];
            const typeMatches = json.typeMatches || [];
            for (const tm of typeMatches) {
                for (const sm2 of (tm.seriesMatches || [])) {
                    const seriesAdWrapper = sm2.seriesAdWrapper || {};
                    const seriesName = seriesAdWrapper.seriesName || '';
                    const matchesArr = seriesAdWrapper.matches || [];
                    for (const m of matchesArr) {
                        const mi = m.matchInfo || {};
                        const ts = m.matchScore || {};
                        all.push({
                            id: mi.matchId,
                            matchType: mi.matchFormat || tm.matchType || '',
                            series: seriesName,
                            team1: { teamId: mi.team1?.teamId, teamName: mi.team1?.teamName, teamFlag: '' },
                            team2: { teamId: mi.team2?.teamId, teamName: mi.team2?.teamName, teamFlag: '' },
                            score1: ts.team1Score || null,
                            score2: ts.team2Score || null,
                            status: mi.status || '',
                            venue: mi.groundName || '',
                            battingTeam: ts.matchScoreDetails?.inningsScoreList?.[0]?.batTeamId || null,
                            matchInfo: mi,
                            teamScore: { team1score: ts.team1Score, team2score: ts.team2Score },
                        });
                    }
                }
            }
            setMatches(all);
        } catch (e) {
            console.warn('Sports API error:', e.message);
            setMatches([]);
        } finally { setLoading(false); setRefreshing(false); }
    }, [matchFilter]);

    useEffect(() => {
        if (activeTab === 'cricket') fetchMatches(matchFilter);
    }, [activeTab, matchFilter]);

    const handleFilterChange = (f) => {
        setMatchFilter(f);
    };

    const getMatchTitle = (m) => {
        const t1 = m?.team1?.teamName || '';
        const t2 = m?.team2?.teamName || '';
        return t1 && t2 ? `${t1} vs ${t2}` : 'Match';
    };

    const cardBg = isDarkMode ? '#1E1E1E' : '#fff';
    const bgColor = isDarkMode ? '#111827' : '#f8fafc';

    return (
        <SafeAreaView style={[s.container, { backgroundColor: bgColor }]} edges={['top']}>
            <TopHeader />

            {/* === SVG Wave Hero === */}
            <View style={s.heroBanner}>
                {/* Green/dark base fills bottom */}
                {/* Content area at top */}
                <View style={[s.heroContent, { backgroundColor: isDarkMode ? '#121212' : '#fff' }]}>
                    <View style={s.heroLeft}>
                        <View style={[s.heroBadge, { backgroundColor: isDarkMode ? 'rgba(34,197,94,0.15)' : '#ecfdf5', borderColor: isDarkMode ? '#166534' : '#6ee7b7' }]}>
                            <MotiView
                                from={{ opacity: 0.3 }} animate={{ opacity: 1 }}
                                transition={{ type: 'timing', duration: 700, loop: true }}
                                style={s.livePill}
                            />
                            <Text style={[s.heroBadgeText, { color: isDarkMode ? '#4ade80' : '#006A4E' }]}>LIVE SCORES</Text>
                        </View>
                        <Text style={[s.heroTitle, { color: isDarkMode ? '#f1f5f9' : '#121212' }]}>Live Sports</Text>
                        <Text style={[s.heroSubtitle, { color: isDarkMode ? '#64748b' : '#6b7280' }]}>Cricket · Football · More</Text>
                    </View>
                </View>

                {/* SVG bezier wave — content color on top, green peeks through below */}
                <Svg
                    width={width}
                    height={44}
                    viewBox={`0 0 ${width} 44`}
                    style={s.heroSvgWave}
                    preserveAspectRatio="none"
                >
                    <Path
                        d={`M0,30 C${width * 0.15},44 ${width * 0.28},8 ${width * 0.5},22 C${width * 0.72},36 ${width * 0.85},4 ${width},18 L${width},0 L0,0 Z`}
                        fill={isDarkMode ? '#121212' : '#fff'}
                    />
                </Svg>

                {/* Illustration over everything */}
                <Image
                    source={require('../../assets/sportsillustration.png')}
                    style={s.heroIllustration}
                    resizeMode="contain"
                />
            </View>

            {/* Sport Tab Selector */}
            <View style={[s.sportTabRow, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff', borderBottomColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]}>
                {[
                    { key: 'cricket', label: 'Cricket' },
                    { key: 'football', label: 'Football' },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[s.sportTab, activeTab === tab.key && s.sportTabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <SportVideo sport={tab.key} size={32} bgColor={activeTab === tab.key ? (isDarkMode ? '#1E1E1E' : '#121212') : (isDarkMode ? '#1E1E1E' : '#f3f4f6')} />
                        <Text style={[s.sportTabLabel, { color: activeTab === tab.key ? (isDarkMode ? '#f1f5f9' : '#111827') : (isDarkMode ? '#475569' : '#9ca3af') }, activeTab === tab.key && s.sportTabLabelActive]}>{tab.label}</Text>
                        {activeTab === tab.key && <View style={[s.sportTabUnderline, { backgroundColor: '#059669' }]} />}
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'football' ? (
                <FootballComingSoon colors={colors} />
            ) : (
                <>
                    {/* Match Filter */}
                    <View style={[s.filterRow, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff', borderBottomColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]}>
                        {FILTER_TABS.map(ft => (
                            <TouchableOpacity
                                key={ft.key}
                                style={[s.filterTab, matchFilter === ft.key && { borderBottomColor: ft.color, borderBottomWidth: 2 }]}
                                onPress={() => handleFilterChange(ft.key)}
                            >
                                <Ionicons
                                    name={ft.icon}
                                    size={16}
                                    color={matchFilter === ft.key ? ft.color : (isDarkMode ? '#475569' : '#9ca3af')}
                                />
                                <Text style={[s.filterTabTxt, { color: matchFilter === ft.key ? ft.color : (isDarkMode ? '#64748b' : '#6b7280') }]}>
                                    {ft.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Matches List */}
                    {loading ? (
                        <ScrollView contentContainerStyle={{ padding: 16 }}>
                            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} isDarkMode={isDarkMode} />)}
                        </ScrollView>
                    ) : matches.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Text style={{ fontSize: 56, marginBottom: 14 }}>🏏</Text>
                            <Text style={[s.emptyTitle, { color: colors.text }]}>No {matchFilter} matches</Text>
                            <Text style={[s.emptySubtitle, { color: colors.textDim }]}>Check back soon for live scores!</Text>
                            <TouchableOpacity style={s.retryBtn} onPress={() => fetchMatches(matchFilter)}>
                                <Ionicons name="refresh" size={16} color="#fff" />
                                <Text style={s.retryTxt}>Refresh</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={matches}
                            keyExtractor={(_, i) => String(i)}
                            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMatches(matchFilter, true)} colors={['#059669']} tintColor={isDarkMode ? '#059669' : undefined} />}
                            renderItem={({ item }) => (
                                <MatchCard
                                    match={item}
                                    onPress={() => item.id && setScorecardMatch(item)}
                                    isDarkMode={isDarkMode}
                                    colors={colors}
                                />
                            )}
                        />
                    )}
                </>
            )}

            {/* Scorecard Modal */}
            <ScorecardModal
                visible={!!scorecardMatch}
                matchId={scorecardMatch?.id}
                matchTitle={getMatchTitle(scorecardMatch)}
                onClose={() => setScorecardMatch(null)}
                isDarkMode={isDarkMode}
                colors={colors}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },

    // === SVG WAVE HERO ===
    heroBanner: {
        backgroundColor: '#00B894',   // teal-green base
        height: 150,
        overflow: 'hidden',
    },
    // White section covering the top portion — text lives here
    heroContent: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 109,
        backgroundColor: '#fff',
        paddingTop: 14,
        paddingLeft: 20,
        justifyContent: 'center',
    },
    heroSvgWave: {
        position: 'absolute',
        top: 106,
        left: 0,
    },
    heroLeft: { gap: 4 },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#6ee7b7',
        marginBottom: 2,
    },
    livePill: {
        width: 7, height: 7, borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    heroBadgeText: {
        color: '#006A4E',
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 1.2,
    },
    heroTitle: {
        fontSize: 26,
        fontFamily: 'Outfit_800ExtraBold',
        color: '#121212',
        letterSpacing: -0.5,
    },
    heroSubtitle: {
        fontSize: 12,
        fontFamily: 'Outfit_400Regular',
        color: '#6b7280',
    },
    heroIllustration: {
        width: width * 0.46,
        height: 130,
        position: 'absolute',
        right: 0,
        bottom: 0,
        zIndex: 10,
    },

    sportTabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    sportTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6, position: 'relative' },
    sportTabActive: {},
    sportTabEmoji: { fontSize: 18 },
    sportTabLabel: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#9ca3af' },
    sportTabLabelActive: { color: '#111827', fontFamily: 'Outfit_700Bold' },
    sportTabUnderline: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 3, backgroundColor: '#2C2C2C', borderTopLeftRadius: 3, borderTopRightRadius: 3 },

    filterRow: { flexDirection: 'row', borderBottomWidth: 1 },
    filterTab: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 3 },
    filterTabTxt: { fontSize: 11, fontFamily: 'Outfit_700Bold' },

    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', textAlign: 'center', marginBottom: 20 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    retryTxt: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },
});
