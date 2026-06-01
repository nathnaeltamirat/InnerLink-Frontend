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

const CONVERSATION_STORAGE_KEY = 'last_conversation_id';

let activeUser = null;
let currentConversationId = null;
let ws = null;
let msgQueue = [];
let reconnectAttempts = 0;
let typingTimeout = null;
let typingIndicatorTimer = null;
let onlineUsers = new Map();

const channelsContainer = document.getElementById("channelsContainer");
const messageContainer = document.getElementById("messageContainer");
const messageForm = document.getElementById("messageForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const activeChatTitle = document.getElementById("activeChatTitle");
const connectionState = document.getElementById("connectionState");
const profileDisplay = document.getElementById("profileDisplay");
const typingStatus = document.getElementById("typingStatus");
const onlineStatusContainer = document.getElementById("onlineStatusContainer");
const signoutBtn = document.getElementById("signoutBtn");

function loadCachedProfile() {
  try {
    activeUser = JSON.parse(localStorage.getItem("user"));
    if (activeUser) {
      profileDisplay.textContent = activeUser.username || activeUser.alias || "Calm Reflection";
      return activeUser.id || activeUser._id;
    }
  } catch (e) {
    console.error("Local user configuration profile trace is corrupted:", e);
  }
  profileDisplay.textContent = "Guest Session";
  return null;
}

function connectWS() {
  ws = new WebSocket(CONFIG.WS_API);
  ws.onopen = () => {
    reconnectAttempts = 0;
    msgQueue.forEach(m => ws.send(JSON.stringify(m)));
    msgQueue = [];
    if (currentConversationId && activeUser) {
      ws.send(JSON.stringify({
        type: 'join',
        userId: activeUser.id || activeUser._id,
        conversationId: currentConversationId
      }));
      ws.send(JSON.stringify({
        type: 'presence',
        isOnline: true,
        userId: activeUser.id || activeUser._id,
        username: activeUser.alias || 'Anonymous',
        conversationId: currentConversationId
      }));
    }
    setConnectionStateLabel('Connected', 'state-online');
  };
  ws.onclose = () => {
    setConnectionStateLabel('Disconnected', 'state-offline');
    setTimeout(connectWS, Math.min(1000 * Math.pow(1.5, reconnectAttempts++), 30000));
  };
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'message' && data.data) {
        const myId = String(activeUser?.id || activeUser?._id).toLowerCase();
        if (String(data.data.userId).toLowerCase() !== myId) {
          renderBubble(data.data.content, 'incoming', data.data.alias || 'User', data.data.timestamp || data.data.sentAt);
        }
      }
      if (data.type === 'typing') {
        if (typingStatus) {
          typingStatus.style.display = data.isTyping ? 'block' : 'none';
          if (data.isTyping) {
            typingStatus.textContent = data.username ? data.username + ' is typing...' : 'Someone is typing...';
            if (typingIndicatorTimer) clearTimeout(typingIndicatorTimer);
            typingIndicatorTimer = setTimeout(() => {
              typingStatus.style.display = 'none';
            }, 3000);
          }
        }
      }
      if (data.type === 'presence') {
        if (data.isOnline) onlineUsers.set(data.userId, data.username || 'User');
        else onlineUsers.delete(data.userId);
        updateOnlineStatus();
      }
    } catch (e) {}
  };
}

function updateOnlineStatus() {
  if (onlineStatusContainer) {
    const names = Array.from(onlineUsers.values());
    onlineStatusContainer.innerHTML = `
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#4dba7f;animation:pulse 2s ease infinite;margin-right:6px;"></span>
      ${onlineUsers.size} online
      ${names.length > 0 ? '— ' + names.join(', ') : ''}
    `;
  }
}

function setConnectionStateLabel(text, classType) {
  if (connectionState) {
    connectionState.textContent = text;
    connectionState.className = `status-indicator-text ${classType || ''}`;
  }
}

function renderBubble(message, direction, sender, timestamp) {
  const t = timestamp ? new Date(timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
  const div = document.createElement('div');
  div.className = `message-wrapper ${direction}`;
  div.innerHTML = `
    <span class="message-sender-title">${escapeHTML(sender)}</span>
    <div class="bubble">${escapeHTML(message)}</div>
    <span style="display:block;font-size:0.65rem;color:#4e5363;margin-top:4px;text-align:right;">${t}</span>
  `;
  messageContainer.appendChild(div);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);
}

async function fetchUserConversations() {
  const userId = loadCachedProfile();
  if (!userId) return;
  try {
    const res = await fetch(`${CONFIG.HTTP_API}/api/conversations/user/${userId}`);
    if (!res.ok) throw new Error();
    const tracks = await res.json();
    channelsContainer.innerHTML = '';
    if (!tracks || tracks.length === 0) {
      const assigned = await assignVolunteerConversation(userId);
      if (assigned) {
        await fetchUserConversations();
        return;
      }
      channelsContainer.innerHTML = `<div class="empty-state">No conversation logs found</div>`;
    } else {
      tracks.forEach((track) => {
        const li = document.createElement('li');
        li.setAttribute('data-id', track.conversationId);
        const isSupport = track.type === 'support';
        const channelClass = isSupport ? 'room-support' : 'room-group';
        const displayRole = track.role ? track.role.toUpperCase() : 'MEMBER';
        const initial = (track.title || 'U').charAt(0).toUpperCase();
        li.className = `${channelClass}`;
        li.innerHTML = `
          <div class="sidebar-chat-card">
            <div class="user-avatar-initials">${initial}</div>
            <div class="conv-details">
              <div class="conv-meta-header">
                <span class="room-badge">${displayRole}</span>
              </div>
              <strong>${escapeHTML(track.title || 'Anonymous Peer')}</strong>
              <p>${isSupport ? 'Active support connection room' : 'Shared community space'}</p>
            </div>
          </div>
        `;
        li.onclick = () => switchActiveRoom(track.conversationId, track.title || 'Sanctuary Chat');
        channelsContainer.appendChild(li);
      });

      // Load saved conversation
      const savedId = localStorage.getItem(CONVERSATION_STORAGE_KEY);
      const savedTitle = localStorage.getItem('last_conversation_title');

      if (savedId) {
        const existing = tracks.find(t => t.conversationId === savedId);
        if (existing) {
          switchActiveRoom(savedId, existing.title || savedTitle || 'Sanctuary Chat');
          return;
        }
      }

      // If no saved conversation, select the first one
      if (tracks.length > 0) {
        switchActiveRoom(tracks[0].conversationId, tracks[0].title || 'Sanctuary Chat');
      }
    }
    const autoOpenId = localStorage.getItem('AUTO_OPEN_CONVERSATION_ID');
    const autoOpenTitle = localStorage.getItem('AUTO_OPEN_CONVERSATION_TITLE');
    if (autoOpenId) {
      localStorage.removeItem('AUTO_OPEN_CONVERSATION_ID');
      localStorage.removeItem('AUTO_OPEN_CONVERSATION_TITLE');
      switchActiveRoom(autoOpenId, autoOpenTitle || 'Direct Sanctuary');
    }
  } catch (err) {
    channelsContainer.innerHTML = `<div class="empty-state">Error syncing communication routes.</div>`;
  }
}

async function assignVolunteerConversation(userId) {
  try {
    const res = await fetch(`${CONFIG.HTTP_API}/api/conversations/assign-volunteer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!res.ok) return null;

    const room = await res.json();
    if (!room || !room.conversationId) return null;

    localStorage.setItem('AUTO_OPEN_CONVERSATION_ID', room.conversationId);
    localStorage.setItem('AUTO_OPEN_CONVERSATION_TITLE', room.title || 'Volunteer Chat Line');
    return room;
  } catch (err) {
    console.error('Could not assign volunteer conversation:', err);
    return null;
  }
}

async function switchActiveRoom(conversationId, title) {
  if (currentConversationId === conversationId) return;
  currentConversationId = conversationId;

  // Save to localStorage
  localStorage.setItem(CONVERSATION_STORAGE_KEY, conversationId);
  localStorage.setItem('last_conversation_title', title);

  Array.from(channelsContainer.children).forEach((el) => {
    el.classList.remove('active');
    if (el.getAttribute('data-id') === conversationId) el.classList.add('active');
  });
  activeChatTitle.textContent = title;
  userInput.removeAttribute('disabled');
  sendBtn.removeAttribute('disabled');
  messageContainer.innerHTML = `<div class="center-notice">Loading messages...</div>`;
  try {
    const res = await fetch(`${CONFIG.HTTP_API}/api/conversations/${conversationId}/messages`);
    if (res.ok) {
      const messages = await res.json();
      messageContainer.innerHTML = '';
      const myId = String(activeUser.id || activeUser._id).toLowerCase();
      messages.forEach((msg) => {
        const direction = String(msg.userId).toLowerCase() === myId ? 'outgoing' : 'incoming';
        renderBubble(msg.content, direction, msg.alias || 'User', msg.sentAt || msg.timestamp);
      });
    }
  } catch (err) {
    messageContainer.innerHTML = `<div class="center-notice">Channel initialized.</div>`;
  }
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({
      type: 'join',
      userId: activeUser.id || activeUser._id,
      conversationId: currentConversationId
    }));
      ws.send(JSON.stringify({
        type: 'presence',
        isOnline: true,
        userId: activeUser.id || activeUser._id,
        username: activeUser.alias || 'Anonymous',
        conversationId: currentConversationId
      }));
  }
}

function sendMessage(text) {
  const userId = activeUser.id || activeUser._id;
  const currentAlias = activeUser.alias || activeUser.username || 'Me';
  const payload = {
    type: 'message',
    userId: userId,
    username: currentAlias,
    alias: currentAlias,
    conversationId: currentConversationId,
    content: text,
    timestamp: new Date().toISOString()
  };
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  } else {
    msgQueue.push(payload);
  }
  renderBubble(text, 'outgoing', currentAlias, new Date().toISOString());
  userInput.value = '';
}

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text || !currentConversationId || !activeUser) return;
  sendMessage(text);
});

userInput.addEventListener('input', () => {
  if (!currentConversationId || !activeUser) return;
  if (typingTimeout) clearTimeout(typingTimeout);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({
      type: 'typing',
      isTyping: true,
      userId: activeUser.id || activeUser._id,
      username: activeUser.alias || 'Someone',
      conversationId: currentConversationId
    }));
  }
  typingTimeout = setTimeout(() => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'typing',
        isTyping: false,
        userId: activeUser.id || activeUser._id,
        conversationId: currentConversationId
      }));
    }
  }, 2000);
});

signoutBtn?.addEventListener('click', signOut);

document.addEventListener('DOMContentLoaded', () => {
  connectWS();
  fetchUserConversations();
});

async function signOut() {
  const token = localStorage.getItem('token');
  try {
    await fetch('http://localhost:8080/api/auth/signout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
  } catch (_) {}
  localStorage.clear();
  window.location.href = 'index.html';
}
