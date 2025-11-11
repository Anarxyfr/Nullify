const pageCountEl = document.getElementById("page-count");
const lifetimeCountEl = document.getElementById("lifetime-count");
const toggleButton = document.getElementById("toggle-button");

let currentTabId = null;
let blockingEnabled = true;
let statsInterval = null;

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function fetchPageStats() {
  if (currentTabId === null) {
    return null;
  }

  try {
    return await chrome.tabs.sendMessage(currentTabId, { type: "getPageStats" });
  } catch (error) {
    return null;
  }
}

async function fetchLifetimeStats() {
  try {
    return await chrome.runtime.sendMessage({
      type: "getStats",
      tabId: currentTabId ?? undefined
    });
  } catch (error) {
    return null;
  }
}

async function fetchStats() {
  if (currentTabId === null) {
    pageCountEl.textContent = "0";
    lifetimeCountEl.textContent = "0";
    toggleButton.textContent = "Enable Blocking";
    toggleButton.disabled = true;
    return;
  }

  const [pageStats, lifetimeStats] = await Promise.all([
    fetchPageStats(),
    fetchLifetimeStats()
  ]);

  const currentPageCount = Number.isFinite(pageStats?.current) ? pageStats.current : 0;
  const lifetimeCount = Number.isFinite(lifetimeStats?.lifetime)
    ? lifetimeStats.lifetime
    : 0;

  if (typeof lifetimeStats?.enabled === "boolean") {
    blockingEnabled = lifetimeStats.enabled;
  } else if (typeof pageStats?.enabled === "boolean") {
    blockingEnabled = pageStats.enabled;
  }

  pageCountEl.textContent = currentPageCount.toString();
  lifetimeCountEl.textContent = lifetimeCount.toString();

  updateToggleButton();
}

function updateToggleButton() {
  toggleButton.disabled = false;
  toggleButton.textContent = blockingEnabled ? "Disable Blocking" : "Enable Blocking";
  toggleButton.setAttribute("aria-pressed", String(!blockingEnabled));
}

async function reloadActiveTab() {
  if (currentTabId === null) {
    return;
  }

  try {
    await chrome.tabs.reload(currentTabId);
  } catch (error) {
    console.warn("Failed to reload active tab:", error);
  }
}

async function toggleBlocking() {
  toggleButton.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "toggleBlocking",
      enabled: !blockingEnabled
    });

    if (response && typeof response.enabled === "boolean") {
      blockingEnabled = response.enabled;
      updateToggleButton();
      pageCountEl.textContent = "0";
      await reloadActiveTab();
      await fetchStats();
    }
  } catch (error) {
    console.error("Failed to toggle blocking:", error);
  } finally {
    toggleButton.disabled = false;
  }
}

async function initialize() {
  toggleButton.disabled = true;

  try {
    const tab = await getActiveTab();
    if (tab && tab.id !== undefined) {
      currentTabId = tab.id;
    }
  } catch (error) {
    console.error("Failed to determine active tab:", error);
  }

  await fetchStats();
  toggleButton.addEventListener("click", toggleBlocking);

  statsInterval = window.setInterval(fetchStats, 2000);

  window.addEventListener(
    "unload",
    () => {
      if (statsInterval !== null) {
        window.clearInterval(statsInterval);
        statsInterval = null;
      }
    },
    { once: true }
  );
}

initialize().catch((error) => {
  console.error("Failed to initialize popup:", error);
});

