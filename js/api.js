const API_BASE = "http://localhost:8888/api";

function getToken() {
  return localStorage.getItem("token");
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + (getToken() || ""),
  };
}

async function apiRequest(endpoint, method = "GET", data = null) {
  const options = {
    method,
    headers: getHeaders(),
  };
  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = "index.html";
      return null;
    }
    return response;
  } catch (err) {
    console.error("API network boundary error:", err);
    throw err;
  }
}

async function login(email, passkey) {
  return await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, passkey }),
  });
}

async function register(email, passkey, alias) {
  return await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, passkey, alias }),
  });
}

async function getCurrentUser() {
  const response = await apiRequest("/auth/me");
  if (response) return response.json();
  return null;
}

async function logout() {
  try {
    await apiRequest("/auth/logout", "POST");
  } catch (_) {}
  localStorage.clear();
  window.location.href = "index.html";
}

async function getUserProfile(userId) {
  const response = await apiRequest(`/users/${userId}`);
  if (response) return response.json();
  return null;
}

async function updateUserProfile(userId, data) {
  const response = await apiRequest(`/users/${userId}`, "PUT", data);
  if (response) return response.json();
  return null;
}

async function getReflections() {
  const response = await apiRequest("/reflections");
  if (response && response.ok) {
    const resData = await response.json();
    return resData.success ? resData.data : resData;
  }
  return [];
}

async function createReflection(content) {
  // Extract the active session user to pass their structural ID mapping
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const response = await apiRequest("/reflections", "POST", {
    content: content,
    userId: user.id || user.userId, // Match whatever key format your backend user schema uses
  });

  if (response && response.ok) {
    return await response.json();
  }
  return null;
}
async function initiateConversation({ userId, volunteerId } = {}) {
  // If the invocation passed an object containing explicit fields, prioritize them.
  // Otherwise, fall back to parsing local storage states safely.
  let targetUserId = userId;
  let currentVolunteerId = volunteerId;

  if (!currentVolunteerId || !targetUserId) {
    try {
      const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");

      // If only one flat string parameter was sent legacy-style (e.g., initiateConversation(targetUserId))
      if (typeof arguments[0] === "string") {
        targetUserId = arguments[0];
        currentVolunteerId =
          cachedUser.id || cachedUser._id || cachedUser.userId;
      } else if (!currentVolunteerId) {
        currentVolunteerId =
          cachedUser.id || cachedUser._id || cachedUser.userId;
      }
    } catch (e) {
      console.error(
        "Failed to recover user profile structure metrics from storage context:",
        e,
      );
    }
  }

  // Guard criteria validation check block before attempting flight transport paths
  if (!targetUserId || !currentVolunteerId) {
    throw new Error(
      "Cannot anchor a session mapping link: both userId and volunteerId are required.",
    );
  }

  // Execute flight pipeline request targeting your Vert.x ChatRouter layout mappings
  const response = await apiRequest("/conversations/initiate", "POST", {
    userId: targetUserId,
    volunteerId: currentVolunteerId,
  });

  if (!response || !response.ok) {
    throw new Error(
      `Server returned status code: ${response ? response.status : "Network Fail"}`,
    );
  }

  const resData = await response.json();
  return resData.data ? resData.data : resData;
}
window.api = {
  login,
  register,
  getCurrentUser,
  logout,
  getUserProfile,
  updateUserProfile,
  getReflections,
  createReflection,
  initiateConversation,
};
