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

let currentConversationId = null;
let wsInstance = null;
let currentMode = "mood"; // Default mode

// UI DOM Component Selections
const messageContainer = document.getElementById("messageContainer");
const messageForm = document.getElementById("messageForm");
const userInput = document.getElementById("userInput");
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

/* ================= CHANNEL SESSION WORKSPACE GENERATOR ================= */

async function establishSession(type) {
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
  setConnectionStatus("Connecting...");

  let endpoint = "/chat/mood";
  let payload = { userId, mood };

  if (type === "group") {
    endpoint = "/chat/group";
  }

  try {
    const res = await fetch(`${CONFIG.HTTP_API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("Session response data payload:", data);

    if (!res.ok) {
      // FIX: Guard against data.error returning null from server trace exceptions
      throw new Error(
        data.error || `Server returned bad status code error: ${res.status}`,
      );
    }

    if (data && data.conversationId) {
      currentConversationId = data.conversationId;
      initiateLiveStream(currentConversationId, userId);
    } else {
      setConnectionStatus("No active matching channel slot found.");
    }
  } catch (err) {
    console.error("Pipeline initialization execution aborted:", err);
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
/* ================= LIVE STREAM STREAMING ENGINE ================= */

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
      clearCanvasView();
      return;
    }

    if (frame.type === "message") {
      const msg = frame.data;
      if (!msg) return;

      const text = String(msg.content || "").trim();
      if (!text) return;

      const userProfile = getCachedUserProfile();
      const myId = String(
        userProfile?.id || userProfile?._id || "",
      ).toLowerCase();
      const senderId = String(msg.userId || "").toLowerCase();

      if (senderId === myId) return; // Ignore message echoes

      const name = msg.username || msg.alias || "Unknown Peer";

      hideTypingMonitor();
      renderBubble(text, "incoming", name);
    }
  };

  wsInstance.onclose = () => {
    setConnectionStatus("Disconnected");
  };

  wsInstance.onerror = (err) => {
    console.error("WebSocket messaging transport error:", err);
  };
}

/* ================= EVENT SUBMISSIONS DISPATCH ================= */

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

  renderBubble(text, "outgoing", "You");
  userInput.value = "";

  setTimeout(showTypingMonitor, 500);
});

/* ================= GRAPHICS AND RENDERING ASSISTANTS ================= */

function renderBubble(message, direction, sender) {
  const div = document.createElement("div");
  div.className = `message-wrapper ${direction}`;
  div.innerHTML = `
    <div class="bubble">${escapeHTML(message)}</div>
    <span class="meta-lbl">${escapeHTML(sender)}</span>
  `;
  messageContainer.appendChild(div);
  messageContainer.scrollTop = messageContainer.scrollHeight;
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

function updateUIVisuals(mood) {
  chatTitle.textContent =
    currentMode === "group" ? `${mood} Sanctuary` : `${mood} Reflection`;
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

// Attach Workspace Event Switching Hooks
if (tabListen) tabListen.onclick = () => establishSession("mood");
if (tabBreathe) tabBreathe.onclick = () => establishSession("group");

document.addEventListener("DOMContentLoaded", () => {
  establishSession("mood");
});
