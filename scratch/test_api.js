
const url = 'http://localhost:3000/api/mobile/login';
const testLogin = async () => {
    try {
        console.log("Testing backend login endpoint...");
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: '123' })
        });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

testLogin();
