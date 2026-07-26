# Hướng dẫn Zalo MCP Server

Model Context Protocol (MCP) cho phép Claude Code và các MCP client tương tác với Zalo trực tiếp qua 8 tools: `zalo_get_messages`, `zalo_get_history`, `zalo_search_history`, `zalo_send_message`, `zalo_list_threads`, `zalo_search_threads`, `zalo_mark_read`, `zalo_view_media`.

---

## Khởi động nhanh

### Chế độ stdio (Local — Claude Code)

```bash
zalo-agent mcp start
```

Thêm vào `.claude/settings.json`:

```json
{
  "mcpServers": {
    "zalo": {
      "command": "zalo-agent",
      "args": ["mcp", "start"]
    }
  }
}
```

### Chế độ HTTP (VPS — Remote)

```bash
zalo-agent mcp start --http 3847 --auth your-secret
```

Thêm vào cấu hình MCP client:

```json
{
  "mcpServers": {
    "zalo": {
      "url": "http://your-vps:3847",
      "headers": { "Authorization": "Bearer your-secret" }
    }
  }
}
```

---

## Tham chiếu Tools

### `zalo_get_messages`
Lấy tin nhắn từ buffer, hỗ trợ cursor để đọc tăng dần.

**Tham số:**

| Tên | Kiểu | Mô tả |
|-----|------|--------|
| `cursor` | string (tuỳ chọn) | Cursor từ lần gọi trước — chỉ lấy tin mới hơn |
| `limit` | number (tuỳ chọn) | Số tin tối đa (mặc định: 50) |
| `threadId` | string (tuỳ chọn) | Lọc theo thread cụ thể |

**Kết quả mẫu:**
```json
{
  "messages": [
    { "id": "msg123", "threadId": "uid456", "text": "Xin chào", "from": "uid789", "ts": 1710000000 }
  ],
  "nextCursor": "cursor_abc",
  "hasMore": false
}
```

---

### `zalo_get_history`
Đọc lịch sử tin nhắn cũ của một DM/nhóm. Khác với `zalo_get_messages` (đọc buffer live), tool này phục vụ từ lịch sử mà server đã thu thập: nạp từ backfill của Zalo mỗi lần server (re)connect (cửa sổ ~2 tuần) và lớn dần theo tin mới. Trả về cũ→mới.

**Tham số:**

| Tên | Kiểu | Mô tả |
|-----|------|--------|
| `threadId` | string | ID của DM hoặc nhóm |
| `threadType` | number (tuỳ chọn) | 0 = DM (mặc định), 1 = nhóm |
| `senderId` | string (tuỳ chọn) | Chỉ lấy tin của một người |
| `since` | string/number (tuỳ chọn) | Từ thời điểm — `YYYY-MM-DD`, ISO, hoặc epoch ms |
| `until` | string/number (tuỳ chọn) | Đến thời điểm — `YYYY-MM-DD` (bao gồm cả ngày), ISO, hoặc epoch ms |
| `limit` | number (tuỳ chọn) | Số tin tối đa (mặc định: 50, tối đa: 200) |
| `lastMsgId` | string (tuỳ chọn) | Truyền `cursor` của lần trước để lùi xa hơn về quá khứ |

**Kết quả mẫu:**
```json
{
  "threadId": "gid789",
  "threadType": "group",
  "count": 2,
  "messages": [
    {
      "msgId": "m1",
      "senderName": "Minh",
      "text": "ok anh",
      "timestamp": 1710000000,
      "type": "text",
      "replyTo": { "senderName": "Le Doan", "text": "M6 trắng sáng thấp", "msgId": "m0" },
      "mentions": ["u123"]
    }
  ],
  "cursor": "m1",
  "hasMore": true
}
```
Lưu ý: kho lưu trữ cũ hơn cửa sổ replay của Zalo không thể lấy qua bất kỳ API nào.

---

### `zalo_search_history`
Tìm trong lịch sử đã thu thập trên **tất cả** thread (hoặc một thread), lọc theo người gửi và/hoặc khoảng thời gian. Dùng cho "tất cả tin của người X" (DM + tin của họ trong mọi nhóm) hoặc "mọi tin trong khoảng ngày". Trả về cũ→mới, kèm `replyTo` + `mentions`.

**Tham số:** (cần ít nhất một trong `senderId` / `since` / `until` / `threadId`)

| Tên | Kiểu | Mô tả |
|-----|------|--------|
| `senderId` | string (tuỳ chọn) | Chỉ tin của người này |
| `threadId` | string (tuỳ chọn) | Giới hạn một thread; bỏ trống = tất cả thread |
| `since` | string/number (tuỳ chọn) | Từ thời điểm — `YYYY-MM-DD`, ISO, hoặc epoch ms |
| `until` | string/number (tuỳ chọn) | Đến thời điểm — `YYYY-MM-DD` (bao gồm cả ngày), ISO, hoặc epoch ms |
| `limit` | number (tuỳ chọn) | Số tin tối đa (mặc định: 50, tối đa: 200) |
| `before` | string (tuỳ chọn) | Truyền `cursor` của lần trước để lùi xa hơn về quá khứ |

---

### `zalo_send_message`
Gửi tin nhắn văn bản đến một thread.

**Tham số:**

| Tên | Kiểu | Mô tả |
|-----|------|--------|
| `threadId` | string | ID của người dùng hoặc nhóm |
| `text` | string | Nội dung tin nhắn |
| `type` | number (tuỳ chọn) | 0 = DM (mặc định), 1 = nhóm |

**Kết quả mẫu:**
```json
{ "success": true, "msgId": "msg456", "ts": 1710000001 }
```

---

### `zalo_list_threads`
Liệt kê các thread đang hoạt động kèm số tin chưa đọc.

**Tham số:** không có (tuỳ chọn: `limit`, `unreadOnly`)

**Kết quả mẫu:**
```json
{
  "threads": [
    { "threadId": "uid456", "name": "Phúc", "unread": 3, "lastTs": 1710000000, "type": "user" },
    { "threadId": "gid789", "name": "Nhóm dự án", "unread": 0, "lastTs": 1709999000, "type": "group" }
  ]
}
```

---

### `zalo_search_threads`
Tìm thread (nhóm/DM) theo tên. Khớp mờ, không phân biệt hoa thường và dấu tiếng Việt. Dùng để lấy `threadId` từ tên rồi truyền vào `zalo_get_history`.

**Tham số:**

| Tên | Kiểu | Mô tả |
|-----|------|--------|
| `query` | string | Từ khoá tìm kiếm |
| `type` | string (tuỳ chọn) | `group`, `dm`, hoặc `all` (mặc định) |
| `limit` | number (tuỳ chọn) | Số kết quả tối đa (mặc định: 10) |

---

### `zalo_mark_read`
Đánh dấu đã đọc — xoá tin khỏi buffer đến cursor chỉ định.

**Tham số:**

| Tên | Kiểu | Mô tả |
|-----|------|--------|
| `cursor` | string | Cursor trả về từ `zalo_get_messages` |
| `threadId` | string (tuỳ chọn) | Chỉ mark một thread cụ thể |

---

### `zalo_view_media`
Mở file media (ảnh/âm thanh/video) đã nhận bằng trình xem hệ thống. Media được tự tải khi nhận, sắp theo thư mục thread.

**Tham số:**

| Tên | Kiểu | Mô tả |
|-----|------|--------|
| `messageId` | string | ID tin nhắn có đính kèm media (từ `zalo_get_messages`) |
| `threadId` | string (tuỳ chọn) | Thread để tìm; bỏ trống = tìm tất cả |
| `open` | boolean (tuỳ chọn) | Mở bằng trình xem hệ thống (mặc định: true) |

---

## Cấu hình (mcp-config.json)

```json
{
  "watchThreads": ["uid123", "gid456"],
  "mode": "whitelist",
  "triggerKeywords": ["@agent", "!task"],
  "notify": {
    "groups": true,
    "dms": true
  },
  "limits": {
    "bufferSize": 500,
    "maxMessageAge": 3600
  }
}
```

| Trường | Mô tả |
|--------|--------|
| `watchThreads` | Danh sách thread ID cần theo dõi |
| `mode` | `whitelist` (chỉ watch) hoặc `all` (toàn bộ) |
| `triggerKeywords` | Chỉ buffer tin có chứa từ khoá này |
| `notify.groups` | Nhận thông báo từ nhóm |
| `limits.bufferSize` | Số tin tối đa trong ring buffer |
| `limits.maxMessageAge` | Tuổi tin tối đa (giây) |

---

## Kiến trúc

```
Zalo WebSocket
     ↓
Ring Buffer (in-memory, max bufferSize)
     ↓
Thread Filter (watchThreads / triggerKeywords)
     ↓
MCP Server (stdio hoặc HTTP)
     ↓
Claude Code / MCP Client
```

- **Auto-reconnect**: WebSocket tự kết nối lại khi mất mạng
- **Cursor-based**: Client đọc tăng dần, không bỏ sót tin
- **Stateless transport**: MCP server không lưu state — state nằm ở buffer

---

## Mẹo sử dụng

- Dùng `watchThreads` để lọc noise — chỉ nhận thread quan trọng
- Gọi `zalo_get_messages` định kỳ với cursor để polling tăng dần
- Dùng `zalo_mark_read` sau khi xử lý xong để buffer không đầy
- Trên VPS: thêm `--auth` để bảo vệ HTTP endpoint
- Kết hợp với `triggerKeywords` để chỉ xử lý khi có mention agent
