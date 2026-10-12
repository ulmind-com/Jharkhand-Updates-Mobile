import { Platform } from 'react-native';

/**
 * AdMob Configuration — Jharkhand Updates
 * Publisher: pub-4004104553380757
 * Android App ID: ca-app-pub-4004104553380757~8682291363
 */

// ─── App IDs ──────────────────────────────────────────────────────────────────
export const ADMOB_APP_ID = {
    android: 'ca-app-pub-4004104553380757~8682291363', // ✅ Real Android App ID
    ios: 'ca-app-pub-4004104553380757~YOUR_IOS_APP_ID', // Add if iOS needed
};

// ─── Toggle: true = test ads, false = real ads ────────────────────────────────
// ✅ PRODUCTION MODE — real ads show honge
export const USE_TEST_ADS = false;

// ─── Test IDs (only used when USE_TEST_ADS = true) ───────────────────────────
const TEST_IDS = {
    banner:       { android: 'ca-app-pub-3940256099942544/6300978111', ios: 'ca-app-pub-3940256099942544/2934735716' },
    interstitial: { android: 'ca-app-pub-3940256099942544/1033173712', ios: 'ca-app-pub-3940256099942544/4411468910' },
    appOpen:      { android: 'ca-app-pub-3940256099942544/9257395921', ios: 'ca-app-pub-3940256099942544/5575463023' },
};

// ─── Production IDs (real ones from AdMob console) ───────────────────────────
const PROD_IDS = {
    banner:       { android: 'ca-app-pub-4004104553380757/3477301801', ios: 'ca-app-pub-4004104553380757/3477301801' },
    interstitial: { android: 'ca-app-pub-4004104553380757/6674310788', ios: 'ca-app-pub-4004104553380757/6674310788' },
    appOpen:      { android: 'ca-app-pub-4004104553380757/7316299455', ios: 'ca-app-pub-4004104553380757/7316299455' },
};

// ─── Final Ad Unit IDs (auto-selects test vs prod) ───────────────────────────
const pick = (key) => Platform.select(
    USE_TEST_ADS ? TEST_IDS[key] : PROD_IDS[key]
);

export const AdUnitIds = {
    banner:       pick('banner'),
    interstitial: pick('interstitial'),
    appOpen:      pick('appOpen'),
};
