# Listen Mode — Real-Time Event Monitoring

WebSocket-based event listener with auto-reconnect. Production-safe for months.

## Usage
```bash
zalo-agent listen                                          # Default: messages + friends
zalo-agent listen --filter user --no-self                  # DM only, no self
zalo-agent listen --filter group                           # Groups only
zalo-agent listen --events message,friend,group,reaction   # All event types
zalo-agent listen --auto-accept                            # Auto-accept friend requests
```

## Options
| Flag | Description | Default |
|------|-------------|---------|
| `-e, --events <types>` | message,friend,group,reaction | message,friend |
| `-f, --filter <type>` | user, group, all | all |
| `-w, --webhook <url>` | POST events as JSON to URL | — |
| `--no-self` | Exclude self-sent messages | false |
| `--auto-accept` | Auto-accept friend requests | false |
| `--save <dir>` | Save as JSONL (1 file/thread) | — |
| `--control-port <port>` | Serve `POST /send-file` on 127.0.0.1 | — |

## Sending Files While Listening
Non-image files (csv, xlsx, pdf, video) only finish sending once the `file_done` event arrives on the listener. A separate `msg send-file` has no listener, so it times out after 60s. Opening a second listener closes the running one (Zalo allows one web session). Send through the running listener instead:
```bash
zalo-agent listen --control-port 18930 &
curl -s -X POST http://127.0.0.1:18930/send-file -H 'Content-Type: application/json' \
  -d '{"threadId":"<ID>","paths":["./report.xlsx"],"type":0,"caption":"Báo cáo"}'
# → {"ok":true,"result":{...}}  or  {"ok":false,"error":"..."}
```
- `type`: 0 = user, 1 = group. Relative paths resolve against the `listen` process's working directory.
- Status: 200 files sent · 400/403/404/413/415 bad request · 502 send failed · 504 timed out after 60s.
- On 504, check `maybeSent`: `false` = cancelled, nothing delivered, safe to retry. `true` = every upload was already confirmed and the send may still complete, so do not retry; the caption is not sent in this case. Images and .gif files never wait for confirmation, so they are not timed out.
- The caption is sent as a separate message after the file (except a single lowercase .jpg/.jpeg/.png/.webp, where it stays inline). If only the caption fails, the reply is still 200 with `result.captionError`; do not resend the file. `msg send-file -m` does the same and prints a warning.
- A send keeps running if the client disconnects, so set the client timeout above 60s or a retry can send the file twice.
- Requests with an `Origin` header or a non-loopback `Host` are refused, so web pages cannot use it. Any local non-browser process can.
- zca-js can occasionally miss a `file_done` that arrives before the upload response; that send returns 504.

## Webhook Integration
Forward events to n8n, Make, Zapier, or custom endpoint:
```bash
zalo-agent listen --webhook http://n8n.local/webhook/zalo --no-self
```

Each event = 1 POST request with JSON body:
```json
{"event":"message","msgId":"...","threadId":"...","content":"Hello","isSelf":false}
{"event":"friend_request","threadId":"...","data":{"fromUid":"...","message":"Hi"}}
{"event":"group_join","threadId":"...","data":{...}}
{"event":"reaction","threadId":"...","data":{...}}
```
Route by `event` field in webhook receiver.

## JSONL Save Mode
```bash
zalo-agent listen --save ./zalo-logs
```
Creates 1 `.jsonl` file per thread. Each line = 1 event JSON. Good for analysis/archival.

## JSON Pipe Mode
```bash
zalo-agent --json listen --no-self | while IFS= read -r line; do
  echo "$line" | jq -r '.content // empty'
done
```

## Production Deployment (pm2)
```bash
npm install -g pm2

# Start
pm2 start "zalo-agent listen --webhook http://n8n.local/webhook/zalo --no-self" \
  --name zalo-listener

# Monitor
pm2 logs zalo-listener
pm2 status

# Auto-start on reboot
pm2 startup && pm2 save
```

## Combining Listen + Send
Both use the same WebSocket connection on the same account:
```bash
# Terminal 1: Listen (background)
zalo-agent listen --webhook http://localhost:3000/events &

# Terminal 2: Send (same account)
zalo-agent msg send <ID> "reply"
```

## Reliability
- **Auto-reconnect:** Reconnects on WebSocket drop
- **Auto re-login:** Re-authenticates on session expiry
- **1 WebSocket/account:** Cannot coexist with browser Zalo on same account
- **Event dedup:** Built-in msgId tracking
