const SUPABASE_URL = "https://sokbfhxlwrxiorgepflu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_If6Yj7WJctjRz_0bhQuTfA_gRyRJlIo";

const authStatusEl = document.getElementById("auth-status");
const authPage = document.body.dataset.authPage || "login";
const productionOrigin = "https://autopub.cn";

if (location.hostname.endsWith(".vercel.app")) {
  const productionUrl = new URL(location.pathname + location.search + location.hash, productionOrigin);
  setAuthStatus("Preview login detected. Redirecting to autopub.cn...", "info");
  window.location.replace(productionUrl.href);
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true
  }
});

function setAuthStatus(message, type) {
  if (!authStatusEl) return;
  authStatusEl.textContent = message || "";
  authStatusEl.className = "auth-status" + (type ? " " + type : "");
}

function storeSession(token, refreshToken, user) {
  localStorage.setItem("autopub_token", token || "");
  if (refreshToken) localStorage.setItem("autopub_refresh_token", refreshToken);
  localStorage.setItem("autopub_user", JSON.stringify(user || {}));
  localStorage.setItem("autopub_origin", "autopub-web");
  window.dispatchEvent(new Event("autopub-session-updated"));
}

function syncExtensionSession(token, user) {
  try {
    chrome.runtime.sendMessage("EXTENSION_ID_PLACEHOLDER", {
      type: "AUTOPUB_SESSION_SYNC",
      session: { token, user, source: "web", synced_at: new Date().toISOString() },
      appBaseUrl: location.origin
    });
  } catch (_) {}
}

function completeWebSession(session) {
  if (!session || !session.access_token) return false;
  const user = session.user || {};
  storeSession(session.access_token, session.refresh_token, user);
  syncExtensionSession(session.access_token, user);
  window.location.href = "./pricing.html";
  return true;
}

async function handleGoogleOAuth(event) {
  event.preventDefault();
  setAuthStatus("Opening Google sign in...", "info");
  const redirectTo = new URL(authPage === "register" ? "./register.html" : "./login.html", window.location.href).href;
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo }
  });
  if (error) {
    setAuthStatus(error.message || "Google sign in failed.", "error");
    return;
  }
  if (data && data.url) window.location.href = data.url;
}

async function finishOAuthRedirect() {
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const error = params.get("error_description") || params.get("error") || hash.get("error_description") || hash.get("error");
  if (error) {
    setAuthStatus(decodeURIComponent(error), "error");
    return;
  }
  if (params.has("code") || hash.has("access_token")) setAuthStatus("Completing Google sign in...", "info");
  const { data, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) {
    setAuthStatus(sessionError.message || "Google sign in failed.", "error");
    return;
  }
  if (completeWebSession(data && data.session)) return;
  if (params.has("code") || hash.has("access_token")) {
    setAuthStatus("Google sign in did not return a session. Check Supabase redirect URL settings.", "error");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  setAuthStatus("Signing in...", "info");
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Sign in failed.");
    storeSession(data.token, data.refresh_token, data.user);
    syncExtensionSession(data.token, data.user);
    window.location.href = "./pricing.html";
  } catch (error) {
    setAuthStatus(error.message, "error");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirm = document.getElementById("reg-confirm").value;
  if (password !== confirm) {
    setAuthStatus("Passwords do not match.", "error");
    return;
  }
  setAuthStatus("Creating account...", "info");
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Registration failed.");
    storeSession(data.token, data.refresh_token, data.user);
    if (data.email_confirmation_required) {
      setAuthStatus("Please confirm your email, then sign in.", "info");
      window.location.href = "./login.html";
      return;
    }
    syncExtensionSession(data.token, data.user);
    window.location.href = "./pricing.html";
  } catch (error) {
    setAuthStatus(error.message, "error");
  }
}

document.getElementById("btn-google-" + authPage)?.addEventListener("click", handleGoogleOAuth);
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
finishOAuthRedirect();
