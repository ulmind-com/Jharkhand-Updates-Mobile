const fs = require('fs');
let code = fs.readFileSync('src/screens/LiveSportsScreen.js', 'utf8');

// Replace all remaining \??\ occurrences
code = code.replace(/\?\?/g, "||");

// Replace all remaining \?.\ occurrences (optional chaining)
// A naive regex for property access: obj?.prop -> (obj ? obj.prop : undefined)
// Since a full regex is complex, we will just remove \?.\ and replace with \.\ 
// ONLY if we are sure it's safe. But it's safer to just do a regex replace for the remaining ones we know.
code = code.replace(/scorer\?\.id/g, "(scorer ? scorer.id : undefined)");
code = code.replace(/team\?\.id/g, "(team ? team.id : undefined)");
code = code.replace(/assist\?\.id/g, "(assist ? assist.id : undefined)");
code = code.replace(/player\?\.id/g, "(player ? player.id : undefined)");
code = code.replace(/playerIn\?\.id/g, "(playerIn ? playerIn.id : undefined)");
code = code.replace(/playerOut\?\.id/g, "(playerOut ? playerOut.id : undefined)");
code = code.replace(/match\?\.score/g, "(match ? match.score : undefined)");
code = code.replace(/match\?\.status/g, "(match ? match.status : undefined)");
code = code.replace(/match\?\.utcDate/g, "(match ? match.utcDate : undefined)");
code = code.replace(/d\?\.score/g, "(d ? d.score : undefined)");
code = code.replace(/d\?\.status/g, "(d ? d.status : undefined)");

fs.writeFileSync('src/screens/LiveSportsScreen.js', code);
