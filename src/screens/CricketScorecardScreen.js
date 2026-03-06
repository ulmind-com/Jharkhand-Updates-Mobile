import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import ContentLoader, { Rect, Circle } from 'react-content-loader/native';
import { cricketFetch } from '../services/CricketApi';

const _cache = {};
function setCache(key, data) { _cache[key] = { data, ts: Date.now() }; }
function getStaleCached(key) { return _cache[key] ? _cache[key].data : null; }

// ─── Persistent storage cache (35-hour TTL) for Finished Matches ────
const CACHE_TTL_LONG = 35 * 60 * 60 * 1000; // 35 hours
async function getPersistentCache(key) {
    try {
        const str = await AsyncStorage.getItem(key);
        if (!str) return null;
        const entry = JSON.parse(str);
        if (Date.now() - entry.ts > CACHE_TTL_LONG) {
            await AsyncStorage.removeItem(key);
            return null;
        }
        return entry.data;
    } catch { return null; }
}
async function setPersistentCache(key, data) {
    try {
        await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch { }
}

const { width } = Dimensions.get('window');

const CricketScorecardSkeleton = ({ isDarkMode, colors }) => {
    return (
        <View style={{ flex: 1, padding: 16 }}>
            {/* Header/Status */}
            <ContentLoader
                speed={1} width={width - 32} height={80}
                viewBox={`0 0 ${width - 32} 80`}
                backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"}
                foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}
            >
                <Rect x="0" y="10" rx="4" ry="4" width="60%" height="20" />
                <Rect x="0" y="45" rx="4" ry="4" width="40%" height="15" />
            </ContentLoader>

            {/* Innings Tabs */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 20 }}>
                <ContentLoader speed={1} width={80} height={40} viewBox="0 0 80 40" backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                    <Rect x="0" y="0" rx="20" ry="20" width="80" height="40" />
                </ContentLoader>
                <ContentLoader speed={1} width={80} height={40} viewBox="0 0 80 40" backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                    <Rect x="0" y="0" rx="20" ry="20" width="80" height="40" />
                </ContentLoader>
            </View>

            {/* Batting/Bowling Toggle */}
            <View style={{ flexDirection: 'row', gap: 0, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: isDarkMode ? colors.border : "#e5e7eb" }}>
                <ContentLoader speed={1} width={width / 2 - 16} height={40} viewBox={`0 0 ${width / 2 - 16} 40`} backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                    <Rect x="20" y="10" rx="4" ry="4" width="80" height="15" />
                </ContentLoader>
                <ContentLoader speed={1} width={width / 2 - 16} height={40} viewBox={`0 0 ${width / 2 - 16} 40`} backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                    <Rect x="20" y="10" rx="4" ry="4" width="80" height="15" />
                </ContentLoader>
            </View>

            {/* Table Rows */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={{ marginBottom: 15 }}>
                    <ContentLoader
                        speed={1} width={width - 32} height={40}
                        viewBox={`0 0 ${width - 32} 40`}
                        backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"}
                        foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}
                    >
                        <Circle cx="20" cy="20" r="14" />
                        <Rect x="45" y="10" rx="4" ry="4" width="40%" height="12" />
                        <Rect x="45" y="26" rx="4" ry="4" width="20%" height="8" />

                        <Rect x={`${width - 150}`} y="15" rx="3" ry="3" width="20" height="10" />
                        <Rect x={`${width - 110}`} y="15" rx="3" ry="3" width="20" height="10" />
                        <Rect x={`${width - 70}`} y="15" rx="3" ry="3" width="20" height="10" />
                        <Rect x={`${width - 30}`} y="15" rx="3" ry="3" width="20" height="10" />
                    </ContentLoader>
                </View>
            ))}
        </View>
    );
};

const getTeamColor = (name, isDarkMode) => {
    const n = name.toLowerCase();

    // International
    if (n.includes('india')) return '#2563eb';
    if (n.includes('australia')) return '#eab308';
    if (n.includes('south africa')) return '#84cc16';
    if (n.includes('west indies')) return '#78350f';
    if (n.includes('sri lanka') || n.includes('sl')) return '#38bdf8';
    if (n.includes('pakistan')) return '#15803d';
    if (n.includes('bangladesh')) return '#16a34a';
    if (n.includes('england')) return '#dc2626';
    if (n.includes('new zealand') || n.includes('nz')) return isDarkMode ? '#404040' : '#000000';
    if (n.includes('afghanistan')) return '#0284c7';
    if (n.includes('zimbabwe')) return '#dc2626';
    if (n.includes('ireland')) return '#16a34a';

    // IPL & SA20 & domestic
    if (n.includes('chennai') || n.includes('csk') || n.includes('super kings')) return '#eab308';
    if (n.includes('mumbai') || n.includes('mi ') || n.includes('cape town')) return '#0284c7';
    if (n.includes('royal challengers') || n.includes('rcb') || n.includes('bengaluru')) return '#dc2626';
    if (n.includes('kolkata') || n.includes('kkr')) return '#6b21a8';
    if (n.includes('rajasthan') || n.includes('rr ') || n.includes('royals')) return '#db2777';
    if (n.includes('sunrisers') || n.includes('srh')) return '#f97316';
    if (n.includes('delhi') || n.includes('dc ') || n.includes('capitals')) return '#2563eb';
    if (n.includes('punjab') || n.includes('pbks') || n.includes('kings')) return '#ef4444';
    if (n.includes('lucknow') || n.includes('lsg') || n.includes('super giants')) return '#0d9488';
    if (n.includes('gujarat') || n.includes('gt ') || n.includes('titans')) return '#1e3a8a';

    // BBL
    if (n.includes('sixers')) return '#d946ef';
    if (n.includes('scorchers')) return '#f97316';
    if (n.includes('renegades') || n.includes('heat')) return '#dc2626';
    if (n.includes('hurricanes')) return '#9333ea';
    if (n.includes('stars')) return '#16a34a';
    if (n.includes('strikers')) return '#2563eb';
    if (n.includes('thunder')) return '#a3e635';

    return '#059669'; // Default Green
};

export default function CricketScorecardScreen() {
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const navigation = useNavigation();
    const route = useRoute();
    const { matchId, matchTitle } = route.params || {};

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeInnings, setActiveInnings] = useState(0);
    const [activeTab, setActiveTab] = useState('batting');

    useEffect(() => {
        if (!matchId) {
            setLoading(false);
            return;
        }

        const fetchScorecard = async (isSilent = false) => {
            const cacheKey = `scorecard_${matchId}`;
            if (!isSilent) setLoading(true);

            try {
                const json = await cricketFetch(`/match_scorecard?id=${matchId}`);
                if (json.status !== 'success' || !json.data) {
                    if (!isSilent) setData(null);
                    return;
                }
                const d = json.data;
                setCache(cacheKey, d);
                setData(d);

                // Cache to disk permanently if match is over
                const s = (d.status || '').toLowerCase();
                if (d.matchEnded || s.includes('won') || s.includes('draw') || s.includes('abandoned')) {
                    await setPersistentCache(cacheKey, d);
                }
            } catch (err) {
                console.warn('Scorecard Fetch Error:', err.message);
                if (!isSilent) setData(null);
            } finally {
                if (!isSilent) setLoading(false);
            }
        };

        const loadData = async () => {
            setActiveInnings(0);
            setActiveTab('batting');
            const cacheKey = `scorecard_${matchId}`;
            const cached = getStaleCached(cacheKey);

            if (cached) {
                setData(cached);
                setLoading(false);
                fetchScorecard(true); // Background refresh even if cached in ram
            } else {
                setLoading(true);
                const diskCached = await getPersistentCache(cacheKey);
                if (diskCached) {
                    setCache(cacheKey, diskCached); // Populate RAM cache again
                    setData(diskCached);
                    setLoading(false);
                    // Let's not fetchScorecard if we pulled a completely finished match from disk
                } else {
                    setData(null);
                    fetchScorecard(false);
                }
            }
        };

        loadData();

        // 60-second silent polling for realtime scorecard updates
        const interval = setInterval(() => {
            fetchScorecard(true);
        }, 60000);

        return () => clearInterval(interval);
    }, [matchId]);

    const innings = (data ? data.scorecard : null) || [];
    const cur = innings[activeInnings];

    const sm = StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
        backBtn: { padding: 8, marginLeft: -8, marginRight: 8 },
        headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.primary, flex: 1 },
        loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
        emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
        emptyTxt: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: colors.textDim },
        matchInfoBlock: { padding: 16, backgroundColor: colors.surface, marginBottom: 8 },
        matchTitleTxt: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 4 },
        matchStatusTxt: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#3b82f6' },
        inningsTabs: { maxHeight: 60, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
        innTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', minWidth: 110, borderWidth: 1, borderColor: colors.border, marginVertical: 8 },
        innTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        innTabTxt: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: colors.text },
        innTabTxtActive: { color: '#fff' },
        innOvers: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: colors.textDim, marginTop: 2 },
        innOversActive: { color: 'rgba(255,255,255,0.8)' },
        tabRow: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
        tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
        tabActive: { borderBottomColor: colors.primary },
        tabTxt: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: colors.textDim },
        tabTxtActive: { color: colors.primary, fontFamily: 'Outfit_700Bold' },
        tableWrap: { margin: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
        tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
        tableHeaderRow: { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f8fafc', borderBottomWidth: 2 },
        thTxt: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: colors.primary, flex: 1 },
        thRight: { textAlign: 'right', flex: 1 },
        tdTxt: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: colors.text, flex: 1 },
        tdRight: { textAlign: 'right', flex: 1 },
        playerName: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: colors.text },
        dismissalTxt: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: colors.textDim, marginTop: 2 },
    });

    return (
        <SafeAreaView style={sm.container} edges={['top']}>
            <View style={sm.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.goBack();
                    }}
                    style={sm.backBtn}
                >
                    <Ionicons name="chevron-back" size={28} color={colors.primary} />
                </TouchableOpacity>
                <Text style={sm.headerTitle}>Scorecard</Text>
            </View>

            {loading ? (
                <CricketScorecardSkeleton isDarkMode={isDarkMode} colors={colors} />
            ) : !data || innings.length === 0 ? (
                <View style={sm.emptyBox}>
                    <Ionicons name="analytics-outline" size={64} color={colors.border} />
                    <Text style={sm.emptyTxt}>Scorecard not available yet</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={sm.matchInfoBlock}>
                        <Text style={sm.matchTitleTxt} numberOfLines={2}>{matchTitle}</Text>
                        {data && data.status ? <Text style={sm.matchStatusTxt}>{data.status}</Text> : null}
                    </View>

                    {/* Innings Tabs */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        style={sm.inningsTabs}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                        {(() => {
                            // Safely extract the two competing teams from the matchTitle
                            // Titles usually look like "Zimbabwe vs South Africa, 51st Match..."
                            let competingTeams = [];
                            if (matchTitle) {
                                const titlePart = matchTitle.split(',')[0]; // "Zimbabwe vs South Africa"
                                if (titlePart.includes(' vs ')) {
                                    competingTeams = titlePart.split(' vs ').map(t => t.trim());
                                } else if (titlePart.includes(' v ')) {
                                    competingTeams = titlePart.split(' v ').map(t => t.trim());
                                }
                            }

                            // Fallback team formats if parsing title fails
                            const fallbackTeams = ['Team 1', 'Team 2'];

                            // Process Inning Names
                            const rawNames = innings.map(inn => (inn.inning || '').replace(/ Inning \d/i, '').replace(/ inning \d/i, '').trim());

                            let assignedTeams = [];
                            const fixedNames = rawNames.map((rawName, idx) => {
                                let chosenTeam = null;

                                if (competingTeams.length >= 2) {
                                    const mentioned = competingTeams.filter(t => rawName.toLowerCase().includes(t.toLowerCase()));

                                    if (mentioned.length === 1) {
                                        chosenTeam = mentioned[0];
                                    } else if (mentioned.length > 1) {
                                        const unassigned = mentioned.find(t => !assignedTeams.includes(t));
                                        chosenTeam = unassigned || mentioned[0];
                                    } else {
                                        const unassigned = competingTeams.find(t => !assignedTeams.includes(t));
                                        chosenTeam = unassigned || competingTeams[idx % competingTeams.length];
                                    }
                                } else {
                                    if (rawName.includes(',')) {
                                        const parts = rawName.split(',').map(n => n.trim());
                                        const unassigned = parts.find(p => !assignedTeams.includes(p));
                                        chosenTeam = unassigned || parts[idx % parts.length];
                                    } else {
                                        chosenTeam = rawName;
                                    }
                                }

                                if (!chosenTeam) chosenTeam = fallbackTeams[idx % 2];

                                assignedTeams.push(chosenTeam);

                                // Return Capitalized String
                                return chosenTeam.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
                            });

                            return innings.map((inn, idx) => {
                                const sc = data.score ? data.score.find(s => (s.inning || '').toLowerCase().replace(/ inning \d/i, '') === (inn.inning || '').toLowerCase().replace(/ inning \d/i, '')) : null;
                                const runsSummary = sc ? `${sc.r}/${sc.w}` : '';

                                const teamName = fixedNames[idx];
                                const isActive = activeInnings === idx;
                                const tColor = getTeamColor(teamName, isDarkMode);

                                return (
                                    <TouchableOpacity key={idx}
                                        style={[sm.innTab, isActive && { backgroundColor: tColor, borderColor: tColor }]}
                                        onPress={() => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setActiveInnings(idx);
                                            setActiveTab('batting');
                                        }}>
                                        <Text style={[sm.innTabTxt, isActive && sm.innTabTxtActive]}>
                                            {teamName}
                                        </Text>
                                        {runsSummary ? <Text style={[sm.innOvers, isActive && sm.innOversActive]}>{runsSummary}</Text> : null}
                                    </TouchableOpacity>
                                );
                            });
                        })()}
                    </ScrollView>

                    {/* Bat/Bowl Tabs */}
                    <View style={sm.tabRow}>
                        {['batting', 'bowling'].map(t => (
                            <TouchableOpacity key={t}
                                style={[sm.tab, activeTab === t && sm.tabActive]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveTab(t);
                                }}>
                                <Text style={[sm.tabTxt, activeTab === t && sm.tabTxtActive]}>
                                    {t === 'batting' ? ' Batting' : ' Bowling'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        {activeTab === 'batting' && cur && cur.batting && (
                            <View style={sm.tableWrap}>
                                <View style={[sm.tableRow, sm.tableHeaderRow]}>
                                    <Text style={[sm.thTxt, { flex: 2.5 }]}>BATTER</Text>
                                    <Text style={[sm.thTxt, sm.thRight]}>R</Text>
                                    <Text style={[sm.thTxt, sm.thRight]}>B</Text>
                                    <Text style={[sm.thTxt, sm.thRight]}>4s</Text>
                                    <Text style={[sm.thTxt, sm.thRight]}>6s</Text>
                                    <Text style={[sm.thTxt, sm.thRight]}>SR</Text>
                                </View>
                                {cur.batting.map((b, i) => {
                                    const notOut = (b['dismissal-text'] || '').toLowerCase() === 'not out' || (b['dismissal-text'] || '').toLowerCase() === 'batting';
                                    return (
                                        <View key={i} style={sm.tableRow}>
                                            <View style={{ flex: 2.5 }}>
                                                <Text style={sm.playerName}>{(b.batsman ? b.batsman.name : null) || ''}</Text>
                                                <Text style={sm.dismissalTxt} numberOfLines={2}>{b['dismissal-text'] || ''}</Text>
                                            </View>
                                            <Text style={[sm.tdTxt, sm.tdRight, notOut && { color: '#059669', fontFamily: 'Outfit_800ExtraBold' }]}>{b.r}</Text>
                                            <Text style={[sm.tdTxt, sm.tdRight]}>{b.b}</Text>
                                            <Text style={[sm.tdTxt, sm.tdRight]}>{b['4s']}</Text>
                                            <Text style={[sm.tdTxt, sm.tdRight]}>{b['6s']}</Text>
                                            <Text style={[sm.tdTxt, sm.tdRight]}>{parseFloat(b.sr || 0).toFixed(1)}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {activeTab === 'bowling' && cur && cur.bowling && (
                            <View style={sm.tableWrap}>
                                <View style={[sm.tableRow, sm.tableHeaderRow]}>
                                    <Text style={[sm.thTxt, { flex: 2 }]}>BOWLER</Text>
                                    <Text style={[sm.thTxt, sm.thRight]}>O</Text>
                                    <Text style={[sm.thTxt, sm.thRight]}>M</Text>
                                    <Text style={[sm.thTxt, sm.thRight]}>R</Text>
                                    <Text style={[sm.thTxt, sm.thRight]}>W</Text>
                                    <Text style={[sm.thTxt, sm.thRight]}>ECO</Text>
                                </View>
                                {cur.bowling.map((b, i) => (
                                    <View key={i} style={sm.tableRow}>
                                        <Text style={[sm.playerName, { flex: 2 }]}>{(b.bowler ? b.bowler.name : null) || ''}</Text>
                                        <Text style={[sm.tdTxt, sm.tdRight]}>{b.o}</Text>
                                        <Text style={[sm.tdTxt, sm.tdRight]}>{b.m}</Text>
                                        <Text style={[sm.tdTxt, sm.tdRight]}>{b.r}</Text>
                                        <Text style={[sm.tdTxt, sm.tdRight, b.w > 0 && { color: '#059669', fontFamily: 'Outfit_800ExtraBold' }]}>{b.w}</Text>
                                        <Text style={[sm.tdTxt, sm.tdRight]}>{b.eco}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}
        </SafeAreaView>
    );
}
