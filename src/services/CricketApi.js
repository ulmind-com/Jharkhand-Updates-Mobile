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
    'b6e3053e-b007-40bb-a98d-53f74f773471',
    '1ae086e2-8829-46ef-b47e-35aee543ec9f',
    'a52a8f80-e2dc-4d75-bb3c-2875028636e2',
    'abc87562-8828-40e3-a2b9-3978132993ed',
    '703e4a25-4273-4f6c-94a7-aeb642340d5d',
    '88e3e867-fa20-4535-92c8-da3fe93dda4e',
    '21f6cb46-1ca3-4536-afb7-d1290a224dc2',
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
 * Fetch with automatic key rotation. Tries all 7 keys before throwing.
 * @param {string} path  e.g. '/currentMatches?offset=0'
 */
export async function cricketFetch(path) {
    for (let attempt = 0; attempt < KEYS.length; attempt++) {
        const key = KEYS[activeKeyIdx];
        if (!key) {
            rotateKey();
            continue;
        }

        const sep = path.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${path}${sep}apikey=${key}`;

        try {
            const res = await fetch(url);
            const json = await res.json();

            if (json.status === 'success') return json;

            // If the error is just "not found" (like a missing scorecard), 
            // DON'T rotate keys and exhaust the quota. Just return the empty/failed json.
            const errMsg = (json.error || json.reason || json.message || json.status || '').toLowerCase();
            if (errMsg.includes('not found') || errMsg.includes('no data')) {
                return json;
            }

            // CRITICAL: If the key gets a temporary 15-min ban for fast-refreshing, DO NOT burn the other 6 keys.
            if (errMsg.includes('blocked')) {
                console.warn(`[CricAPI] Key ${activeKeyIdx + 1} Error:`, json.error || json.reason);
                throw new Error('Rate limit exceeded. Please wait a few seconds.');
            }

            console.warn(`[CricAPI] Key ${activeKeyIdx + 1} Error:`, json.error || json.reason || json.status);
            rotateKey();
        } catch (err) {
            console.warn(`[CricAPI] Network error (key ${activeKeyIdx + 1}):`, err.message);
            rotateKey();
        }
    }
    throw new Error('All API keys exhausted or network unavailable');
}

// ─── Match relevance filtering ─────────────────────────────────────

const LOW_PRIORITY_KEYWORDS = [
    // Skip these domestic fillers entirely
    'csa provincial', 'csa t20', 'club', 'quadrangular', 'tri-series in',
    'division two', 'hong kong', 'kuwait', 'bhutan', 'bahrain', 'japan',
    'malaysia', 'singapore', 'rwanda', 'botswana', 'mozambique', 'lesotho',
    'cyprus', 'estonia', 'isle of man', 'gibraltar', 'serbia', 'spain',
    'portugal', 'romania', 'luxembourg', 'malta', 'bulgaria', 'switzerland',
    'belgium', 'guernsey', 'jersey', 'austria', 'czech', 'hungary', 'croatia',
    'slovenia', 'greece', 'turkey', 'sweden', 'norway', 'denmark', 'finland',
    'women\'s t20i pacific cup', 'european cricket', 't10', 't20 blast', // excluding minor leagues
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
        if (name.includes(kw) || teams.includes(kw)) return -1;
    }

    let score = 0;

    // Highest Priority: India Matches
    if (teams.includes('india') || name.includes('india')) score += 1000;

    // High Priority: ICC World Cups / Champions Trophy / WTC
    if (name.includes('world cup') || name.includes('icc') || name.includes('champions trophy') || name.includes('wtc')) score += 500;

    // High Priority: Indian Premier League (IPL)
    if (name.includes('ipl') || name.includes('indian premier league')) score += 400;

    // Medium Priority: Indian Domestic (Ranji, Duleep, SMAT, Vijay Hazare, WPL)
    if (name.includes('ranji') || name.includes('duleep') || name.includes('vijay hazare') || name.includes('syed mushtaq ali') || name.includes('wpl') || name.includes('women\'s premier league')) score += 300;

    // Medium Priority: Big Leagues (BBL, PSL, CPL, SA20, Hundred)
    if (name.includes('bbl') || name.includes('big bash') || name.includes('psl') || name.includes('cpl') || name.includes('sa20') || name.includes('hundred') || name.includes('ilt20')) score += 200;

    // Medium Priority: Major International Matches (Test/ODI/T20I of top nations)
    const topNations = ['australia', 'england', 'south africa', 'new zealand', 'pakistan', 'sri lanka', 'west indies', 'bangladesh', 'afghanistan'];
    for (const nation of topNations) {
        if (teams.includes(nation) || name.includes(nation)) {
            score += 150;
            break;
        }
    }

    // Match Type Bonus
    if (name.includes('test')) score += 30;
    if (name.includes('odi')) score += 20;
    if (name.includes('t20i')) score += 10;

    // Womens Matches (Important ones only, as lower leagues are filtered)
    if (name.includes('women')) score += 5;

    // Current State Penalty: Push finished/abandoned matches to bottom organically
    const s = (match.status || '').toLowerCase();
    if (s.includes('abandoned') || s.includes('cancelled') || s.includes('stumps') || match.matchEnded) {
        score -= 50;
    }

    return score;
}

/**
 * Filter and sort matches:
 * - Remove irrelevant matches (score < 0)
 * - Sort by priority (India + ICC + IPL first)
 */
export function filterAndSortMatches(matches = [], hideFinished = false) {
    let filtered = matches;

    // If we only want live, hard filter out ended ones
    if (hideFinished) {
        filtered = filtered.filter(m => !m.matchEnded && !(m.status || '').toLowerCase().includes('abandoned'));
    }

    return filtered
        .map(m => ({ match: m, priority: getMatchPriority(m) }))
        .filter(({ priority }) => priority >= 0)
        .sort((a, b) => b.priority - a.priority)
        .map(({ match }) => match);
}
