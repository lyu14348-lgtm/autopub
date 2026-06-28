const apiBase = "";

function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("autopub_token");
  if (token) headers.Authorization = "Bearer " + token;
  return headers;
}

async function postJson(url, body) {
  const response = await fetch(apiBase + url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

window.autopubWaitlist = async function autopubWaitlist(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector(".cta-status");
  if (!status) return;
  status.textContent = "Submitting...";
  try {
    await postJson("/api/waitlist", {
      email: form.email.value,
      source: form.source?.value || "website",
      interested_features: ["seo_geo_saas"]
    });
    status.textContent = "You are on the list! We will be in touch.";
    form.reset();
  } catch (error) {
    status.textContent = error.message;
  }
};

window.autopubSaaSWaitlist = async function autopubSaaSWaitlist(event, tier) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector(".tier-status");
  const email = form.email.value.trim();
  if (!email) return;
  if (status) status.textContent = "Reserving...";
  try {
    await postJson("/api/waitlist", {
      email: email,
      source: "saas-pricing",
      interested_features: ["saas_" + tier]
    });
    if (status) status.textContent = "Reserved! We will notify you when beta access begins.";
    form.email.value = "";
  } catch (error) {
    if (status) status.textContent = error.message;
  }
};

window.autopubStartCheckout = async function autopubStartCheckout(plan) {
  const status = document.querySelector("#checkout-status");
  const buttons = document.querySelectorAll("[data-plan]");
  if (status) status.textContent = "Creating secure checkout...";
  buttons.forEach((button) => { button.disabled = true; });
  try {
    const checkout = await postJson("/api/billing/create-checkout", { plan });
    if (status) status.textContent = "Redirecting to checkout...";
    window.location.href = checkout.checkout_url;
  } catch (error) {
    if (status) status.textContent = error.message + " Please sign in or register before upgrading.";
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
};
