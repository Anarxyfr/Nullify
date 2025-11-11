(() => {
  const adKeywords = [
    "ad",
    "ads",
    "banner",
    "sponsor",
    "promo",
    "adbox",
    "advertisement",
    "adunit",
    "ad-slot"
  ];

  const excludeSelectors = [
    "#adb_test",
    "#cf_wrap",
    ".test_card",
    ".test_block",
    "main",
    "header",
    "footer"
  ];

  const hiddenElements = new Map();
  let observer = null;
  let blockedCount = 0;
  let domReady = false;

  const blockingController = window.nullifyBlocking;
  let blockingEnabled =
    (blockingController && typeof blockingController.isEnabled === "function"
      ? blockingController.isEnabled()
      : true) ?? true;

  function isLikelyAd(el) {
    if (!el || el.nodeType !== 1) return false;
    const id = el.id || "";
    const cls = el.className || "";
    let matches = 0;

    for (const keyword of adKeywords) {
      if (id.toLowerCase().includes(keyword) || cls.toLowerCase().includes(keyword)) {
        matches++;
      }
      if (matches >= 2) {
        return true;
      }
    }

    return false;
  }

  function isExcluded(el) {
    return excludeSelectors.some((sel) => {
      try {
        return el.matches(sel) || el.closest(sel);
      } catch (error) {
        return false;
      }
    });
  }

  function sendMessageSafely(payload) {
    try {
      chrome.runtime.sendMessage(payload, () => {
        if (chrome.runtime.lastError) {
          return;
        }
      });
    } catch (error) {
    }
  }

  function hideAds() {
    if (!blockingEnabled) {
      return;
    }

    const candidates = document.querySelectorAll("div, section, aside");
    let newlyHidden = 0;

    candidates.forEach((el) => {
      if (!blockingEnabled) {
        return;
      }

      if (hiddenElements.has(el)) {
        return;
      }

      if (isExcluded(el) || !isLikelyAd(el)) {
        return;
      }

      hiddenElements.set(el, el.style.display ?? "");
      el.style.display = "none";
      newlyHidden += 1;
    });

    if (newlyHidden > 0) {
      blockedCount += newlyHidden;
      window.nullifyBlocking?.notifyIncrement?.(newlyHidden);
    }
  }

  function restoreAds() {
    if (hiddenElements.size === 0) {
      return;
    }

    hiddenElements.forEach((originalDisplay, el) => {
      if (!el || !el.style) return;
      if (originalDisplay) {
        el.style.display = originalDisplay;
      } else {
        el.style.removeProperty("display");
      }
    });

    hiddenElements.clear();

    if (blockedCount > 0) {
      blockedCount = 0;
      window.nullifyBlocking?.notifyReset?.();
    }
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function startObserver() {
    if (!blockingEnabled || observer) {
      return;
    }

    hideAds();
    observer = new MutationObserver(hideAds);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function applyBlockingState(enabled) {
    blockingEnabled = Boolean(enabled);

    if (!domReady) {
      return;
    }

    if (blockingEnabled) {
      startObserver();
    } else {
      stopObserver();
      restoreAds();
    }
  }

  function onDomReady() {
    domReady = true;

    sendMessageSafely({ type: "adPageInit" });

    if (blockingEnabled) {
      startObserver();
    }
  }

  document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
  if (document.readyState === "interactive" || document.readyState === "complete") {
    onDomReady();
  }

  if (blockingController && typeof blockingController.subscribe === "function") {
    blockingController.subscribe((enabled) => {
      applyBlockingState(enabled);
    });
  } else {
    applyBlockingState(true);
  }
})();
