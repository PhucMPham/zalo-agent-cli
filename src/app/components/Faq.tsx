import Accordion, { type AccordionItem } from "./Accordion";
import { DISCLAIMER_URL, OA_DOCS_URL, ZCA_JS_URL } from "../links";

const ITEMS: AccordionItem[] = [
    {
        id: "unofficial",
        title: "Đây có phải API chính thức của Zalo không?",
        body: (
            <p className="leading-relaxed text-muted">
                Phần lớn lệnh chạy trên{" "}
                <a href={ZCA_JS_URL} className="text-brand underline underline-offset-4">
                    zca-js
                </a>{" "}
                — API <strong className="text-fg">không chính thức</strong>. Zalo không hỗ trợ và tài khoản của bạn có
                thể bị hạn chế hoặc khóa. Riêng nhánh <code className="font-mono text-fg">oa</code> dùng Official
                Account API v3.0 chính thức. Dự án không liên kết với Zalo hay VNG — đọc{" "}
                <a href={DISCLAIMER_URL} className="text-brand underline underline-offset-4">
                    DISCLAIMER
                </a>{" "}
                trước khi dùng.
            </p>
        ),
    },
    {
        id: "business",
        title: "Dùng cho mục đích kinh doanh thì nên chọn gì?",
        body: (
            <p className="leading-relaxed text-muted">
                Dùng{" "}
                <a href={OA_DOCS_URL} className="text-brand underline underline-offset-4">
                    Official Account API v3.0
                </a>
                : OAuth, gửi tin nhắn, quản lý follower, tag và webhook listener — tất cả đều là API được Zalo hỗ trợ,
                nên không có rủi ro khóa tài khoản cá nhân.
            </p>
        ),
    },
    {
        id: "vps",
        title: "Chạy trên VPS được không?",
        body: (
            <p className="leading-relaxed text-muted">
                Được. Đăng nhập QR có sẵn chế độ vẽ trong terminal, listener và webhook chạy nền, còn MCP server có chế
                độ HTTP kèm token xác thực (<code className="font-mono text-fg">--http 3847 --auth …</code>) để agent từ
                xa kết nối vào.
            </p>
        ),
    },
    {
        id: "agent",
        title: "Nối vào Claude Code hoặc OpenClaw thế nào?",
        body: (
            <p className="leading-relaxed text-muted">
                Hai cách: chạy <code className="font-mono text-fg">zalo-agent mcp start</code> để agent gọi 4 MCP tool,
                hoặc cài skill — <code className="font-mono text-fg">clawhub install zalo-agent</code> cho OpenClaw,{" "}
                <code className="font-mono text-fg">cp -r skill/ ~/.claude/skills/zalo-agent/</code> cho Claude Code.
            </p>
        ),
    },
    {
        id: "license",
        title: "Yêu cầu hệ thống và giấy phép?",
        body: (
            <p className="leading-relaxed text-muted">
                Node.js 20 trở lên, cài bằng một lệnh npm, không cần dịch vụ bên ngoài. Mã nguồn mở theo giấy phép MIT.
            </p>
        ),
    },
];

export default function Faq() {
    return (
        <section id="faq" className="bg-bg px-6 py-24">
            <div className="mx-auto max-w-3xl">
                <div data-reveal className="mb-16 text-center">
                    <h2 className="mb-4 font-display text-4xl font-bold">Câu hỏi thường gặp</h2>
                    <p className="text-muted">Những điều nên biết trước khi cài.</p>
                </div>

                <Accordion items={ITEMS} variant="faq" />
            </div>
        </section>
    );
}
