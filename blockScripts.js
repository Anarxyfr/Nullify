(function() {
    
    
    const adKeywords = [
        "ad", "ads", "banner", "sponsor", "promo", "adbox", "advertisement", "adunit", "ad-slot"
    ];

    const adSelectors = [
        '[class*="ad-"]', '[class*="sponsored"]', '[class*="advert"]', 
        '[class*="promo"]', '[id*="ad-"]', '[id*="sponsored"]',
        '[aria-label*="Sponsored"]', '.adbox.banner_ads.adsbox', '.textads',
        '.yt-simple-endpoint', 'bannerAds:', '[class*="banner-ad"]',
        '[class*="ad-banner"]', '[class*="top-ad"]', '[class*="sidebar-ad"]',
        '[class*="right-ad"]', '[class*="left-ad"]', '[class*="inline-ad"]',
        '[class*="ad-article"]', '[class*="sponsored-post"]',
        '[class*="overlay-ad"]', '[class*="modal-ad"]', '[class*="popup-ad"]',
        '#ad-inline-playback-metadata', '#thumbnail-container',
        // Cosmetic filter additions
        '.test_block', '.adsbox', '.banner_ads', '#ct_static', '#ctd_test', '#cts_test'
    ];

    const sponsoredKeywords = [
        'sponsored', 'advertisement', 'ad', 'promoted', 
        'partner content', 'affiliate link', 'brought to you by',
        'promotion'
    ];

    const blockedDomains = [
        'testaruga.goatcounter.com', 'google-analytics.com', 'doubleclick.net',
        'adserver.com', 'adservice.google.com', 'connect.facebook.net', 'coveryourtracks.eff.org/static/jquery.flash.js',
    ];

    const scriptsToBlock = [
        'ads.js', 'pagead.js', 'base._ExihPHf.png', 'Q_mEDzP1.js', 'fakepage.html', 'base._ExihPHf.png', 'jquery.flash.js',
        '8b1bdd48.js', '98eefed2636036c3bdb8377b11ff28fe.min.js',
        'pr_advertising_ads_banner.gif', 'testing.gif', 'logo.c41e6f93.svg',
        'head.inject.8b1bdd48.js', 'ads_test.js', 'count.js', '/count',
        'firebase-analytics.js', 'jJ4r5Hbv.js', 'analytics.js', 'gtag.js',
        'fbevents.js', 'pixel.js', 'tracker.js', 'beacon.js', 'pr_advertising_ads_banner.swf', '/banners/pr_advertising_ads_banner.swf?v=1'
    ];

    const excludeSelectors = [
        "#adb_test", "#cf_wrap", ".test_card", "main", "header", "footer"
    ];

    let adsBlockedCount = 0;

    
    function isLikelyAd(el) {
        if (!el || el.nodeType !== 1) return false;
        const id = el.id || "";
        const cls = el.className || "";
        let matches = 0;
        adKeywords.forEach(keyword => {
            if (id.toLowerCase().includes(keyword) || cls.toLowerCase().includes(keyword)) matches++;
        });
        return matches >= 2;
    }

    function isExcluded(el) {
        return excludeSelectors.some(sel => el.matches(sel) || el.closest(sel));
    }

    function isBlockedDomain(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return blockedDomains.some(domain => lowerUrl.includes(domain));
    }

    function hasSponsoredContent(el) {
        if (!el || !el.textContent) return false;
        const text = el.textContent.toLowerCase();
        const attributes = Array.from(el.attributes || []).map(attr => attr.value.toLowerCase());
        return sponsoredKeywords.some(keyword => text.includes(keyword) || attributes.some(attr => attr.includes(keyword)));
    }

    function isIntrusiveOverlay(el) {
        if (el.tagName !== 'DIV') return false;
        const style = window.getComputedStyle(el);
        return (style.position === 'fixed' || style.position === 'absolute') &&
            parseInt(style.zIndex, 10) > 1000 &&
            el.offsetWidth / window.innerWidth > 0.8 &&
            el.offsetHeight / window.innerHeight > 0.8;
    }

    
    function removeSpecificSWF() {
        const div = document.querySelector('div.include.svelte-1h1i54z');
        if (div) {
            div.remove();
            adsBlockedCount++;
            console.log('Removed specific SWF container.');
        }
    }

    
    function blockAds() {
        try {
           
            document.querySelectorAll(adSelectors.join(',')).forEach(el => {
                if (!isExcluded(el)) {
                    el.style.display = 'none';
                    adsBlockedCount++;
                }
            });

            
            document.querySelectorAll('div, section, aside').forEach(el => {
                if (!isExcluded(el) && isLikelyAd(el)) {
                    el.style.display = 'none';
                    adsBlockedCount++;
                }
            });

            
            document.querySelectorAll('div, p, span, section, aside').forEach(el => {
                if (hasSponsoredContent(el) || isIntrusiveOverlay(el)) {
                    el.style.display = 'none';
                    adsBlockedCount++;
                }
            });

            
            document.querySelectorAll('script, img, iframe, object, embed').forEach(el => {
                if (el.src && (isBlockedDomain(el.src) || scriptsToBlock.some(p => el.src.includes(p)))) {
                    el.remove();
                    adsBlockedCount++;
                }
            });

            
            removeSpecificSWF();

        } catch (e) {
            console.error('Adblock error:', e);
        }
    }

    
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0].toString();
        if (isBlockedDomain(url) || scriptsToBlock.some(p => url.includes(p))) {
            console.log(`Blocked fetch: ${url}`);
            adsBlockedCount++;
            return new Response(null, { status: 403 });
        }
        return originalFetch.apply(this, args);
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        if (isBlockedDomain(url) || scriptsToBlock.some(p => url.includes(p))) {
            console.log(`Blocked XHR: ${url}`);
            adsBlockedCount++;
            this.abort();
            return;
        }
        return originalXHROpen.apply(this, arguments);
    };

    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, ...args) {
        if (isBlockedDomain(url)) {
            console.log(`Blocked WebSocket: ${url}`);
            adsBlockedCount++;
            throw new Error('Blocked by adblocker');
        }
        return new originalWebSocket(url, ...args);
    };

    
    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    const observer = new MutationObserver(debounce(blockAds, 200));
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true
    });

    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', blockAds);
    } else {
        blockAds();
    }
    
    window.addEventListener('load', blockAds);

})();
