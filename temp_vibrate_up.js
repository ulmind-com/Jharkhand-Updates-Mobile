const fs = require('fs');
const path = require('path');

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        let f = path.join(dir, file);
        if (fs.statSync(f).isDirectory()) walk(f);
        else if (f.endsWith('.js')) {
            let c = fs.readFileSync(f, 'utf8');
            let o = c;

            // Increase duration of all vibrate calls from 50ms and 80ms upwards, so it can actually be felt on modern Android motors.
            c = c.replace(/Vibration\.vibrate\(50\)/g, "Vibration.vibrate(100)");
            c = c.replace(/Vibration\.vibrate\(80\)/g, "Vibration.vibrate(120)");

            if (c !== o) {
                fs.writeFileSync(f, c);
                console.log('Fixed ' + f);
            }
        }
    });
}
walk(path.join(process.cwd(), 'src'));
console.log('Done!');
