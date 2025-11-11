const DYNAMIC_RULES = [
  {
    id: 1,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "ads.js", resourceTypes: ["script"] }
  },
  {
    id: 2,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "pagead.js", resourceTypes: ["script"] }
  },
  {
    id: 3,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "googlesyndication.com", resourceTypes: ["script"] }
  },
  {
    id: 4,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "doubleclick.net", resourceTypes: ["script"] }
  }
];

const RULE_IDS = DYNAMIC_RULES.map((rule) => rule.id);
const STATIC_RULESET_IDS = ["ruleset_1"];
let isBlockingEnabled = true;
let lifetimeCount = 0;
const tabCounts = new Map();

async function ensureDynamicRulesInstalled() {
  try {
    const updateRequest = { removeRuleIds: RULE_IDS };
    if (isBlockingEnabled) {
      updateRequest.addRules = DYNAMIC_RULES;
    }
    await chrome.declarativeNetRequest.updateDynamicRules(updateRequest);
  } catch (error) {
    console.error("Failed to update dynamic rules:", error);
  }
}

async function ensureStaticRulesets() {
  try {
    if (isBlockingEnabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: STATIC_RULESET_IDS
      });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: STATIC_RULESET_IDS
      });
    }
  } catch (error) {
    console.error("Failed to update static rulesets:", error);
  }
}

async function loadState() {
  try {
    const { isBlockingEnabled: storedEnabled = true, lifetimeCount: storedLifetime = 0 } =
      await chrome.storage.local.get(["isBlockingEnabled", "lifetimeCount"]);

    isBlockingEnabled = storedEnabled;
    lifetimeCount = storedLifetime;
  } catch (error) {
    console.error("Failed to load stored state:", error);
  }

  await ensureDynamicRulesInstalled();
  await ensureStaticRulesets();
}

async function broadcastBlockingState() {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({});
  } catch (error) {
    console.error("Failed to query tabs:", error);
    return;
  }

  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) return;

      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "setBlockingState",
          enabled: isBlockingEnabled
        });
      } catch (error) {
        if (
          error &&
          typeof error.message === "string" &&
          error.message.includes("Receiving end does not exist")
        ) {
          return;
        }

        console.error("Failed to send blocking state to tab:", error);
      }
    })
  );
}

async function setBlockingEnabled(enabled) {
  if (isBlockingEnabled === enabled) {
    return;
  }

  isBlockingEnabled = enabled;

  try {
    await chrome.storage.local.set({ isBlockingEnabled });
  } catch (error) {
    console.error("Failed to persist blocking state:", error);
  }

  await ensureDynamicRulesInstalled();
  await ensureStaticRulesets();
  await broadcastBlockingState();

  if (!enabled) {
    for (const tabId of tabCounts.keys()) {
      tabCounts.set(tabId, 0);
    }
  }
}

loadState().catch((error) => {
  console.error("Failed to initialize state:", error);
});

chrome.runtime.onInstalled.addListener(() => {
  loadState();
});

chrome.runtime.onStartup.addListener(() => {
  loadState();
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  tabCounts.set(details.tabId, 0);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabCounts.delete(tabId);
});

chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  if (!isBlockingEnabled) {
    return;
  }

  const { tabId = -1 } = info;
  if (tabId === -1) {
    return;
  }

  const current = (tabCounts.get(tabId) ?? 0) + 1;
  tabCounts.set(tabId, current);
  lifetimeCount += 1;

  chrome.storage.local.set({ lifetimeCount }).catch((error) => {
    console.error("Failed to persist lifetime count:", error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message?.type) {
    case "getBlockingState": {
      sendResponse({ enabled: isBlockingEnabled });
      return false;
    }
    case "adPageInit": {
      if (tabId !== undefined) {
        tabCounts.set(tabId, 0);
      }
      return false;
    }
    case "adIncrement": {
      if (!isBlockingEnabled || tabId === undefined) {
        return false;
      }

      const amount = Number.isFinite(message.amount) ? Number(message.amount) : 1;
      const current = (tabCounts.get(tabId) ?? 0) + amount;
      tabCounts.set(tabId, current);
      lifetimeCount += amount;

      chrome.storage.local.set({ lifetimeCount }).catch((error) => {
        console.error("Failed to persist lifetime count:", error);
      });

      return false;
    }
    case "adReset": {
      if (tabId !== undefined) {
        tabCounts.set(tabId, 0);
      }
      return false;
    }
    case "getStats": {
      (async () => {
        const targetTabId = message.tabId ?? tabId;
        const current = targetTabId !== undefined ? tabCounts.get(targetTabId) ?? 0 : 0;
        sendResponse({
          current,
          lifetime: lifetimeCount,
          enabled: isBlockingEnabled
        });
      })().catch((error) => {
        console.error("Failed to provide stats:", error);
      });
      return true;
    }
    case "toggleBlocking": {
      (async () => {
        const desiredState =
          typeof message.enabled === "boolean" ? message.enabled : !isBlockingEnabled;
        await setBlockingEnabled(desiredState);
        sendResponse({ enabled: isBlockingEnabled });
      })().catch((error) => {
        console.error("Failed to toggle blocking:", error);
      });
      return true;
    }
    default:
      return false;
  }
});
