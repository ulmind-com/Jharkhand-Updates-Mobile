import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
    Dimensions, RefreshControl, Modal, FlatList, Image, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Video, ResizeMode } from 'expo-av';
import Svg, { Path } from 'react-native-svg';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopHeader from '../components/TopHeader';
import { cricketFetch, BASE_URL, filterAndSortMatches } from '../services/CricketApi';
import {
    fetchFootballLive, fetchFootballUpcoming, fetchFootballRecent, fetchFootballMatch,
    fbIsLive, fbIsUpcoming, fbStatusLabel, fbScoreText, fbToIST, getCompData,
} from '../services/FootballApi';
import {
    startTracking,
    stopTracking,
    isTracking,
    setupNotificationChannel,
    requestNotificationPermission,
} from '../services/ScoreNotificationService';
import * as Notifications from 'expo-notifications';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Video assets ─────────────────────────────────
const VIDEOS = {
    cricket: require('../../assets/videos/cricket.mp4'),
    football: require('../../assets/videos/football.mp4'),
};

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

// ─── In-memory cache (5-min TTL) to protect daily API limits ────────
const CACHE_TTL = 5 * 60 * 1000;
const _cache = {};
function getCached(key) {
    const entry = _cache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.data;
}
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

// ─── Country flags ────────────────────────────────
const COUNTRY_FLAGS = {
    'india': '🇮🇳', 'australia': '🇦🇺', 'england': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'pakistan': '🇵🇰', 'south africa': '🇿🇦', 'new zealand': '🇳🇿',
    'west indies': '🇼🇮', 'sri lanka': '🇱🇰', 'bangladesh': '🇧🇩',
    'afghanistan': '🇦🇫', 'zimbabwe': '🇿🇼', 'ireland': '🇮🇪',
    'united states': '🇺🇸', 'usa': '🇺🇸', 'scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'netherlands': '🇳🇱', 'namibia': '🇳🇦', 'oman': '🇴🇲',
    'nepal': '🇳🇵', 'uae': '🇦🇪', 'kenya': '🇰🇪',
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
    const found = Object.entries(COUNTRY_FLAGS).find(([k]) => key.includes(k));
    const flag = COUNTRY_FLAGS[key] || (found ? found[1] : null);
    if (flag) return <Text style={{ fontSize: size - 4 }}>{flag}</Text>;
    const iplEntry = Object.entries(IPL_FLAGS).find(([k]) => key.includes(k));
    if (iplEntry) {
        const [, ipl] = iplEntry;
        return (
            <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: ipl.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                <Text style={{ fontSize: 7, fontFamily: 'Outfit_700Bold', color: ipl.textColor || '#fff' }} numberOfLines={1}>{ipl.short}</Text>
            </View>
        );
    }
    return <Text style={{ fontSize: size - 4 }}>🏏</Text>;
};

// ─── Team image badge ─────────────────────────────
const TeamImg = ({ img, name, size = 28 }) => {
    const [err, setErr] = useState(false);
    if (!err && img) {
        return <Image source={{ uri: img }} style={{ width: size, height: size, borderRadius: size / 2 }} onError={() => setErr(true)} />;
    }
    return <TeamFlag teamName={name} size={size} />;
};

// ─── Helpers ──────────────────────────────────────
const getStatusColor = (status = '', matchStarted, matchEnded) => {
    const s = status.toLowerCase();
    if (matchStarted && !matchEnded) return '#22c55e';  // live green
    if (s.includes('won') || s.includes('draw') || matchEnded) return '#3b82f6';
    if (!matchStarted) return '#f59e0b';
    return '#6b7280';
};

const getMatchTypeLabel = (t = '') => {
    const u = t.toUpperCase();
    if (u.includes('TEST')) return 'TEST';
    if (u.includes('ODI')) return 'ODI';
    if (u.includes('T20')) return 'T20';
    return t || 'MATCH';
};

const matchTypeColor = (type = '') => {
    const t = type.toUpperCase();
    if (t.includes('TEST')) return ['#7c3aed', '#a855f7'];
    if (t.includes('ODI')) return ['#0369a1', '#0ea5e9'];
    if (t.includes('T20')) return ['#b45309', '#f59e0b'];
    return ['#333333', '#6b7280'];
};

// Convert GMT datestring to IST display
const toIST = (dateTimeGMT) => {
    if (!dateTimeGMT) return '';
    try {
        const d = new Date(dateTimeGMT + 'Z');
        return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit', month: 'short',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch (e) { return ''; }
};

// ─── Skeleton ─────────────────────────────────────
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
    card: { borderRadius: 20, padding: 18, marginBottom: 14, gap: 8 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between' },
    badge: { width: 50, height: 18, borderRadius: 6 },
    status: { width: 80, height: 14, borderRadius: 4 },
    teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    teamName: { width: '60%', height: 16, borderRadius: 4 },
    score: { width: 80, height: 20, borderRadius: 6 },
});

// ─── Bell Button with pulse animation ─────────────
const BellButton = ({ tracking, onPress }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (tracking) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [tracking]);

    return (
        <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={bell.wrap}>
            <Animated.View style={[bell.btn, tracking && bell.btnActive, { transform: [{ scale: pulseAnim }] }]}>
                {tracking && (
                    <Animated.View style={[bell.ring, { opacity: pulseAnim.interpolate({ inputRange: [1, 1.2], outputRange: [0.5, 0] }) }]} />
                )}
                <Ionicons
                    name={tracking ? 'notifications' : 'notifications-outline'}
                    size={14}
                    color={tracking ? '#fff' : '#006A4E'}
                />
                {tracking && <View style={bell.dot} />}
            </Animated.View>
            <Text style={[bell.label, { color: tracking ? '#059669' : '#9ca3af' }]}>
                {tracking ? 'Tracking' : 'Notify'}
            </Text>
        </TouchableOpacity>
    );
};
const bell = StyleSheet.create({
    wrap: { alignItems: 'center', gap: 2 },
    btn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#ecfdf5',
        borderWidth: 1.5, borderColor: '#6ee7b7',
        alignItems: 'center', justifyContent: 'center',
    },
    btnActive: {
        backgroundColor: '#059669',
        borderColor: '#047857',
        shadowColor: '#059669',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 6,
    },
    ring: {
        position: 'absolute',
        width: 50, height: 50, borderRadius: 25,
        borderWidth: 2, borderColor: '#059669',
    },
    dot: {
        position: 'absolute', top: 6, right: 6,
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: '#fbbf24',
        borderWidth: 1.5, borderColor: '#fff',
    },
    label: { fontSize: 9, fontFamily: 'Outfit_600SemiBold' },
});

// ─── Score Display from cricketdata.org score[] ───
// score = [{r, w, o, inning}, ...]
const getScoreDisplay = (scores = [], teamName = '') => {
    // find inning(s) belonging to this team
    const key = teamName.split('&')[0].trim().split(' ')[0].toLowerCase(); // Use first word to be safe against dirty strings
    const teamInns = scores.filter(s => (s.inning || '').toLowerCase().includes(key));
    if (teamInns.length === 0) return null;

    // Test matches can have multiple innings. Only show the latest active inning on the small card to avoid text overlap.
    const latest = teamInns[teamInns.length - 1];
    return `${latest.r}/${latest.w} (${latest.o} ov)`;
};

const cleanTeamName = (name = '') => {
    // Sometimes API returns name with score if it's messy e.g "Jammu & Kashmir 186/4 & 584/10"
    // We try to strip trailing scores 
    return name.replace(/\d+\/\d+.*$/, '').replace(/&$/, '').trim();
};

// ─── Match Card ───────────────────────────────────
const MatchCard = ({ match, onPress, isDarkMode }) => {
    const matchId = match.id;
    const [tracking, setTracking] = useState(() => isTracking(matchId));

    const rawTeam1 = (match.teams && match.teams[0]) ? match.teams[0] : 'Team A';
    const rawTeam2 = (match.teams && match.teams[1]) ? match.teams[1] : 'Team B';

    const team1Name = cleanTeamName(rawTeam1);
    const team2Name = cleanTeamName(rawTeam2);

    const team1Info = match.teamInfo ? match.teamInfo.find(t => t.name.toLowerCase().includes(team1Name.toLowerCase().slice(0, 4))) : null;
    const team2Info = match.teamInfo ? match.teamInfo.find(t => t.name.toLowerCase().includes(team2Name.toLowerCase().slice(0, 4))) : null;

    const isLive = match.matchStarted && !match.matchEnded;
    const isUpcoming = !match.matchStarted;
    const statusColor = getStatusColor(match.status, match.matchStarted, match.matchEnded);
    const typeColors = matchTypeColor(match.matchType);

    const sc1 = getScoreDisplay(match.score || [], rawTeam1);
    const sc2 = getScoreDisplay(match.score || [], rawTeam2);

    const handleBellPress = async () => {
        if (tracking) {
            await stopTracking(matchId);
            setTracking(false);
        } else {
            const ok = await startTracking(match);
            if (ok === false) {
                Alert.alert('Permission Required', 'Please allow notifications to track live scores.');
            } else {
                setTracking(true);
            }
        }
    };

    return (
        <TouchableOpacity activeOpacity={0.92} onPress={onPress}
            style={[mc.card, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff', borderColor: isLive ? '#22c55e' : (isDarkMode ? '#2C3147' : '#f0f0f0'), borderWidth: isLive ? 1.5 : 1 }]}>

            {isLive && (
                <MotiView
                    from={{ opacity: 0.4 }} animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 700, loop: true }}
                    style={mc.livePulse}
                />
            )}

            {/* Header */}
            <View style={mc.headerRow}>
                <View style={[mc.typeBadge, { backgroundColor: typeColors[0] }]}>
                    <Text style={mc.typeTxt}>{getMatchTypeLabel(match.matchType)}</Text>
                </View>
                {isLive && (
                    <View style={mc.liveBadge}>
                        <View style={mc.liveDot} />
                        <Text style={mc.liveTxt}>LIVE</Text>
                    </View>
                )}
                <Text style={[mc.seriesTxt, { color: isDarkMode ? '#94a3b8' : '#6b7280' }]} numberOfLines={1}>
                    {match.name ? match.name.split(',').slice(1).join(',').trim() : ''}
                </Text>
                <View style={[mc.statusDot, { backgroundColor: statusColor }]} />
            </View>

            {/* Team 1 */}
            <View style={mc.teamRow}>
                <View style={mc.teamLeft}>
                    <TeamImg img={team1Info ? team1Info.img : null} name={team1Name} size={28} />
                    <Text style={[mc.teamName, { color: isDarkMode ? '#f1f5f9' : '#111827' }]} numberOfLines={1}>{team1Name}</Text>
                </View>
                {sc1 ? (
                    <Text style={[mc.scoreText, { color: isDarkMode ? '#f8fafc' : '#111827' }]}>{sc1}</Text>
                ) : (
                    <Text style={mc.vsText}>vs</Text>
                )}
            </View>

            {/* Team 2 */}
            <View style={[mc.teamRow, { marginTop: 8 }]}>
                <View style={mc.teamLeft}>
                    <TeamImg img={team2Info ? team2Info.img : null} name={team2Name} size={28} />
                    <Text style={[mc.teamName, { color: isDarkMode ? '#f1f5f9' : '#111827' }]} numberOfLines={1}>{team2Name}</Text>
                </View>
                {sc2 && <Text style={[mc.scoreText, { color: isDarkMode ? '#f8fafc' : '#111827' }]}>{sc2}</Text>}
            </View>

            <View style={[mc.divider, { backgroundColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]} />

            {/* Footer */}
            <View style={mc.footer}>
                <View style={mc.statusRow}>
                    <View style={[mc.statusDot2, { backgroundColor: statusColor }]} />
                    <Text style={[mc.statusTxt, { color: statusColor }]} numberOfLines={2}>
                        {isUpcoming ? `Starts: ${toIST(match.dateTimeGMT)} IST` : match.status}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <BellButton tracking={tracking} onPress={handleBellPress} />
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
    card: { borderRadius: 20, padding: 18, marginBottom: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, overflow: 'hidden' },
    livePulse: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#22c55e', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    typeTxt: { color: '#fff', fontSize: 10, fontFamily: 'Outfit_700Bold', letterSpacing: 0.5 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
    liveTxt: { fontSize: 9, fontFamily: 'Outfit_700Bold', color: '#ef4444', letterSpacing: 0.5 },
    seriesTxt: { flex: 1, fontSize: 10, fontFamily: 'Outfit_500Medium' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 'auto' },
    teamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    teamLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    teamName: { fontSize: 14, fontFamily: 'Outfit_700Bold', flex: 1 },
    scoreText: { fontSize: 15, fontFamily: 'Outfit_800ExtraBold' },
    vsText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#d1d5db' },
    divider: { height: 1, marginVertical: 12 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flex: 1 },
    statusDot2: { width: 7, height: 7, borderRadius: 3.5, marginTop: 3, flexShrink: 0 },
    statusTxt: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', flex: 1, lineHeight: 17 },
    scoreCardBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    scoreCardTxt: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#3b82f6' },
});

// ─── Football Bell Button ─────────────────────────────────────────
const FbBellButton = ({ match, isDarkMode }) => {
    const [tracking, setTracking] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (tracking) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [tracking]);

    const toggle = async () => {
        if (tracking) {
            stopFbTracking(match.id);
            setTracking(false);
        } else {
            const ok = await startFbTracking(match);
            setTracking(!!ok);
        }
    };

    return (
        <TouchableOpacity onPress={toggle} style={{ alignItems: 'center', width: 44 }}>
            {tracking && (
                <Animated.View style={{
                    position: 'absolute', top: -4, width: 32, height: 32, borderRadius: 16,
                    borderWidth: 2, borderColor: '#22c55e', opacity: 0.6,
                    transform: [{ scale: pulseAnim }],
                }} />
            )}
            <Ionicons name={tracking ? 'notifications' : 'notifications-outline'} size={20} color={tracking ? '#22c55e' : isDarkMode ? '#64748b' : '#9ca3af'} />
            {tracking && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginTop: 2 }} />}
        </TouchableOpacity>
    );
};

// ─── Football Notification Service (in-module) ──────────────────────
const _fbTracked = {};

async function startFbTracking(match) {
    await setupNotificationChannel();
    const ok = await requestNotificationPermission();
    if (!ok) return false;

    const id = String(match.id);
    if (_fbTracked[id]) return true;

    // Show initial notification immediately
    await _showFbNotif(id, match, null);

    // Poll every 60s for live score updates
    const intervalId = setInterval(async () => {
        try {
            const json = await fetchFootballMatch(id);
            await _showFbNotif(id, match, json);
        } catch (_) { }
    }, 60000);

    _fbTracked[id] = { intervalId, match };
    return true;
}

function stopFbTracking(matchId) {
    const id = String(matchId);
    const entry = _fbTracked[id];
    if (!entry) return;
    clearInterval(entry.intervalId);
    delete _fbTracked[id];
}

async function _showFbNotif(id, match, detail) {
    try {
        const src = detail || match;
        const home = (src.homeTeam || match.homeTeam || {}).name || 'Home';
        const away = (src.awayTeam || match.awayTeam || {}).name || 'Away';
        const score = fbScoreText(src) || fbScoreText(match) || '? - ?';
        const status = fbStatusLabel(src || match);
        const isLive = fbIsLive(src || match);
        const emoji = isLive ? '\uD83D\uDD34' : '\u26BD';

        const goals = ((detail ? detail.goals : undefined) || []);
        const lastGoal = goals.length > 0 ? goals[goals.length - 1] : null;
        const goalLine = lastGoal ? `GOAL: ${lastGoal.minute}' ${(lastGoal.scorer ? lastGoal.scorer.name : undefined) || ''} (${(lastGoal.team ? lastGoal.team.name : undefined) || ''})` : '';

        await Notifications.dismissNotificationAsync(`fb_${id}`).catch(() => { });
        await Notifications.scheduleNotificationAsync({
            identifier: `fb_${id}`,
            content: {
                title: `${emoji} ${home} ${score} ${away}`,
                body: goalLine ? `${goalLine}\n${status}` : status,
                data: { matchId: id, type: 'football' },
                priority: 'default',
                channelId: 'score-tracker',
            },
            trigger: null,
        });
    } catch (e) { console.warn('[FbNotif]', e.message); }
}

// ─── Football Match Detail Modal (Full Rewrite) ────────────────────
const FootballMatchModal = ({ visible, matchId, match, onClose, isDarkMode }) => {
    const [detail, setDetail] = useState(null);
    const [h2h, setH2h] = useState(null);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef(null);

    const load = useCallback(async () => {
        if (!matchId) return;
        try {
            // Fetch both match detail and head2head in parallel
            const [detailJson, h2hJson] = await Promise.allSettled([
                fetchFootballMatch(String(matchId)),
                fetchFootballMatch(`${matchId}/head2head?limit=5`),
            ]);
            if (detailJson.status === 'fulfilled') setDetail(detailJson.value);
            if (h2hJson.status === 'fulfilled') setH2h(h2hJson.value);
        } catch (e) {
            console.warn('[FbModal]', e.message);
        }
    }, [matchId]);

    useEffect(() => {
        if (visible && matchId) {
            setDetail(null); setH2h(null); setLoading(true);
            load().finally(() => setLoading(false));
            intervalRef.current = setInterval(load, 30000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [visible, matchId]);

    const d = detail || match || {};
    const home = d.homeTeam || {};
    const away = d.awayTeam || {};
    const comp = d.competition || {};
    const { name: compName, flag: compFlag, priority } = getCompData(comp.code);
    const compColor = priority >= 90 ? '#1d4ed8' : priority >= 80 ? '#7c3aed' : priority >= 60 ? '#0369a1' : '#374151';
    const isLive = fbIsLive(d);
    const isFinished = d.status === 'FINISHED';
    const ftScore = fbScoreText(d) || '-';
    const ht = (d.score ? d.score.halfTime : undefined);
    const htScore = (ht && ht.home !== null) ? `${(ht.home !== null && ht.home !== undefined ? ht.home : '-')} - ${(ht.away !== null && ht.away !== undefined ? ht.away : '-')}` : null;
    const winner = (d.score ? d.score.winner : undefined); // HOME_TEAM, AWAY_TEAM, DRAW

    const bg = isDarkMode ? '#111827' : '#f8fafc';
    const cardBg = isDarkMode ? '#1E1E1E' : '#fff';
    const textColor = isDarkMode ? '#e2e8f0' : '#111827';
    const dimColor = isDarkMode ? '#64748b' : '#9ca3af';
    const borderColor = isDarkMode ? 'rgba(148,163,184,0.1)' : 'rgba(0,0,0,0.06)';

    // H2H matches list
    const h2hMatches = (h2h ? h2h.matches || [] : []).filter(m => m.status === 'FINISHED').slice(0, 5);

    const HomeCrest = () => home.crest
        ? <Image source={{ uri: home.crest }} style={fbd.crest} resizeMode="contain" />
        : <View style={[fbd.crestPH, { backgroundColor: compColor }]}><Text style={fbd.crestPHTxt}>{(home.tla || 'H').slice(0, 3)}</Text></View>;

    const AwayCrest = () => away.crest
        ? <Image source={{ uri: away.crest }} style={fbd.crest} resizeMode="contain" />
        : <View style={[fbd.crestPH, { backgroundColor: '#374151' }]}><Text style={fbd.crestPHTxt}>{(away.tla || 'A').slice(0, 3)}</Text></View>;

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View style={fbd.overlay}>
                <TouchableOpacity style={fbd.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[fbd.sheet, { backgroundColor: bg, height: SCREEN_HEIGHT * 0.9 }]}>
                    <View style={[fbd.handle, { backgroundColor: isDarkMode ? '#475569' : '#d1d5db' }]} />

                    {/* ── Coloured Header ── */}
                    <View style={[fbd.header, { backgroundColor: compColor }]}>
                        {/* Competition + Live pill */}
                        <View style={fbd.compLine}>
                            <Text style={fbd.compTxt}>{compFlag}  {(compName || comp.name || 'Football').toUpperCase()}</Text>
                            {isLive && (
                                <View style={fbd.livePill}>
                                    <MotiView from={{ opacity: 0.3 }} animate={{ opacity: 1 }}
                                        transition={{ type: 'timing', duration: 600, loop: true }}
                                        style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' }} />
                                    <Text style={fbd.livePillTxt}>LIVE {d.minute ? `${d.minute}'` : ''}</Text>
                                </View>
                            )}
                        </View>

                        {/* Teams Row */}
                        <View style={fbd.scoreRow}>
                            {/* Home */}
                            <View style={fbd.teamBlock}>
                                <HomeCrest />
                                <Text style={fbd.teamTxt} numberOfLines={2}>{home.shortName || home.name || '—'}</Text>
                                {winner === 'HOME_TEAM' && (
                                    <View style={fbd.winBadge}><Ionicons name="trophy" size={10} color="#facc15" /><Text style={fbd.winTxt}>WIN</Text></View>
                                )}
                            </View>

                            {/* Score */}
                            <View style={fbd.scoreCol}>
                                <Text style={[fbd.scoreTxt, isLive && { color: '#86efac' }]}>{ftScore}</Text>
                                {htScore && <Text style={fbd.htTxt}>HT {htScore}</Text>}
                                <Text style={fbd.statusTxt}>{fbStatusLabel(d)}</Text>
                            </View>

                            {/* Away */}
                            <View style={fbd.teamBlock}>
                                <AwayCrest />
                                <Text style={fbd.teamTxt} numberOfLines={2}>{away.shortName || away.name || '—'}</Text>
                                {winner === 'AWAY_TEAM' && (
                                    <View style={fbd.winBadge}><Ionicons name="trophy" size={10} color="#facc15" /><Text style={fbd.winTxt}>WIN</Text></View>
                                )}
                            </View>
                        </View>

                        {winner === 'DRAW' && <Text style={fbd.drawTxt}>DRAW</Text>}
                        <TouchableOpacity onPress={onClose} style={fbd.closeBtn}>
                            <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    </View>

                    {loading && !detail ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                            <ActivityIndicator size="large" color={compColor} />
                            <Text style={{ fontFamily: 'Outfit_500Medium', color: dimColor, fontSize: 14 }}>Loading match details...</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

                            {/* ── Match Info Card ── */}
                            <View style={[fbd.card, { backgroundColor: cardBg }]}>
                                <View style={fbd.cardHeader}>
                                    <View style={[fbd.iconBadge, { backgroundColor: isDarkMode ? '#1e3a5f' : '#dbeafe' }]}>
                                        <Ionicons name="information-circle" size={15} color="#2563eb" />
                                    </View>
                                    <Text style={[fbd.cardTitle, { color: textColor }]}>Match Info</Text>
                                </View>
                                {[
                                    ['location-outline', 'Venue', d.venue || '—'],
                                    ['trophy-outline', 'Stage', (d.stage || '').replace(/_/g, ' ') || '—'],
                                    ['calendar-outline', 'Matchday', d.matchday ? `Matchday ${d.matchday}` : '—'],
                                    ['person-outline', 'Referee', detail?.referees?.[0]?.name || '—'],
                                    ['time-outline', 'Date', fbToIST(d.utcDate) || '—'],
                                ].map(([icon, label, val], i, arr) => (
                                    <View key={label} style={[fbd.infoRow, { borderBottomColor: borderColor, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
                                        <View style={fbd.infoLeft}>
                                            <Ionicons name={icon} size={14} color={dimColor} />
                                            <Text style={[fbd.infoLabel, { color: dimColor }]}>{label}</Text>
                                        </View>
                                        <Text style={[fbd.infoVal, { color: textColor }]} numberOfLines={1}>{val}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* ── Score Breakdown (only if finished/live) ── */}
                            {(isFinished || isLive) && (
                                <View style={[fbd.card, { backgroundColor: cardBg }]}>
                                    <View style={fbd.cardHeader}>
                                        <View style={[fbd.iconBadge, { backgroundColor: isDarkMode ? '#14532d' : '#dcfce7' }]}>
                                            <Ionicons name="stats-chart" size={15} color="#16a34a" />
                                        </View>
                                        <Text style={[fbd.cardTitle, { color: textColor }]}>Score Breakdown</Text>
                                    </View>
                                    <View style={fbd.statGrid}>
                                        {[
                                            { label: 'Full Time', home: d.score?.fullTime?.home, away: d.score?.fullTime?.away },
                                            htScore ? { label: 'Half Time', home: ht?.home, away: ht?.away } : null,
                                        ].filter(Boolean).map((row) => (
                                            <View key={row.label} style={fbd.statRow}>
                                                <Text style={[fbd.statVal, { color: textColor, textAlign: 'left' }]}>{row.home || '—'}</Text>
                                                <Text style={[fbd.statLabel, { color: dimColor }]}>{row.label}</Text>
                                                <Text style={[fbd.statVal, { color: textColor, textAlign: 'right' }]}>{row.away || '—'}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* ── Head to Head ── */}
                            {h2hMatches.length > 0 && (
                                <View style={[fbd.card, { backgroundColor: cardBg }]}>
                                    <View style={fbd.cardHeader}>
                                        <View style={[fbd.iconBadge, { backgroundColor: isDarkMode ? '#3b1f8c' : '#ede9fe' }]}>
                                            <Ionicons name="swap-horizontal" size={15} color="#7c3aed" />
                                        </View>
                                        <Text style={[fbd.cardTitle, { color: textColor }]}>Head-to-Head</Text>
                                    </View>
                                    {h2hMatches.map((m, i) => {
                                        const mHome = (m.homeTeam ? m.homeTeam.name : undefined) || '—';
                                        const mAway = (m.awayTeam ? m.awayTeam.name : undefined) || '—';
                                        const mScore = `${m.score?.fullTime?.home || '?'} - ${m.score?.fullTime?.away || '?'}`;
                                        const mDate = new Date(m.utcDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
                                        const mWinner = m.score?.winner;
                                        const homeWon = mWinner === 'HOME_TEAM';
                                        const awayWon = mWinner === 'AWAY_TEAM';
                                        return (
                                            <View key={m.id} style={[fbd.h2hRow, { borderBottomColor: borderColor, borderBottomWidth: i < h2hMatches.length - 1 ? 1 : 0 }]}>
                                                <Text style={[fbd.h2hDate, { color: dimColor }]}>{mDate}</Text>
                                                <Text style={[fbd.h2hTeam, { color: homeWon ? '#16a34a' : textColor, flex: 1, textAlign: 'right' }]} numberOfLines={1}>{mHome}</Text>
                                                <View style={[fbd.h2hScorePill, { backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9' }]}>
                                                    <Text style={[fbd.h2hScore, { color: textColor }]}>{mScore}</Text>
                                                </View>
                                                <Text style={[fbd.h2hTeam, { color: awayWon ? '#16a34a' : textColor, flex: 1, textAlign: 'left' }]} numberOfLines={1}>{mAway}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* ── Info note about live events ── */}
                            <View style={[fbd.noteCard, { backgroundColor: isDarkMode ? '#1c1917' : '#fafaf9', borderColor: isDarkMode ? '#44403c' : '#e7e5e4' }]}>
                                <Ionicons name="football" size={16} color="#78716c" />
                                <Text style={[fbd.noteTxt, { color: dimColor }]}>
                                    Goal scorers & match events (live data) require a premium data plan. Score updates every 30s automatically.
                                </Text>
                            </View>

                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};
const fbd = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    header: { padding: 18, paddingTop: 10, paddingBottom: 20, position: 'relative' },
    compLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 },
    compTxt: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: 'rgba(255,255,255,0.85)', letterSpacing: 1.5 },
    livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    livePillTxt: { color: '#fff', fontSize: 10, fontFamily: 'Outfit_700Bold' },
    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    teamBlock: { flex: 1, alignItems: 'center', gap: 8 },
    crest: { width: 52, height: 52 },
    crestPH: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    crestPHTxt: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#fff' },
    teamTxt: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#fff', textAlign: 'center', lineHeight: 18 },
    winBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
    winTxt: { fontSize: 9, fontFamily: 'Outfit_700Bold', color: '#facc15' },
    scoreCol: { alignItems: 'center', gap: 5 },
    scoreTxt: { fontSize: 40, fontFamily: 'Outfit_800ExtraBold', color: '#fff' },
    htTxt: { fontSize: 10, fontFamily: 'Outfit_500Medium', color: 'rgba(255,255,255,0.6)' },
    statusTxt: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
    drawTxt: { textAlign: 'center', fontSize: 11, fontFamily: 'Outfit_700Bold', color: 'rgba(255,255,255,0.7)', marginTop: 6, letterSpacing: 2 },
    closeBtn: { position: 'absolute', top: 12, right: 14 },
    // Cards
    card: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    iconBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 14, fontFamily: 'Outfit_800ExtraBold', letterSpacing: 0.3 },
    // Info rows
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
    infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLabel: { fontSize: 12, fontFamily: 'Outfit_500Medium' },
    infoVal: { fontSize: 12, fontFamily: 'Outfit_700Bold', textAlign: 'right', flex: 1, marginLeft: 12 },
    // Score grid
    statGrid: { gap: 4 },
    statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    statLabel: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', flex: 1, textAlign: 'center' },
    statVal: { fontSize: 20, fontFamily: 'Outfit_800ExtraBold', width: 40 },
    // H2H
    h2hRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
    h2hDate: { fontSize: 9, fontFamily: 'Outfit_500Medium', width: 44 },
    h2hTeam: { fontSize: 11, fontFamily: 'Outfit_600SemiBold' },
    h2hScorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginHorizontal: 4 },
    h2hScore: { fontSize: 13, fontFamily: 'Outfit_800ExtraBold', textAlign: 'center' },
    // Note card
    noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    noteTxt: { fontSize: 11, fontFamily: 'Outfit_400Regular', flex: 1, lineHeight: 17 },
});



// ─── Football Match Card (tappable) ───────────────────────────────
const FootballMatchCard = ({ match, isDarkMode, onPress }) => {
    const comp = match.competition || {};
    const { name: compName, flag: compFlag, priority } = getCompData(comp.code);
    const home = match.homeTeam || {};
    const away = match.awayTeam || {};
    const isLive = fbIsLive(match);
    const scoreText = fbScoreText(match);
    const statusLabel = fbStatusLabel(match);
    const compColor = priority >= 90 ? '#1d4ed8' : priority >= 80 ? '#7c3aed' : priority >= 60 ? '#0369a1' : '#374151';

    return (
        <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={[fbc.card, {
            backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
            borderColor: isLive ? '#22c55e' : isDarkMode ? '#2C3147' : '#f0f0f0',
            borderWidth: isLive ? 1.5 : 1,
        }]}>
            {isLive && <View style={fbc.liveStrip} />}
            <View style={fbc.compRow}>
                <View style={[fbc.compBadge, { backgroundColor: compColor }]}>
                    <Text style={fbc.compFlag}>{compFlag}</Text>
                    <Text style={fbc.compName}>{compName}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isLive && (
                        <View style={fbc.liveBadge}>
                            <MotiView from={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 600, loop: true }} style={fbc.liveDot} />
                            <Text style={fbc.liveTxt}>LIVE{match.minute ? ` ${match.minute}'` : ''}</Text>
                        </View>
                    )}
                    <FbBellButton match={match} isDarkMode={isDarkMode} />
                </View>
            </View>
            <View style={fbc.matchRow}>
                <View style={fbc.teamCol}>
                    {home.crest ? <Image source={{ uri: home.crest }} style={fbc.crest} resizeMode="contain" /> :
                        <View style={[fbc.crestPlaceholder, { backgroundColor: compColor }]}><Text style={fbc.crestTxt}>{(home.tla || 'H').slice(0, 3)}</Text></View>}
                    <Text style={[fbc.teamName, { color: isDarkMode ? '#e2e8f0' : '#111827' }]} numberOfLines={2}>{home.shortName || home.name}</Text>
                </View>
                <View style={fbc.scoreBox}>
                    {scoreText ? (
                        <>
                            <Text style={[fbc.scoreText, { color: isDarkMode ? '#f8fafc' : '#111827' }, isLive && { color: '#22c55e' }]}>{scoreText}</Text>
                            <Text style={[fbc.statusText, { color: isLive ? '#22c55e' : isDarkMode ? '#64748b' : '#6b7280' }]}>{statusLabel}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={[fbc.vsText, { color: isDarkMode ? '#64748b' : '#d1d5db' }]}>vs</Text>
                            <Text style={[fbc.timeText, { color: isDarkMode ? '#94a3b8' : '#6b7280' }]}>{statusLabel}</Text>
                        </>
                    )}
                </View>
                <View style={[fbc.teamCol, { alignItems: 'flex-end' }]}>
                    {away.crest ? <Image source={{ uri: away.crest }} style={fbc.crest} resizeMode="contain" /> :
                        <View style={[fbc.crestPlaceholder, { backgroundColor: '#374151' }]}><Text style={fbc.crestTxt}>{(away.tla || 'A').slice(0, 3)}</Text></View>}
                    <Text style={[fbc.teamName, { color: isDarkMode ? '#e2e8f0' : '#111827', textAlign: 'right' }]} numberOfLines={2}>{away.shortName || away.name}</Text>
                </View>
            </View>
            {(match.venue || match.stage) && (
                <Text style={[fbc.venueTxt, { color: isDarkMode ? '#475569' : '#9ca3af' }]} numberOfLines={1}>
                    📍 {match.venue || (match.stage || '').replace(/_/g, ' ')}
                </Text>
            )}
            <View style={fbc.tapHint}>
                <Ionicons name="chevron-forward-outline" size={12} color={isDarkMode ? '#475569' : '#d1d5db'} />
                <Text style={[fbc.tapHintTxt, { color: isDarkMode ? '#475569' : '#d1d5db' }]}>Tap for details</Text>
            </View>
        </TouchableOpacity>
    );
};
const fbc = StyleSheet.create({
    card: { borderRadius: 20, padding: 16, marginBottom: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, overflow: 'hidden' },
    liveStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#22c55e', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    compRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    compBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    compFlag: { fontSize: 12 },
    compName: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#fff', letterSpacing: 0.3 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
    liveTxt: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#ef4444' },
    matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
    teamCol: { flex: 1, alignItems: 'center', gap: 8 },
    crest: { width: 44, height: 44 },
    crestPlaceholder: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    crestTxt: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#fff' },
    teamName: { fontSize: 12, fontFamily: 'Outfit_700Bold', textAlign: 'center', lineHeight: 17 },
    scoreBox: { flex: 1.2, alignItems: 'center', gap: 4 },
    scoreText: { fontSize: 28, fontFamily: 'Outfit_800ExtraBold' },
    statusText: { fontSize: 10, fontFamily: 'Outfit_700Bold', letterSpacing: 0.5 },
    vsText: { fontSize: 22, fontFamily: 'Outfit_800ExtraBold' },
    timeText: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', textAlign: 'center' },
    venueTxt: { fontSize: 10, fontFamily: 'Outfit_400Regular', marginTop: 2 },
    tapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 4 },
    tapHintTxt: { fontSize: 9, fontFamily: 'Outfit_500Medium' },
});

// ─── MAIN SCREEN ──────────────────────────────────
export default function LiveSportsScreen() {
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState('football');
    const [matchFilter, setMatchFilter] = useState('live');
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Football state
    const [fbFilter, setFbFilter] = useState('live');
    const [fbMatches, setFbMatches] = useState([]);
    const [fbLoading, setFbLoading] = useState(false);
    const [fbRefreshing, setFbRefreshing] = useState(false);
    const [fbSelectedMatch, setFbSelectedMatch] = useState(null);

    const FILTER_TABS = [
        { key: 'live', label: 'Live', icon: 'radio', color: '#22c55e' },
        { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline', color: '#f59e0b' },
        { key: 'recent', label: 'Recent', icon: 'checkmark-circle-outline', color: '#3b82f6' },
    ];

    const fetchMatches = useCallback(async (filter = matchFilter, isRefresh = false, isSilent = false) => {
        const cacheKey = `matches_${filter}`;

        if (!isRefresh) {
            const fresh = getCached(cacheKey);
            if (fresh) { setMatches(fresh); return; }
        }

        if (!isSilent) {
            if (isRefresh) setRefreshing(true); else setLoading(true);
        }
        try {
            if (filter === 'upcoming') {
                // Upcoming: use /matches which returns scheduled matches
                const json = await cricketFetch('/matches?offset=0');
                let all = (json.data || []).filter(m => !m.matchStarted);
                all = filterAndSortMatches(all, false);
                setCache(cacheKey, all);
                setMatches(all);
            } else if (filter === 'live') {
                // Live: fetch TWO pages in parallel to avoid missing India/IPL matches
                const [page0, page1] = await Promise.allSettled([
                    cricketFetch('/currentMatches?offset=0'),
                    cricketFetch('/currentMatches?offset=25'),
                ]);
                const data0 = page0.status === 'fulfilled' ? (page0.value.data || []) : [];
                const data1 = page1.status === 'fulfilled' ? (page1.value.data || []) : [];
                const seen = new Set();
                const merged = [...data0, ...data1].filter(m => {
                    const key = m.id || m.name;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                const live = merged.filter(m => m.matchStarted && !m.matchEnded && !(m.status || '').toLowerCase().includes('abandoned'));
                const sorted = filterAndSortMatches(live, true);
                setCache(cacheKey, sorted);
                setMatches(sorted);
            } else {
                // Recent: pull from currentMatches (recently ended) + /matches endpoint
                const [currentRes, matchesRes] = await Promise.allSettled([
                    cricketFetch('/currentMatches?offset=0'),
                    cricketFetch('/matches?offset=0'),
                ]);
                const current = currentRes.status === 'fulfilled' ? (currentRes.value.data || []) : [];
                const matchesList = matchesRes.status === 'fulfilled' ? (matchesRes.value.data || []) : [];
                const seen = new Set();
                const merged = [...current, ...matchesList].filter(m => {
                    const key = m.id || m.name;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                const ended = merged.filter(m => m.matchEnded);
                const all = filterAndSortMatches(ended.length > 0 ? ended : merged, false);
                setCache(cacheKey, all);
                setMatches(all);
            }
        } catch (e) {
            console.warn('Sports API error:', e.message);
            const stale = getStaleCached(cacheKey);
            setMatches(stale || []);
        } finally {
            if (!isSilent) {
                setLoading(false); setRefreshing(false);
            }
        }
    }, [matchFilter]);

    const fetchFootball = useCallback(async (filter = fbFilter, isRefresh = false) => {
        const cacheKey = `fb_${filter}`;
        if (!isRefresh) {
            const fresh = getCached(cacheKey);
            if (fresh) { setFbMatches(fresh); return; }
        }
        if (isRefresh) setFbRefreshing(true); else setFbLoading(true);
        try {
            let data;
            if (filter === 'live') data = await fetchFootballLive();
            else if (filter === 'upcoming') data = await fetchFootballUpcoming();
            else data = await fetchFootballRecent();
            setCache(cacheKey, data);
            setFbMatches(data);
        } catch (e) {
            console.warn('[Football]', e.message);
            const stale = getStaleCached(cacheKey);
            setFbMatches(stale || []);
        } finally { setFbLoading(false); setFbRefreshing(false); }
    }, [fbFilter]);

    // Lazy load: Only fetch the active tab's active filter to save API hits
    useEffect(() => {
        if (activeTab === 'cricket') {
            fetchMatches(matchFilter);
        }
    }, [activeTab, matchFilter]);

    // 60-second silent background polling for REALTIME updates (Only on Live tab)
    useEffect(() => {
        let interval;
        if (activeTab === 'cricket' && matchFilter === 'live') {
            interval = setInterval(() => {
                fetchMatches('live', true, true);
            }, 60000);
        }
        return () => clearInterval(interval);
    }, [activeTab, matchFilter, fetchMatches]);

    useEffect(() => {
        if (activeTab === 'football') {
            fetchFootball(fbFilter);
        }
    }, [activeTab, fbFilter]);

    const bgColor = isDarkMode ? '#111827' : '#f8fafc';

    return (
        <SafeAreaView style={[s.container, { backgroundColor: bgColor }]} edges={['top']}>
            <TopHeader />

            {/* Hero */}
            <View style={s.heroBanner}>
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
                <Svg width={width} height={44} viewBox={`0 0 ${width} 44`} style={s.heroSvgWave} preserveAspectRatio="none">
                    <Path
                        d={`M0,30 C${width * 0.15},44 ${width * 0.28},8 ${width * 0.5},22 C${width * 0.72},36 ${width * 0.85},4 ${width},18 L${width},0 L0,0 Z`}
                        fill={isDarkMode ? '#121212' : '#fff'}
                    />
                </Svg>
                <Image source={require('../../assets/sportsillustration.png')} style={s.heroIllustration} resizeMode="contain" />
            </View>

            {/* Sport Tab: Defaults to Football first to save Cricket API hits as requested */}
            <View style={[s.sportTabRow, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff', borderBottomColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]}>
                {[{ key: 'football', label: 'Football' }, { key: 'cricket', label: 'Cricket' }].map(tab => (
                    <TouchableOpacity key={tab.key} style={[s.sportTab, activeTab === tab.key && s.sportTabActive]} onPress={() => setActiveTab(tab.key)}>
                        <SportVideo sport={tab.key} size={32} bgColor={activeTab === tab.key ? (isDarkMode ? '#1E1E1E' : '#121212') : (isDarkMode ? '#1E1E1E' : '#f3f4f6')} />
                        <Text style={[s.sportTabLabel, { color: activeTab === tab.key ? (isDarkMode ? '#f1f5f9' : '#111827') : (isDarkMode ? '#475569' : '#9ca3af') }, activeTab === tab.key && s.sportTabLabelActive]}>{tab.label}</Text>
                        {activeTab === tab.key && <View style={[s.sportTabUnderline, { backgroundColor: '#059669' }]} />}
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'football' ? (
                <>
                    {/* Football filter tabs */}
                    <View style={[s.filterRow, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff', borderBottomColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]}>
                        {[
                            { key: 'live', label: 'Live', icon: 'radio', color: '#22c55e' },
                            { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline', color: '#f59e0b' },
                            { key: 'recent', label: 'Recent', icon: 'checkmark-circle-outline', color: '#3b82f6' },
                        ].map(ft => (
                            <TouchableOpacity key={ft.key}
                                style={[s.filterTab, fbFilter === ft.key && { borderBottomColor: ft.color, borderBottomWidth: 2 }]}
                                onPress={() => setFbFilter(ft.key)}>
                                <Ionicons name={ft.icon} size={16} color={fbFilter === ft.key ? ft.color : (isDarkMode ? '#475569' : '#9ca3af')} />
                                <Text style={[s.filterTabTxt, { color: fbFilter === ft.key ? ft.color : (isDarkMode ? '#475569' : '#9ca3af') }]}>{ft.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {fbLoading ? (
                        <ScrollView contentContainerStyle={{ padding: 16 }}>
                            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} isDarkMode={isDarkMode} />)}
                        </ScrollView>
                    ) : fbMatches.length === 0 ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
                            <Text style={{ fontSize: 56 }}>⚽</Text>
                            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: isDarkMode ? '#e2e8f0' : '#111827' }}>
                                {fbFilter === 'live' ? 'No Live Matches' : fbFilter === 'upcoming' ? 'No Upcoming Matches' : 'No Recent Matches'}
                            </Text>
                            <TouchableOpacity onPress={() => fetchFootball(fbFilter, true)} style={{ backgroundColor: '#1d4ed8', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}>
                                <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold' }}>Refresh</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={fbMatches}
                            keyExtractor={item => String(item.id)}
                            renderItem={({ item }) => (
                                <FootballMatchCard
                                    match={item}
                                    isDarkMode={isDarkMode}
                                    onPress={() => navigation.navigate('FootballDetails', { matchId: item.id, match: item })}
                                />
                            )}
                            contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={fbRefreshing}
                                    onRefresh={() => fetchFootball(fbFilter, true)}
                                    tintColor="#1d4ed8"
                                />
                            }
                            showsVerticalScrollIndicator={false}
                        />
                    )}


                </>
            ) : (
                <>
                    {/* Filter tabs */}
                    <View style={[s.filterRow, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff', borderBottomColor: isDarkMode ? '#2C2C2C' : '#f3f4f6' }]}>
                        {FILTER_TABS.map(ft => (
                            <TouchableOpacity key={ft.key}
                                style={[s.filterTab, matchFilter === ft.key && { borderBottomColor: ft.color, borderBottomWidth: 2 }]}
                                onPress={() => setMatchFilter(ft.key)}>
                                <Ionicons name={ft.icon} size={16} color={matchFilter === ft.key ? ft.color : (isDarkMode ? '#475569' : '#9ca3af')} />
                                <Text style={[s.filterTabTxt, { color: matchFilter === ft.key ? ft.color : (isDarkMode ? '#64748b' : '#6b7280') }]}>{ft.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

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
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMatches(matchFilter, true)} colors={['#059669']} tintColor={isDarkMode ? '#059669' : undefined} />}
                            renderItem={({ item }) => (
                                <MatchCard
                                    match={item}
                                    onPress={() => item.id && navigation.navigate('CricketScorecard', { matchId: item.id, matchTitle: item.name })}
                                    isDarkMode={isDarkMode}
                                />
                            )}
                        />
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    heroBanner: { backgroundColor: '#00B894', height: 150, overflow: 'hidden' },
    heroContent: { position: 'absolute', top: 0, left: 0, right: 0, height: 109, paddingTop: 14, paddingLeft: 20, justifyContent: 'center' },
    heroSvgWave: { position: 'absolute', top: 106, left: 0 },
    heroLeft: { gap: 4 },
    heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 2 },
    livePill: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
    heroBadgeText: { fontSize: 10, fontFamily: 'Outfit_700Bold', letterSpacing: 1.2 },
    heroTitle: { fontSize: 26, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.5 },
    heroSubtitle: { fontSize: 12, fontFamily: 'Outfit_400Regular' },
    heroIllustration: { width: width * 0.46, height: 130, position: 'absolute', right: 0, bottom: 0, zIndex: 10 },
    sportTabRow: { flexDirection: 'row', borderBottomWidth: 1 },
    sportTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6, position: 'relative' },
    sportTabActive: {},
    sportTabLabel: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
    sportTabLabelActive: { fontFamily: 'Outfit_700Bold' },
    sportTabUnderline: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    filterRow: { flexDirection: 'row', borderBottomWidth: 1 },
    filterTab: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 3 },
    filterTabTxt: { fontSize: 11, fontFamily: 'Outfit_700Bold' },
    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', textAlign: 'center', marginBottom: 20 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    retryTxt: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },
});

