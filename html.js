(() => {
  const blockingController = window.nullifyBlocking;
  const selectors = [
    'div.test-container[data-v-e476da83] > div.video-overlay-ad',
    'div.test-container[data-v-e476da83] > div.floating-ad',
    'div.test-container[data-v-e476da83] > div.interactive-ad',
    'div.test-container[data-v-e476da83] > div.dynamic-ad',
    'div.banner-container[data-v-c6f3e9d5]',
    'div.sidebar-content[data-v-c6f3e9d5]',
    'div.sidebar-image[data-v-c6f3e9d5]',
    'div.sponsored-content[data-v-c6f3e9d5] > div > div.demo-ad.sponsored',
    'article.article-preview[data-v-c6f3e9d5]',
    'img[src="/web/20250624110841im_/https://getblocktest.com/static/base._ExihPHf.png"][alt="Advertisement Image"][data-v-c6f3e9d5]',
    'div.test-container[data-v-1c49a17f] > div.deceptive-ad',
    'div.test-container[data-v-1c49a17f] > div.popup-chain',
    'div.test-container[data-v-1c49a17f] > div.redirect-test',
    'div.test-container[data-v-1c49a17f] > div.anti-adblock-test'
  ];

  const tracked = new Map();
  let observer = null;
  let blockingEnabled =
    (blockingController && typeof blockingController.isEnabled === "function"
      ? blockingController.isEnabled()
      : true) ?? true;

  function hideElement(el) {
    if (!el || tracked.has(el)) return false;

    const previousDisplay = {
      value: el.style.getPropertyValue("display"),
      priority: el.style.getPropertyPriority("display")
    };

    tracked.set(el, previousDisplay);
    el.style.setProperty("display", "none", "important");
    return true;
  }

  function restoreElements() {
    tracked.forEach((previousDisplay, el) => {
      if (!el || !el.style) return;

      if (previousDisplay.value) {
        el.style.setProperty("display", previousDisplay.value, previousDisplay.priority || undefined);
      } else {
        el.style.removeProperty("display");
      }
    });

    tracked.clear();
  }

  function scanAndHide() {
    if (!blockingEnabled) return;

    let newlyHidden = 0;

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (hideElement(el)) {
          newlyHidden += 1;
        }
      });
    });

    if (newlyHidden > 0) {
      window.nullifyBlocking?.notifyIncrement?.(newlyHidden);
    }
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function startObserver() {
    if (observer || !blockingEnabled || !document.body) {
      return;
    }

    observer = new MutationObserver(() => {
      if (blockingEnabled) {
        scanAndHide();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function applyState(enabled) {
    blockingEnabled = Boolean(enabled);

    if (blockingEnabled) {
      scanAndHide();
      startObserver();
    } else {
      stopObserver();
      restoreElements();
    }
  }

  function onReady() {
    if (blockingEnabled) {
      scanAndHide();
      startObserver();
    }
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    onReady();
  } else {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  }

  if (blockingController && typeof blockingController.subscribe === "function") {
    blockingController.subscribe((enabled) => {
      applyState(enabled);
    });
  }
})();
