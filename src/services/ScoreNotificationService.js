import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { cricketFetch } from './CricketApi';

const BG_TASK_NAME = 'SCORE_BACKGROUND_FETCH';
const CHANNEL_ID = 'score-tracker';

// ─── Notification appearance ───────────────────────────────────────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

// ─── Android notification channel ─────────────────────────────────
export async function setupNotificationChannel() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Live Score Tracker',
        description: 'Cricket match score updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0],
        enableLights: false,
        enableVibrate: false,
        showBadge: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
}

// ─── Tracked matches (in-memory) ──────────────────────────────────
const trackedMatches = {}; // { matchId: { intervalId, match } }

// ─── Request permission ────────────────────────────────────────────
export async function requestNotificationPermission() {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

// ─── Check if tracked ─────────────────────────────────────────────
export function isTracking(matchId) {
    return !!trackedMatches[String(matchId)];
}

// ─── Start tracking ───────────────────────────────────────────────
export async function startTracking(match) {
    await setupNotificationChannel();
    const matchId = String(match.id || '');
    if (!matchId || matchId === 'undefined' || trackedMatches[matchId]) return;

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    // Show immediately
    await showScoreNotification(matchId, match, null);

    // Poll every 30s
    const intervalId = setInterval(async () => {
        try {
            const liveData = await fetchMatchInfo(matchId);
            await showScoreNotification(matchId, match, liveData);
        } catch (e) {
            console.warn('[ScoreNotif] Poll error', e.message);
        }
    }, 30000);

    trackedMatches[matchId] = { intervalId, match };
    await registerBackgroundTask();
    return true;
}

// ─── Stop tracking ────────────────────────────────────────────────
export async function stopTracking(matchId) {
    const id = String(matchId);
    const entry = trackedMatches[id];
    if (!entry) return;
    clearInterval(entry.intervalId);
    const identifier = `match_score_${id}`;
    try { await Notifications.dismissNotificationAsync(identifier); } catch (_) { }
    delete trackedMatches[id];
    if (Object.keys(trackedMatches).length === 0) await unregisterBackgroundTask();
}

// ─── Fetch latest match info from cricketdata.org ─────────────────
async function fetchMatchInfo(matchId) {
    const json = await cricketFetch(`/match_info?id=${matchId}`);
    return json.data || null;
}

// ─── Convert GMT to IST ───────────────────────────────────────────
function toIST(dateTimeGMT) {
    if (!dateTimeGMT) return '';
    try {
        const d = new Date(dateTimeGMT + 'Z');
        return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch { return ''; }
}

// ─── Build score line from cricketdata.org score[] ────────────────
// score = [{r, w, o, inning}, ...]
function buildScoreLine(scores = []) {
    if (!scores.length) return '';
    return scores.map(s => {
        const team = (s.inning || '').replace(/ Inning \d+/i, '').trim();
        return `${team}: ${s.r}/${s.w} (${s.o} ov)`;
    }).join('\n');
}

// ─── Build notification content ───────────────────────────────────
function buildNotifContent(match, liveData) {
    const src = liveData || match;
    const teams = src.teams || match.teams || [];
    const t1 = teams[0] || 'Team A';
    const t2 = teams[1] || 'Team B';
    const status = src.status || match.status || '';
    const scores = src.score || match.score || [];

    const isLive = src.matchStarted && !src.matchEnded;
    const isUpcoming = !src.matchStarted;

    const emoji = isLive ? '🔴' : isUpcoming ? '🗓️' : '🏏';
    const title = `${emoji} ${t1} vs ${t2}`;

    let body;
    const scoreLine = buildScoreLine(scores);
    if (scoreLine) {
        body = `${scoreLine}\n${status}`;
    } else if (isUpcoming && src.dateTimeGMT) {
        body = `Starts at ${toIST(src.dateTimeGMT)} IST`;
    } else {
        body = status || 'Tracking match...';
    }

    return { title, body };
}

// ─── Show / update notification ───────────────────────────────────
async function showScoreNotification(matchId, match, liveData) {
    const { title, body } = buildNotifContent(match, liveData);
    const identifier = `match_score_${matchId}`;
    try { await Notifications.dismissNotificationAsync(identifier); } catch (_) { }
    await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
            title,
            body,
            data: { matchId, type: 'score_tracker' },
            priority: 'default',
            channelId: CHANNEL_ID,
        },
        trigger: null,
    });
}

// ─── Background task ──────────────────────────────────────────────
TaskManager.defineTask(BG_TASK_NAME, async () => {
    try {
        const ids = Object.keys(trackedMatches);
        for (const matchId of ids) {
            const { match } = trackedMatches[matchId];
            const liveData = await fetchMatchInfo(matchId);
            await showScoreNotification(matchId, match, liveData);
        }
        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

async function registerBackgroundTask() {
    try {
        const s = await BackgroundFetch.getStatusAsync();
        if (s === BackgroundFetch.BackgroundFetchStatus.Restricted ||
            s === BackgroundFetch.BackgroundFetchStatus.Denied) return;
        await BackgroundFetch.registerTaskAsync(BG_TASK_NAME, {
            minimumInterval: 15 * 60,
            stopOnTerminate: false,
            startOnBoot: true,
        });
    } catch (_) { /* already registered */ }
}

async function unregisterBackgroundTask() {
    try { await BackgroundFetch.unregisterTaskAsync(BG_TASK_NAME); } catch (_) { }
}

export function getTrackedMatchIds() {
    return Object.keys(trackedMatches);
}
