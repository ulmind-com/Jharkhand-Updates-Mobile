const fs = require('fs');
let code = fs.readFileSync('src/screens/LiveSportsScreen.js', 'utf8');

// Simple regex replacements for known cases to avoid Babel transpiler parsing errors in Metro

code = code.replace(/d\.score\?\.halfTime/g, "(d.score ? d.score.halfTime : undefined)");
code = code.replace(/d\.score\?\.winner/g, "(d.score ? d.score.winner : undefined)");
code = code.replace(/homeTeam\?\.name/g, "(homeTeam ? homeTeam.name : undefined)");
code = code.replace(/awayTeam\?\.name/g, "(awayTeam ? awayTeam.name : undefined)");
code = code.replace(/homeTeam\?\.crest/g, "(homeTeam ? homeTeam.crest : undefined)");
code = code.replace(/awayTeam\?\.crest/g, "(awayTeam ? awayTeam.crest : undefined)");
code = code.replace(/scorer\?\.name/g, "(scorer ? scorer.name : undefined)");
code = code.replace(/team\?\.name/g, "(team ? team.name : undefined)");
code = code.replace(/assist\?\.name/g, "(assist ? assist.name : undefined)");
code = code.replace(/player\?\.name/g, "(player ? player.name : undefined)");
code = code.replace(/playerIn\?\.name/g, "(playerIn ? playerIn.name : undefined)");
code = code.replace(/playerOut\?\.name/g, "(playerOut ? playerOut.name : undefined)");
code = code.replace(/match\?\.homeTeam/g, "(match ? match.homeTeam : undefined)");
code = code.replace(/match\?\.awayTeam/g, "(match ? match.awayTeam : undefined)");
code = code.replace(/item\?\.id/g, "(item ? item.id : undefined)");

// Nullish coalescing replacements 
code = code.replace(/ht\.home \?\? '-'/g, "(ht.home !== null && ht.home !== undefined ? ht.home : '-')");
code = code.replace(/ht\.away \?\? '-'/g, "(ht.away !== null && ht.away !== undefined ? ht.away : '-')");

fs.writeFileSync('src/screens/LiveSportsScreen.js', code);
console.log('Done replacements.');
