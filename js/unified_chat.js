(function init() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const alias = localStorage.getItem("alias") || "";
  const role = localStorage.getItem("role") || "user";

  if (role === "admin") {
    window.location.href = "admin_dashboard.html";
  }
})();
const CONFIG = {
  HTTP_API: "http://localhost:8888",
  WS_API: "ws://localhost:8889/ws/chat",
};

let activeUser = null;
let currentConversationId = null;
let wsInstance = null;

// Node Reference Caching Layers Map
const channelsContainer = document.getElementById("channelsContainer");
const messageContainer = document.getElementById("messageContainer");
const messageForm = document.getElementById("messageForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const activeChatTitle = document.getElementById("activeChatTitle");
const connectionState = document.getElementById("connectionState");
const profileDisplay = document.getElementById("profileDisplay");

function loadCachedProfile() {
  try {
    activeUser = JSON.parse(localStorage.getItem("user"));
    if (activeUser) {
      const identity = activeUser.id || activeUser._id;
      profileDisplay.textContent =
        activeUser.username || activeUser.alias || "Calm Reflection";
      return identity;
    }
  } catch (e) {
    console.error("Local user configuration profile trace is corrupted:", e);
  }
  profileDisplay.textContent = "Guest Session";
  return null;
}

/* ================= STEP 1: SIDEBAR TRACKS RENDERER ================= */

async function fetchUserConversations() {
  const userId = loadCachedProfile();
  if (!userId) {
    setConnectionStateLabel("Authentication missing.", "state-offline");
    return;
  }

  try {
    const res = await fetch(
      `${CONFIG.HTTP_API}/api/conversations/user/${userId}`,
    );
    if (!res.ok) throw new Error("Could not parse channel indices maps.");

    const tracks = await res.json();
    channelsContainer.innerHTML = "";

    if (!tracks || tracks.length === 0) {
      channelsContainer.innerHTML = `<div class="empty-state">No conversation logs found</div>`;
    } else {
      tracks.forEach((track) => {
        const li = document.createElement("li");
        li.setAttribute("data-id", track.conversationId);

        const rawType = track.type || "group";
        const isSupport = rawType === "support";
        const channelClass = isSupport ? "room-support" : "room-group";
        const displayRole = track.role ? track.role.toUpperCase() : "MEMBER";

        const avatarPlaceholder = track.avatar
          ? `<img src="${track.avatar}" class="user-avatar-img" alt="avatar"/>`
          : `<div class="user-avatar-initials">${(track.title || "U").charAt(0).toUpperCase()}</div>`;

        li.className = `${channelClass} ${track.conversationId === currentConversationId ? "active" : ""}`;

        li.innerHTML = `
          <div class="sidebar-chat-card">
            ${avatarPlaceholder}
            <div class="conv-details">
              <div class="conv-meta-header">
                <span class="room-badge">${displayRole}</span>
              </div>
              <strong>${escapeHTML(track.title || "Anonymous Peer")}</strong>
              <p>${isSupport ? "Active support connection room" : "Shared community space"}</p>
            </div>
          </div>
        `;

        li.onclick = () =>
          switchActiveRoom(
            track.conversationId,
            track.title || "Sanctuary Chat",
          );
        channelsContainer.appendChild(li);
      });
    }

    const autoOpenId = localStorage.getItem("AUTO_OPEN_CONVERSATION_ID");
    const autoOpenTitle = localStorage.getItem("AUTO_OPEN_CONVERSATION_TITLE");

    if (autoOpenId) {
      localStorage.removeItem("AUTO_OPEN_CONVERSATION_ID");
      localStorage.removeItem("AUTO_OPEN_CONVERSATION_TITLE");
      switchActiveRoom(autoOpenId, autoOpenTitle || "Direct Sanctuary");
    }
  } catch (err) {
    console.error("Sidebar routing collection error trace:", err);
    channelsContainer.innerHTML = `<div class="empty-state">Error syncing communication routes.</div>`;
  }
}

/* ================= STEP 2: SWITCH CHANNELS & LOAD HISTORY ================= */

async function switchActiveRoom(conversationId, title) {
  if (currentConversationId === conversationId) return;
  currentConversationId = conversationId;

  Array.from(channelsContainer.children).forEach((el) => {
    el.classList.remove("active");
    if (el.getAttribute("data-id") === conversationId)
      el.classList.add("active");
  });

  activeChatTitle.textContent = title;
  userInput.removeAttribute("disabled");
  sendBtn.removeAttribute("disabled");

  messageContainer.innerHTML = `<div class="center-notice">Loading secure interaction records...</div>`;

  try {
    const res = await fetch(
      `${CONFIG.HTTP_API}/api/conversations/${conversationId}/messages`,
    );
    if (res.ok) {
      const messages = await res.json();
      messageContainer.innerHTML = "";

      const timeDivider = document.createElement("div");
      timeDivider.className = "time-divider";
      timeDivider.innerHTML = `<span>Today</span>`;
      messageContainer.appendChild(timeDivider);

      const myId = String(activeUser.id || activeUser._id).toLowerCase();
      messages.forEach((msg) => {
        const direction =
          String(msg.userId).toLowerCase() === myId ? "outgoing" : "incoming";
        // Passing the loaded db name alias smoothly down to render logic
        renderBubble(msg.content, direction, msg.alias || "User");
      });
    }
  } catch (err) {
    console.warn("Backlog records index dropped out of scope context.", err);
    messageContainer.innerHTML = `<div class="center-notice">Channel initialized.</div>`;
  }

  initializeStreamRouting(conversationId);
}

/* ================= STEP 3: LIVE STREAM TRANSPORT PIPELINES ================= */

function initializeStreamRouting(conversationId) {
  if (wsInstance) wsInstance.close();

  const userId = activeUser.id || activeUser._id;
  setConnectionStateLabel("Match shifting...", "state-pending");

  wsInstance = new WebSocket(CONFIG.WS_API);

  wsInstance.onopen = () => {
    setConnectionStateLabel("", "state-online");
    wsInstance.send(
      JSON.stringify({
        type: "join",
        userId,
        conversationId,
      }),
    );
  };

  wsInstance.onmessage = (event) => {
    try {
      const frame = JSON.parse(event.data);
      if (frame.type === "message" && frame.data) {
        const msg = frame.data;
        const myId = String(activeUser.id || activeUser._id).toLowerCase();
        if (String(msg.userId).toLowerCase() === myId) return;

        // Uses real-time fallback payload metadata values transmitted live
        const senderName = msg.alias || msg.username || "Anonymous Connection";
        renderBubble(msg.content, "incoming", senderName);
      }
    } catch (e) {}
  };

  wsInstance.onclose = () => {
    setConnectionStateLabel("Match failed — retry", "state-offline");
  };
}

/* ================= STEP 4: MESSAGE DISPATCH PRODUCTION ================= */

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = activeUser.id || activeUser._id;
  const text = userInput.value.trim();

  if (!text || !currentConversationId || !userId) return;

  const currentAlias = activeUser.alias || activeUser.username || "Me";

  const payload = {
    type: "message",
    userId,
    username: currentAlias,
    alias: currentAlias,
    conversationId: currentConversationId,
    content: text,
  };

  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify(payload));
  } else {
    try {
      await fetch(
        `${CONFIG.HTTP_API}/api/conversations/messages/offline-save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    } catch (err) {
      console.error(
        "Critical communications transport route failed entirely:",
        err,
      );
    }
  }

  renderBubble(text, "outgoing", currentAlias);
  userInput.value = "";
});
async function signOut() {
  const token = localStorage.getItem("token");
  try {
    await fetch("http://localhost:8080/api/auth/signout", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    });
  } catch (_) {}
  localStorage.clear();
  window.location.href = "index.html";
}
/* ================= RENDERING LAYER WITH ALIAS SUPPORT ================= */

function renderBubble(message, direction, senderAlias) {
  const div = document.createElement("div");
  div.className = `message-wrapper ${direction}`;

  // Appends a clean micro metadata name string label cleanly resting right above the bubble layout structures
  div.innerHTML = `
    <span class="message-sender-title">${escapeHTML(senderAlias)}</span>
    <div class="bubble">${escapeHTML(message)}</div>
  `;

  messageContainer.appendChild(div);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function setConnectionStateLabel(text, classType) {
  connectionState.textContent = text;
  connectionState.className = `status-indicator-text ${classType}`;
}

function escapeHTML(str) {
  return String(str).replace(
    /[&<>'"]/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[c],
  );
}

document.addEventListener("DOMContentLoaded", fetchUserConversations);
