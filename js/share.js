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

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  setupComposeForm();
  setupLogout();
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

function setupComposeForm() {
  const textarea = document.getElementById("reflectionContent");
  const submitBtn = document.getElementById("submitReflectionBtn");
  const cancelBtn = document.getElementById("cancelComposeBtn");

  textarea.focus();

  cancelBtn.addEventListener("click", function () {
    window.location.href = "reflections.html";
  });

  submitBtn.addEventListener("click", async function () {
    const content = textarea.value.trim();
    if (!content) {
      alert("Please enter some text before posting.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Publishing...";

    try {
      const success = await window.api.createReflection(content);
      if (success) {
        textarea.value = "";
        window.location.href = "reflections.html";
      } else {
        alert("Could not post your thoughts. Check connection variables.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Post Reflection";
      }
    } catch (error) {
      console.error(error);
      alert("Error communicating along network socket arrays.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Post Reflection";
    }
  });
}

function setupLogout() {
  document
    .getElementById("logoutBtn")
    .addEventListener("click", async function () {
      await window.api.logout();
    });
}
