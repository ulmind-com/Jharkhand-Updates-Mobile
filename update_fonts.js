const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function findJSFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            findJSFiles(filePath, fileList);
        } else if (filePath.endsWith('.js') || filePath.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

const jsFiles = findJSFiles(srcDir);

console.log(`Scanning ${jsFiles.length} files...`);
let modifiedFiles = 0;

jsFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Skip files that already have Outfit fonts applied heavily to avoid double insertion parsing issues
    if (content.split("Outfit_").length > 3) return;

    let originalContent = content;

    // Regex strategy: We find the styles object usually ending with `StyleSheet.create({ ... })`
    // We look for objects containing Text-like styling.

    // To keep it simple and safe for regex:
    // Step 1: Replace fontWeight: 'bold' or '700', '800', '900' with fontFamily: 'Outfit_700Bold'
    content = content.replace(/fontWeight:\s*['"](?:bold|700|800|900)['"]/g, "fontFamily: 'Outfit_700Bold'");

    // Step 2: Replace fontWeight: '600' or '500' with fontFamily: 'Outfit_600SemiBold' or 'Outfit_500Medium'
    content = content.replace(/fontWeight:\s*['"]600['"]/g, "fontFamily: 'Outfit_600SemiBold'");
    content = content.replace(/fontWeight:\s*['"]500['"]/g, "fontFamily: 'Outfit_500Medium'");

    // Step 3: For all other styles that have ONLY `fontSize: X` or `color:` but no fontFamily, 
    // We'll inject `fontFamily: 'Outfit_400Regular'`
    // This is tricky safely via Regex. It's better to explicitly search for text styles
    // We'll target properties often used with text. Like adding fontFamily alongside fontSize.
    content = content.replace(/(fontSize:\s*\d+,)/g, "$1 fontFamily: 'Outfit_400Regular',");

    // Step 4: UI Enhancement - Tweak border radius & shadows for minimal look globally
    // We replace basic borderRadius: 10/12/16 to 14/18/24 for softer borders
    content = content.replace(/borderRadius:\s*10(\D)/g, "borderRadius: 12$1");
    content = content.replace(/borderRadius:\s*12(\D)/g, "borderRadius: 16$1");
    content = content.replace(/borderRadius:\s*16(\D)/g, "borderRadius: 20$1");
    // Clean up shadow Opacities globally for cleaner Minimal Look 
    content = content.replace(/shadowOpacity:\s*0.1(\D)/g, "shadowOpacity: 0.05$1");
    content = content.replace(/shadowOpacity:\s*0.15(\D)/g, "shadowOpacity: 0.08$1");
    content = content.replace(/shadowOpacity:\s*0.2(\D)/g, "shadowOpacity: 0.1$1");
    content = content.replace(/shadowOpacity:\s*0.3(\D)/g, "shadowOpacity: 0.15$1");

    // Remove "fontFamily: 'Outfit_400Regular'," duplicates if added twice next to a bold
    // If we have Outfit_700Bold and Outfit_400Regular in same object line, remove 400
    content = content.replace(/fontFamily:\s*'Outfit_[5|6|7]00[^']+',\s*fontFamily:\s*'Outfit_400Regular',/g, match => match.split(", ")[0] + ",");
    content = content.replace(/fontFamily:\s*'Outfit_400Regular',\s*fontFamily:\s*'Outfit_[5|6|7]00[^']+',/g, match => match.split(", ")[1] + ",");
    content = content.replace(/(fontFamily:\s*'Outfit_[^']+',.*)fontFamily:\s*'Outfit_[^']+',/g, "$1");

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedFiles++;
        console.log(`Updated UI Typography: ${path.basename(file)}`);
    }
});

console.log(`\nSuccessfully applied Minimalist Pro Typography & UI fixes to ${modifiedFiles} files.`);
