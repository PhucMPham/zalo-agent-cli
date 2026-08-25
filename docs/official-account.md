# Zalo Official Account (OA)

Quản lý Zalo Official Account qua API v3.0 chính thức. Độc lập hoàn toàn với tài khoản cá nhân (zca-js).

> **Lưu ý:** Một số API cần upgrade OA tier. Xem [zalo.cloud/oa/pricing](https://zalo.cloud/oa/pricing).

## Bắt đầu nhanh

### Interactive (con người)

```bash
zalo-agent oa init
```

Wizard hướng dẫn từng bước: nhập credentials → OAuth login → webhook setup.

### Non-interactive (AI agent / CI)

```bash
# Login + skip webhook
zalo-agent oa init --app-id <APP_ID> --secret <SECRET> --skip-webhook

# Login + ngrok tunnel
zalo-agent oa init --app-id <APP_ID> --secret <SECRET> --tunnel ngrok -p 3000

# Login + existing webhook URL (VPS/n8n)
zalo-agent oa init --app-id <APP_ID> --secret <SECRET> --webhook-url https://your-server.com/webhook

# JSON output
zalo-agent --json oa init --app-id <APP_ID> --secret <SECRET> --skip-webhook
```

### VPS (headless server)

```bash
# On VPS — starts callback server on 0.0.0.0
zalo-agent oa login --app-id <APP_ID> --secret <SECRET> --callback-host https://your-vps.com

# Copy the auth URL → open in local browser → authorize → VPS receives token
```

---

## Lệnh

### Setup & Auth

| Lệnh | Mô tả |
|-------|--------|
| `oa init` | Guided setup wizard (interactive + non-interactive) |
| `oa login --app-id <id> --secret <key>` | OAuth login (mở browser) |
| `oa login ... --callback-host <url>` | OAuth login từ VPS |
| `oa refresh` | Làm mới access token (dùng refresh token) |
| `oa setup <access-token>` | Set token thủ công (bỏ qua OAuth) |
| `oa whoami` | Xem thông tin OA |

### Tin nhắn

```bash
# Gửi text (message type: cs | transaction | promotion)
zalo-agent oa msg text <user-id> "Nội dung" [-m cs]

# Gửi ảnh (URL hoặc attachment_id)
zalo-agent oa msg image <user-id> --image-url https://...
zalo-agent oa msg image <user-id> --image-id <attachment_id>

# Gửi file — upload và gửi trong một lệnh
zalo-agent oa msg file <user-id> --file ./document.pdf

# Hoặc dùng token đã upload trước đó
zalo-agent oa msg file <user-id> <file-token>

# Gửi danh sách
zalo-agent oa msg list <user-id> '[{"title":"Item 1"},{"title":"Item 2"}]'

# Kiểm tra trạng thái
zalo-agent oa msg status <message-id>
```

### Follower

```bash
zalo-agent oa follower list [--offset 0] [--count 50]
zalo-agent oa follower info <user-id>
zalo-agent oa follower update <user-id> '{"name":"...","phone":"..."}'
```

### Tag

```bash
zalo-agent oa tag list
zalo-agent oa tag assign <user-id> <tag-name>
zalo-agent oa tag remove <tag-name>
zalo-agent oa tag untag <user-id> <tag-name>
```

### Media Upload

```bash
zalo-agent oa upload image ./photo.jpg    # Returns attachment_id
zalo-agent oa upload file ./document.pdf  # Returns file token
```

Upload dùng endpoint `v2.0` (Zalo không có endpoint upload trên `v3.0`).
Giới hạn: ảnh 1 MB, file 5 MB. File token chỉ dùng được với `oa msg file`.

### Hội thoại

```bash
zalo-agent oa conv recent [--offset 0] [--count 10]
zalo-agent oa conv history <user-id> [--offset 0] [--count 10]
```

### Webhook Listener

```bash
# Cơ bản
zalo-agent oa listen -p 3000

# Với MAC verification
zalo-agent oa listen -p 3000 -s <OA_SECRET_KEY>

# Lọc events
zalo-agent oa listen -e user_send_text,follow

# Domain verification
zalo-agent oa listen -p 3000 --verify-domain <ZALO_VERIFY_CODE>

# JSON output (pipe)
zalo-agent --json oa listen | while read -r event; do
  echo "$event" | jq '.message.text'
done
```

**Events hỗ trợ:** `follow`, `unfollow`, `user_send_text`, `user_send_image`, `user_send_file`, `user_send_location`, `user_send_sticker`, `user_send_gif`, `user_click_button`, `user_click_link`

### Khác

```bash
zalo-agent oa menu '{"buttons":[...]}'         # Cập nhật menu OA
zalo-agent oa article create '{"title":"..."}'  # Tạo bài viết
zalo-agent oa article list                      # Danh sách bài viết
zalo-agent oa store product-list                # Danh sách sản phẩm
zalo-agent oa store category-list               # Danh mục
```

---

## Webhook Setup

### Yêu cầu từ Zalo

1. **Domain verification** — Zalo cần verify domain trước khi dùng webhook
2. **HTTPS required** — webhook URL phải là HTTPS
3. **IP Việt Nam** — để nhận đầy đủ thông tin user (tên, avatar, SĐT)
4. **Trả về 200 OK** — trong vòng 5 giây

### Các cách expose webhook

| Cách | Ưu điểm | Nhược điểm |
|------|----------|------------|
| **ngrok** | Nhanh nhất, 1 lệnh | IP Singapore, URL thay đổi mỗi lần |
| **cloudflared** | Free, stable | Cần Cloudflare account |
| **VPS** | IP VN, ổn định | Cần quản lý server |
| **n8n** | Visual workflow | Cần deploy n8n |

### Với ngrok

```bash
# Terminal 1: listener
zalo-agent oa listen -p 3000 --no-verify --verify-domain <CODE>

# Terminal 2: tunnel
ngrok http 3000
```

### Với VPS (khuyến nghị cho production)

```bash
# Install trên VPS
npm install -g zalo-agent-cli

# Login từ VPS
zalo-agent oa login --app-id <ID> --secret <KEY> --callback-host https://your-vps.com

# Run listener
zalo-agent oa listen -p 3000 -s <SECRET>

# Dùng systemd/pm2 để keep alive
pm2 start "zalo-agent oa listen -p 3000 -s <SECRET>" --name zalo-oa
```

---

## Credentials

Lưu tại `~/.zalo-agent/oa-credentials.json` (quyền 0600, chỉ owner đọc được).

```json
{
  "default": {
    "appId": "...",
    "secretKey": "...",
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 90000,
    "updatedAt": "2026-03-17T..."
  }
}
```

**Multi-OA:** Dùng `--oa-id` để quản lý nhiều OA:

```bash
zalo-agent oa login --app-id <ID1> --secret <KEY1> --oa-id shop1
zalo-agent oa login --app-id <ID2> --secret <KEY2> --oa-id shop2
zalo-agent oa whoami --oa-id shop1
zalo-agent oa whoami --oa-id shop2
```

---

## Security

- Credentials file: `chmod 600` (owner-only)
- MAC verification: HMAC-SHA256 with timing-safe comparison
- Message type whitelist: `cs`, `transaction`, `promotion` only
- Webhook body size limit: 1MB max
- OAuth callback: binds `127.0.0.1` (local) or `0.0.0.0` (VPS mode)
- No hardcoded secrets — all from CLI flags or credential file

---

## So sánh

| | `zalo-agent` (personal) | `zalo-agent oa` (official) |
|---|---|---|
| API | Unofficial (zca-js) | Official (Zalo OA API v3.0) |
| Auth | QR code login | OAuth 2.0 |
| Scope | Tài khoản cá nhân | Official Account |
| Risk | Có thể bị ban | An toàn, API chính thức |
| Features | Chat, friend, group, poll... | Messaging, follower, tag, store, webhook |
