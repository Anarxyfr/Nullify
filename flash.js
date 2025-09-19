function removeFlashBanners() {
    const banners = document.querySelectorAll('div.include.svelte-1h1i54z');

    banners.forEach(banner => {
        const hasFlash = banner.querySelector(
            'object[type="application/x-shockwave-flash"], embed[type="application/x-shockwave-flash"]'
        );
        if (hasFlash) {
            banner.remove();
            console.log('Removed a Flash banner.');
        }
    });
}

if (document.body) {
    removeFlashBanners();
} else {
    document.addEventListener('DOMContentLoaded', removeFlashBanners);
}

document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(removeFlashBanners);
    observer.observe(document.body, { childList: true, subtree: true });
});
