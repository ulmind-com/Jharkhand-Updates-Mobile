const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

walk('src', function (filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let patched = false;

        const heavyRegex = /Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Heavy\)/g;

        if (heavyRegex.test(content)) {
            content = content.replace(heavyRegex, "Platform.OS === 'android' ? require('react-native').Vibration.vibrate(100) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)");
            patched = true;
        }

        if (patched) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Reverted ' + filePath);
        }
    }
});
console.log('Done reverting!');
