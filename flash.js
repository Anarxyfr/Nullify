(() => {
  const blockingController = window.nullifyBlocking;
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

  function processFlashBanners() {
    if (!blockingEnabled) return;

    let newlyHidden = 0;

    document.querySelectorAll("div.include.svelte-1h1i54z").forEach((banner) => {
      const hasFlash = banner.querySelector(
        'object[type="application/x-shockwave-flash"], embed[type="application/x-shockwave-flash"]'
      );

      if (hasFlash && hideElement(banner)) {
        newlyHidden += 1;
      }
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
        processFlashBanners();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function applyState(enabled) {
    blockingEnabled = Boolean(enabled);

    if (blockingEnabled) {
      processFlashBanners();
      startObserver();
    } else {
      stopObserver();
      restoreElements();
    }
  }

  function onReady() {
    if (blockingEnabled) {
      processFlashBanners();
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
