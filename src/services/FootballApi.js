/**
 * football-data.org API service
 * Token: 7f58efbd78b84ef7a9a82f10f4a6748e
 * Free plan = 10 req/min (no daily cap!)
 *
 * Competition priority:
 *   HIGH  → WC, CL, PL, EC (World Cup, Champions League, Premier League, Euros)
 *   MED   → BL1, FL1, SA, PD (Bundesliga, Ligue 1, Serie A, La Liga)
 *   LOW   → ELC, PPL (Championship, Primeira Liga)
 *   SKIP  → DED, BSA (Eredivisie, Brazilian Serie A)
 */

const FB_TOKEN = '7f58efbd78b84ef7a9a82f10f4a6748e';
const FB_BASE = 'https://api.football-data.org/v4';

// All competitions the free account has access to (ordered by priority)
const COMP_PRIORITY = {
    WC: 100,   // FIFA World Cup
    EC: 95,    // UEFA European Championship
    CL: 90,    // UEFA Champions League
    PL: 85,    // Premier League
    BL1: 60,    // Bundesliga
    FL1: 55,    // Ligue 1
    SA: 55,    // Serie A
    PD: 55,    // La Liga
    ELC: 30,    // Championship (low)
    PPL: 25,    // Primeira Liga (low)
    DED: -1,    // Eredivisie — skip
    BSA: -1,    // Brazilian Serie A — skip
};

const COMP_NAMES = {
    WC: 'FIFA World Cup', EC: 'UEFA Euro',
    CL: 'Champions League', PL: 'Premier League',
    BL1: 'Bundesliga', FL1: 'Ligue 1',
    SA: 'Serie A', PD: 'La Liga',
    ELC: 'Championship', PPL: 'Primeira Liga',
};

const COMP_FLAGS = {
    WC: '🌍', EC: '🇪🇺', CL: '⭐', PL: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    BL1: '🇩🇪', FL1: '🇫🇷', SA: '🇮🇹', PD: '🇪🇸',
    ELC: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', PPL: '🇵🇹',
};

export function getCompData(code) {
    return {
        name: COMP_NAMES[code] || code,
        flag: COMP_FLAGS[code] || '⚽',
        priority: COMP_PRIORITY[code] ?? 0,
    };
}

// ─── API fetcher (raw) ─────────────────────────────────────────────
async function fbFetch(path) {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${FB_BASE}${path}`;
    const res = await fetch(url, {
        headers: { 'X-Auth-Token': FB_TOKEN },
    });
    if (!res.ok) throw new Error(`football-data.org: HTTP ${res.status}`);
    return res.json();
}

// ─── Filter + sort matches ─────────────────────────────────────────
function filterAndSortFootball(matches = [], sortFn) {
    const filtered = matches
        .map(m => ({
            match: m,
            priority: COMP_PRIORITY[m.competition?.code] ?? 0,
        }))
        .filter(({ priority }) => priority >= 0);

    if (sortFn) {
        filtered.sort(sortFn);
    } else {
        filtered.sort((a, b) => b.priority - a.priority);
    }
    return filtered.map(({ match }) => match);
}

// ─── Convert UTC → IST display ─────────────────────────────────────
export function fbToIST(utcDate) {
    if (!utcDate) return '';
    try {
        const d = new Date(utcDate);
        return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit', month: 'short',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch { return ''; }
}

// ─── Status helpers ────────────────────────────────────────────────
// football-data.org statuses: SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, SUSPENDED, POSTPONED, CANCELLED
export function fbIsLive(m) {
    return m.status === 'IN_PLAY' || m.status === 'PAUSED';
}
export function fbIsUpcoming(m) {
    return m.status === 'SCHEDULED' || m.status === 'TIMED';
}
export function fbIsFinished(m) {
    return m.status === 'FINISHED';
}

export function fbStatusLabel(m) {
    switch (m.status) {
        case 'IN_PLAY': return `LIVE ${m.minute ? m.minute + "'" : ''}`.trim();
        case 'PAUSED': return 'Half Time';
        case 'FINISHED': return 'Full Time';
        case 'POSTPONED': return 'Postponed';
        case 'CANCELLED': return 'Cancelled';
        case 'SCHEDULED':
        case 'TIMED': return `${fbToIST(m.utcDate)} IST`;
        default: return m.status || '';
    }
}

export function fbScoreText(m) {
    const s = m.score;
    if (!s) return null;
    const ft = s.fullTime;
    if (ft && (ft.home !== null || ft.away !== null)) {
        return `${ft.home ?? '-'} - ${ft.away ?? '-'}`;
    }
    const ht = s.halfTime;
    if (ht && (ht.home !== null || ht.away !== null)) {
        return `${ht.home ?? '-'} - ${ht.away ?? '-'}`;
    }
    return null;
}

// ─── Exported fetch functions ──────────────────────────────────────

/** Fetch live matches (IN_PLAY + PAUSED/halftime) */
export async function fetchFootballLive() {
    // football-data.org requires separate calls for IN_PLAY and PAUSED
    const [inPlayRes, pausedRes] = await Promise.allSettled([
        fbFetch('/matches?status=IN_PLAY'),
        fbFetch('/matches?status=PAUSED'),
    ]);
    const inPlay = inPlayRes.status === 'fulfilled' ? (inPlayRes.value.matches || []) : [];
    const paused = pausedRes.status === 'fulfilled' ? (pausedRes.value.matches || []) : [];
    // Merge and deduplicate by match id
    const seen = new Set();
    const merged = [...inPlay, ...paused].filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
    });
    return filterAndSortFootball(merged);
}

/** Fetch upcoming matches (SCHEDULED + TIMED, next 7 days) */
export async function fetchFootballUpcoming() {
    const today = new Date();
    const plus7 = new Date(today);
    plus7.setDate(plus7.getDate() + 7);
    const fmt = d => d.toISOString().split('T')[0];
    const dateRange = `dateFrom=${fmt(today)}&dateTo=${fmt(plus7)}`;
    // Fetch both SCHEDULED and TIMED in parallel (free tier needs separate calls)
    const [schedRes, timedRes] = await Promise.allSettled([
        fbFetch(`/matches?${dateRange}&status=SCHEDULED`),
        fbFetch(`/matches?${dateRange}&status=TIMED`),
    ]);
    const scheduled = schedRes.status === 'fulfilled' ? (schedRes.value.matches || []) : [];
    const timed = timedRes.status === 'fulfilled' ? (timedRes.value.matches || []) : [];
    const seen = new Set();
    const merged = [...timed, ...scheduled].filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
    });
    // Sort by priority descending, then by date ascending (soonest first)
    return filterAndSortFootball(merged, (a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return new Date(a.match.utcDate) - new Date(b.match.utcDate);
    });
}

/** Fetch recent finished matches (last 7 days) */
export async function fetchFootballRecent() {
    const today = new Date();
    const minus7 = new Date(today);
    minus7.setDate(minus7.getDate() - 7);
    const fmt = d => d.toISOString().split('T')[0];
    const json = await fbFetch(`/matches?dateFrom=${fmt(minus7)}&dateTo=${fmt(today)}&status=FINISHED`);
    // Sort by priority descending, then by date descending (most recent first)
    return filterAndSortFootball(json.matches || [], (a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return new Date(b.match.utcDate) - new Date(a.match.utcDate);
    });
}

/** Fetch head2head / match detail */
export async function fetchFootballMatch(matchId) {
    return fbFetch(`/matches/${matchId}`);
}
