function removeSpecificAds() {
  const adSelectors = [
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

  adSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  });
}

function setupObserver() {
  if (!document.body) {
    setTimeout(setupObserver, 100);
    return;
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        removeSpecificAds();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener('unload', () => {
    observer.disconnect();
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  removeSpecificAds();
  setupObserver();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    removeSpecificAds();
    setupObserver();
  });
}
