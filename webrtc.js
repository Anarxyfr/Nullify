(function() {
    'use strict';

    const OriginalRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (OriginalRTCPeerConnection) {
        window.RTCPeerConnection = function() {
            return {
                createOffer: async () => { throw new Error('WebRTC disabled'); },
                createAnswer: async () => { throw new Error('WebRTC disabled'); },
                setLocalDescription: async () => { throw new Error('WebRTC disabled'); },
                setRemoteDescription: async () => { throw new Error('WebRTC disabled'); },
                addIceCandidate: async () => { throw new Error('WebRTC disabled'); },
                close: () => {},
                onicecandidate: null,
                ontrack: null,
                addTrack: () => {},
                removeTrack: () => {},
                getReceivers: () => [],
                getSenders: () => [],
                getStats: async () => { return {}; }
            };
        };
        window.RTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
    }

    if (window.RTCDataChannel) window.RTCDataChannel = function() {};

    if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = function() {
            return Promise.reject(new Error('WebRTC getUserMedia blocked'));
        };
        navigator.mediaDevices.enumerateDevices = function() {
            return Promise.resolve([]);
        };
    }

    if (window.RTCIceCandidate) {
        const OriginalIceCandidate = window.RTCIceCandidate;
        window.RTCIceCandidate = function(init) {
            return new OriginalIceCandidate({});
        };
    }

    const fakeScreen = {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24
    };

    Object.defineProperty(window, 'screen', { get: () => fakeScreen, configurable: true });
    Object.defineProperty(window, 'innerWidth', { get: () => fakeScreen.width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { get: () => fakeScreen.height, configurable: true });
    Object.defineProperty(window, 'devicePixelRatio', { get: () => 1, configurable: true });

    const toBlob = HTMLCanvasElement.prototype.toBlob;
    const toDataURL = HTMLCanvasElement.prototype.toDataURL;
    const getContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        const ctx = getContext.call(this, type, ...args);
        if (type === '2d') {
            const originalFillText = ctx.fillText;
            ctx.fillText = function(text, x, y, maxWidth) {
                const offsetX = Math.random() * 0.5;
                const offsetY = Math.random() * 0.5;
                return originalFillText.call(this, text, x + offsetX, y + offsetY, maxWidth);
            };

            const originalGetImageData = ctx.getImageData;
            ctx.getImageData = function(sx, sy, sw, sh) {
                const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i] = imageData.data[i] + (Math.random() > 0.5 ? 1 : -1);
                    imageData.data[i+1] = imageData.data[i+1] + (Math.random() > 0.5 ? 1 : -1);
                    imageData.data[i+2] = imageData.data[i+2] + (Math.random() > 0.5 ? 1 : -1);
                }
                return imageData;
            };
        }
        return ctx;
    };

    HTMLCanvasElement.prototype.toBlob = function(...args) {
        const ctx = this.getContext('2d');
        ctx.getImageData(0, 0, this.width, this.height);
        return toBlob.apply(this, args);
    };

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const ctx = this.getContext('2d');
        ctx.getImageData(0, 0, this.width, this.height);
        return toDataURL.apply(this, args);
    };
})();
