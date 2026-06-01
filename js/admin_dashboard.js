const API = "http://localhost:8888/api";
let authToken = "";
let currentPage = 0;
let totalPages = 1;
let searchTimer = null;
let pendingAction = null;
let pendingUserId = null;
let filterBarOpen = false;
let analyticsInterval = null;

// Init
(function init() {
  authToken = localStorage.getItem("token");
  if (!authToken) {
    window.location.href = "index.html";
    return;
  }

  // Guard: only admins
  const role = localStorage.getItem("role");
  if (role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  // Set avatar initials
  const alias = localStorage.getItem("alias") || "A";
  document.getElementById("nav-avatar").textContent = alias
    .charAt(0)
    .toUpperCase();

  // Load data
  loadAnalytics();
  loadMembers();
  loadFlaggedItems();
  updateLiveTime();

  // Auto-refresh analytics and flags every 30s
  analyticsInterval = setInterval(() => {
    loadAnalytics();
    loadFlaggedItems();
  }, 30000);
  setInterval(updateLiveTime, 1000);

  function initAdminWS() {
    const ws = new WebSocket('ws://localhost:8889/ws/admin');
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'new_flag') {
          if (typeof toast === 'function') toast('New emergency flag!', 'error');
          if (typeof loadFlaggedItems === 'function') loadFlaggedItems();
          if (typeof loadAnalytics === 'function') loadAnalytics();
        }
        if (data.type === 'new_user') {
          if (typeof loadMembers === 'function') loadMembers();
        }
        if (data.type === 'flag_updated') {
          if (typeof loadFlaggedItems === 'function') loadFlaggedItems();
        }
      } catch (err) {
        console.error('Admin WebSocket error:', err);
      }
    };
    ws.onclose = () => setTimeout(initAdminWS, 3000);
  }
  initAdminWS();

  // Search debounce
  document.getElementById("member-search").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentPage = 0;
      loadMembers();
    }, 380);
  });

  // Close dropdowns on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".actions-wrap")) {
      document
        .querySelectorAll(".dropdown.open")
        .forEach((d) => d.classList.remove("open"));
    }
  });

  document.getElementById("view-all-link").addEventListener("click", () => {
    currentPage = 0;
    document.getElementById("member-search").value = "";
    document.getElementById("filter-role").value = "";
    document.getElementById("filter-status").value = "";
    loadMembers();
  });
})();


function updateLiveTime() {
  const now = new Date();
  document.getElementById("live-time").textContent = now.toLocaleTimeString(
    "en-US",
    { hour: "2-digit", minute: "2-digit" },
  );
}


async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + authToken,
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok || !json.success)
    throw new Error(json.message || "Request failed");
  return json.data;
}

async function loadAnalytics() {
  try {
    const data = await apiFetch("/admin/dashboard/analytics");
    renderStats(data);
    renderEmergency(data.emergencyMonitoring || []);
  } catch (err) {
    console.error("Analytics error:", err);
  }
}

function renderStats(data) {
  document.getElementById("stats-grid").innerHTML = `
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon">&#128100;</div>
        <span class="stat-change">+4%</span>
      </div>
      <div class="stat-value">${Number(data.activeSoulsCount).toLocaleString()}</div>
      <div class="stat-label">Active Souls</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon">&#128119;</div>
        <span class="stat-badge ${statusClass(data.volunteersStatus)}">${capitalise(data.volunteersStatus)}</span>
      </div>
      <div class="stat-value">${Number(data.volunteersOnlineCount).toLocaleString()}</div>
      <div class="stat-label">Volunteers Online</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon">&#128172;</div>
        <span class="stat-badge ${data.conversationsStatus === "active" ? "active" : "amber"}">${capitalise(data.conversationsStatus)}</span>
      </div>
      <div class="stat-value">${Number(data.activeConversationsCount).toLocaleString()}</div>
      <div class="stat-label">Active Conversations</div>
    </div>
  `;
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

// ─Emergency Monitors
function statusClass(s) {
  if (s === "stable") return "stable";
  if (s === "low" || s === "critical") return "amber";
  return "stable";
}

function renderEmergency(flags) {
  const grid = document.getElementById("emergency-grid");
  if (!flags.length) {
    grid.innerHTML = `<div class="stat-card" style="grid-column:1/-1"><div class="empty-state"><div class="icon">&#10003;</div>No open emergency flags</div></div>`;
    return;
  }
  grid.innerHTML = flags
    .map((f) => {
      const riskClass =
        f.riskLevel === "high"
          ? "high"
          : f.riskLevel === "medium"
            ? "medium"
            : "low";
      const initials = (f.alias || "AN").substring(0, 2).toUpperCase();
      return `
      <div class="emergency-card risk-${riskClass}">
        <div class="emergency-card-top">
          <div class="emergency-user">
            <div class="emergency-avatar">${initials}</div>
            <span class="emergency-alias">${escHtml(f.alias || "Anonymous")}</span>
          </div>
          <span class="risk-badge ${riskClass}">${capitalise(f.riskLevel)} Risk</span>
        </div>
        <p class="emergency-content">"${escHtml(f.flaggedContent)}"</p>
        <div class="emergency-actions">
          <button class="btn-sm primary" onclick="viewMember('${f.userId}')">View more now</button>
          <button class="btn-sm" onclick="assignGuide('${f.flagId}')">Assign Guide</button>
        </div>
      </div>
    `;
    })
    .join("");
}

// Flagged Items
async function loadFlaggedItems() {
  try {
    // Queries all tracking rows matching the schema
    const data = await apiFetch("/admin/emergency/flags");
    renderFlaggedItemsTable(data || []);
  } catch (err) {
    console.error("Failed to parse database flags feed:", err);
    document.getElementById("flagged-list").innerHTML = `
      <div class="empty-state" style="padding:15px;"><div class="icon">&#9888;</div>Error loading review items</div>`;
  }
}

function renderFlaggedItemsTable(items) {
  const container = document.getElementById("flagged-list");
  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:20px;">
        <div class="icon">&#10003;</div>No items flagged for review.
      </div>`;
    return;
  }

  container.innerHTML = items
    .map((i) => {
      const riskClass = (i.riskLevel || "low").toLowerCase();
      const statusKey = (i.status || "open").toLowerCase();
      const timeAgo = i.flaggedAt ? formatTimeAgo(i.flaggedAt) : "Recent";

      return `
      <div class="flagged-item" id="flag-item-${i.flagId}">
        <div class="flagged-tag">
          <span class="risk-badge ${riskClass}">${riskClass.toUpperCase()} RISK</span>
          <span class="status-pill state-${statusKey}">${capitalise(statusKey.replace("_", " "))}</span>
          <span class="time">${timeAgo}</span>
        </div>
        <p class="flagged-desc">
          <strong>${escHtml(i.alias || "Anonymous User")}</strong>: "${escHtml(i.flaggedContent)}"
        </p>
        <div class="flagged-actions">
          ${
            statusKey === "open"
              ? `
            <button class="flagged-btn" onclick="updateFlagTriage('${i.flagId}', 'under_review')">Keep</button>
            <button class="flagged-btn remove" onclick="updateFlagTriage('${i.flagId}', 'resolved')">Remove</button>
          `
              : statusKey === "under_review"
                ? `
            <button class="flagged-btn remove" onclick="updateFlagTriage('${i.flagId}', 'resolved')">Resolve Now</button>
          `
                : `
            <span class="resolved-check-label">&#10004; Settled</span>
          `
          }
        </div>
      </div>
    `;
    })
    .join("");
}

async function updateFlagTriage(flagId, targetStatus) {
  try {
    await apiFetch(`/admin/emergency/flags/${flagId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: targetStatus }),
    });
    toast(`Flag triage updated successfully.`, "success");
    loadFlaggedItems();
    loadAnalytics(); // Refresh structural counter data simultaneously
  } catch (err) {
    toast(err.message, "error");
  }
}

//  Community Members
async function loadMembers() {
  const search = document.getElementById("member-search").value.trim();
  const role = document.getElementById("filter-role").value;
  const active = document.getElementById("filter-status").value;
  const sortBy = document.getElementById("filter-sort").value;

  let url = `/admin/community/members?page=${currentPage}&size=5&sortBy=${sortBy}&sortDir=desc`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (role) url += `&role=${role}`;
  if (active !== "") url += `&active=${active}`;

  // Show skeleton
  document.getElementById("members-tbody").innerHTML = `
    <tr><td colspan="5">
      <div style="padding:8px 0">
        ${[0, 1, 2].map(() => `<div class="skeleton" style="width:100%;height:34px;border-radius:6px;margin-bottom:6px"></div>`).join("")}
      </div>
    </td></tr>`;
  document.getElementById("pg-info").textContent = "Loading…";

  try {
    const data = await apiFetch(url);
    totalPages = data.totalPages || 1;
    renderMembersTable(data.content || []);
    renderPagination(data.totalElements, data.currentPage, data.totalPages);
    document.getElementById("view-all-link").textContent =
      `View all ${Number(data.totalElements).toLocaleString()} members`;
  } catch (err) {
    document.getElementById("members-tbody").innerHTML =
      `<tr><td colspan="5"><div class="empty-state"><div class="icon">&#9888;</div>Failed to load members</div></td></tr>`;
    toast("Failed to load members: " + err.message, "error");
  }
}

function renderMembersTable(members) {
  if (!members.length) {
    document.getElementById("members-tbody").innerHTML =
      `<tr><td colspan="5"><div class="empty-state"><div class="icon">&#128100;</div>No members found</div></td></tr>`;
    return;
  }

  const avatarColors = ["#2a4a36", "#2a3a4a", "#3a2a4a", "#4a3a2a", "#2a4a4a"];

  document.getElementById("members-tbody").innerHTML = members
    .map((m, i) => {
      const initials = (m.alias || m.email || "AN")
        .substring(0, 2)
        .toUpperCase();
      const bgColor = avatarColors[i % avatarColors.length];
      const joined = m.joinedAt ? formatDate(m.joinedAt) : "—";
      const statusKey = (m.status || "Away").toLowerCase();
      const roleLower = (m.role || "user").toLowerCase();

      return `
      <tr>
        <td>
          <div class="member-cell">
            <div class="member-avatar" style="background:${bgColor}">${initials}</div>
            <span class="member-name">${escHtml(m.alias || m.email.split("@")[0])}</span>
          </div>
        </td>
        <td><span class="role-pill ${roleLower}">${capitalise(m.role)}</span></td>
        <td>
          <div class="status-cell">
            <span class="sdot ${statusKey}"></span>
            ${escHtml(m.status)}
          </div>
        </td>
        <td><span class="joined-date">${joined}</span></td>
        <td>
          <div class="actions-wrap">
            <button class="actions-btn" onclick="toggleDropdown('dd-${m.userId}', event)">···</button>
            <div class="dropdown" id="dd-${m.userId}">
              <div class="dd-item" onclick="openActivity('${m.userId}')">&#128269; Review Activity</div>
              <div class="dd-item" onclick="openAdjustRole('${m.userId}', '${m.role}')">&#128260; Adjust Role</div>
              ${
                m.role !== "volunteer"
                  ? `<div class="dd-item" onclick="confirmAction('make-volunteer','${m.userId}','Make ${escHtml(m.alias || "user")} a Volunteer?','This will grant volunteer access and create a volunteer profile.')">&#11014; Make Volunteer</div>`
                  : `<div class="dd-item" onclick="confirmAction('remove-volunteer','${m.userId}','Remove Volunteer Role?','This will demote ${escHtml(m.alias || "user")} back to a regular user.')">&#11015; Remove Volunteer</div>`
              }
              <div class="dd-divider"></div>
              <div class="dd-item danger" onclick="confirmAction('delete','${m.userId}','Delete this user?','This will permanently remove ${escHtml(m.alias || "user")} and all their data. This cannot be undone.')">&#128465; Delete User</div>
            </div>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderPagination(total, page, pages) {
  document.getElementById("pg-info").textContent =
    `${total.toLocaleString()} members · Page ${page + 1} of ${pages}`;

  const btns = document.getElementById("pg-btns");
  btns.innerHTML = "";

  const prev = btn("‹", page === 0);
  prev.addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage--;
      loadMembers();
    }
  });
  btns.appendChild(prev);

  const start = Math.max(0, page - 2);
  const end = Math.min(pages - 1, start + 4);
  for (let p = start; p <= end; p++) {
    const b = btn(p + 1, false, p === page);
    const pp = p;
    b.addEventListener("click", () => {
      currentPage = pp;
      loadMembers();
    });
    btns.appendChild(b);
  }

  const next = btn("›", page >= pages - 1);
  next.addEventListener("click", () => {
    if (currentPage < totalPages - 1) {
      currentPage++;
      loadMembers();
    }
  });
  btns.appendChild(next);
}

function btn(label, disabled, active = false) {
  const b = document.createElement("button");
  b.className = "pg-btn" + (active ? " active" : "");
  b.textContent = label;
  b.disabled = disabled;
  return b;
}

//  Dropdown toggle
function toggleDropdown(id, e) {
  e.stopPropagation();
  document.querySelectorAll(".dropdown.open").forEach((d) => {
    if (d.id !== id) d.classList.remove("open");
  });
  document.getElementById(id).classList.toggle("open");
}

//  Filter bar
function toggleFilterBar() {
  filterBarOpen = !filterBarOpen;
  document.getElementById("filter-bar").classList.toggle("open", filterBarOpen);
}
function applyFilters() {
  currentPage = 0;
  loadMembers();
}
function clearFilters() {
  document.getElementById("filter-role").value = "";
  document.getElementById("filter-status").value = "";
  document.getElementById("filter-sort").value = "created_at";
  currentPage = 0;
  loadMembers();
}

// Confirm action modal
function confirmAction(action, userId, title, body) {
  document
    .querySelectorAll(".dropdown.open")
    .forEach((d) => d.classList.remove("open"));
  pendingAction = action;
  pendingUserId = userId;
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").textContent = body;

  const confirmBtn = document.getElementById("modal-confirm-btn");
  confirmBtn.className =
    "btn-modal " + (action === "delete" ? "danger-confirm" : "confirm");
  confirmBtn.textContent = action === "delete" ? "Delete" : "Confirm";
  confirmBtn.onclick = executeAction;

  openModal("modal-confirm");
}

async function executeAction() {
  closeModal("modal-confirm");
  const action = pendingAction;
  const userId = pendingUserId;
  if (!action || !userId) return;

  try {
    let endpoint, method;
    if (action === "make-volunteer") {
      endpoint = `/admin/community/members/${userId}/make-volunteer`;
      method = "POST";
    } else if (action === "remove-volunteer") {
      endpoint = `/admin/community/members/${userId}/remove-volunteer`;
      method = "POST";
    } else if (action === "delete") {
      endpoint = `/admin/community/members/${userId}`;
      method = "DELETE";
    }

    await apiFetch(endpoint, { method });
    toast(
      action === "delete"
        ? "User deleted successfully."
        : action === "make-volunteer"
          ? "User promoted to volunteer."
          : "Volunteer role removed.",
      "success",
    );
    loadMembers();
    if (action !== "delete") {
      loadAnalytics();
      loadFlaggedItems();
    }
  } catch (err) {
    toast(err.message, "error");
  }
}

//  Adjust role modal
let adjustRoleUserId = null;
function openAdjustRole(userId, currentRole) {
  document
    .querySelectorAll(".dropdown.open")
    .forEach((d) => d.classList.remove("open"));
  adjustRoleUserId = userId;
  document.getElementById("role-select").value = currentRole || "user";
  openModal("modal-role");
}

async function confirmAdjustRole() {
  const newRole = document.getElementById("role-select").value;
  closeModal("modal-role");
  try {
    await apiFetch(`/admin/community/members/${adjustRoleUserId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: newRole }),
    });
    toast(`Role updated to ${capitalise(newRole)}.`, "success");
    loadMembers();
    loadAnalytics();
  } catch (err) {
    toast(err.message, "error");
  }
}

//  Activity review modal
async function openActivity(userId) {
  document
    .querySelectorAll(".dropdown.open")
    .forEach((d) => d.classList.remove("open"));
  document.getElementById("activity-title").textContent = "Activity Review";
  document.getElementById("activity-sub").textContent = "Loading…";
  document.getElementById("activity-stats").innerHTML = "";
  document.getElementById("activity-info").innerHTML = "";
  openModal("modal-activity");

  try {
    const d = await apiFetch(`/admin/community/members/${userId}/activity`);
    document.getElementById("activity-title").textContent = escHtml(
      d.alias || d.email,
    );
    document.getElementById("activity-sub").textContent = escHtml(d.email);

    document.getElementById("activity-stats").innerHTML = `
      <div class="activity-stat">
        <div class="activity-stat-val">${d.totalConversations ?? 0}</div>
        <div class="activity-stat-lbl">Conversations</div>
      </div>
      <div class="activity-stat">
        <div class="activity-stat-val">${d.totalReflections ?? 0}</div>
        <div class="activity-stat-lbl">Reflections</div>
      </div>
      <div class="activity-stat">
        <div class="activity-stat-val">${d.totalBreatheSessions ?? 0}</div>
        <div class="activity-stat-lbl">Breathe Sessions</div>
      </div>
      <div class="activity-stat">
        <div class="activity-stat-val">${d.activeConversationCount ?? 0}</div>
        <div class="activity-stat-lbl">Active Now</div>
      </div>
    `;

    document.getElementById("activity-info").innerHTML = `
      <div class="activity-row"><span class="activity-row-lbl">Role</span>      <span class="activity-row-val">${capitalise(d.role)}</span></div>
      <div class="activity-row"><span class="activity-row-lbl">Status</span>    <span class="activity-row-val">${escHtml(d.status)}</span></div>
      <div class="activity-row"><span class="activity-row-lbl">Joined</span>    <span class="activity-row-val">${formatDate(d.joinedAt)}</span></div>
      <div class="activity-row"><span class="activity-row-lbl">Last Login</span> <span class="activity-row-val">${d.lastLoginAt ? formatDate(d.lastLoginAt) : "Never"}</span></div>
      ${d.currentMood ? `<div class="activity-row"><span class="activity-row-lbl">Mood</span><span class="activity-row-val">${escHtml(d.currentMood)}</span></div>` : ""}
    `;
  } catch (err) {
    document.getElementById("activity-sub").textContent =
      "Failed to load activity data.";
    toast(err.message, "error");
  }
}

// Emergency helpers
function viewMember(userId) {
  if (userId) openActivity(userId);
}
function assignGuide(flagId) {
  toast("Guide assignment feature coming soon.", "success");
}

// Modal helpers
function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
});

//  Toast
function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById("toast-wrap").appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

//  Auth
async function signOut() {
  try {
    await apiFetch("/auth/signout", { method: "POST" });
  } catch (_) {}
  localStorage.clear();
  window.location.href = "index.html";
}

function navTo(page) {
  toast(`Navigating to ${capitalise(page)}…`, "success");
}

//  Utilities
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function capitalise(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
function formatTimeAgo(isoString) {
  try {
    const date = new Date(isoString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}hr ago`;
    return date.toLocaleDateString();
  } catch (e) {
    return "Recent";
  }
}
