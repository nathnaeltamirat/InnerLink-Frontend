const API_BASE = "http://localhost:8888/api";

let currentMode = "signin";

// ── Mode Switching ─────────────────────────────────────
function switchMode(mode) {
  currentMode = mode;

  const isSignup = mode === "signup";

  document
    .getElementById("tab-signin")
    .classList.toggle("active", !isSignup);

  document
    .getElementById("tab-signup")
    .classList.toggle("active", isSignup);

  document
    .getElementById("tab-signin")
    .setAttribute("aria-selected", !isSignup);

  document
    .getElementById("tab-signup")
    .setAttribute("aria-selected", isSignup);

  document
    .getElementById("alias-group")
    .classList.toggle("show", isSignup);

  document.getElementById("forgot-row").style.display =
    isSignup ? "none" : "flex";

  document.getElementById("form-title").textContent =
    isSignup ? "Create a Space" : "Welcome Back";

  document.getElementById("form-subtitle").textContent =
    isSignup
      ? "A quiet corner, just for you."
      : "Continue your journey in private.";

  document.getElementById("btn-label").textContent =
    isSignup ? "Create Space" : "Enter Quietly";

  document.getElementById("form-footer").innerHTML = isSignup
    ? `Already here? <a onclick="switchMode('signin')">Sign in</a>`
    : `New here? <a onclick="switchMode('signup')">Create a space</a>`;

  hideMsg();
}

// ── Message Helpers ───────────────────────────────────
function showMsg(text, type) {
  const el = document.getElementById("msg");

  el.textContent = text;
  el.className = `msg show ${type}`;
}

function hideMsg() {
  document.getElementById("msg").className = "msg";
}

// ── Loading State ─────────────────────────────────────
function setLoading(state) {
  const btn = document.getElementById("submit-btn");

  btn.classList.toggle("loading", state);
  btn.disabled = state;
}

// ── Form Submit ───────────────────────────────────────
document
  .getElementById("auth-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    hideMsg();

    const email = document.getElementById("email").value.trim();
    const passkey = document.getElementById("passkey").value.trim();
    const alias = document.getElementById("alias").value.trim();

    // Validation
    if (!email || !passkey) {
      showMsg("Please fill in all required fields.", "error");
      return;
    }

    if (currentMode === "signup" && !alias) {
      showMsg("Alias is required.", "error");
      return;
    }

    setLoading(true);

    try {
      let response;

      // ── SIGN UP ─────────────────────────────────────
      if (currentMode === "signup") {
        response = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            passkey,
            alias,
          }),
        });
      }

      // ── SIGN IN ─────────────────────────────────────
      else {
        response = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            passkey,
          }),
        });
      }

      const result = await response.json();

      // Error Handling
      if (!response.ok) {
        showMsg(
          result.message || "Something went wrong.",
          "error"
        );
        return;
      }

      // ── SUCCESS HANDLING DEPENDING ON MODE ───────────
      const data = result.data || result;

      if (currentMode === "signup") {
        // Registration yields just the user object profile mapper directly
        showMsg("Account created successfully! Please sign in below.", "success");
        
        // Transitions them smoothly to login view without clearing inputs
        setTimeout(() => {
          switchMode("signin");
        }, 1200);

      } else {
        // Login provides both the tracking token string and nested user data
        const token = data.token;
        const user = data.user || {};

        if (!token) {
          showMsg("Session mapping initialization failure.", "error");
          return;
        }

        localStorage.setItem("token", token);
        localStorage.setItem("alias", user.alias || "friend");
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("role", user.role || "user");

        showMsg("Login successful.", "success");

        // Secure Dash Routing Redirect Sequence
        setTimeout(() => {
          if (user.role === "admin") {
            window.location.href = "admin_dashboard.html";
          } else {
            window.location.href = "home.html";
          }
        }, 1000);
      }

    } catch (error) {
      console.error(error);
      showMsg(
        "Could not connect to server.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  });

// ── Guard Routing Hook Layer ─────────────────────────
(function () {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (token) {
    window.location.href =
      role === "admin"
        ? "admin_dashboard.html"
        : "home.html";
  }
})();