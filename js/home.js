(function init() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const alias = localStorage.getItem("alias") || "";
  const role = localStorage.getItem("role") || "user";

  document.getElementById("user-alias").textContent = alias || "friend";
  document.getElementById("nav-avatar").textContent = (alias || "A")
      .charAt(0)
      .toUpperCase();

  if (role === "admin") {
    window.location.href = "admin_dashboard.html";
  } else if (role === "volunteer") {
    window.location.href = "reflections.html";
  }

  // Load my reflections after page loads
  loadMyReflections();
})();

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

document.getElementById("talk").addEventListener("click", (event) => {
  window.location.href = "chat.html";
});

document.getElementById("reflect").addEventListener("click", (event) => {
  window.location.href = "reflections.html";
});

document.getElementById("chat_grid").addEventListener("click", (event) => {
  window.location.href = "chat.html";
});

document.getElementById("reflect_grid").addEventListener("click", (event) => {
  window.location.href = "share.html";
});

document.getElementById("volunteer_chat").addEventListener("click", (event) => {
  window.location.href = "unified_chat.html";
});  // <-- Fixed: Added closing parenthesis

async function loadMyReflections() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.id;
  if (!userId) return;

  try {
    const allReflections = await window.api.getReflections();
    const myReflections = allReflections.filter(r => r.userId === userId);

    const section = document.getElementById("my-reflections-section");
    const grid = document.getElementById("myReflectionsGrid");

    if (!section || !grid) return;

    if (myReflections.length > 0) {
      section.style.display = "block";
      grid.innerHTML = myReflections.slice(0, 3).map(item => `
        <div class="feature-card">
          <div class="feature-desc" style="font-style:italic;color:var(--text-sub);">
            "${esc(item.content.substring(0, 80))}..."
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">
            ${timeAgo(item.createdAt)}
          </div>
        </div>
      `).join("");
    }
  } catch (error) {
    console.error("Error loading my reflections:", error);
  }
}

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

function esc(str) {
  if (!str) return "";
  return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
}