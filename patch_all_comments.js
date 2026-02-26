const fs = require('fs');

function patchFile(filepath) {
    if (!fs.existsSync(filepath)) return;
    let c = fs.readFileSync(filepath, 'utf8');

    // 1. Patch fetchComments for sorting
    const targetSetComments = 'setComments(res.data.data);';
    if (c.includes(targetSetComments)) {
        c = c.replace(targetSetComments,
            `let fetchedComments = res.data.data || [];
                fetchedComments.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                fetchedComments.forEach(cmt => {
                    if (cmt.replies) {
                       cmt.replies.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                    }
                });
                setComments(fetchedComments);`);
    }

    // 2. Patch pop sound to after fetchComments completes in handleAddComment
    const targetFetchComments = 'setCommentText("");\n            fetchComments();';
    if (c.includes(targetFetchComments)) {
        c = c.replace(targetFetchComments,
            `setCommentText("");
            await fetchComments();

            try {
                const { sound } = await Audio.Sound.createAsync(
                    require('../../assets/sounds/pop.mp3'),
                    { shouldPlay: true }
                );
                sound.setOnPlaybackStatusUpdate(status => {
                    if (status.didJustFinish) sound.unloadAsync();
                });
            } catch (e) {
                console.log("Audio play error", e);
            }`);
    }

    // 3. Remove old pop sound from the send button
    // It's usually inside: try { const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/pop.mp3'), { shouldPlay: true }); sound.setOn... } catch (e) { console.log... }
    const oldSoundRegex = /try\s*\{\s*const\s*\{\s*sound\s*\}\s*=\s*await\s*Audio\.Sound\.createAsync\(\s*require\('\.\.\/\.\.\/assets\/sounds\/pop\.mp3'\),\s*\{\s*shouldPlay:\s*true\s*\}\s*\);\s*sound\.setOnPlaybackStatusUpdate\(status\s*=>\s*\{\s*if\s*\(status\.didJustFinish\)\s*sound\.unloadAsync\(\);\s*\}\);\s*\}\s*catch\s*\(e\)\s*\{\s*console\.log\("Audio play error",\s*e\);\s*\}/g;
    c = c.replace(oldSoundRegex, '');

    // Same for ogg sound in StateNews
    const oldOggRegex = /try\s*\{\s*const\s*\{\s*sound\s*\}\s*=\s*await\s*Audio\.Sound\.createAsync\(\s*\{\s*uri:\s*'https:\/\/actions\.google\.com\/sounds\/v1\/water\/wood_tap_hollow\.ogg'\s*\},\s*\{\s*shouldPlay:\s*true\s*\}\s*\);\s*sound\.setOnPlaybackStatusUpdate\(status\s*=>\s*\{\s*if\s*\(status\.didJustFinish\)\s*sound\.unloadAsync\(\);\s*\}\);\s*\}\s*catch\s*\(e\)\s*\{\s*console\.log\(e\);\s*\}/g;
    c = c.replace(oldOggRegex, '');

    // StateNews fix for await fetchComments(); target
    const targetStateNewsFetch = 'setCommentText("");\n            fetchComments();';
    if (c.includes(targetStateNewsFetch) && filepath.includes('StateNewsDetailsScreen')) {
        c = c.replace(targetStateNewsFetch,
            `setCommentText("");
            await fetchComments();

            try {
                const { sound } = await Audio.Sound.createAsync(
                    { uri: 'https://actions.google.com/sounds/v1/water/wood_tap_hollow.ogg' },
                    { shouldPlay: true }
                );
                sound.setOnPlaybackStatusUpdate(status => {
                    if (status.didJustFinish) sound.unloadAsync();
                });
            } catch (e) { console.log(e); }`);
    }

    fs.writeFileSync(filepath, c, 'utf8');
    console.log('Patched ' + filepath);
}

const files = [
    'src/screens/CommunityPostDetailsScreen.js',
    'src/screens/StateNewsDetailsScreen.js',
    'src/screens/JobDetailsScreen.js',
    'src/screens/EventDetailsScreen.js',
    'src/screens/CommunityScreen.js',
    'src/screens/PropertyDetailsScreen.js'
];

files.forEach(patchFile);
console.log('Done!');
