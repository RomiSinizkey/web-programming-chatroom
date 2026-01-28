// public/JS/chat/chat.api.js

function jsonHeaders() {
    return { "Content-Type": "application/json", "Accept": "application/json" };
}

async function parseJsonSafe(res) {
    return await res.json().catch(() => ({}));
}

export async function fetchMessages(q) {
    const url = q
        ? `/api/messages/search?q=${encodeURIComponent(q)}`
        : `/api/messages`;

    const res = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json", "Cache-Control": "no-cache" },
        cache: "no-store",
        credentials: "same-origin",
    });

    if (res.status === 401) return null;
    if (!res.ok) {
        const body = await parseJsonSafe(res);
        throw new Error(body.error || `Fetch failed (${res.status})`);
    }

    return await res.json();
}

export async function sendMessage(text) {
    const res = await fetch("/api/messages", {
        method: "POST",
        headers: jsonHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ text }),
    });

    if (res.status === 401) return null;
    if (!res.ok) {
        const body = await parseJsonSafe(res);
        throw new Error(body.error || `Send failed (${res.status})`);
    }

    return await res.json();
}

export async function editMessage(id, text) {
    const res = await fetch(`/api/messages/${id}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ text }),
    });

    if (res.status === 401) return null;
    if (!res.ok) {
        const body = await parseJsonSafe(res);
        throw new Error(body.error || `Edit failed (${res.status})`);
    }

    return await res.json();
}

export async function deleteMany(ids) {
    const res = await fetch("/api/messages/delete-many", {
        method: "POST",
        headers: jsonHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ ids }),
    });

    if (res.status === 401) return null;
    if (!res.ok) {
        const body = await parseJsonSafe(res);
        throw new Error(body.error || `Delete failed (${res.status})`);
    }

    return await res.json();
}
