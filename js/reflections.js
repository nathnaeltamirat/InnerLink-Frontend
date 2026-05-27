document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  if (!token || role != "volunteer") {
    window.location.href = "index.html";
    return;
  }

  loadReflections();
  setupLogout();
  setupGridDelegation();
});

// ===== LOAD REFLECTIONS =====
async function loadReflections() {
  const grid = document.getElementById("reflectionsGrid");
  grid.innerHTML =
    '<div class="loading-state">Loading workspace reflections...</div>';

  let currentUser = {};
  try {
    currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  } catch (e) {
    console.error("Failed to extract cached session metrics:", e);
  }

  const isVolunteer =
    currentUser.role === "volunteer" || currentUser.role === "admin";

  try {
    const reflections = await window.api.getReflections();

    if (reflections && reflections.length > 0) {
      grid.innerHTML = reflections
        .map((item) => {
          const showTalkButton = isVolunteer && item.userId !== currentUser.id;
          const initial = (item.userAlias || "A").charAt(0).toUpperCase();

          return `
                    <div class="reflection-card">
                        <div class="card-header">
                            <div class="avatar-small">${initial}</div>
                            <div>
                                <div class="author-name">${esc(item.userAlias || "Anonymous")}</div>
                                <div class="post-time">${timeAgo(item.createdAt)}</div>
                            </div>
                        </div>
                        <div class="card-content">${esc(item.content)}</div>
                        ${item.imageUrl ? `<img src="${esc(item.imageUrl)}" class="card-image" alt="Uploaded graphic">` : ""}
                        ${
                          showTalkButton
                            ? `
                            <div class="card-actions">
                                <button class="talk-to-user-btn" data-user-id="${item.userId}">
                                    💬 Talk to User
                                </button>
                            </div>
                        `
                            : ""
                        }
                    </div>
                `;
        })
        .join("");
    } else {
      grid.innerHTML =
        '<div class="empty-state">No reflections yet. Shared thoughts will appear here.</div>';
    }
  } catch (error) {
    console.error("Failed to synchronize layout feeds:", error);
    grid.innerHTML =
      '<div class="error-state">Error loading reflections feed. Please try again.</div>';
  }
}

// ===== EVENT DELEGATION =====
function setupGridDelegation() {
  const grid = document.getElementById("reflectionsGrid");
  grid.addEventListener("click", function (e) {
    const talkBtn = e.target.closest(".talk-to-user-btn");
    if (talkBtn) {
      const targetUserId = talkBtn.dataset.userId;
      initiateVolunteerChat(targetUserId);
    }
  });
}

// ===== INITIATE VOLUNTEER CHAT =====
async function initiateVolunteerChat(targetUserId) {
  try {
    // 1. Recover the current volunteer session safely
    let currentUser = {};
    try {
      currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    } catch (e) {
      console.error("Failed to parse volunteer session metadata:", e);
    }

    const volunteerId = currentUser.id || currentUser._id;
    if (!volunteerId) {
      alert(
        "Your volunteer profile session could not be verified. Please log in again.",
      );
      return;
    }

    // 2. Transmit both parts of the communication link to the API layer
    // Make sure your window.api implementation accepts an object or two distinct arguments!
    const apiResult = await window.api.initiateConversation({
      userId: targetUserId,
      volunteerId: volunteerId,
    });

    // Safety check: drill into apiResult if it is wrapped, otherwise read flat properties
    const chatRoomInfo =
      apiResult && apiResult.success && apiResult.data
        ? apiResult.data
        : apiResult;

    if (!chatRoomInfo || !chatRoomInfo.conversationId) {
      console.warn(
        "Expected 'conversationId' field missing from response channel indices:",
        apiResult,
      );
      alert(
        "Dialogue engine allocation context returned empty tracking indices.",
      );
      return;
    }

    localStorage.setItem(
      "AUTO_OPEN_CONVERSATION_ID",
      chatRoomInfo.conversationId,
    );
    localStorage.setItem(
      "AUTO_OPEN_CONVERSATION_TITLE",
      chatRoomInfo.title || "Direct Sanctuary Channel",
    );

    window.location.href = "unified_chat.html";
  } catch (error) {
    console.error("Critical channel redirection process aborted:", error);
    alert("Could not initialize secure dialogue node workspace.");
  }
}
// ===== UTILITIES =====
function timeAgo(dateString) {
  if (!dateString) return "Recent";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + "m ago";
  if (hours < 24) return hours + "h ago";
  return days + "d ago";
}

function setupLogout() {
  document
    .getElementById("logoutBtn")
    .addEventListener("click", async function () {
      await window.api.logout();
    });
}

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
// ===== LOAD REFLECTIONS =====
async function loadReflections() {
  const grid = document.getElementById("reflectionsGrid");
  grid.innerHTML =
    '<div class="loading-state">Loading workspace reflections...</div>';

  let currentUser = {};
  try {
    currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  } catch (e) {
    console.error("Failed to extract cached session metrics:", e);
  }

  // Capture standard access privileges safely
  const isVolunteer =
    currentUser.role === "volunteer" || currentUser.role === "admin";

  try {
    const reflections = await window.api.getReflections();

    if (reflections && reflections.length > 0) {
      grid.innerHTML = reflections
        .map((item) => {
          const showTalkButton = isVolunteer && item.userId !== currentUser.id;
          const initial = (item.userAlias || "A").charAt(0).toUpperCase();

          return `
                    <div class="reflection-card">
                        <div class="card-header">
                            <div class="avatar-small">${initial}</div>
                            <div>
                                <div class="author-name">${esc(item.userAlias || "Anonymous")}</div>
                                <div class="post-time">${timeAgo(item.createdAt)}</div>
                            </div>
                        </div>
                        <div class="card-content">${esc(item.content)}</div>
                        ${item.imageUrl ? `<img src="${esc(item.imageUrl)}" class="card-image" alt="Uploaded graphic">` : ""}
                        ${
                          showTalkButton
                            ? `
                            <div class="card-actions">
                                <button class="talk-to-user-btn" data-user-id="${item.userId}">
                                    💬 Talk to User
                                </button>
                            </div>
                        `
                            : ""
                        }
                    </div>
                `;
        })
        .join("");
    } else {
      grid.innerHTML =
        '<div class="empty-state">No reflections yet. Be the first to share.</div>';
    }
  } catch (error) {
    console.error("Failed to synchronize layout feeds:", error);
    grid.innerHTML =
      '<div class="error-state">Error loading reflections feed. Please try again.</div>';
  }
}

// ===== EVENT DELEGATION =====
function setupGridDelegation() {
  const grid = document.getElementById("reflectionsGrid");
  grid.addEventListener("click", function (e) {
    const talkBtn = e.target.closest(".talk-to-user-btn");
    if (talkBtn) {
      const targetUserId = talkBtn.dataset.userId;
      initiateVolunteerChat(targetUserId);
    }
  });
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
async function initiateVolunteerChat(targetUserId) {
  try {
    const apiResult = await window.api.initiateConversation(targetUserId);

    // Safety check: drill into apiResult if it is wrapped, otherwise read flat properties
    const chatRoomInfo =
      apiResult && apiResult.success && apiResult.data
        ? apiResult.data
        : apiResult;

    if (!chatRoomInfo || !chatRoomInfo.conversationId) {
      console.warn(
        "Expected 'conversationId' field missing from response channel indices:",
        apiResult,
      );
      alert(
        "Dialogue engine allocation context returned empty tracking indices.",
      );
      return;
    }

    localStorage.setItem(
      "AUTO_OPEN_CONVERSATION_ID",
      chatRoomInfo.conversationId,
    );
    localStorage.setItem(
      "AUTO_OPEN_CONVERSATION_TITLE",
      chatRoomInfo.title || "Direct Sanctuary Channel",
    );

    window.location.href = "unified_chat.html";
  } catch (error) {
    console.error("Critical channel redirection process aborted:", error);
    alert("Could not initialize secure dialogue node workspace.");
  }
}

// ===== CREATE REFLECTION MODAL =====
function setupCreateModal() {
  const modal = document.getElementById("createModal");
  const openBtn = document.getElementById("createReflectionBtn");
  const cancelBtn = document.getElementById("cancelModal");
  const submitBtn = document.getElementById("submitReflection");
  const textarea = document.getElementById("reflectionContent");

  openBtn.addEventListener("click", function () {
    modal.classList.add("active");
    textarea.value = "";
    textarea.focus();
  });

  const closeTags = [cancelBtn, modal];
  closeTags.forEach((el) => {
    el.addEventListener("click", function (e) {
      if (e.target === cancelBtn || e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });

  submitBtn.addEventListener("click", async function () {
    const content = textarea.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Posting...";

    try {
      const success = await window.api.createReflection(content);
      if (success) {
        modal.classList.remove("active");
        textarea.value = "";
        await loadReflections();
      }
    } catch (error) {
      alert("Error sharing reflection across secure cluster node endpoints.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Post";
    }
  });
}

// ===== UTILITIES =====
function timeAgo(dateString) {
  if (!dateString) return "Recent";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + "m ago";
  if (hours < 24) return hours + "h ago";
  return days + "d ago";
}

function setupLogout() {
  document
    .getElementById("logoutBtn")
    .addEventListener("click", async function () {
      await window.api.logout();
    });
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
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
