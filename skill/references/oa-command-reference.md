# Official Account (OA) Command Reference

Zalo OA API v3.0 — official API, separate from personal account.

## Setup

```bash
# Interactive wizard (human)
zalo-agent oa init

# Non-interactive (AI agent / CI)
zalo-agent oa init --app-id <ID> --secret <KEY> --skip-webhook
zalo-agent oa init --app-id <ID> --secret <KEY> --tunnel ngrok -p 3000
zalo-agent oa init --app-id <ID> --secret <KEY> --webhook-url https://server.com/webhook

# Manual login
zalo-agent oa login --app-id <ID> --secret <KEY>

# VPS login (headless — binds 0.0.0.0, prints auth URL)
zalo-agent oa login --app-id <ID> --secret <KEY> --callback-host https://vps.com

# Refresh token (~25h expiry)
zalo-agent oa refresh

# Manual token set
zalo-agent oa setup <access-token>

# Check connection
zalo-agent oa whoami
```

## Messaging

Message types: `cs` (customer service), `transaction`, `promotion`.

```bash
zalo-agent oa msg text <user-id> "message" [-m cs]
zalo-agent oa msg image <user-id> --image-url https://...
zalo-agent oa msg image <user-id> --image-id <attachment_id>
zalo-agent oa msg file <user-id> <file-token>
zalo-agent oa msg list <user-id> '[{"title":"A","subtitle":"B"}]'
zalo-agent oa msg status <message-id>
```

## Followers

```bash
zalo-agent oa follower list [--offset 0] [--count 50]
zalo-agent oa follower info <user-id>
zalo-agent oa follower update <user-id> '{"name":"...","phone":"..."}'
```

## Tags

```bash
zalo-agent oa tag list
zalo-agent oa tag assign <user-id> <tag-name>
zalo-agent oa tag remove <tag-name>
zalo-agent oa tag untag <user-id> <tag-name>
```

## Media Upload

```bash
zalo-agent oa upload image ./photo.jpg   # Returns attachment_id
zalo-agent oa upload file ./doc.pdf      # Returns file token
```

## Conversations

```bash
zalo-agent oa conv recent [--offset 0] [--count 10]
zalo-agent oa conv history <user-id> [--offset 0] [--count 10]
```

## Webhook Listener

```bash
zalo-agent oa listen -p 3000                           # Basic
zalo-agent oa listen -p 3000 -s <OA_SECRET>            # MAC verify
zalo-agent oa listen -e user_send_text,follow           # Filter events
zalo-agent oa listen --verify-domain <CODE>             # Domain verification
zalo-agent oa listen --no-verify                        # Skip MAC (dev)
zalo-agent --json oa listen                             # JSON pipe
```

Events: follow, unfollow, user_send_text, user_send_image, user_send_file, user_send_location, user_send_sticker, user_send_gif, user_click_button, user_click_link

## Menu, Articles, Store

```bash
zalo-agent oa menu '{"buttons":[...]}'
zalo-agent oa article create '{"title":"..."}' | list | detail <id>
zalo-agent oa store product-create | product-list | product-info <id>
zalo-agent oa store category-create | category-list
zalo-agent oa store order-create '{"...":"..."}'
```

## Multi-OA

```bash
zalo-agent oa login --app-id <ID1> --secret <K1> --oa-id shop1
zalo-agent oa login --app-id <ID2> --secret <K2> --oa-id shop2
zalo-agent oa whoami --oa-id shop1
zalo-agent oa msg text <uid> "Hi" --oa-id shop2
```

## Credentials

Stored: `~/.zalo-agent/oa-credentials.json` (chmod 600)

Contains: appId, secretKey, accessToken, refreshToken, expiresIn, webhookUrl, verifyCode

## Common Errors

| Code | Meaning | Fix |
|------|---------|-----|
| -216 | Invalid access token | `oa refresh` or `oa login` |
| -224 | OA tier too low | Upgrade at zalo.cloud/oa/pricing |
| -14029 | App not approved | Verify app at developers.zalo.me |

## Webhook Setup Checklist

1. developers.zalo.me → Official Account → Callback URL: `http://localhost:3456/callback`
2. Đăng ký sử dụng API → Official Account API → toggle ON
3. Official Account → Chọn quyền → tick all → Lưu
4. Xác thực domain (serve verification file or meta tag)
5. Webhook → set HTTPS URL → bật events
