<p align="center">
  <img src="assets/mascot.png" width="200" alt="zalo-agent-cli mascot" />
</p>

# zalo-agent-cli

CLI tool for Zalo automation — multi-account, proxy support, bank transfers, QR payments.

Built on top of [zca-js](https://github.com/AKAspanion/zca-js), the unofficial Zalo API library for Node.js.

**[Tiếng Việt](#tiếng-việt)** | **[English](#english)**

---

## English

### Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Command Reference](#command-reference)
- [Multi-Account & Proxy](#multi-account--proxy)
- [Headless / VPS / CI Usage](#headless--vps--ci-usage)
- [Bank Card & QR Payments](#bank-card--qr-payments)
- [Security](#security)
- [Disclaimer](#disclaimer)
- [License](#license)

### Features

- Login via QR code with auto HTTP server (PNG in browser + inline terminal image + base64 data URL)
- Multi-account management with per-account dedicated proxy (1:1 mapping)
- Send text, images, files, contact cards, stickers, reactions
- Send bank cards (55+ Vietnamese banks)
- Generate and send VietQR transfer images via qr.sepay.vn
- Friend management (list, find, add, remove, block, alias, recommendations)
- Group management (create, rename, members, settings, links, notes, invites)
- Conversation management (mute, pin, archive, hidden, auto-delete)
- Auto-reply, quick messages, labels, Zalo Shop catalogs
- Export/import credentials for headless server deployment
- Local HTTP server for QR display on VPS (via SSH tunnel)
- `--json` output on all commands for scripting and coding agents

### Requirements

- **Node.js** >= 20
- **npm** (comes with Node.js)

### Installation

```bash
npm install -g zalo-agent-cli
```

Or run without installing:

```bash
npx zalo-agent-cli login
```

Or clone and link for development:

```bash
git clone https://github.com/PhucMPham/zalo-agent-cli.git
cd zalo-agent-cli
npm install
npm link
```

### Quick Start

#### 1. Login

```bash
zalo-agent login
```

A QR code PNG will be saved and a local HTTP server starts automatically. Open the URL shown in output (e.g. `http://your-ip:18927/qr`) in your browser, then scan with **Zalo app > QR Scanner**. Credentials are auto-saved to `~/.zalo-agent-cli/`.

> **Important:** Use Zalo's built-in QR scanner (not regular phone camera). The QR expires in ~60 seconds.

#### 2. Find a thread ID

A `thread_id` is a user ID (for DMs) or group ID (for group chats). You need it for most messaging commands.

```bash
# Search friends by name → get their thread_id
zalo-agent friend search "Phúc"

# List recent conversations (friends + groups) with thread_id
zalo-agent conv recent

# List only groups
zalo-agent conv recent --groups-only
```

#### 3. Send a message

```bash
# Send to a user (type 0, default)
zalo-agent msg send <THREAD_ID> "Hello from zalo-agent!"

# Send to a group (type 1)
zalo-agent msg send <THREAD_ID> "Hello group!" -t 1
```

#### 4. List friends

```bash
zalo-agent friend list
```

#### 5. Manage your profile

```bash
# View your profile
zalo-agent profile me

# Change avatar
zalo-agent profile avatar /path/to/photo.jpg

# Update bio
zalo-agent profile bio "Phụ tùng ô tô chính hãng"

# View privacy settings
zalo-agent profile settings

# Update a setting (e.g. hide online status)
zalo-agent profile set online-status 0
```

#### 6. Check status

```bash
zalo-agent status
zalo-agent whoami
```

### Command Reference

#### Global Flags

| Flag            | Description                |
| --------------- | -------------------------- |
| `--json`        | Output all results as JSON |
| `-V, --version` | Show version number        |
| `-h, --help`    | Show help                  |

#### Auth

| Command                                               | Description                               |
| ----------------------------------------------------- | ----------------------------------------- |
| `login [--proxy URL] [--credentials PATH] [--qr-url]` | Login via QR or from exported credentials |
| `logout`                                              | Clear current session                     |
| `status`                                              | Show login state                          |
| `whoami`                                              | Show current user profile                 |

#### Messages (`msg`)

| Command                                                                                          | Description                         |
| ------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `msg send <threadId> <text> [-t 0\|1] [--md] [--style specs...]`                                 | Send text message (with formatting) |
| `msg send-image <threadId> <paths...> [-t 0\|1] [-m caption]`                                    | Send images                         |
| `msg send-file <threadId> <paths...> [-t 0\|1] [-m caption]`                                     | Send files                          |
| `msg send-card <threadId> <userId> [-t 0\|1] [--phone NUM]`                                      | Send contact card                   |
| `msg send-bank <threadId> <accountNum> -b BANK [-n name] [-t 0\|1]`                              | Send bank card                      |
| `msg send-qr-transfer <threadId> <accountNum> -b BANK [-a amount] [-m content] [--template tpl]` | Send VietQR transfer image          |
| `msg send-voice <threadId> <voiceUrl> [-t 0\|1] [--ttl ms]`                                      | Send a voice message from URL       |
| `msg send-link <threadId> <url> [-m caption] [-t 0\|1]`                                          | Send link with auto-preview         |
| `msg send-video <threadId> <videoUrl> --thumb <thumbUrl> [-m caption] [-d ms] [-W px] [-H px]`   | Send video from URL                 |
| `msg sticker <threadId> <keyword> [-t 0\|1]`                                                     | Search and send sticker             |
| `msg sticker-list <keyword>`                                                                     | Search stickers (returns IDs)       |
| `msg sticker-detail <stickerIds...>`                                                             | Get sticker details by IDs          |
| `msg sticker-category <categoryId>`                                                              | Get sticker category details        |
| `msg react <msgId> <threadId> <emoji> [-t 0\|1]`                                                 | React to a message                  |
| `msg delete <msgId> <threadId> [-t 0\|1]`                                                        | Delete a message                    |
| `msg forward <msgId> <threadId> [-t 0\|1]`                                                       | Forward a message                   |

> `-t 0` = User (default), `-t 1` = Group

**Text formatting with `--md` (markdown mode):**

```bash
zalo-agent msg send <threadId> "**Bold** *Italic* __Underline__ ~~Strike~~ {red:Red} {big:BIG}" --md
```

| Syntax          | Style         |
| --------------- | ------------- |
| `**text**`      | Bold          |
| `*text*`        | Italic        |
| `__text__`      | Underline     |
| `~~text~~`      | Strikethrough |
| `{red:text}`    | Red text      |
| `{orange:text}` | Orange text   |
| `{yellow:text}` | Yellow text   |
| `{green:text}`  | Green text    |
| `{big:text}`    | Large font    |
| `{small:text}`  | Small font    |

**Manual style with `--style` (for agents/automation):**

```bash
# Format: start:len:style — style names: bold, italic, underline, strikethrough, red, orange, yellow, green, big, small
zalo-agent msg send <threadId> "Hello World" --style 0:5:bold 6:5:italic
```

#### Friends (`friend`)

| Command                                  | Description                                    |
| ---------------------------------------- | ---------------------------------------------- |
| `friend list`                            | List all friends                               |
| `friend search <name>`                   | Search friends by name (get thread_id)         |
| `friend online`                          | List online friends                            |
| `friend find <query>`                    | Find by phone or ID                            |
| `friend info <userId>`                   | Get user profile                               |
| `friend add <userId> [-m msg]`           | Send friend request                            |
| `friend accept <userId>`                 | Accept request                                 |
| `friend remove <userId>`                 | Remove friend                                  |
| `friend block <userId>`                  | Block user                                     |
| `friend unblock <userId>`                | Unblock user                                   |
| `friend last-online <userId>`            | Check last seen                                |
| `friend find-username <username>`        | Find user by Zalo username                     |
| `friend alias <friendId> <alias>`        | Set nickname for a friend                      |
| `friend alias-list [-c count] [-p page]` | List all friend aliases                        |
| `friend alias-remove <friendId>`         | Remove a friend's alias                        |
| `friend reject <userId>`                 | Reject a friend request                        |
| `friend undo-request <userId>`           | Cancel a sent friend request                   |
| `friend sent-requests`                   | List sent friend requests                      |
| `friend request-status <userId>`         | Check friend request status                    |
| `friend close`                           | List close friends                             |
| `friend recommendations`                 | Get friend recommendations & received requests |
| `friend find-phones <phones...>`         | Find users by phone numbers                    |

#### Groups (`group`)

| Command                                              | Description                             |
| ---------------------------------------------------- | --------------------------------------- |
| `group list`                                         | List all groups                         |
| `group create <name> <memberIds...>`                 | Create group                            |
| `group history <groupId> [-n count]`                 | Get chat history (normalized JSON)      |
| `group info <groupId>`                               | Group details                           |
| `group members <groupId>`                            | List members                            |
| `group add-member <groupId> <userIds...>`            | Add members                             |
| `group remove-member <groupId> <userIds...>`         | Remove members                          |
| `group rename <groupId> <name>`                      | Rename                                  |
| `group upgrade-community <groupId>`                  | Upgrade group to Zalo Community         |
| `group leave <groupId>`                              | Leave group                             |
| `group join <link>`                                  | Join via invite link                    |
| `group members-info <userIds...>`                    | Get detailed info for members by IDs    |
| `group settings <groupId> [flags]`                   | Update group settings (see flags below) |
| `group pending <groupId>`                            | List pending member requests (admin)    |
| `group approve <groupId> <userIds...>`               | Approve pending members (admin)         |
| `group reject-member <groupId> <userIds...>`         | Reject pending members (admin)          |
| `group enable-link <groupId>`                        | Enable group invite link                |
| `group disable-link <groupId>`                       | Disable group invite link               |
| `group link-info <groupId>`                          | Get group invite link details           |
| `group blocked <groupId> [-c count] [-p page]`       | List blocked members                    |
| `group note-create <groupId> <title> [--pin]`        | Create a note                           |
| `group note-edit <groupId> <noteId> <title> [--pin]` | Edit a note                             |
| `group invite-boxes`                                 | List received group invitations         |
| `group join-invite <groupId>`                        | Accept a group invitation               |
| `group delete-invite <groupIds...> [--block]`        | Delete invitations                      |
| `group invite-to <userId> <groupIds...>`             | Invite user to groups                   |
| `group disperse <groupId>`                           | Disperse group (irreversible!)          |

**Group settings flags:** `--block-name`, `--sign-admin`, `--msg-history`, `--join-appr`, `--lock-post`, `--lock-poll`, `--lock-msg`, `--lock-view-member` (prefix with `--no-` to disable)

#### Conversations (`conv`)

| Command                                                   | Description                              |
| --------------------------------------------------------- | ---------------------------------------- |
| `conv recent [-n limit] [--friends-only] [--groups-only]` | List recent conversations with thread_id |
| `conv pinned`                                             | List pinned                              |
| `conv archived`                                           | List archived                            |
| `conv mute <threadId> [-t 0\|1] [-d secs]`                | Mute (-1 = forever)                      |
| `conv unmute <threadId> [-t 0\|1]`                        | Unmute                                   |
| `conv read <threadId> [-t 0\|1]`                          | Mark as read                             |
| `conv unread <threadId> [-t 0\|1]`                        | Mark as unread                           |
| `conv hidden`                                             | List hidden conversations                |
| `conv hide <threadIds...> [-t 0\|1]`                      | Hide conversation(s)                     |
| `conv unhide <threadIds...> [-t 0\|1]`                    | Unhide conversation(s)                   |
| `conv hidden-pin <pin>`                                   | Set PIN for hidden conversations         |
| `conv hidden-pin-reset`                                   | Reset hidden conversations PIN           |
| `conv auto-delete-status`                                 | View auto-delete chat settings           |
| `conv auto-delete <threadId> <ttl> [-t 0\|1]`             | Set auto-delete (off, 1d, 7d, 14d)       |
| `conv delete <threadId> [-t 0\|1]`                        | Delete conversation                      |

#### Profile (`profile`)

| Command                                              | Description                                   |
| ---------------------------------------------------- | --------------------------------------------- |
| `profile me`                                         | Show your profile (name, phone, avatar, etc.) |
| `profile avatar <imagePath>`                         | Change profile avatar                         |
| `profile bio [text]`                                 | View or update bio/status                     |
| `profile update [-n name] [-d YYYY-MM-DD] [-g 0\|1]` | Update name, birthday, gender                 |
| `profile avatars [-c count] [-p page]`               | List avatar gallery                           |
| `profile full-avatar <friendId>`                     | Get full-size avatar URL                      |
| `profile avatar-url <friendIds...>`                  | Get avatar URLs for users                     |
| `profile delete-avatar <photoIds...>`                | Delete avatar(s) from gallery                 |
| `profile reuse-avatar <photoId>`                     | Reuse a previous avatar                       |
| `profile settings`                                   | View privacy settings                         |
| `profile set <setting> <value>`                      | Update a privacy setting                      |

**Privacy settings:** `online-status`, `seen-status`, `birthday`, `receive-msg`, `accept-call`, `add-by-phone`, `add-by-qr`, `add-by-group`, `recommend`

#### Polls (`poll`)

| Command                                          | Description                                  |
| ------------------------------------------------ | -------------------------------------------- |
| `poll create <groupId> <question> <options...>`  | Create a poll (see flags below)              |
| `poll info <pollId>`                             | View poll details and vote results           |
| `poll vote <pollId> <optionIds...>`              | Vote on a poll (option IDs from `poll info`) |
| `poll unvote <pollId>`                           | Remove your vote                             |
| `poll add-option <pollId> <options...> [--vote]` | Add new options to a poll                    |
| `poll lock <pollId>`                             | Close a poll (no more votes)                 |
| `poll share <pollId>`                            | Share a poll                                 |

**Poll create flags:** `--multi` (multiple choices), `--add-options` (members can add options), `--anonymous` (hide voters), `--hide-preview` (hide results until voted), `--expire <minutes>` (auto-close)

**Example:**

```bash
# Create a multi-choice poll with 3 options, auto-close after 60 minutes
zalo-agent poll create <groupId> "Chọn ngày họp" "Thứ 2" "Thứ 4" "Thứ 6" --multi --expire 60

# View results
zalo-agent poll info <pollId>

# Vote for option IDs 123 and 456
zalo-agent poll vote <pollId> 123 456

# Close the poll
zalo-agent poll lock <pollId>
```

#### Reminders (`reminder`)

| Command                                                                                              | Description                             |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `reminder create <threadId> <title> [-t 0\|1] [--time "YYYY-MM-DD HH:mm"] [--repeat mode] [--emoji]` | Create a reminder                       |
| `reminder list <threadId> [-t 0\|1] [-n count]`                                                      | List reminders                          |
| `reminder info <reminderId>`                                                                         | View reminder details (group only)      |
| `reminder responses <reminderId>`                                                                    | View who accepted/rejected (group only) |
| `reminder edit <reminderId> <threadId> <title> [-t 0\|1] [--time] [--repeat] [--emoji]`              | Edit a reminder                         |
| `reminder remove <reminderId> <threadId> [-t 0\|1]`                                                  | Remove a reminder                       |

**Repeat modes:** `none`, `daily`, `weekly`, `monthly`

**Example:**

```bash
# Create a daily reminder in a group at 9:00 AM tomorrow
zalo-agent reminder create <groupId> "Standup meeting" -t 1 --time "2026-03-16 09:00" --repeat daily

# List reminders in a group
zalo-agent reminder list <groupId> -t 1

# View who responded
zalo-agent reminder responses <reminderId>

# Edit reminder title and time
zalo-agent reminder edit <reminderId> <groupId> "New title" -t 1 --time "2026-03-17 10:00"

# Remove a reminder
zalo-agent reminder remove <reminderId> <groupId> -t 1
```

#### Auto-Reply (`auto-reply`)

| Command                                                                           | Description               |
| --------------------------------------------------------------------------------- | ------------------------- |
| `auto-reply list`                                                                 | List all auto-reply rules |
| `auto-reply create <content> [--enable] [--start ms] [--end ms] [--scope n]`      | Create auto-reply         |
| `auto-reply update <id> <content> [--enable] [--start ms] [--end ms] [--scope n]` | Update auto-reply         |
| `auto-reply delete <id>`                                                          | Delete auto-reply         |

**Scope:** `0`=all, `1`=friends, `2`=strangers

#### Quick Messages (`quick-msg`)

| Command                                       | Description               |
| --------------------------------------------- | ------------------------- |
| `quick-msg list`                              | List saved quick messages |
| `quick-msg add <keyword> <title>`             | Add a quick message       |
| `quick-msg update <itemId> <keyword> <title>` | Update a quick message    |
| `quick-msg remove <itemIds...>`               | Remove quick message(s)   |

#### Labels (`label`)

| Command               | Description                      |
| --------------------- | -------------------------------- |
| `label list`          | List all conversation labels     |
| `label update <json>` | Update labels (raw JSON payload) |

#### Catalog / Shop (`catalog`)

| Command                                                                                   | Description                        |
| ----------------------------------------------------------------------------------------- | ---------------------------------- |
| `catalog list [-l limit] [-p page]`                                                       | List all catalogs                  |
| `catalog create <name>`                                                                   | Create a catalog                   |
| `catalog rename <catalogId> <name>`                                                       | Rename a catalog                   |
| `catalog delete <catalogId>`                                                              | Delete a catalog                   |
| `catalog products <catalogId> [-l limit] [-p page]`                                       | List products in a catalog         |
| `catalog add-product <catalogId> <name> <price> <desc> [--photos urls...]`                | Add product                        |
| `catalog update-product <catalogId> <productId> <name> <price> <desc> [--photos urls...]` | Update product                     |
| `catalog delete-product <catalogId> <productIds...>`                                      | Delete product(s)                  |
| `catalog upload-photo <filePath>`                                                         | Upload product photo (returns URL) |

> Catalog/Shop APIs require a Zalo Business account.

#### Accounts (`account`)

| Command                                         | Description                           |
| ----------------------------------------------- | ------------------------------------- |
| `account list`                                  | List all registered accounts          |
| `account login [-p proxy] [-n name] [--qr-url]` | Login new account with optional proxy |
| `account switch <ownerId>`                      | Switch active account                 |
| `account remove <ownerId>`                      | Remove account + credentials          |
| `account info`                                  | Show active account                   |
| `account export [ownerId] [-o path]`            | Export credentials for transfer       |

#### Listener (`listen`)

```bash
# Listen for messages (default: message + friend events)
zalo-agent listen

# Filter: DM only, with webhook
zalo-agent listen -f user -w https://your-n8n.com/webhook/zalo

# Save messages locally as JSONL (one file per thread)
zalo-agent listen --save ./zalo-logs

# JSON mode for piping + save locally + webhook
zalo-agent --json listen --save ./zalo-logs -w https://webhook.url

# Auto-accept friend requests
zalo-agent listen --auto-accept
```

**Flags:** `-e` events (message,friend,group,reaction), `-f` filter (user,group,all), `-w` webhook URL, `--save <dir>` local JSONL storage, `--no-self` exclude own messages, `--auto-accept` auto-accept friend requests

**JSONL storage format:** One file per thread (`<threadId>.jsonl`), each line is a JSON object with event data + `savedAt` timestamp. Useful as workaround for chat history — Zalo API only returns ~20 recent messages.

### Multi-Account & Proxy

Each Zalo account can be bound to its own dedicated proxy (1:1 mapping).

```bash
# Login account via residential proxy
zalo-agent account login --proxy "http://user:pass@proxy:8080" --name "Shop A"

# Login another account via different proxy
zalo-agent account login --proxy "socks5://user:pass@proxy2:1080" --name "Shop B"

# List accounts (proxy passwords are always masked)
zalo-agent account list
#   ★  356721...  Shop A   http://user:***@proxy:8080
#      789012...  Shop B   socks5://user:***@proxy2:1080

# Switch between accounts
zalo-agent account switch 789012...
```

**Important notes:**

- Zalo enforces 1 account = 1 device (IMEI). Each QR login auto-generates a unique IMEI.
- Use 1 dedicated proxy per account — sharing proxies risks both accounts being flagged.
- Supported proxy protocols: `http://`, `https://`, `socks5://`
- Proxy passwords are **never** displayed in output — always masked as `***`.

### Headless / VPS / CI Usage

#### Option A: QR via browser (recommended)

```bash
# On VPS — QR HTTP server starts automatically
zalo-agent login
# Output: QR available at http://your-vps-ip:18927/qr

# Open the URL in your browser, scan with Zalo app > QR Scanner
```

> The server auto-detects your public IP and tries ports 18927, 8080, 3000, 9000.
> Make sure at least one port is open in your firewall.

#### Option B: Export/import credentials

```bash
# On local machine — login and export
zalo-agent login
zalo-agent account export --output ./creds.json

# Transfer to server
scp ./creds.json user@server:~/

# On server — import (no QR needed)
zalo-agent login --credentials ~/creds.json
```

### Bank Card & QR Payments

#### Send bank card (55+ Vietnamese banks)

```bash
# By bank name
zalo-agent msg send-bank THREAD_ID 0123456789 --bank ocb

# With holder name
zalo-agent msg send-bank THREAD_ID 0123456789 --bank vietcombank --name "NGUYEN VAN A"
```

#### Send VietQR transfer image

```bash
# Basic QR
zalo-agent msg send-qr-transfer THREAD_ID 0123456789 --bank ocb

# With amount + content + template
zalo-agent msg send-qr-transfer THREAD_ID 0123456789 --bank vcb \
  --amount 500000 --content "thanh toan don hang" --template qronly
```

Templates: `compact` (VietQR frame, default), `print` (logo V), `qronly` (bare QR)

Transfer content: max 50 characters (VietQR/NAPAS spec).

### Security

- Credentials stored at `~/.zalo-agent-cli/credentials/` with **0600** file permissions (owner-only)
- Proxy configuration stored separately from credential files
- Proxy passwords **never** shown in CLI output — always masked
- QR HTTP server binds to `127.0.0.1` only (not externally accessible)
- Exported credential files created with **0600** permissions + security warning

#### Storage layout

```
~/.zalo-agent-cli/
├── accounts.json              # Account registry (ownId, name, proxy, active)
├── credentials/
│   ├── cred_<ownId1>.json     # Per-account credentials (0600)
│   └── cred_<ownId2>.json
└── qr.png                     # Last generated QR code
```

### Disclaimer

> ⚠️ **Warning:** This tool uses [zca-js](https://github.com/AKAspanion/zca-js), an **unofficial** Zalo API library. Zalo does not support this and **your account may be banned**. Use at your own risk.

This is an **unofficial** project and is **not affiliated with, endorsed by, or connected to Zalo or VNG Corporation**. See [DISCLAIMER.md](DISCLAIMER.md) for full details.

### License

[MIT](LICENSE)

---

## Tiếng Việt

### Mục lục

- [Tính năng](#tính-năng)
- [Yêu cầu](#yêu-cầu)
- [Cài đặt](#cài-đặt)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Danh sách lệnh](#danh-sách-lệnh)
- [Đa tài khoản & Proxy](#đa-tài-khoản--proxy)
- [Sử dụng trên VPS / Headless / CI](#sử-dụng-trên-vps--headless--ci)
- [Thẻ ngân hàng & Thanh toán QR](#thẻ-ngân-hàng--thanh-toán-qr)
- [Bảo mật](#bảo-mật)
- [Tuyên bố miễn trừ](#tuyên-bố-miễn-trừ)

### Tính năng

- Đăng nhập bằng mã QR qua HTTP server tự động (PNG trên browser + inline terminal + base64)
- Quản lý đa tài khoản với proxy riêng biệt cho từng tài khoản (1:1)
- Gửi tin nhắn, hình ảnh, file, danh thiếp, sticker, reaction
- Gửi thẻ ngân hàng (55+ ngân hàng Việt Nam)
- Tạo và gửi ảnh QR chuyển khoản qua qr.sepay.vn
- Quản lý bạn bè (danh sách, tìm kiếm, thêm, xóa, chặn, biệt danh, gợi ý)
- Quản lý nhóm (tạo, đổi tên, thành viên, cài đặt, link, ghi chú, lời mời)
- Quản lý hội thoại (tắt thông báo, ghim, lưu trữ, ẩn, tự xóa)
- Trả lời tự động, tin nhắn nhanh, nhãn, cửa hàng Zalo Shop
- Xuất/nhập credentials cho triển khai trên server
- HTTP server local hiển thị QR cho VPS (qua SSH tunnel)
- Output `--json` cho mọi lệnh, phục vụ scripting và coding agent

### Yêu cầu

- **Node.js** >= 20
- **npm** (đi kèm Node.js)

### Cài đặt

```bash
npm install -g zalo-agent-cli
```

Hoặc chạy không cần cài:

```bash
npx zalo-agent-cli login
```

Hoặc clone để phát triển:

```bash
git clone https://github.com/PhucMPham/zalo-agent-cli.git
cd zalo-agent-cli
npm install
npm link
```

### Bắt đầu nhanh

#### 1. Đăng nhập

```bash
zalo-agent login
```

HTTP server tự khởi động và hiện URL (ví dụ `http://ip:18927/qr`). Mở URL trên trình duyệt, quét bằng **Zalo app > Quét mã QR** (không dùng camera thường). Thông tin đăng nhập tự động lưu tại `~/.zalo-agent-cli/`.

#### 2. Tìm thread ID

`thread_id` là ID của người dùng (tin nhắn riêng) hoặc ID nhóm (nhóm chat). Bạn cần nó cho hầu hết các lệnh gửi tin.

```bash
# Tìm bạn bè theo tên → lấy thread_id
zalo-agent friend search "Phúc"

# Xem danh sách hội thoại gần đây (bạn bè + nhóm) kèm thread_id
zalo-agent conv recent

# Chỉ xem nhóm
zalo-agent conv recent --groups-only
```

#### 3. Gửi tin nhắn

```bash
# Gửi cho cá nhân (type 0, mặc định)
zalo-agent msg send <THREAD_ID> "Xin chào!"

# Gửi vào nhóm (type 1)
zalo-agent msg send <THREAD_ID> "Xin chào nhóm!" -t 1
```

#### 4. Xem danh sách bạn bè

```bash
zalo-agent friend list
```

#### 5. Quản lý hồ sơ cá nhân

```bash
# Xem hồ sơ
zalo-agent profile me

# Đổi ảnh đại diện
zalo-agent profile avatar /đường/dẫn/ảnh.jpg

# Cập nhật tiểu sử
zalo-agent profile bio "Phụ tùng ô tô chính hãng"

# Xem cài đặt quyền riêng tư
zalo-agent profile settings

# Thay đổi cài đặt (VD: ẩn trạng thái online)
zalo-agent profile set online-status 0
```

#### 6. Tạo khảo sát (Poll) trong nhóm

```bash
# Tạo poll multi-choice, tự đóng sau 60 phút
zalo-agent poll create <groupId> "Chọn ngày họp" "Thứ 2" "Thứ 4" "Thứ 6" --multi --expire 60

# Xem kết quả
zalo-agent poll info <pollId>

# Bỏ phiếu (dùng option ID từ poll info)
zalo-agent poll vote <pollId> 123 456

# Đóng poll
zalo-agent poll lock <pollId>
```

#### 7. Nhắc nhở (Reminder)

```bash
# Tạo nhắc nhở hàng ngày trong nhóm lúc 9h sáng
zalo-agent reminder create <groupId> "Họp standup" -t 1 --time "2026-03-16 09:00" --repeat daily

# Xem danh sách nhắc nhở
zalo-agent reminder list <groupId> -t 1

# Xem ai đã chấp nhận/từ chối
zalo-agent reminder responses <reminderId>

# Sửa nhắc nhở
zalo-agent reminder edit <reminderId> <groupId> "Tiêu đề mới" -t 1 --time "2026-03-17 10:00"

# Xóa nhắc nhở
zalo-agent reminder remove <reminderId> <groupId> -t 1
```

Chế độ lặp: `none` (không lặp), `daily` (hàng ngày), `weekly` (hàng tuần), `monthly` (hàng tháng)

### Danh sách lệnh

Xem đầy đủ tại [phần tiếng Anh](#command-reference) phía trên. Tất cả lệnh đều giống nhau.

### Đa tài khoản & Proxy

Mỗi tài khoản Zalo có thể gắn với 1 proxy riêng biệt.

```bash
# Đăng nhập qua proxy
zalo-agent account login --proxy "http://user:pass@proxy:8080" --name "Shop A"

# Xem danh sách (mật khẩu proxy luôn bị ẩn)
zalo-agent account list

# Chuyển tài khoản
zalo-agent account switch <ID>
```

**Lưu ý quan trọng:**

- Zalo giới hạn 1 tài khoản = 1 thiết bị (IMEI). Mỗi lần quét QR tự tạo IMEI mới.
- Dùng 1 proxy riêng cho mỗi tài khoản — dùng chung proxy có nguy cơ bị khóa cả 2.
- Hỗ trợ: `http://`, `https://`, `socks5://`
- Mật khẩu proxy **không bao giờ** hiển thị — luôn bị ẩn thành `***`.

### Sử dụng trên VPS / Headless / CI

#### Cách A: QR qua trình duyệt (khuyến nghị)

```bash
# Trên VPS — HTTP server tự động khởi động
zalo-agent login
# Output: QR available at http://ip-vps:18927/qr

# Mở URL trên trình duyệt, quét bằng Zalo app > Quét mã QR
```

> Server tự detect IP public và thử port 18927, 8080, 3000, 9000.
> Đảm bảo ít nhất 1 port mở trong firewall.

#### Cách B: Xuất/nhập credentials

```bash
# Trên máy local
zalo-agent login
zalo-agent account export --output ./creds.json

# Chuyển sang server
scp ./creds.json user@server:~/

# Trên server (không cần QR)
zalo-agent login --credentials ~/creds.json
```

### Thẻ ngân hàng & Thanh toán QR

#### Gửi thẻ ngân hàng (55+ ngân hàng VN)

```bash
zalo-agent msg send-bank THREAD_ID 0123456789 --bank ocb
zalo-agent msg send-bank THREAD_ID 0123456789 --bank vietcombank --name "NGUYEN VAN A"
```

#### Gửi QR chuyển khoản VietQR

```bash
zalo-agent msg send-qr-transfer THREAD_ID 0123456789 --bank vcb \
  --amount 500000 --content "thanh toan" --template qronly
```

Template: `compact` (khung VietQR), `print` (logo V), `qronly` (chỉ mã QR)

Nội dung chuyển khoản: tối đa 50 ký tự (theo chuẩn VietQR/NAPAS).

### Bảo mật

- Credentials lưu tại `~/.zalo-agent-cli/credentials/` với quyền **0600** (chỉ chủ sở hữu đọc được)
- Cấu hình proxy lưu riêng, không nằm trong file credentials
- Mật khẩu proxy **không bao giờ** hiển thị — luôn bị ẩn
- HTTP server QR chỉ lắng nghe `127.0.0.1` (không truy cập từ bên ngoài)

### Tuyên bố miễn trừ

> ⚠️ **Cảnh báo:** Tool này sử dụng [zca-js](https://github.com/AKAspanion/zca-js) — thư viện gọi API Zalo **không chính thức**. Zalo không hỗ trợ và **tài khoản của bạn có thể bị khóa (ban)**. Dùng trên tinh thần tự chịu trách nhiệm.

Đây là dự án **không chính thức** và **không liên kết với Zalo hay Tập đoàn VNG**. Xem [DISCLAIMER.md](DISCLAIMER.md) để biết chi tiết.

### Giấy phép

[MIT](LICENSE)
