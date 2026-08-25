import "react";

// Inline-playback hints for mobile WebKit / X5 (Tencent) browsers. These are
// valid HTML attributes that React forwards verbatim but does not type.
declare module "react" {
    interface VideoHTMLAttributes<T> extends MediaHTMLAttributes<T> {
        "webkit-playsinline"?: string;
        "x5-playsinline"?: string;
        disableRemotePlayback?: boolean;
    }
}
