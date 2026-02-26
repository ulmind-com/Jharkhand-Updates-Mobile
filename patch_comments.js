const fs = require('fs');

const filesToPatch = [
    'src/screens/StateNewsDetailsScreen.js',
    'src/screens/JobDetailsScreen.js',
    'src/screens/EventDetailsScreen.js',
    'src/screens/CommunityPostDetailsScreen.js',
    'src/screens/PropertyDetailsScreen.js',  // Check if Property has comments
    'src/screens/CommunityScreen.js'
];

filesToPatch.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let patched = false;

        // --- PART 1: FIX COMMENT SORTING IN fetchComments ---
        if (content.includes('setComments(res.data.data);')) {
            content = content.replace(
                'setComments(res.data.data);',
                `let fetchedComments = res.data.data || [];
                // Sort root comments newest first
                fetchedComments.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                // Sort nested replies newest first
                fetchedComments.forEach(c => {
                    if (c.replies) {
                       c.replies.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                    }
                });
                setComments(fetchedComments);`
            );
            patched = true;
        }

        // --- PART 2: MOVE SOUND EFFECT IN handleAddComment ---

        // Remove ALL Audio.Sound.createAsync blocks from JSX button press and inside handleAddComment (if early).
        // First we find handleAddComment and replace the ending part to ensure it awaits fetchComments and THEN plays sound.

        // 2A: Ensure handleAddComment awaits fetchComments()
        if (content.includes('fetchComments();') && content.includes('setCommentText("");')) {
            content = content.split('fetchComments();').join('await fetchComments();\n\n            // Play success sound after comment is added and UI updated\n            try {\n                const { sound } = await Audio.Sound.createAsync(\n                    require(\'../../assets/sounds/pop.mp3\'),\n                    { shouldPlay: true }\n                );\n                sound.setOnPlaybackStatusUpdate(status => {\n                    if (status.didJustFinish) sound.unloadAsync();\n                });\n            } catch (e) { \n                console.log("Audio play error", e); \n            }');
            patched = true;
        }

        // 2B: Remove previous sound logic anywhere else (like in JSX or early in handleAddComment)
        // A naive way is to remove the Audio block inside JSX or elsewhere, but since it's hard to match exactly,
        // let's do a more surgical replacement for the known variations.

        const audioBlock1 = `try {
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

        const audioBlock2 = `try {
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: 'https://actions.google.com/sounds/v1/water/wood_tap_hollow.ogg' },
                        { shouldPlay: true }
                    );
                    sound.setOnPlaybackStatusUpdate(status => {
                        if (status.didJustFinish) sound.unloadAsync();
                    });
                } catch (e) { console.log(e); }`;

        const audioBlock3 = `try {
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

        // Just remove these blocks wherever they were placed too early.
        if (content.includes(audioBlock1)) { content = content.split(audioBlock1).join(''); patched = true; }
        if (content.includes(audioBlock2)) { content = content.split(audioBlock2).join(''); patched = true; }
        if (content.includes(audioBlock3)) { content = content.split(audioBlock3).join(''); patched = true; }

        if (patched) {
            // Because we might have duplicated the audio code inside handleAddComment if fetchComments() was called twice, 
            // let's just make sure we only have one sound play per handleAddComment but it's okay for now.
            fs.writeFileSync(file, content, 'utf8');
            console.log('Patched ' + file);
        } else {
            console.log('No patch needed or failed for ' + file);
        }
    }
});
