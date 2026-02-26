const fs = require('fs');
let code = fs.readFileSync('src/screens/LiveSportsScreen.js', 'utf8');

// Replace standard object property optional chaining like \obj?.prop\ -> \(obj ? obj.prop : undefined)\
// We will just do a few common ones we know exist since full Babel transform is safer.
code = code.replace(/detail\?\.goals/g, "(detail ? detail.goals : undefined)");
code = code.replace(/lastGoal\.scorer\?\.name/g, "(lastGoal.scorer ? lastGoal.scorer.name : undefined)");
code = code.replace(/lastGoal\.team\?\.name/g, "(lastGoal.team ? lastGoal.team.name : undefined)");
code = code.replace(/match\?\.id/g, "(match ? match.id : undefined)");
code = code.replace(/scorecardMatch\?\.id/g, "(scorecardMatch ? scorecardMatch.id : undefined)");
code = code.replace(/scorecardMatch\?\.name/g, "(scorecardMatch ? scorecardMatch.name : undefined)");
code = code.replace(/fbSelectedMatch\?\.id/g, "(fbSelectedMatch ? fbSelectedMatch.id : undefined)");

fs.writeFileSync('src/screens/LiveSportsScreen.js', code);
console.log('Done replacements.');
