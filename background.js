chrome.runtime.onInstalled.addListener(async () => {
  const rules = [
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

  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeIds = existingRules.map(r => r.id);
    if (removeIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds });
    }
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
    console.log("Script-blocking rules installed!");
  } catch (e) {
    console.error("Error installing rules:", e);
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId, allFrames: true },
    func: () => {
      (function() {
        const adKeywords = [
          "ad", "ads", "banner", "sponsor", "promo",
          "adbox", "advertisement", "adunit", "ad-slot"
        ];

        function isLikelyAd(el) {
          if (!el || el.nodeType !== 1) return false;
          const id = el.id || "";
          const cls = el.className || "";
          let matches = 0;
          adKeywords.forEach(keyword => {
            if (id.toLowerCase().includes(keyword) || cls.toLowerCase().includes(keyword)) {
              matches++;
            }
          });
          return matches >= 2;
        }

        const excludeSelectors = [
          "#adb_test", "#cf_wrap", ".test_card", ".test_block",
          "main", "header", "footer"
        ];

        function isExcluded(el) {
          return excludeSelectors.some(sel => el.matches(sel) || el.closest(sel));
        }

        function hideAds() {
          const candidates = document.querySelectorAll("div, section, aside");
          candidates.forEach(el => {
            if (!isExcluded(el) && isLikelyAd(el)) {
              el.style.display = "none";
            }
          });
        }

        hideAds();

        const observer = new MutationObserver(hideAds);
        observer.observe(document.body, { childList: true, subtree: true });
      })();
    }
  });
});
