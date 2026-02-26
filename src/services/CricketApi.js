/**
 * cricketdata.org API utility — 5-key round-robin rotation.
 *
 * Keys (100 req/day each = 500 req/day total):
 *   1. 90e398d0-86d6-4142-83a0-4d94018d3900
 *   2. ac9c96f8-7e9f-46df-9613-b00868184190
 *   3. 7c438bc1-34d2-49db-841e-1d07f3afce5e
 *   4. 1ff9baa1-8bd6-4528-8825-aa8766442508
 *   5. 8fcafcfa-cede-49b0-812f-a33eb8345e0b
 *
 * Strategy: Round-robin across all 5 keys. If the current key is
 * rate-limited (status != 'success'), rotate to next key and retry.
 */

export const BASE_URL = 'https://api.cricapi.com/v1';

const KEYS = [
    '90e398d0-86d6-4142-83a0-4d94018d3900',
    'ac9c96f8-7e9f-46df-9613-b00868184190',
    '7c438bc1-34d2-49db-841e-1d07f3afce5e',
    '1ff9baa1-8bd6-4528-8825-aa8766442508',
    '8fcafcfa-cede-49b0-812f-a33eb8345e0b',
];

let activeKeyIdx = 0;

export function getApiKey() {
    return KEYS[activeKeyIdx];
}

function rotateKey() {
    const prev = activeKeyIdx;
    activeKeyIdx = (activeKeyIdx + 1) % KEYS.length;
    console.log(`[CricAPI] Key ${prev + 1} exhausted → Key ${activeKeyIdx + 1}`);
}

/**
 * Fetch with automatic key rotation. Tries all 5 keys before throwing.
 * @param {string} path  e.g. '/currentMatches?offset=0'
 */
export async function cricketFetch(path) {
    for (let attempt = 0; attempt < KEYS.length; attempt++) {
        const key = KEYS[activeKeyIdx];
        const sep = path.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${path}${sep}apikey=${key}`;

        try {
            const res = await fetch(url);
            const json = await res.json();

            if (json.status === 'success') return json; // ✅

            console.warn(`[CricAPI] Key ${activeKeyIdx + 1} blocked:`, json.error || json.status);
            rotateKey();
        } catch (err) {
            console.warn(`[CricAPI] Network error (key ${activeKeyIdx + 1}):`, err.message);
            rotateKey();
        }
    }
    throw new Error('All 5 API keys exhausted or network unavailable');
}

// ─── Match relevance filtering ─────────────────────────────────────
// Returns true only for IPL, Ranji, India domestic, World Cup,
// major international series. Filters out obscure club tournaments.

const HIGH_PRIORITY_KEYWORDS = [
    // World events
    'world cup', 'icc', 'champions trophy', 'world test championship', 'wtc',
    't20 world cup', 'cwc', 'u19 world cup', 'women\'s world cup',
    // IPL and India tournaments
    'ipl', 'indian premier league',
    'ranji', 'duleep', 'vijay hazare', 'syed mushtaq ali', 'bcci', 'india',
    // Big bilateral series (any country touring)
    'test match', 'odi series', 't20 series', 't20i', 'odi', 'test',
    // Big leagues
    'big bash', 'bbl', 'psl', 'cpl', 'sa20', 'the hundred',
    'lpl', 'bpl', 'il t20', 'major league cricket', 'mlc',
    // Women's big series
    'women',
];

const LOW_PRIORITY_KEYWORDS = [
    // Skip these domestic fillers
    'csa provincial', 'csa t20', 'club', 'quadrangular t20i series in thailand',
    'division two', 'division two 2026', 'hong kong', 'kuwait tour',
    'bhutan', 'bahrain', 'japan cricket',
];

/**
 * Determine if a match is relevant to show.
 * Returns a priority score: higher = show first.
 */
export function getMatchPriority(match) {
    const name = (match.name || '').toLowerCase();
    const series = (match.series_id || '');
    const teams = (match.teams || []).map(t => t.toLowerCase()).join(' ');

    // Always skip low-priority filler
    for (const kw of LOW_PRIORITY_KEYWORDS) {
        if (name.includes(kw)) return -1;
    }

    let score = 0;

    // India = highest priority
    if (teams.includes('india') || name.includes('india')) score += 100;

    // ICC events
    if (name.includes('world cup') || name.includes('icc') || name.includes('champions trophy') || name.includes('wtc')) score += 80;

    // IPL
    if (name.includes('ipl') || name.includes('indian premier league')) score += 75;

    // India domestic
    if (name.includes('ranji') || name.includes('duleep') || name.includes('vijay hazare') || name.includes('syed mushtaq ali')) score += 60;

    // Big T20 leagues
    if (name.includes('bbl') || name.includes('psl') || name.includes('cpl') || name.includes('sa20') || name.includes('hundred') || name.includes('lpl') || name.includes('bpl') || name.includes('il t20') || name.includes('mlc')) score += 50;

    // Any international series (Test/ODI/T20I)
    if (name.includes('test') || name.includes('odi') || name.includes('t20i')) score += 40;

    // Women's matches
    if (name.includes('women')) score += 30;

    return score;
}

/**
 * Filter and sort matches:
 * - Remove irrelevant matches (score < 0)
 * - Sort by priority (India + ICC + IPL first)
 */
export function filterAndSortMatches(matches = []) {
    return matches
        .map(m => ({ match: m, priority: getMatchPriority(m) }))
        .filter(({ priority }) => priority >= 0)
        .sort((a, b) => b.priority - a.priority)
        .map(({ match }) => match);
}
