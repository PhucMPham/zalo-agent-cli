/**
 * Temporary local HTTP server for QR display on headless/VPS environments.
 * Serves QR image as a simple HTML page on localhost.
 * Auto-closes after login completes.
 */

import http from "http";
import { readFileSync, existsSync } from "fs";
import nodefetch from "node-fetch";
import { info } from "./output.js";

/**
 * Start a temporary HTTP server that serves the QR image.
 * @param {string} qrImagePath - path to QR PNG file
 * @param {number} port - default 18927
 * @returns {{ url: string, close: () => void }}
 */
export function startQrServer(qrImagePath, port = 18927, tryPorts = [18927, 8080, 3000, 9000]) {
    const server = http.createServer(async (req, res) => {
        if (req.url === "/qr" || req.url === "/") {
            if (!existsSync(qrImagePath)) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="2">
<title>Waiting for QR...</title></head>
<body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;color:#fff;font-family:system-ui">
<p>QR code generating... auto-refreshing in 2s</p></body></html>`);
                return;
            }
            const img = readFileSync(qrImagePath);
            const b64 = img.toString("base64");
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Zalo QR Login</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#111;font-family:system-ui}
.card{text-align:center;padding:2rem;background:#1a1a2e;border-radius:16px;max-width:400px}
h2{color:#fff;margin-bottom:1rem}img{width:280px;border-radius:8px}
p{color:#888;font-size:0.9rem;margin-top:1rem}
.success{color:#4ade80;font-size:1.2rem;font-weight:bold}
.hidden{display:none}
</style></head>
<body><div class="card">
<div id="qr-view">
<h2>Scan with Zalo app</h2>
<img src="data:image/png;base64,${b64}" alt="QR Code"/>
<p>Open Zalo > QR Scanner to scan this code</p>
</div>
<div id="success-view" class="hidden">
<h2 style="color:#4ade80">Login Successful!</h2>
<p class="success">You can close this page now.</p>
<p>The CLI is ready to use.</p>
</div>
</div>
<script>
// Poll /status to detect login success
setInterval(async()=>{
  try{
    const r=await fetch('/status');
    const d=await r.json();
    if(d.loggedIn){
      document.getElementById('qr-view').classList.add('hidden');
      document.getElementById('success-view').classList.remove('hidden');
    }
  }catch{}
},2000);
</script>
</body></html>`);
        } else if (req.url === "/status") {
            // Login status endpoint for browser polling
            let loggedIn = false;
            try {
                const { isLoggedIn } = await import("../core/zalo-client.js");
                loggedIn = isLoggedIn();
            } catch {}
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ loggedIn }));
        } else {
            res.writeHead(404);
            res.end("Not found");
        }
    });

    // Try ports in order until one works (avoids firewall issues)
    let currentPortIdx = 0;

    function tryListen() {
        const p = tryPorts[currentPortIdx];
        server.listen(p, "0.0.0.0");
    }

    server.on("listening", async () => {
        const actualPort = server.address().port;
        info(`QR available at: http://localhost:${actualPort}/qr`);
        // Auto-detect public IP for VPS users
        try {
            const res = await nodefetch("https://ifconfig.me", { timeout: 3000 });
            const ip = (await res.text()).trim();
            if (ip) info(`On VPS, open: http://${ip}:${actualPort}/qr`);
        } catch {
            info(`On VPS, open: http://<your-server-ip>:${actualPort}/qr`);
        }
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE" || err.code === "EACCES") {
            currentPortIdx++;
            if (currentPortIdx < tryPorts.length) {
                info(`Port ${tryPorts[currentPortIdx - 1]} unavailable, trying ${tryPorts[currentPortIdx]}...`);
                tryListen();
            }
        }
    });

    tryListen();

    return {
        url: `http://localhost:${port}/qr`,
        close: () => {
            try {
                server.close();
            } catch {}
        },
    };
}
