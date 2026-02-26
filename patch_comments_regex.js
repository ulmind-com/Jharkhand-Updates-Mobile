const fs = require('fs');

const filesToPatch = [
    'src/screens/StateNewsDetailsScreen.js',
    'src/screens/JobDetailsScreen.js',
    'src/screens/EventDetailsScreen.js',
    'src/screens/CommunityPostDetailsScreen.js',
    'src/screens/PropertyDetailsScreen.js',
    'src/screens/CommunityScreen.js'
];

filesToPatch.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let patched = false;

        // Ensure fetchComments is awaited and sound plays after refetching.
        // We look for setCommentText(""); followed by some whitespace and fetchComments();
        const fetchCommentsRegex = /setCommentText\(\s*""\s*\);\s*fetchComments\(\);/g;

        if (fetchCommentsRegex.test(content)) {
            const replacement = `setCommentText("");
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
            }`;

            content = content.replace(fetchCommentsRegex, replacement);
            patched = true;
        }

        if (patched) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Regex patched ' + file);
        } else {
            console.log('No regex patch needed or failed for ' + file);
        }
    }
});
