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
  }else if(role === "volunteer"){
    window.location.href = "reflections.html"
  }
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
});