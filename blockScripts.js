(function () {
  const blockingController = window.nullifyBlocking;
  let blockingEnabled =
    (blockingController && typeof blockingController.isEnabled === "function"
      ? blockingController.isEnabled()
      : true) ?? true;

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

  const adSelectors = [
    '[class*="ad-"]',
    '[class*="sponsored"]',
    '[class*="advert"]',
    '[class*="promo"]',
    '[id*="ad-"]',
    '[id*="sponsored"]',
    '[aria-label*="Sponsored"]',
    ".adbox.banner_ads.adsbox",
    ".textads",
    ".yt-simple-endpoint",
    "bannerAds:",
    '[class*="banner-ad"]',
    '[class*="ad-banner"]',
    '[class*="top-ad"]',
    '[class*="sidebar-ad"]',
    '[class*="right-ad"]',
    '[class*="left-ad"]',
    '[class*="inline-ad"]',
    '[class*="ad-article"]',
    '[class*="sponsored-post"]',
    '[class*="overlay-ad"]',
    '[class*="modal-ad"]',
    '[class*="popup-ad"]',
    "#ad-inline-playback-metadata",
    "#thumbnail-container",
    ".test_block",
    ".adsbox",
    ".banner_ads",
    "#ct_static",
    "#ctd_test",
    "#cts_test"
  ];

  const sponsoredKeywords = [
    "sponsored",
    "advertisement",
    "ad",
    "promoted",
    "partner content",
    "affiliate link",
    "brought to you by",
    "promotion"
  ];

  const blockedDomains = [
    "testaruga.goatcounter.com",
    "google-analytics.com",
    "doubleclick.net",
    "adserver.com",
    "adservice.google.com",
    "connect.facebook.net",
    "coveryourtracks.eff.org/static/jquery.flash.js"
  ];

  const scriptsToBlock = [
    "ads.js",
    "pagead.js",
    "base._ExihPHf.png",
    "Q_mEDzP1.js",
    "fakepage.html",
    "jquery.flash.js",
    "8b1bdd48.js",
    "98eefed2636036c3bdb8377b11ff28fe.min.js",
    "pr_advertising_ads_banner.gif",
    "testing.gif",
    "logo.c41e6f93.svg",
    "head.inject.8b1bdd48.js",
    "ads_test.js",
    "count.js",
    "/count",
    "firebase-analytics.js",
    "jJ4r5Hbv.js",
    "analytics.js",
    "gtag.js",
    "fbevents.js",
    "pixel.js",
    "tracker.js",
    "beacon.js",
    "pr_advertising_ads_banner.swf",
    "/banners/pr_advertising_ads_banner.swf?v=1"
  ];

  const excludeSelectors = ["#adb_test", "#cf_wrap", ".test_card", "main", "header", "footer"];

  const hiddenElements = new Map();
  let observer = null;

  function isLikelyAd(el) {
    if (!el || el.nodeType !== 1) return false;
    const id = el.id || "";
    const cls = el.className || "";
    let matches = 0;
    adKeywords.forEach((keyword) => {
      if (id.toLowerCase().includes(keyword) || cls.toLowerCase().includes(keyword)) matches++;
    });
    return matches >= 2;
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

  function isBlockedDomain(url) {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return blockedDomains.some((domain) => lowerUrl.includes(domain));
  }

  function hasSponsoredContent(el) {
    if (!el || !el.textContent) return false;
    const text = el.textContent.toLowerCase();
    const attributes = Array.from(el.attributes || []).map((attr) => attr.value.toLowerCase());
    return sponsoredKeywords.some(
      (keyword) =>
        text.includes(keyword) || attributes.some((attr) => attr.includes(keyword))
    );
  }

  function isIntrusiveOverlay(el) {
    if (el.tagName !== "DIV") return false;
    const style = window.getComputedStyle(el);
    return (
      (style.position === "fixed" || style.position === "absolute") &&
      parseInt(style.zIndex, 10) > 1000 &&
      el.offsetWidth / window.innerWidth > 0.8 &&
      el.offsetHeight / window.innerHeight > 0.8
    );
  }

  function hideElement(el, forceImportant = false) {
    if (!el || hiddenElements.has(el)) return false;

    const previousDisplay = {
      value: el.style.getPropertyValue("display"),
      priority: el.style.getPropertyPriority("display")
    };

    hiddenElements.set(el, previousDisplay);
    el.style.setProperty("display", "none", forceImportant ? "important" : previousDisplay.priority);
    return true;
  }

  function restoreElements() {
    hiddenElements.forEach((previousDisplay, el) => {
      if (!el || !el.style) return;

      if (previousDisplay.value) {
        el.style.setProperty("display", previousDisplay.value, previousDisplay.priority || undefined);
      } else {
        el.style.removeProperty("display");
      }
    });

    hiddenElements.clear();
  }

  function processAds() {
    if (!blockingEnabled) return;

    try {
      document.querySelectorAll(adSelectors.join(",")).forEach((el) => {
        if (!isExcluded(el)) {
          if (hideElement(el)) {
            window.nullifyBlocking?.notifyIncrement?.(1);
          }
        }
      });

      document.querySelectorAll("div, section, aside").forEach((el) => {
        if (!isExcluded(el) && isLikelyAd(el)) {
          if (hideElement(el)) {
            window.nullifyBlocking?.notifyIncrement?.(1);
          }
        }
      });

      document.querySelectorAll("div, p, span, section, aside").forEach((el) => {
        if (hasSponsoredContent(el) || isIntrusiveOverlay(el)) {
          if (hideElement(el, true)) {
            window.nullifyBlocking?.notifyIncrement?.(1);
          }
        }
      });

      document.querySelectorAll("object, embed").forEach((el) => {
        if (!el || !blockingEnabled) return;
        if (hideElement(el, true)) {
          window.nullifyBlocking?.notifyIncrement?.(1);
        }
      });
    } catch (error) {
      console.error("Nullify block script error:", error);
    }
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function startObserver() {
    if (observer || !blockingEnabled) {
      return;
    }

    observer = new MutationObserver(debounce(processAds, 200));
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    if (!blockingEnabled) {
      return originalFetch.apply(this, args);
    }

    const url = args[0]?.toString?.() ?? "";
    if (isBlockedDomain(url) || scriptsToBlock.some((pattern) => url.includes(pattern))) {
      window.nullifyBlocking?.notifyIncrement?.(1);
      return new Response(null, { status: 403 });
    }
    return originalFetch.apply(this, args);
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (!blockingEnabled) {
      return originalXHROpen.apply(this, arguments);
    }

    if (isBlockedDomain(url) || scriptsToBlock.some((pattern) => url.includes(pattern))) {
      window.nullifyBlocking?.notifyIncrement?.(1);
      this.addEventListener("readystatechange", function abortOnSend() {
        this.removeEventListener("readystatechange", abortOnSend);
        if (blockingEnabled) {
          this.abort();
        }
      });
      return;
    }
    return originalXHROpen.apply(this, arguments);
  };

  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (url, ...args) {
    if (!blockingEnabled) {
      return new OriginalWebSocket(url, ...args);
    }

    if (isBlockedDomain(url)) {
      window.nullifyBlocking?.notifyIncrement?.(1);
      throw new Error("Blocked by Nullify adblocker");
    }
    return new OriginalWebSocket(url, ...args);
  };

  function applyState(enabled) {
    const nextState = Boolean(enabled);
    if (blockingEnabled === nextState) {
      return;
    }

    blockingEnabled = nextState;

    if (blockingEnabled) {
      processAds();
      startObserver();
    } else {
      stopObserver();
      restoreElements();
    }
  }

  function initialize() {
    if (blockingEnabled) {
      processAds();
      startObserver();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.addEventListener("load", () => {
    if (blockingEnabled) {
      processAds();
    }
  });

  if (!window.nullifyBlocking) {
    return;
  }

  if (typeof window.nullifyBlocking.notifyIncrement !== "function") {
    window.nullifyBlocking.notifyIncrement = (amount) => {
      try {
        chrome.runtime.sendMessage({ type: "adIncrement", amount });
      } catch (error) {
        // ignore
      }
    };
  }

  if (blockingController && typeof blockingController.subscribe === "function") {
    blockingController.subscribe((enabled) => {
      applyState(enabled);
    });
  }
})();
