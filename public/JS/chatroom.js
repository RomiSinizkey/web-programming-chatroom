// public/JS/chatroom.js

import {
    escapeHtml,
    escapeRegex,
    formatTime,
} from "./utils.js";

import {
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMany,
} from "./chat/chat.api.js";

/* global document, window, confirm */

const currentUserEmail = String(window.currentUserEmail || "")
    .trim()
    .toLowerCase();

const messagesBox = document.getElementById("messagesBox");
const errorBox = document.getElementById("errorBox");
const refreshBtn = document.getElementById("refreshBtn");
const selectAllBtn = document.getElementById("selectAllBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const searchInput = document.getElementById("searchInput");
const prevMatchBtn = document.getElementById("prevMatchBtn");
const nextMatchBtn = document.getElementById("nextMatchBtn");
const matchInfo = document.getElementById("matchInfo");
const sendForm = document.getElementById("sendForm");
const msgInput = document.getElementById("msgInput");

let allMessages = [];
let filteredMessages = [];
let matchIds = [];
let currentMatchIndex = -1;
const selectedIds = new Set();

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("d-none");
}

function clearError() {
    errorBox.textContent = "";
    errorBox.classList.add("d-none");
}

function redirectToLogin() {
    window.location.href = "/?msg=" + encodeURIComponent("Session expired");
}

function updateDeleteSelectedUI() {
    deleteSelectedBtn.disabled = selectedIds.size === 0;
    deleteSelectedBtn.textContent =
        selectedIds.size === 0
            ? "Delete selected"
            : `Delete selected (${selectedIds.size})`;
}

function highlightText(text, query) {
    const safe = escapeHtml(text || "");
    if (!query) return safe;
    const re = new RegExp(escapeRegex(query), "gi");
    return safe.replace(re, m => `<mark class="chat-highlight">${m}</mark>`);
}

function renderMessages(messages, q) {
    messagesBox.innerHTML = "";

    if (!messages.length) {
        messagesBox.innerHTML = `<div class="text-muted">No messages yet.</div>`;
        return;
    }

    for (const m of messages) {
        const isMine =
            String(m.userEmail || "").toLowerCase() === currentUserEmail;

        const wrapper = document.createElement("div");
        wrapper.className = "mb-3";
        wrapper.dataset.msgId = m.id;

        const meta = document.createElement("div");
        meta.className = "msg-meta";
        meta.textContent = `${m.User?.firstName || "Unknown"} • ${formatTime(
            m.createdAt
        )}`;

        const bubble = document.createElement("div");
        bubble.className =
            "msg-bubble border rounded p-2 " +
            (isMine ? "bg-primary text-white" : "bg-light");

        bubble.innerHTML = highlightText(m.text, q);

        wrapper.append(meta, bubble);

        if (isMine) {
            const actions = document.createElement("div");
            actions.className = "mt-2 d-flex gap-2";

            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = selectedIds.has(String(m.id));
            cb.addEventListener("change", () => {
                cb.checked ? selectedIds.add(String(m.id)) : selectedIds.delete(String(m.id));
                updateDeleteSelectedUI();
            });

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.className = "btn btn-sm btn-outline-secondary";
            editBtn.onclick = async () => {
                const newText = prompt("Edit message:", m.text);
                if (!newText) return;
                try {
                    await editMessage(m.id, newText);
                    await loadMessages();
                } catch {
                    showError("Edit failed");
                }
            };

            actions.append(cb, editBtn);
            wrapper.append(actions);
        }

        messagesBox.append(wrapper);
    }
}

async function loadMessages() {
    try {
        clearError();
        const q = searchInput.value.trim();
        const msgs = await fetchMessages(q);
        if (!msgs) return redirectToLogin();
        allMessages = msgs;
        filteredMessages = msgs;
        renderMessages(filteredMessages, q);
    } catch {
        showError("Failed to load messages");
    }
}

sendForm.addEventListener("submit", async e => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;

    try {
        await sendMessage(text);
        msgInput.value = "";
        await loadMessages();
    } catch {
        showError("Send failed");
    }
});

deleteSelectedBtn.addEventListener("click", async () => {
    if (!confirm(`Delete ${selectedIds.size} messages?`)) return;
    try {
        await deleteMany([...selectedIds]);
        selectedIds.clear();
        updateDeleteSelectedUI();
        await loadMessages();
    } catch {
        showError("Delete failed");
    }
});

refreshBtn.addEventListener("click", loadMessages);
searchInput.addEventListener("input", () => setTimeout(loadMessages, 250));

updateDeleteSelectedUI();
loadMessages();
