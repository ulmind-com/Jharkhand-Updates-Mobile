import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import {
    fetchFootballMatch, fbIsLive, fbStatusLabel, fbScoreText, fbToIST, getCompData,
} from '../services/FootballApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FootballDetailsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { matchId, match: initialMatch } = route.params || {};
    const { isDarkMode } = React.useContext(ThemeContext);

    const [detail, setDetail] = useState(null);
    const [h2h, setH2h] = useState(null);
    const [loading, setLoading] = useState(true);
    const intervalRef = useRef(null);

    const load = useCallback(async () => {
        if (!matchId) return;
        try {
            const [detailJson, h2hJson] = await Promise.allSettled([
                fetchFootballMatch(String(matchId)),
                fetchFootballMatch(`${matchId}/head2head?limit=5`),
            ]);
            if (detailJson.status === 'fulfilled') setDetail(detailJson.value);
            if (h2hJson.status === 'fulfilled') setH2h(h2hJson.value);
        } catch (e) {
            console.warn('[FootballDetails]', e.message);
        }
    }, [matchId]);

    useEffect(() => {
        setLoading(true);
        load().finally(() => setLoading(false));
        intervalRef.current = setInterval(load, 30000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [matchId]);

    const d = detail || initialMatch || {};
    const home = d.homeTeam || {};
    const away = d.awayTeam || {};
    const comp = d.competition || {};
    const { name: compName, flag: compFlag, priority } = getCompData(comp.code);
    const compColor = priority >= 90 ? '#1d4ed8' : priority >= 80 ? '#7c3aed' : priority >= 60 ? '#0369a1' : '#374151';
    const isLive = fbIsLive(d);
    const isFinished = d.status === 'FINISHED';
    const ftScore = fbScoreText(d) || '-';
    const ht = d.score ? d.score.halfTime : null;
    const htScore = (ht && ht.home !== null) ? `${ht.home !== null && ht.home !== undefined ? ht.home : '-'} - ${ht.away !== null && ht.away !== undefined ? ht.away : '-'}` : null;
    const winner = d.score ? d.score.winner : null;

    const bg = isDarkMode ? '#111827' : '#f8fafc';
    const cardBg = isDarkMode ? '#1E1E1E' : '#fff';
    const textColor = isDarkMode ? '#e2e8f0' : '#111827';
    const dimColor = isDarkMode ? '#64748b' : '#9ca3af';
    const borderColor = isDarkMode ? 'rgba(148,163,184,0.1)' : 'rgba(0,0,0,0.06)';

    const h2hMatches = (h2h ? h2h.matches || [] : []).filter(m => m.status === 'FINISHED').slice(0, 5);

    const HomeCrest = () => home.crest
        ? <Image source={{ uri: home.crest }} style={st.crest} resizeMode="contain" />
        : <View style={[st.crestPH, { backgroundColor: compColor }]}><Text style={st.crestPHTxt}>{(home.tla || 'H').slice(0, 3)}</Text></View>;

    const AwayCrest = () => away.crest
        ? <Image source={{ uri: away.crest }} style={st.crest} resizeMode="contain" />
        : <View style={[st.crestPH, { backgroundColor: '#374151' }]}><Text style={st.crestPHTxt}>{(away.tla || 'A').slice(0, 3)}</Text></View>;

    return (
        <SafeAreaView style={[st.container, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
            {/* ── Coloured Header ── */}
            <View style={[st.header, { backgroundColor: compColor }]}>
                {/* Back button */}
                <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>

                {/* Competition + Live pill */}
                <View style={st.compLine}>
                    <Text style={st.compTxt}>{compFlag}  {(compName || comp.name || 'Football').toUpperCase()}</Text>
                    {isLive && (
                        <View style={st.livePill}>
                            <MotiView from={{ opacity: 0.3 }} animate={{ opacity: 1 }}
                                transition={{ type: 'timing', duration: 600, loop: true }}
                                style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' }} />
                            <Text style={st.livePillTxt}>LIVE {d.minute ? `${d.minute}'` : ''}</Text>
                        </View>
                    )}
                </View>

                {/* Teams Row */}
                <View style={st.scoreRow}>
                    {/* Home */}
                    <View style={st.teamBlock}>
                        <HomeCrest />
                        <Text style={st.teamTxt} numberOfLines={2}>{home.shortName || home.name || '—'}</Text>
                        {winner === 'HOME_TEAM' && (
                            <View style={st.winBadge}><Ionicons name="trophy" size={10} color="#facc15" /><Text style={st.winTxt}>WIN</Text></View>
                        )}
                    </View>

                    {/* Score */}
                    <View style={st.scoreCol}>
                        <Text style={[st.scoreTxt, isLive && { color: '#86efac' }]}>{ftScore}</Text>
                        {htScore && <Text style={st.htTxt}>HT {htScore}</Text>}
                        <Text style={st.statusTxt}>{fbStatusLabel(d)}</Text>
                    </View>

                    {/* Away */}
                    <View style={st.teamBlock}>
                        <AwayCrest />
                        <Text style={st.teamTxt} numberOfLines={2}>{away.shortName || away.name || '—'}</Text>
                        {winner === 'AWAY_TEAM' && (
                            <View style={st.winBadge}><Ionicons name="trophy" size={10} color="#facc15" /><Text style={st.winTxt}>WIN</Text></View>
                        )}
                    </View>
                </View>

                {winner === 'DRAW' && <Text style={st.drawTxt}>DRAW</Text>}
            </View>

            {/* ── Body ── */}
            {loading && !detail ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                    <ActivityIndicator size="large" color={compColor} />
                    <Text style={{ fontFamily: 'Outfit_500Medium', color: dimColor, fontSize: 14 }}>Loading match details...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

                    {/* ── Match Info Card ── */}
                    <View style={[st.card, { backgroundColor: cardBg }]}>
                        <View style={st.cardHeader}>
                            <View style={[st.iconBadge, { backgroundColor: isDarkMode ? '#1e3a5f' : '#dbeafe' }]}>
                                <Ionicons name="information-circle" size={15} color="#2563eb" />
                            </View>
                            <Text style={[st.cardTitle, { color: textColor }]}>Match Info</Text>
                        </View>
                        {[
                            ['location-outline', 'Venue', d.venue || '—'],
                            ['trophy-outline', 'Stage', (d.stage || '').replace(/_/g, ' ') || '—'],
                            ['calendar-outline', 'Matchday', d.matchday ? `Matchday ${d.matchday}` : '—'],
                            ['person-outline', 'Referee', detail && detail.referees && detail.referees[0] ? detail.referees[0].name : '—'],
                            ['time-outline', 'Date', fbToIST(d.utcDate) || '—'],
                        ].map(([icon, label, val], i, arr) => (
                            <View key={label} style={[st.infoRow, { borderBottomColor: borderColor, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
                                <View style={st.infoLeft}>
                                    <Ionicons name={icon} size={14} color={dimColor} />
                                    <Text style={[st.infoLabel, { color: dimColor }]}>{label}</Text>
                                </View>
                                <Text style={[st.infoVal, { color: textColor }]} numberOfLines={1}>{val}</Text>
                            </View>
                        ))}
                    </View>

                    {/* ── Score Breakdown ── */}
                    {(isFinished || isLive) && (
                        <View style={[st.card, { backgroundColor: cardBg }]}>
                            <View style={st.cardHeader}>
                                <View style={[st.iconBadge, { backgroundColor: isDarkMode ? '#14532d' : '#dcfce7' }]}>
                                    <Ionicons name="stats-chart" size={15} color="#16a34a" />
                                </View>
                                <Text style={[st.cardTitle, { color: textColor }]}>Score Breakdown</Text>
                            </View>
                            <View style={st.statGrid}>
                                {[
                                    { label: 'Full Time', home: d.score && d.score.fullTime ? d.score.fullTime.home : null, away: d.score && d.score.fullTime ? d.score.fullTime.away : null },
                                    htScore ? { label: 'Half Time', home: ht ? ht.home : null, away: ht ? ht.away : null } : null,
                                ].filter(Boolean).map((row) => (
                                    <View key={row.label} style={st.statRow}>
                                        <Text style={[st.statVal, { color: textColor, textAlign: 'left' }]}>{row.home !== null && row.home !== undefined ? row.home : '—'}</Text>
                                        <Text style={[st.statLabel, { color: dimColor }]}>{row.label}</Text>
                                        <Text style={[st.statVal, { color: textColor, textAlign: 'right' }]}>{row.away !== null && row.away !== undefined ? row.away : '—'}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── Head to Head ── */}
                    {h2hMatches.length > 0 && (
                        <View style={[st.card, { backgroundColor: cardBg }]}>
                            <View style={st.cardHeader}>
                                <View style={[st.iconBadge, { backgroundColor: isDarkMode ? '#3b1f8c' : '#ede9fe' }]}>
                                    <Ionicons name="swap-horizontal" size={15} color="#7c3aed" />
                                </View>
                                <Text style={[st.cardTitle, { color: textColor }]}>Head-to-Head</Text>
                            </View>
                            {h2hMatches.map((m, i) => {
                                const mHome = (m.homeTeam ? m.homeTeam.name : null) || '—';
                                const mAway = (m.awayTeam ? m.awayTeam.name : null) || '—';
                                const ftHome = m.score && m.score.fullTime ? m.score.fullTime.home : '?';
                                const ftAway = m.score && m.score.fullTime ? m.score.fullTime.away : '?';
                                const mScore = `${ftHome} - ${ftAway}`;
                                const mDate = new Date(m.utcDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
                                const mWinner = m.score ? m.score.winner : null;
                                const homeWon = mWinner === 'HOME_TEAM';
                                const awayWon = mWinner === 'AWAY_TEAM';
                                return (
                                    <View key={m.id} style={[st.h2hRow, { borderBottomColor: borderColor, borderBottomWidth: i < h2hMatches.length - 1 ? 1 : 0 }]}>
                                        <Text style={[st.h2hDate, { color: dimColor }]}>{mDate}</Text>
                                        <Text style={[st.h2hTeam, { color: homeWon ? '#16a34a' : textColor, flex: 1, textAlign: 'right' }]} numberOfLines={1}>{mHome}</Text>
                                        <View style={[st.h2hScorePill, { backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9' }]}>
                                            <Text style={[st.h2hScore, { color: textColor }]}>{mScore}</Text>
                                        </View>
                                        <Text style={[st.h2hTeam, { color: awayWon ? '#16a34a' : textColor, flex: 1, textAlign: 'left' }]} numberOfLines={1}>{mAway}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* ── Info note ── */}
                    <View style={[st.noteCard, { backgroundColor: isDarkMode ? '#1c1917' : '#fafaf9', borderColor: isDarkMode ? '#44403c' : '#e7e5e4' }]}>
                        <Ionicons name="football" size={16} color="#78716c" />
                        <Text style={[st.noteTxt, { color: dimColor }]}>
                            Goal scorers & match events (live data) require a premium data plan. Score updates every 30s automatically.
                        </Text>
                    </View>

                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1 },
    backBtn: { position: 'absolute', top: 14, left: 14, zIndex: 10, padding: 4 },
    header: { padding: 18, paddingTop: 16, paddingBottom: 22, position: 'relative' },
    compLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14, marginTop: 28 },
    compTxt: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: 'rgba(255,255,255,0.85)', letterSpacing: 1.5 },
    livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    livePillTxt: { color: '#fff', fontSize: 10, fontFamily: 'Outfit_700Bold' },
    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    teamBlock: { flex: 1, alignItems: 'center', gap: 8 },
    crest: { width: 56, height: 56 },
    crestPH: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    crestPHTxt: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#fff' },
    teamTxt: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#fff', textAlign: 'center', lineHeight: 18 },
    winBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
    winTxt: { fontSize: 9, fontFamily: 'Outfit_700Bold', color: '#facc15' },
    scoreCol: { alignItems: 'center', gap: 5 },
    scoreTxt: { fontSize: 42, fontFamily: 'Outfit_800ExtraBold', color: '#fff' },
    htTxt: { fontSize: 10, fontFamily: 'Outfit_500Medium', color: 'rgba(255,255,255,0.6)' },
    statusTxt: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
    drawTxt: { textAlign: 'center', fontSize: 11, fontFamily: 'Outfit_700Bold', color: 'rgba(255,255,255,0.7)', marginTop: 6, letterSpacing: 2 },
    card: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    iconBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 14, fontFamily: 'Outfit_800ExtraBold', letterSpacing: 0.3 },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
    infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLabel: { fontSize: 12, fontFamily: 'Outfit_500Medium' },
    infoVal: { fontSize: 12, fontFamily: 'Outfit_700Bold', textAlign: 'right', flex: 1, marginLeft: 12 },
    statGrid: { gap: 4 },
    statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    statLabel: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', flex: 1, textAlign: 'center' },
    statVal: { fontSize: 20, fontFamily: 'Outfit_800ExtraBold', width: 40 },
    h2hRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
    h2hDate: { fontSize: 9, fontFamily: 'Outfit_500Medium', width: 44 },
    h2hTeam: { fontSize: 11, fontFamily: 'Outfit_600SemiBold' },
    h2hScorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginHorizontal: 4 },
    h2hScore: { fontSize: 13, fontFamily: 'Outfit_800ExtraBold', textAlign: 'center' },
    noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    noteTxt: { fontSize: 11, fontFamily: 'Outfit_400Regular', flex: 1, lineHeight: 17 },
});
