# zalo-agent CLI — Full Command Reference

## Global Flags
| Flag | Description |
|------|-------------|
| `--json` | JSON output for all commands |
| `-V, --version` | Version number |

## Auth
| Command | Description |
|---------|-------------|
| `login [-p proxy] [--credentials path] [--qr-url]` | QR or credential login |
| `logout [--purge]` | Clear session (--purge deletes creds) |
| `status` | Login state |
| `whoami` | Profile info |
| `update` | Self-update to latest |

## Messages — `msg`
| Command | Description |
|---------|-------------|
| `send <id> <text> [-t 0\|1] [--react] [--mention pos:uid:len]` | Text message |
| `send-image <id> <paths...> [-t] [-m caption]` | Images |
| `send-file <id> <paths...> [-t] [-m caption]` | Files |
| `send-card <id> <userId> [-t] [--phone]` | Contact card (danh thiếp) |
| `send-bank <id> <accNum> --bank alias [-n name] [-t]` | Bank card (55+ VN banks) |
| `send-qr-transfer <id> <accNum> --bank alias [-a amt] [-m content] [--template] [-t]` | VietQR image |
| `send-voice <id> <voiceUrl> [-t]` | Voice from URL |
| `send-video <id> <videoUrl> [-t]` | Video from URL |
| `send-link <id> <url> [-t]` | Link with auto-preview |
| `sticker <id> <keyword> [-t]` | Search + send sticker |
| `sticker-list <keyword>` | Search stickers (returns IDs) |
| `sticker-detail <stickerIds...>` | Sticker details |
| `sticker-category <categoryId>` | Category details |
| `react <msgId> <id> <emoji> -c <cliMsgId> [-t]` | Reaction (cliMsgId REQUIRED) |
| `delete <msgId> <id> [-t]` | Delete (self only) |
| `undo <msgId> <id> -c <cliMsgId> [-t]` | Recall both sides |
| `forward <msgId> <id> [-t]` | Forward message |
| `history <id> [-t 0\|1] [-n limit] [--timeout ms]` | Read recent message history (DM or group) via fresh WebSocket |

## Friends — `friend`
| Command | Description |
|---------|-------------|
| `list` | All friends |
| `online` | Online friends |
| `find <query>` | By phone/ID |
| `info <userId>` | Profile |
| `add <userId> [-m msg]` | Friend request |
| `accept <userId>` | Accept request |
| `remove <userId>` | Unfriend |
| `block <userId>` | Block |
| `unblock <userId>` | Unblock |
| `last-online <userId>` | Last seen |

## Groups — `group`
| Command | Description |
|---------|-------------|
| `list` | All groups |
| `create <name> <ids...>` | Create |
| `info <groupId>` | Details |
| `members <groupId>` | Member list |
| `add-member <groupId> <ids...>` | Add members |
| `remove-member <groupId> <ids...>` | Remove members |
| `rename <groupId> <name>` | Rename |
| `avatar <groupId> <path>` | Change avatar |
| `add-admin <groupId> <userId>` | Promote to admin |
| `remove-admin <groupId> <userId>` | Demote admin |
| `transfer-owner <groupId> <userId>` | Transfer ownership |
| `block-member <groupId> <userId>` | Block from rejoining |
| `unblock-member <groupId> <userId>` | Unblock |
| `join <link>` | Join via link |
| `leave <groupId>` | Leave |

## Listen
| Command | Description |
|---------|-------------|
| `listen [-e types] [-f filter] [-w url] [--no-self] [--auto-accept] [--save dir]` | WebSocket listener |

Events: message, friend, group, reaction. Filters: user, group, all.

## Conversations — `conv`
| Command | Description |
|---------|-------------|
| `pinned` | Pinned list |
| `archived` | Archived list |
| `mute <id> [-t] [-d secs]` | Mute (-1=forever) |
| `unmute <id> [-t]` | Unmute |
| `read <id> [-t]` | Mark read |
| `unread <id> [-t]` | Mark unread |
| `delete <id> [-t]` | Delete history |

## Accounts — `account`
| Command | Description |
|---------|-------------|
| `list` | All accounts (proxy masked) |
| `login [-p proxy] [-n name] [--qr-url]` | Add account |
| `switch <ownerId>` | Switch active |
| `remove <ownerId>` | Delete account+creds |
| `info` | Active account |
| `export [ownerId] [-o path]` | Export creds |

## Profile — `profile`
| Command | Description |
|---------|-------------|
| `view` | View profile |

## Polls — `poll`
| Command | Description |
|---------|-------------|
| `create <groupId> <question> <options...>` | Create poll |

## Reminders — `reminder`
| Command | Description |
|---------|-------------|
| `create <threadId> <time> <message>` | Create reminder |

## Auto-Reply — `auto-reply`
| Command | Description |
|---------|-------------|
| `set` | Set auto-reply message |

## Labels — `label`
| Command | Description |
|---------|-------------|
| `list` | List labels |

## Catalog — `catalog`
| Command | Description |
|---------|-------------|
| `list` | Zalo Shop products |

## Reaction Codes
| Code | Emoji | Code | Emoji |
|------|-------|------|-------|
| `:>` | Haha | `/-heart` | Heart |
| `/-strong` | Like | `:o` | Wow |
| `:-((` | Cry | `:-h` | Angry |
| `:-*` | Kiss | `:')`| Tears of joy |
| `/-weak` | Dislike | `/-shit` | Poop |

## Thread Type
`-t 0` = User (default), `-t 1` = Group

## Bank Aliases
ocb, vcb, vietcombank, bidv, mb, mbbank, techcombank, tpbank, acb, vpbank, msb, sacombank, hdbank, seabank, shb, eximbank, vib, agribank, vietinbank, ctg, scb, ncb, abbank, dongabank, kienlongbank, shinhan, hsbc, cimb, woori, and 25+ more.
