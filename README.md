<p align="center">
  <img src="assets/mascot.png" width="120" alt="zalo-agent-cli mascot" />
</p>

# zalo-agent-cli

<p align="center">
  <img src="assets/demo.gif" alt="zalo-agent-cli demo" />
</p>

[![npm version](https://img.shields.io/npm/v/zalo-agent-cli.svg)](https://www.npmjs.com/package/zalo-agent-cli)
[![npm downloads](https://img.shields.io/npm/dm/zalo-agent-cli.svg)](https://www.npmjs.com/package/zalo-agent-cli)
[![npm total downloads](https://img.shields.io/npm/dt/zalo-agent-cli.svg)](https://www.npmjs.com/package/zalo-agent-cli)
[![license](https://img.shields.io/npm/l/zalo-agent-cli.svg)](https://github.com/PhucMPham/zalo-agent-cli/blob/main/LICENSE)

Công cụ CLI tự động hóa Zalo — đa tài khoản, proxy, chuyển khoản ngân hàng, thanh toán QR.
Xây dựng trên [zca-js](https://github.com/RFS-ADRENO/zca-js).

**[Tiếng Việt](#bắt-đầu-nhanh)** | **[English](#english)**

> [!WARNING]
> Tool này sử dụng API Zalo **không chính thức** ([zca-js](https://github.com/RFS-ADRENO/zca-js)). Zalo không hỗ trợ và **tài khoản của bạn có thể bị khóa hoặc ban**. Tự chịu trách nhiệm. Không liên kết với Zalo hay VNG. Xem [DISCLAIMER.md](DISCLAIMER.md).

> [!TIP]
> **AI Agent Skill** — Dùng với OpenClaw, Claude Code, hoặc bất kỳ agent nào hỗ trợ SKILL.md:
> ```bash
> clawhub install zalo-agent          # OpenClaw (từ ClawHub registry)
> cp -r skill/ ~/.claude/skills/zalo-agent/   # Claude Code
> ```
> 15+ nhóm lệnh · listen mode + webhook · 55+ ngân hàng VN · đa tài khoản + proxy
> Xem [skill/SKILL.md](skill/SKILL.md) · [Eval scenarios](skill/evals/)

---

## Cài đặt

```bash
npm install -g zalo-agent-cli
```

## Bắt đầu nhanh

### 1. Đăng nhập

```bash
zalo-agent login
```

Quét QR bằng **Zalo app > Quét mã QR**. Thông tin tự động lưu.

### 2. Tìm bạn bè

```bash
zalo-agent friend search "Phúc"
```

### 3. Lắng nghe tin nhắn (lấy thread ID)

```bash
zalo-agent listen
```

Mỗi tin nhắn đến sẽ hiện `threadId`. Dùng `--json` để lấy dạng JSON.

### 4. Gửi tin nhắn

```bash
# Gửi cho cá nhân
zalo-agent msg send <THREAD_ID> "Xin chào!"

# Gửi vào nhóm
zalo-agent msg send <THREAD_ID> "Xin chào nhóm!" -t 1
```

---

## Danh sách lệnh

Tất cả lệnh hỗ trợ `--json`. Tài liệu đầy đủ: **[Wiki](https://github.com/PhucMPham/zalo-agent-cli/wiki)**

| Nhóm lệnh | Mô tả | Docs |
|------------|--------|------|
| `msg` | Gửi tin nhắn, hình, file, voice, video, sticker, link, thẻ chuyển khoản, QR | [Tin nhắn](https://github.com/PhucMPham/zalo-agent-cli/wiki/Tin-Nh%E1%BA%AFn) |
| `friend` | Danh sách, tìm, thêm, xóa, chặn, biệt danh, gợi ý | [Bạn bè](https://github.com/PhucMPham/zalo-agent-cli/wiki/B%E1%BA%A1n-B%C3%A8) |
| `group` | Tạo, đổi tên, thành viên, cài đặt, link, ghi chú, lời mời | [Nhóm & Cộng đồng](https://github.com/PhucMPham/zalo-agent-cli/wiki/Nh%C3%B3m) |
| `conv` | Tắt thông báo, ghim, lưu trữ, ẩn hội thoại, tự xóa | [Hội thoại](https://github.com/PhucMPham/zalo-agent-cli/wiki/H%E1%BB%99i-Tho%E1%BA%A1i) |
| `profile` | Xem/cập nhật hồ sơ, ảnh đại diện, quyền riêng tư | [Hồ sơ](https://github.com/PhucMPham/zalo-agent-cli/wiki/H%E1%BB%93-S%C6%A1) |
| `poll` | Tạo, bỏ phiếu, đóng khảo sát | [Khảo sát](https://github.com/PhucMPham/zalo-agent-cli/wiki/Kh%E1%BA%A3o-S%C3%A1t) |
| `reminder` | Tạo, sửa, xóa nhắc nhở | [Nhắc nhở](https://github.com/PhucMPham/zalo-agent-cli/wiki/Nh%E1%BA%AFc-Nh%E1%BB%9F) |
| `auto-reply` | Quản lý trả lời tự động | [Trả lời tự động](https://github.com/PhucMPham/zalo-agent-cli/wiki/Tr%E1%BA%A3-L%E1%BB%9Di-T%E1%BB%B1-%C4%90%E1%BB%99ng) |
| `quick-msg` | Tin nhắn nhanh đã lưu | [Tin nhắn nhanh](https://github.com/PhucMPham/zalo-agent-cli/wiki/Tin-Nh%E1%BA%AFn-Nhanh) |
| `label` | Nhãn hội thoại | [Nhãn](https://github.com/PhucMPham/zalo-agent-cli/wiki/Nh%C3%A3n) |
| `catalog` | zBusiness — danh mục sản phẩm | [zBusiness](https://github.com/PhucMPham/zalo-agent-cli/wiki/zBusiness) |
| `listen` | Lắng nghe tin nhắn real-time, webhook, lưu JSONL | [Lắng nghe](https://github.com/PhucMPham/zalo-agent-cli/wiki/L%E1%BA%AFng-Nghe) |
| `account` | Đa tài khoản & proxy | [Tài khoản](https://github.com/PhucMPham/zalo-agent-cli/wiki/T%C3%A0i-Kho%E1%BA%A3n) |

Xem thêm: [Đa tài khoản & Proxy](https://github.com/PhucMPham/zalo-agent-cli/wiki/%C4%90a-T%C3%A0i-Kho%E1%BA%A3n-&-Proxy) · [Cài đặt VPS](https://github.com/PhucMPham/zalo-agent-cli/wiki/C%C3%A0i-%C4%90%E1%BA%B7t-VPS) · [Thẻ chuyển khoản & QR](https://github.com/PhucMPham/zalo-agent-cli/wiki/Th%E1%BA%BB-Chuy%E1%BB%83n-Kho%E1%BA%A3n-&-QR)

---

## Tính năng

- Đăng nhập QR qua HTTP server tự động (browser + terminal)
- Đa tài khoản với proxy riêng biệt (1:1)
- 90+ lệnh phủ hết tính năng Zalo
- Thẻ chuyển khoản (55+ ngân hàng VN) & QR VietQR
- Lắng nghe real-time với webhook & lưu JSONL local
- Output `--json` cho mọi lệnh — scripting & AI agents
- Credentials mã hóa tại chỗ (quyền 0600)

---

## Ủng hộ

Nếu tool này giúp bạn tiết kiệm thời gian, hãy mua cho chúng tôi một ly cà phê!

<p align="center">
  <img src="assets/donate-qr.jpg" width="280" alt="Donate qua VietQR (OCB)" />
  <br/>
  <em>Quét bằng app ngân hàng bất kỳ</em>
</p>

---

## English

CLI tool for Zalo automation — multi-account, proxy support, bank transfers, QR payments.

> [!TIP]
> **AI Agent Skill** — Use with OpenClaw, Claude Code, or any SKILL.md-compatible agent:
> ```bash
> clawhub install zalo-agent                    # OpenClaw (from ClawHub registry)
> cp -r skill/ ~/.claude/skills/zalo-agent/     # Claude Code
> ```
> 15+ command groups · listen mode + webhook · 55+ VN banks · multi-account + proxy
> See [skill/SKILL.md](skill/SKILL.md) · [Eval scenarios](skill/evals/)

### Quick Start

```bash
npm install -g zalo-agent-cli
zalo-agent login                           # 1. Login via QR
zalo-agent friend search "Name"            # 2. Find a friend
zalo-agent listen                          # 3. Listen for threadId
zalo-agent msg send <THREAD_ID> "Hello!"   # 4. Send a message
```

### Commands

Full docs: **[Wiki](https://github.com/PhucMPham/zalo-agent-cli/wiki)**

| Group | Description | Docs |
|-------|-------------|------|
| `msg` | Text, images, files, voice, video, stickers, links, bank cards, QR | [Messages](https://github.com/PhucMPham/zalo-agent-cli/wiki/Messages) |
| `friend` | List, find, add, remove, block, alias, recommendations | [Friends](https://github.com/PhucMPham/zalo-agent-cli/wiki/Friends) |
| `group` | Create, rename, members, settings, links, notes, invites | [Groups](https://github.com/PhucMPham/zalo-agent-cli/wiki/Groups) |
| `conv` | Mute, pin, archive, hidden, auto-delete | [Conversations](https://github.com/PhucMPham/zalo-agent-cli/wiki/Conversations) |
| `profile` | Profile, avatar gallery, privacy | [Profile](https://github.com/PhucMPham/zalo-agent-cli/wiki/Profile) |
| `poll` | Create, vote, lock polls | [Polls](https://github.com/PhucMPham/zalo-agent-cli/wiki/Polls) |
| `reminder` | Create, edit, remove reminders | [Reminders](https://github.com/PhucMPham/zalo-agent-cli/wiki/Reminders) |
| `auto-reply` | Auto-reply rules | [Auto-Reply](https://github.com/PhucMPham/zalo-agent-cli/wiki/Auto-Reply) |
| `quick-msg` | Saved quick messages | [Quick Messages](https://github.com/PhucMPham/zalo-agent-cli/wiki/Quick-Messages) |
| `label` | Conversation labels | [Labels](https://github.com/PhucMPham/zalo-agent-cli/wiki/Labels) |
| `catalog` | zBusiness catalogs & products | [Catalog](https://github.com/PhucMPham/zalo-agent-cli/wiki/Catalog) |
| `listen` | Real-time listener, webhook, JSONL | [Listener](https://github.com/PhucMPham/zalo-agent-cli/wiki/Listener) |
| `account` | Multi-account & proxy | [Accounts](https://github.com/PhucMPham/zalo-agent-cli/wiki/Accounts) |

### Support Us

If this tool saves you time, consider buying us a coffee!

<p align="center">
  <img src="assets/donate-qr.jpg" width="280" alt="Donate via VietQR (OCB)" />
  <br/>
  <em>Scan with any Vietnamese banking app</em>
</p>

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=PhucMPham/zalo-agent-cli&type=Date)](https://star-history.com/#PhucMPham/zalo-agent-cli&Date)

## License

[MIT](LICENSE) · See [DISCLAIMER.md](DISCLAIMER.md) for full terms.
