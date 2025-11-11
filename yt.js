(() => {
  const blockingController = window.nullifyBlocking;
  const adblocker = true;
  const removePopup = false;
  const debugMessages = true;
  const skipButtonsSelectors = [
    "ytp-ad-skip-button-container",
    "ytp-ad-skip-button-modern",
    ".videoAdUiSkipButton",
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-slot"
  ];

  let blockingEnabled =
    (blockingController && typeof blockingController.isEnabled === "function"
      ? blockingController.isEnabled()
      : true) ?? true;

  let adInterval = null;
  let popupInterval = null;
  let styleElement = null;
  let currentUrl = window.location.href;
  let isAdFound = false;
  let adLoop = 0;

  function log(message, level = "l", ...args) {
    if (!debugMessages) return;
    const prefix = "Nullify YouTube:";
    const output = `${prefix} ${message}`;

    switch (level) {
      case "e":
      case "error":
        console.error(output, ...args);
        break;
      case "w":
      case "warn":
        console.warn(output, ...args);
        break;
      case "i":
      case "info":
        console.info(output, ...args);
        break;
      default:
        console.log(output, ...args);
    }
  }

  function ensureStyleElement() {
    if (styleElement || !blockingEnabled) {
      return;
    }

    styleElement = document.createElement("style");
    styleElement.textContent = `
      ytd-action-companion-ad-renderer,
      ytd-display-ad-renderer,
      ytd-video-masthead-ad-advertiser-info-renderer,
      ytd-video-masthead-ad-primary-video-renderer,
      ytd-in-feed-ad-layout-renderer,
      ytd-ad-slot-renderer,
      yt-about-this-ad-renderer,
      yt-mealbar-promo-renderer,
      ytd-statement-banner-renderer,
      ytd-banner-promo-renderer-background
      statement-banner-style-type-compact,
      .ytd-video-masthead-ad-v3-renderer,
      div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint,
      div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer,
      div#main-container.style-scope.ytd-promoted-video-renderer,
      div#player-ads.style-scope.ytd-watch-flexy,
      ad-slot-renderer,
      ytm-promoted-sparkles-web-renderer,
      masthead-ad,
      tp-yt-iron-overlay-backdrop,
      #masthead-ad {
        display: none !important;
      }
    `;

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(styleElement);
    } else {
      log("Unable to append style element", "e");
    }
  }

  function removeStyleElement() {
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
    styleElement = null;
  }

  function resetVideoPlayback() {
    const video = document.querySelector("video");
    if (video) {
      if (video.playbackRate === 10) {
        video.playbackRate = 1;
      }
      if (video.volume === 0) {
        video.volume = 1;
      }
    }
  }

  function handleAdTick() {
    if (!blockingEnabled) {
      return;
    }

    const video = document.querySelector("video");
    const ad = document.querySelector(".ad-showing");

    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      ensureStyleElement();
    }

    if (!ad) {
      if (video && video.playbackRate === 10) {
        video.playbackRate = 1;
      }

      if (isAdFound) {
        isAdFound = false;
        adLoop = 0;
        if (video) {
          video.volume = Math.min(video.volume || 1, 1);
        }
      }

      return;
    }

    isAdFound = true;
    adLoop += 1;

    if (video) {
      video.volume = 0;
      video.playbackRate = 10;
    }

    if (adLoop < 10) {
      const openAdCenterButton = document.querySelector(".ytp-ad-button-icon");
      openAdCenterButton?.click();

      const blockAdButton = document.querySelector('[label="Block ad"]');
      blockAdButton?.click();

      const blockAdButtonConfirm = document.querySelector('.Eddif [label="CONTINUE"] button');
      blockAdButtonConfirm?.click();

      const closeAdCenterButton = document.querySelector(".zBmRhe-Bz112c");
      closeAdCenterButton?.click();
    } else if (video) {
      video.play();
    }

    const popupContainer = document.querySelector("body > ytd-app > ytd-popup-container > tp-yt-paper-dialog");
    if (popupContainer && popupContainer.style.display === "") {
      popupContainer.style.display = "none";
    }

    skipButtonsSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => element?.click());
    });

    if (video) {
      video.play();
      const randomNumber = Math.random() * (0.5 - 0.1) + 0.1;
      video.currentTime = video.duration + randomNumber || 0;
    }

    log("Skipped YouTube ad");
  }

  function handlePopupTick() {
    if (!blockingEnabled) {
      return;
    }

    const modalOverlay = document.querySelector("tp-yt-iron-overlay-backdrop");
    const popup = document.querySelector(".style-scope ytd-enforcement-message-view-model");
    const popupButton = document.getElementById("dismiss-button");
    const video = document.querySelector("video");

    document.body?.style.setProperty("overflow-y", "auto", "important");

    if (modalOverlay) {
      modalOverlay.removeAttribute("opened");
      modalOverlay.remove();
    }

    if (popup) {
      log("Removing enforcement popup");
      popupButton?.click();
      popup.remove();
      video?.play();
      setTimeout(() => video?.play(), 500);
    }

    if (video && video.paused) {
      video.play();
    }
  }

  function startAdBlocking() {
    if (!blockingEnabled || !adblocker) {
      return;
    }

    if (adInterval === null) {
      adInterval = window.setInterval(handleAdTick, 50);
    }

    ensureStyleElement();
  }

  function stopAdBlocking() {
    if (adInterval !== null) {
      window.clearInterval(adInterval);
      adInterval = null;
    }

    resetVideoPlayback();
    removeStyleElement();
    isAdFound = false;
    adLoop = 0;
  }

  function startPopupRemoval() {
    if (!removePopup || popupInterval !== null) {
      return;
    }

    popupInterval = window.setInterval(handlePopupTick, 1000);
  }

  function stopPopupRemoval() {
    if (popupInterval !== null) {
      window.clearInterval(popupInterval);
      popupInterval = null;
    }
  }

  function initialize() {
    if (blockingEnabled) {
      ensureStyleElement();
      startAdBlocking();
      startPopupRemoval();
    }
  }

  if (blockingController && typeof blockingController.subscribe === "function") {
    blockingController.subscribe((enabled) => {
      blockingEnabled = Boolean(enabled);

      if (blockingEnabled) {
        ensureStyleElement();
        startAdBlocking();
        startPopupRemoval();
      } else {
        stopAdBlocking();
        stopPopupRemoval();
      }
    });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initialize();
  } else {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  }
})();
