const fs = require('fs');
const path = require('path');

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        let f = path.join(dir, file);
        if (fs.statSync(f).isDirectory()) walk(f);
        else if (f.endsWith('.js')) {
            let c = fs.readFileSync(f, 'utf8');
            let o = c;

            // Normalize any existing bad double-replacements
            c = c.replace(/Platform\.OS === 'android'\s*\?\s*require\('react-native'\)\.Vibration\.vibrate\(\d+\)\s*:\s*Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.(Light|Medium|Heavy)\)/g, (match, p1) => `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.${p1})`);

            c = c.replace(/Platform\.OS === 'android'\s*\?\s*require\('react-native'\)\.Vibration\.vibrate\(\d+\)\s*:\s*Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Success\)/g, 'Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)');

            // Then apply correctly
            c = c.replace(/Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Light\)/g, "Platform.OS === 'android' ? require('react-native').Vibration.vibrate(50) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)");

            c = c.replace(/Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Medium\)/g, "Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)");

            c = c.replace(/Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Heavy\)/g, "Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)");

            c = c.replace(/Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Success\)/g, "Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)");

            if (c !== o) {
                fs.writeFileSync(f, c);
                console.log('Fixed ' + f);
            }
        }
    });
}
walk(path.join(process.cwd(), 'src'));
console.log('Done!');
