// public/JS/utils.js

export function safeCssEscape(s) {
    if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(String(s));
    }
    return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

export function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}
