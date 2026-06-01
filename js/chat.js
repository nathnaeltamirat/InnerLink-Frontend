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
  } else if (role === "volunteer") {
    window.location.href = "reflections.html";
  }
})();

const CONFIG = {
  HTTP_API: "http://localhost:8888",
  WS_API: "ws://localhost:8889/ws/chat",
};

const CONVERSATION_STORAGE_KEY = 'last_conversation_id';

let currentConversationId = null;
let wsInstance = null;
let currentMode = "mood";
let typingTimeout = null;
let matchPollTimer = null;

const messageContainer = document.getElementById("messageContainer");
const messageForm = document.getElementById("messageForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatTitle = document.getElementById("chatTitle");
const connectionState = document.getElementById("connectionState");
const typingStatus = document.getElementById("typingStatus");
const tabListen = document.getElementById("tabListen");
const tabBreathe = document.getElementById("tabBreathe");

function getCachedUserProfile() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch (e) {
    console.error("Failed to parse cached user profile storage context:", e);
    return null;
  }
}

async function establishSession(type) {
  if (matchPollTimer) {
    clearTimeout(matchPollTimer);
    matchPollTimer = null;
  }

  const userProfile = getCachedUserProfile();
  if (!userProfile) {
    setConnectionStatus("Login required");
    return;
  }

  const userId = String(userProfile.id || userProfile._id || "").trim();
  const mood = userProfile.current_mood || "Calm";

  if (!userId) {
    setConnectionStatus("Invalid user ID profile data");
    return;
  }

  currentMode = type;
  updateUIVisuals(mood);
  updateActiveTab(type);
  setInputEnabled(false);
  setConnectionStatus("Connecting...");

  let endpoint = type === "group" ? "/chat/group" : "/chat/mood";
  let payload = { userId, mood };

  try {
    const res = await fetch(`${CONFIG.HTTP_API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Server returned bad status code error: ${res.status}`);
    }

    if (data && data.status === "waiting") {
      currentConversationId = null;
      localStorage.removeItem(CONVERSATION_STORAGE_KEY);
      clearCanvasView();
      setConnectionStatus(data.message || "Waiting for a peer...");
      matchPollTimer = setTimeout(() => establishSession("mood"), 3000);
      return;
    }

    if (data && data.conversationId) {
      currentConversationId = data.conversationId;
      localStorage.setItem(CONVERSATION_STORAGE_KEY, data.conversationId);
      initiateLiveStream(currentConversationId, userId);
      setInputEnabled(true);
    } else {
      setConnectionStatus("No active matching channel slot found.");
    }
  } catch (err) {
    console.error("Pipeline initialization execution aborted:", err);
    setInputEnabled(false);
    setConnectionStatus("Match failed — retry");
  }
}

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

function initiateLiveStream(conversationId, userId) {
  if (wsInstance) wsInstance.close();

  wsInstance = new WebSocket(CONFIG.WS_API);

  wsInstance.onopen = () => {
    wsInstance.send(
        JSON.stringify({
          type: "join",
          userId,
          conversationId,
        }),
    );
  };

  wsInstance.onmessage = (event) => {
    let frame;
    try {
      frame = JSON.parse(event.data);
    } catch (e) {
      return;
    }

    if (frame.type === "joined") {
      setConnectionStatus("Connected");
      setInputEnabled(true);
      loadConversationHistory(conversationId);
      return;
    }

    if (frame.type === "typing" && typingStatus) {
      typingStatus.style.display = frame.isTyping ? "flex" : "none";
      return;
    }

    if (frame.type === "message") {
      const msg = frame.data;
      if (!msg) return;

      const text = String(msg.content || "").trim();
      if (!text) return;

      const userProfile = getCachedUserProfile();
      const myId = String(userProfile?.id || userProfile?._id || "").toLowerCase();
      const senderId = String(msg.userId || "").toLowerCase();

      if (senderId === myId) return;

      const name = msg.username || msg.alias || "Unknown Peer";

      hideTypingMonitor();
      renderBubble(text, "incoming", name, msg.timestamp);
    }
  };

  wsInstance.onclose = () => {
    setConnectionStatus("Disconnected");
    setTimeout(() => {
      if (currentConversationId) {
        const user = getCachedUserProfile();
        if (user) {
          initiateLiveStream(currentConversationId, user.id || user._id);
        }
      }
    }, 3000);
  };

  wsInstance.onerror = (err) => {
    console.error("WebSocket messaging transport error:", err);
  };
}

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const user = getCachedUserProfile();
  const userId = user?.id || user?._id;
  const text = userInput.value.trim();

  if (!text || !wsInstance || !currentConversationId) return;

  const name = user?.alias || user?.username || "You";

  const payload = {
    type: "message",
    userId,
    username: name,
    alias: name,
    conversationId: currentConversationId,
    content: text,
  };

  wsInstance.send(JSON.stringify(payload));
  renderBubble(text, "outgoing", "You", new Date().toISOString());
  userInput.value = "";
  setTimeout(showTypingMonitor, 500);
});

userInput.addEventListener('input', () => {
  if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN || !currentConversationId) return;
  if (typingTimeout) clearTimeout(typingTimeout);
  const user = getCachedUserProfile();
  wsInstance.send(JSON.stringify({
    type: 'typing',
    isTyping: true,
    userId: user?.id || user?._id,
    username: user?.alias || 'Someone',
    conversationId: currentConversationId
  }));
  typingTimeout = setTimeout(() => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.send(JSON.stringify({
        type: 'typing',
        isTyping: false,
        userId: user?.id || user?._id,
        conversationId: currentConversationId
      }));
    }
  }, 2000);
});

function renderBubble(message, direction, sender, timestamp) {
  const t = timestamp ? new Date(timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
  const div = document.createElement('div');
  div.className = `message-wrapper ${direction}`;
  div.innerHTML = `
    <div class="bubble">${escapeHTML(message)}</div>
    <span class="meta-lbl">${escapeHTML(sender)} ${t}</span>
  `;
  messageContainer.appendChild(div);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

async function loadConversationHistory(conversationId) {
  const userProfile = getCachedUserProfile();
  const myId = String(userProfile?.id || userProfile?._id || "").toLowerCase();

  try {
    const res = await fetch(`${CONFIG.HTTP_API}/api/conversations/${conversationId}/messages`);
    if (!res.ok) {
      throw new Error(`History request failed: ${res.status}`);
    }

    const messages = await res.json();
    clearCanvasView();

    messages.forEach((msg) => {
      const direction = String(msg.userId || "").toLowerCase() === myId ? "outgoing" : "incoming";
      renderBubble(msg.content, direction, msg.alias || "User", msg.sentAt || msg.timestamp);
    });
  } catch (err) {
    console.error("Failed to load conversation history:", err);
    clearCanvasView();
  }
}

function escapeHTML(str) {
  return String(str).replace(
      /[&<>'"]/g,
      (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[c],
  );
}

function updateUIVisuals(mood) {
  chatTitle.textContent = currentMode === "group" ? `${mood} Sanctuary` : `${mood} Reflection`;
}

function updateActiveTab(type) {
  tabListen?.classList.toggle("active", type === "mood");
  tabBreathe?.classList.toggle("active", type === "group");
}

function setInputEnabled(enabled) {
  if (userInput) userInput.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
}

function setConnectionStatus(t) {
  if (connectionState) connectionState.textContent = t;
}

function clearCanvasView() {
  messageContainer.innerHTML = "";
}

function showTypingMonitor() {
  if (typingStatus) typingStatus.style.display = "flex";
}

function hideTypingMonitor() {
  if (typingStatus) typingStatus.style.display = "none";
}

if (tabListen) tabListen.onclick = () => establishSession("mood");
if (tabBreathe) tabBreathe.onclick = () => establishSession("group");

document.addEventListener("DOMContentLoaded", () => {
  // Restore saved conversation if exists
  const savedId = localStorage.getItem(CONVERSATION_STORAGE_KEY);
  if (savedId) {
    const user = getCachedUserProfile();
    if (user) {
      currentConversationId = savedId;
      initiateLiveStream(savedId, user.id || user._id);
      return;
    }
  }
  establishSession(tabListen ? "mood" : "group");
});
