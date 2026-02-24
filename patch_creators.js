const fs = require('fs');

const files = [
    { path: 'src/screens/CreateCommunityPostScreen.js', msg: 'Community post created successfully!' },
    { path: 'src/screens/CreateJobPostScreen.js', msg: 'Job posted successfully!' },
    { path: 'src/screens/CreateEventPostScreen.js', msg: 'Event posted successfully!' },
    { path: 'src/screens/CreatePropertyListingScreen.js', msg: 'Property listed successfully!' }
];

files.forEach(f => {
    if (fs.existsSync(f.path)) {
        let t = fs.readFileSync(f.path, 'utf8');

        const target = `Toast.show({ type: 'success', text1: 'Success', text2: '${f.msg}' });`;

        // Check if it's already patched
        if (!t.includes("isPending")) {
            const replacement = `const isPending = res.data.data && res.data.data.status === 'PENDING';
                Toast.show({ 
                    type: 'success', 
                    text1: isPending ? 'Pending Approval' : 'Success', 
                    text2: isPending ? 'Your post is waiting for admin approval.' : '${f.msg}' 
                });`;

            t = t.replace(target, replacement);
            fs.writeFileSync(f.path, t);
            console.log(`Patched ${f.path}`);
        } else {
            console.log(`Already patched ${f.path}`);
        }
    }
});
console.log('All done!');
