const http = require('http');

http.get('http://localhost:8081/index.bundle?platform=android&dev=true', (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.message) {
                console.log("METRO ERROR MESSAGE:");
                console.log(parsed.message);
                if (parsed.errors) {
                    console.log("ERRORS:", JSON.stringify(parsed.errors, null, 2));
                }
            } else {
                console.log("No error found in bundle (or bundle built successfully).");
            }
        } catch (e) {
            console.log("Failed to parse the response as JSON. First 500 chars:");
            console.log(data.substring(0, 500));
        }
    });
}).on('error', (err) => {
    console.log("HTTP GET complete failure. Server might be down:", err.message);
});
