# VHS Demo — zalo-agent-cli full flow
Output assets/demo.gif
Output assets/demo.mp4

Set Shell "zsh"
Set FontSize 14
Set Width 1200
Set Height 700
Set Padding 20
Set Theme { "name": "Claude Dark", "black": "#1a1a2e", "red": "#e07a5f", "green": "#81b29a", "yellow": "#f2cc8f", "blue": "#7eb8da", "purple": "#c49ebd", "cyan": "#89c2d9", "white": "#d4c5a9", "brightBlack": "#2d2d44", "brightRed": "#e8937e", "brightGreen": "#a3d2b5", "brightYellow": "#f5dbb3", "brightBlue": "#a1d0e8", "brightPurple": "#d4b8cf", "brightCyan": "#aed5e6", "brightWhite": "#ede0cc", "background": "#1a1a2e", "foreground": "#d4c5a9", "selectionBackground": "#3d3d5c", "cursorColor": "#f2cc8f" }
Set TypingSpeed 35ms
Set WindowBar Colorful

# Override PATH to use mock binaries
Hide
Type "export PATH=$PWD/assets/demo-bin:$PATH"
Enter
Type "clear"
Enter
Show
Sleep 500ms

# ═══════════════════════════════════════
# Scene 1: Install
# ═══════════════════════════════════════
Type "npm install -g zalo-agent-cli"
Enter
Sleep 3s

# ═══════════════════════════════════════
# Scene 1b: Install OpenClaw skill
# ═══════════════════════════════════════
Type "clawhub install zalo-agent"
Enter
Sleep 3s

# ═══════════════════════════════════════
# Scene 2: Login with QR
# ═══════════════════════════════════════
Type "zalo-agent login --qr-url"
Enter
Sleep 9s

# ═══════════════════════════════════════
# Scene 3: Check status
# ═══════════════════════════════════════
Type "zalo-agent status"
Enter
Sleep 3s

# ═══════════════════════════════════════
# Scene 4: Claude Code — AI agent sends message
# ═══════════════════════════════════════
Type "claude"
Enter
Sleep 2s

Set TypingSpeed 50ms
Type "Gửi tin nhắn 'Xin chào team!' vào nhóm Dev Team"
Enter
Sleep 5s

Ctrl+C
Sleep 500ms

# ═══════════════════════════════════════
# Scene 5: Listen mode with webhook
# ═══════════════════════════════════════
Set TypingSpeed 35ms
Type "zalo-agent listen --filter user --no-self --webhook http://n8n.local/webhook/zalo"
Enter
Sleep 9s

Ctrl+C
Sleep 1.5s
