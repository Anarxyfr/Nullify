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

    function startObserver() {
        hideAds();
        const observer = new MutationObserver(hideAds);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.body) {
        startObserver();
    } else {
        window.addEventListener("DOMContentLoaded", startObserver);
    }
})();
