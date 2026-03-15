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
- Friend management (list, find, add, remove, block)
- Group management (create, rename, add/remove members)
- Conversation management (mute, pin, archive, read/unread)
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

#### 2. Send a message

```bash
zalo-agent msg send <THREAD_ID> "Hello from zalo-agent!"
```

#### 3. List friends

```bash
zalo-agent friend list
```

#### 4. Check status

```bash
zalo-agent status
zalo-agent whoami
```

### Command Reference

#### Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output all results as JSON |
| `-V, --version` | Show version number |
| `-h, --help` | Show help |

#### Auth

| Command | Description |
|---------|-------------|
| `login [--proxy URL] [--credentials PATH] [--qr-url]` | Login via QR or from exported credentials |
| `logout` | Clear current session |
| `status` | Show login state |
| `whoami` | Show current user profile |

#### Messages (`msg`)

| Command | Description |
|---------|-------------|
| `msg send <threadId> <text> [-t 0\|1]` | Send text message |
| `msg send-image <threadId> <paths...> [-t 0\|1] [-m caption]` | Send images |
| `msg send-file <threadId> <paths...> [-t 0\|1] [-m caption]` | Send files |
| `msg send-card <threadId> <userId> [-t 0\|1] [--phone NUM]` | Send contact card |
| `msg send-bank <threadId> <accountNum> -b BANK [-n name] [-t 0\|1]` | Send bank card |
| `msg send-qr-transfer <threadId> <accountNum> -b BANK [-a amount] [-m content] [--template tpl]` | Send VietQR transfer image |
| `msg sticker <threadId> <keyword> [-t 0\|1]` | Search and send sticker |
| `msg react <msgId> <threadId> <emoji> [-t 0\|1]` | React to a message |
| `msg delete <msgId> <threadId> [-t 0\|1]` | Delete a message |
| `msg forward <msgId> <threadId> [-t 0\|1]` | Forward a message |

> `-t 0` = User (default), `-t 1` = Group

#### Friends (`friend`)

| Command | Description |
|---------|-------------|
| `friend list` | List all friends |
| `friend online` | List online friends |
| `friend find <query>` | Find by phone or ID |
| `friend info <userId>` | Get user profile |
| `friend add <userId> [-m msg]` | Send friend request |
| `friend accept <userId>` | Accept request |
| `friend remove <userId>` | Remove friend |
| `friend block <userId>` | Block user |
| `friend unblock <userId>` | Unblock user |
| `friend last-online <userId>` | Check last seen |

#### Groups (`group`)

| Command | Description |
|---------|-------------|
| `group list` | List all groups |
| `group create <name> <memberIds...>` | Create group |
| `group info <groupId>` | Group details |
| `group members <groupId>` | List members |
| `group add-member <groupId> <userIds...>` | Add members |
| `group remove-member <groupId> <userIds...>` | Remove members |
| `group rename <groupId> <name>` | Rename |
| `group leave <groupId>` | Leave group |
| `group join <link>` | Join via invite link |

#### Conversations (`conv`)

| Command | Description |
|---------|-------------|
| `conv pinned` | List pinned |
| `conv archived` | List archived |
| `conv mute <threadId> [-t 0\|1] [-d secs]` | Mute (-1 = forever) |
| `conv unmute <threadId> [-t 0\|1]` | Unmute |
| `conv read <threadId> [-t 0\|1]` | Mark as read |
| `conv unread <threadId> [-t 0\|1]` | Mark as unread |
| `conv delete <threadId> [-t 0\|1]` | Delete conversation |

#### Accounts (`account`)

| Command | Description |
|---------|-------------|
| `account list` | List all registered accounts |
| `account login [-p proxy] [-n name] [--qr-url]` | Login new account with optional proxy |
| `account switch <ownerId>` | Switch active account |
| `account remove <ownerId>` | Remove account + credentials |
| `account info` | Show active account |
| `account export [ownerId] [-o path]` | Export credentials for transfer |

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
- Quản lý bạn bè (danh sách, tìm kiếm, thêm, xóa, chặn)
- Quản lý nhóm (tạo, đổi tên, thêm/xóa thành viên)
- Quản lý hội thoại (tắt thông báo, ghim, lưu trữ)
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

#### 2. Gửi tin nhắn

```bash
zalo-agent msg send <THREAD_ID> "Xin chào!"
```

#### 3. Xem danh sách bạn bè

```bash
zalo-agent friend list
```

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
