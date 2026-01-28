// public/JS/chatroom.js

import {
    escapeHtml,
    escapeRegex,
    formatTime,
} from "./chat/utils.js";

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

const userColors = [
    "#e53935", "#d81b60", "#8e24aa", "#5e35b1", "#3949ab",
    "#1e88e5", "#039be5", "#00acc1", "#00897b", "#43a047",
    "#7cb342", "#c0ca33", "#fdd835", "#ffb300", "#fb8c00",
    "#f4511e", "#6d4c41", "#757575", "#546e7a"
];

function getUserColor(str) {
    if (!str) return "#000000";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % userColors.length);
    return userColors[index];
}

function renderMessages(messages, q) {
    messagesBox.innerHTML = "";

    if (!messages.length) {
        messagesBox.innerHTML = `<div class="text-muted text-center py-4">No messages yet. Say hello! 👋</div>`;
        return;
    }

    for (const m of messages) {
        const isMine = String(m.userEmail || "").toLowerCase() === currentUserEmail;

        // wrapper is now .msg-row
        const wrapper = document.createElement("div");
        wrapper.className = "msg-row " + (isMine ? "mine" : "other");
        wrapper.dataset.msgId = m.id;

        // Meta (Time / Name)
        const meta = document.createElement("div");
        meta.className = "msg-meta";

        if (isMine) {
            meta.textContent = formatTime(m.createdAt);
        } else {
            const nameSpan = document.createElement("span");
            const name = m.User?.firstName || "Unknown";
            nameSpan.textContent = name;
            nameSpan.style.color = getUserColor(name + (m.userEmail || "")); // use combo for uniqueness
            nameSpan.style.fontWeight = "bold";
            nameSpan.style.marginRight = "4px";

            const timeSpan = document.createElement("span");
            timeSpan.textContent = "• " + formatTime(m.createdAt);
            timeSpan.className = "text-muted"; // ensure time remains gray

            meta.append(nameSpan, timeSpan);
        }

        // Bubble
        const bubble = document.createElement("div");
        // No explicit bg classes here, handled by CSS based on .mine/.other
        bubble.className = "msg-bubble";
        bubble.innerHTML = highlightText(m.text, q);

        wrapper.append(meta, bubble);

        // Actions (Only for my messages)
        if (isMine) {
            const actions = document.createElement("div");
            actions.className = "msg-actions";

            // Checkbox
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.className = "form-check-input mt-0"; // bootstrap tweak
            cb.checked = selectedIds.has(String(m.id));
            cb.title = "Select to delete";
            cb.addEventListener("change", () => {
                cb.checked ? selectedIds.add(String(m.id)) : selectedIds.delete(String(m.id));
                updateDeleteSelectedUI();
            });

            // Edit Button (Icon)
            const editBtn = document.createElement("button");
            editBtn.innerHTML = "✏️"; // Simple text icon or use SVG
            editBtn.title = "Edit message";
            editBtn.className = "btn btn-sm btn-light border btn-icon";
            editBtn.onclick = () => {
                // If already editing, do nothing (or toggle off)
                if (bubble.querySelector('input.edit-input')) return;

                const currentText = m.text;

                // Create input directly in the bubble
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control form-control-sm edit-input';
                input.value = currentText;
                input.style.minWidth = '200px';

                // Replace text with input
                bubble.innerHTML = '';
                bubble.append(input);
                input.focus();

                // Save on Enter, Cancel on Escape
                input.onkeydown = async (e) => {
                    if (e.key === 'Enter') {
                        const newText = input.value.trim();
                        if (!newText || newText === currentText) {
                            // Revert if empty or unchanged
                            bubble.innerHTML = highlightText(currentText, q);
                            return;
                        }

                        try {
                            await editMessage(m.id, newText);
                            await loadMessages();
                        } catch {
                            showError("Edit failed");
                            bubble.innerHTML = highlightText(currentText, q);
                        }
                    } else if (e.key === 'Escape') {
                        // Cancel edit
                        bubble.innerHTML = highlightText(currentText, q);
                    }
                };

                // Also cancel if clicking away (blur), optional but good UX
                input.onblur = () => {
                    // small timeout to allow "Enter" to fire first if that was the cause
                    setTimeout(() => {
                        if (document.activeElement !== input) {
                            // Check if we should save or cancel. 
                            // For simplicity on blur, let's just cancel (standard chat behavior usually)
                            // or we could save. Let's cancel to be safe.
                            if (bubble.contains(input)) {
                                bubble.innerHTML = highlightText(currentText, q);
                            }
                        }
                    }, 100);
                };
            };

            actions.append(cb, editBtn);
            wrapper.append(actions);
        }

        messagesBox.append(wrapper);
    }

    // Auto scroll to bottom
    //messagesBox.scrollTop = messagesBox.scrollHeight;
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

selectAllBtn.addEventListener("click", () => {
    for (const m of filteredMessages) {
        if (String(m.userEmail || "").toLowerCase() === currentUserEmail) {
            selectedIds.add(String(m.id));
        }
    }
    updateDeleteSelectedUI();
    renderMessages(filteredMessages, searchInput.value.trim());
});

clearAllBtn.addEventListener("click", () => {
    selectedIds.clear();
    updateDeleteSelectedUI();
    renderMessages(filteredMessages, searchInput.value.trim());
});

updateDeleteSelectedUI();
loadMessages();
