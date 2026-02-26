import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';

// ─── Config ───────────────────────────────────────────────────────
const RAPID_API_KEY = '4854f0d1b9msh2fa3c7ea80e9d1ep1ab3c8jsn4b37a3e01b78';
const RAPID_API_HOST = 'cricbuzz-cricket.p.rapidapi.com';
const BG_TASK_NAME = 'SCORE_BACKGROUND_FETCH';
const CHANNEL_ID = 'score-tracker';

// ─── Notification appearance (show banner even in foreground) ─────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

// ─── Setup Android notification channel ───────────────────────────
export async function setupNotificationChannel() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Live Score Tracker',
        description: 'Persistent cricket match score updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0],
        enableLights: false,
        enableVibrate: false,
        showBadge: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
}

// ─── Active tracking state (in-memory) ────────────────────────────
const trackedMatches = {}; // { matchId: { intervalId, match } }

// ─── Request permission ───────────────────────────────────────────
export async function requestNotificationPermission() {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

// ─── Check if a match is being tracked ───────────────────────────
export function isTracking(matchId) {
    return !!trackedMatches[String(matchId)];
}

// ─── Start tracking a match ───────────────────────────────────────
export async function startTracking(match) {
    await setupNotificationChannel();

    const matchId = String(match.id || match.matchInfo?.matchId || '');
    if (!matchId || matchId === 'undefined' || trackedMatches[matchId]) return;

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    // Show notification immediately with current data
    await showScoreNotification(matchId, match, null);

    // Poll every 30s for updated score
    const intervalId = setInterval(async () => {
        try {
            const score = await fetchScore(matchId);
            await showScoreNotification(matchId, match, score);
        } catch (e) {
            console.warn('[ScoreNotif] Poll error', e.message);
        }
    }, 30000);

    trackedMatches[matchId] = { intervalId, match };

    // Register background fetch fallback
    await registerBackgroundTask();

    return true;
}

// ─── Stop tracking a match ────────────────────────────────────────
export async function stopTracking(matchId) {
    const id = String(matchId);
    const entry = trackedMatches[id];
    if (!entry) return;

    clearInterval(entry.intervalId);

    // Dismiss this notification
    const identifier = `match_score_${id}`;
    try { await Notifications.dismissNotificationAsync(identifier); } catch (_) { }

    delete trackedMatches[id];

    if (Object.keys(trackedMatches).length === 0) {
        await unregisterBackgroundTask();
    }
}

// ─── Fetch score from Cricbuzz API ────────────────────────────────
async function fetchScore(matchId) {
    const res = await fetch(
        `https://${RAPID_API_HOST}/mcenter/v1/${matchId}/hscard`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': RAPID_API_HOST } }
    );
    return res.json();
}

// ─── Convert epoch ms to IST string ──────────────────────────────
function toIST(epochMs) {
    if (!epochMs) return '';
    try {
        const date = new Date(Number(epochMs));
        return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            day: '2-digit',
            month: 'short',
        });
    } catch {
        return '';
    }
}

// ─── Build notification title + body ─────────────────────────────
function buildNotifContent(match, scoreData) {
    const t1 = match.team1?.teamName || match.matchInfo?.team1?.teamName || 'Team A';
    const t2 = match.team2?.teamName || match.matchInfo?.team2?.teamName || 'Team B';
    const status = match.status || match.matchInfo?.status || '';
    const startTime = match.matchInfo?.startDate;

    // Live score from scorecard
    let scoreText = '';
    if (scoreData?.scorecard?.length > 0) {
        const latest = scoreData.scorecard[scoreData.scorecard.length - 1];
        if (latest) scoreText = `${latest.score}/${latest.wickets} (${latest.overs} ov)`;
    } else if (match.score1?.inngsScore?.length > 0) {
        const inn = match.score1.inngsScore[match.score1.inngsScore.length - 1];
        scoreText = `${inn.runs}/${inn.wickets} (${inn.overs} ov)`;
    }

    const isLive = status.toLowerCase().includes('live') ||
        (match.matchInfo?.state || '').toLowerCase() === 'in progress';

    // Upcoming: show IST time instead of GMT
    const isUpcoming = status.toLowerCase().includes('yet') ||
        status.toLowerCase().includes('upcoming') ||
        (!scoreText && !isLive);

    const emoji = isLive ? '🔴' : isUpcoming ? '🗓️' : '🏏';
    const title = `${emoji} ${t1} vs ${t2}`;

    let body;
    if (scoreText) {
        body = `${scoreText} • ${status}`;
    } else if (isUpcoming && startTime) {
        body = `Starts at ${toIST(startTime)} IST`;
    } else {
        body = status || 'Tracking match...';
    }

    return { title, body };
}

// ─── Show / update the notification ──────────────────────────────
async function showScoreNotification(matchId, match, scoreData) {
    const { title, body } = buildNotifContent(match, scoreData);
    const identifier = `match_score_${matchId}`;

    // Dismiss old version first (to "update" it)
    try { await Notifications.dismissNotificationAsync(identifier); } catch (_) { }

    await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
            title,
            body,
            data: { matchId, type: 'score_tracker' },
            priority: 'default',
            channelId: CHANNEL_ID,  // Android 8+ requires channel
        },
        trigger: null,  // fire immediately
    });
}

// ─── Background task ──────────────────────────────────────────────
TaskManager.defineTask(BG_TASK_NAME, async () => {
    try {
        const ids = Object.keys(trackedMatches);
        for (const matchId of ids) {
            const { match } = trackedMatches[matchId];
            const score = await fetchScore(matchId);
            await showScoreNotification(matchId, match, score);
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
