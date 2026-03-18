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
            // Embed mascot inline (read from assets if available, else skip)
            let mascotB64 = "";
            try {
                const { resolve: resolvePath } = await import("path");
                const { fileURLToPath } = await import("url");
                const { dirname } = await import("path");
                const dir = dirname(fileURLToPath(import.meta.url));
                const mascotPath = resolvePath(dir, "../../assets/mascot.png");
                if (existsSync(mascotPath)) {
                    mascotB64 = readFileSync(mascotPath).toString("base64");
                }
            } catch {}
            const mascotImg = mascotB64
                ? `<img src="data:image/png;base64,${mascotB64}" class="mascot" alt="zalo-agent"/>`
                : "";
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Zalo Agent — QR Login</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;
  background:linear-gradient(135deg,#0a1628 0%,#111d33 50%,#0d1f3c 100%);font-family:system-ui,-apple-system,sans-serif}
.card{text-align:center;padding:2.5rem 2rem;background:rgba(17,29,51,0.9);
  border-radius:20px;max-width:420px;width:90%;
  border:1px solid rgba(59,130,246,0.2);backdrop-filter:blur(10px);
  box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 40px rgba(59,130,246,0.1)}
.mascot{width:80px;height:80px;border-radius:50%;margin-bottom:0.5rem;
  border:2px solid rgba(59,130,246,0.4);box-shadow:0 0 20px rgba(59,130,246,0.2)}
h1{color:#e2e8f0;font-size:1.1rem;font-weight:600;margin:0.5rem 0}
.brand{color:#3b82f6;font-size:0.8rem;margin-bottom:1.5rem;opacity:0.8}
.qr-img{width:260px;height:260px;border-radius:12px;border:3px solid rgba(59,130,246,0.3);
  box-shadow:0 0 30px rgba(59,130,246,0.15)}
.hint{color:#94a3b8;font-size:0.85rem;margin-top:1.2rem;line-height:1.5}
.hint strong{color:#60a5fa}
.success-text{color:#4ade80;font-size:1.3rem;font-weight:bold}
.hidden{display:none}
.footer{color:#475569;font-size:0.7rem;margin-top:1.5rem}
.footer a{color:#3b82f6;text-decoration:none}
</style></head>
<body><div class="card">
<div id="qr-view">
${mascotImg}
<h1>Zalo Agent CLI</h1>
<p class="brand">QR Code Login</p>
<img src="data:image/png;base64,${b64}" class="qr-img" alt="QR Code"/>
<p class="hint">Open <strong>Zalo app</strong> > <strong>QR Scanner</strong> to scan</p>
<p class="footer">Powered by <a href="https://github.com/PhucMPham/zalo-agent-cli">zalo-agent-cli</a></p>
</div>
<div id="success-view" class="hidden">
${mascotImg}
<h1 style="color:#4ade80;font-size:1.5rem;margin:1rem 0">Login Successful!</h1>
<p class="success-text">You can close this page now.</p>
<p class="hint">The CLI is ready to use.</p>
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
        const jsonMode = process.env.ZALO_JSON_MODE === "1";
        let publicIp = null;

        // Auto-detect public IP for VPS users
        try {
            const res = await nodefetch("https://api.ipify.org", { timeout: 3000 });
            publicIp = (await res.text()).trim() || null;
        } catch {}

        if (jsonMode) {
            console.log(JSON.stringify({
                event: "qr_server",
                port: actualPort,
                localUrl: `http://localhost:${actualPort}/qr`,
                publicUrl: publicIp ? `http://${publicIp}:${actualPort}/qr` : null,
            }));
        } else {
            info(`QR available at: http://localhost:${actualPort}/qr`);
            if (publicIp) info(`On VPS, open: http://${publicIp}:${actualPort}/qr`);
            else info(`On VPS, open: http://<your-server-ip>:${actualPort}/qr`);
            info(`If firewall blocks, run: sudo ufw allow ${actualPort}/tcp`);
            info(`Or copy QR file: scp user@vps:~/.zalo-agent/qr.png ./qr.png`);
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
