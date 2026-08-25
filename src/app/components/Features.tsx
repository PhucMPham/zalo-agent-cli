import Accordion, { type AccordionItem } from "./Accordion";
import CodeBlock from "./CodeBlock";

const ITEMS: AccordionItem[] = [
    {
        id: "login",
        title: "Đăng nhập QR & credentials tại chỗ",
        subtitle: "Quét một lần, dùng mãi",
        meta: "login",
        body: (
            <div className="space-y-6">
                <p className="leading-relaxed text-muted">
                    Lệnh <code className="font-mono text-fg">login</code> mở một HTTP server nhỏ để hiện QR trên trình
                    duyệt, đồng thời vẽ luôn QR trong terminal cho môi trường không có UI. Credentials được lưu tại chỗ
                    với quyền 0600 — không có dịch vụ trung gian nào giữ session của bạn.
                </p>
                <CodeBlock lines={["zalo-agent login", "zalo-agent profile me --json"]} />
            </div>
        ),
    },
    {
        id: "multi",
        title: "Đa tài khoản với proxy riêng",
        subtitle: "Mỗi tài khoản một proxy, ánh xạ 1:1",
        meta: "account",
        body: (
            <div className="space-y-6">
                <p className="leading-relaxed text-muted">
                    Thêm nhiều tài khoản và gắn cho mỗi tài khoản một proxy riêng. Mọi lệnh đều nhận cờ{" "}
                    <code className="font-mono text-fg">--account</code> để chọn danh tính thực thi, nên một máy có thể
                    chạy nhiều shop song song mà không trộn phiên.
                </p>
                <CodeBlock
                    lines={[
                        "zalo-agent account add shop-1",
                        "zalo-agent account proxy set shop-1 http://10.0.0.1:8080",
                        "zalo-agent account list --json",
                    ]}
                />
            </div>
        ),
    },
    {
        id: "listen",
        title: "Lắng nghe real-time, webhook & JSONL",
        subtitle: "Đưa hội thoại vào hệ thống của bạn",
        meta: "listen",
        body: (
            <div className="space-y-6">
                <p className="leading-relaxed text-muted">
                    Chế độ listen in mọi tin nhắn đến kèm <code className="font-mono text-fg">threadId</code>, đẩy sang
                    webhook của bạn và lưu bản sao JSONL local để phát lại hoặc phân tích sau.
                </p>
                <CodeBlock
                    lines={[
                        "zalo-agent listen --json",
                        "zalo-agent listen --webhook https://api.shop.vn/zalo --save ./log.jsonl",
                    ]}
                />
            </div>
        ),
    },
    {
        id: "oa",
        title: "Zalo Official Account API v3.0",
        subtitle: "API chính thức cho tài khoản doanh nghiệp",
        meta: "oa",
        body: (
            <div className="space-y-6">
                <p className="leading-relaxed text-muted">
                    Nhánh <code className="font-mono text-fg">oa</code> dùng API Official Account chính thức của Zalo:
                    đăng nhập OAuth, gửi tin nhắn, quản lý follower và tag, kèm webhook listener chạy được trên VPS. Đây
                    là lựa chọn nên dùng cho mục đích kinh doanh.
                </p>
                <CodeBlock
                    lines={[
                        "zalo-agent oa init",
                        'zalo-agent oa msg text <USER_ID> "Xin chào"',
                        "zalo-agent oa listen -p 3000",
                    ]}
                />
            </div>
        ),
    },
];

export default function Features() {
    return (
        <section id="tinh-nang" className="relative bg-bg px-6 py-24">
            <div className="mx-auto max-w-4xl">
                <div data-reveal className="mb-16 text-center">
                    <h2 className="mb-4 font-display text-4xl font-bold">Tính năng chính</h2>
                    <p className="text-muted">Những gì bạn dùng đến trong ngày đầu tiên.</p>
                </div>

                <Accordion items={ITEMS} />
            </div>
        </section>
    );
}
