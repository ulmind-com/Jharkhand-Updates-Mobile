const fs = require('fs');
let c = fs.readFileSync('App.js', 'utf8');

if (!c.includes('PendingCategoryListScreen')) {
    c = c.replace(
        "import PendingApprovalsScreen from './src/screens/PendingApprovalsScreen';",
        "import PendingApprovalsScreen from './src/screens/PendingApprovalsScreen';\nimport PendingCategoryListScreen from './src/screens/PendingCategoryListScreen';"
    );
    c = c.replace(
        '<Stack.Screen name="PendingApprovals" component={PendingApprovalsScreen} />',
        '<Stack.Screen name="PendingApprovals" component={PendingApprovalsScreen} />\n              <Stack.Screen name="PendingCategoryList" component={PendingCategoryListScreen} />'
    );
    fs.writeFileSync('App.js', c);
    console.log('App.js patched!');
} else {
    console.log('App.js already patched!');
}
