(function() {
    "use strict";

    
    const originalNavigator = { ...navigator };
    const originalScreen = { ...screen };
    const originalDocument = { ...document };
    const originalWindow = { ...window };
    const originalIntl = { ...Intl };

    
    function randomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    
    function randomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    
    function seededRandom(seed) {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    
    let sessionSeed = parseFloat(sessionStorage.getItem('fpSeed')) || Math.random();
    sessionStorage.setItem('fpSeed', sessionSeed);

    
    function randomizeNavigator() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0'
        ];

        const languages = ['en-US', 'en-GB', 'fr-FR', 'de-DE'];
        const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];

        Object.defineProperties(navigator, {
            userAgent: {
                value: userAgents[Math.floor(seededRandom(sessionSeed) * userAgents.length)],
                writable: false
            },
            language: {
                value: languages[Math.floor(seededRandom(sessionSeed + 1) * languages.length)],
                writable: false
            },
            languages: {
                value: [navigator.language, 'en'],
                writable: false
            },
            platform: {
                value: platforms[Math.floor(seededRandom(sessionSeed + 2) * platforms.length)],
                writable: false
            },
            hardwareConcurrency: {
                value: randomNumber(2, 16),
                writable: false
            },
            deviceMemory: {
                value: [2, 4, 8, 16][Math.floor(seededRandom(sessionSeed + 3) * 4)],
                writable: false
            },
            doNotTrack: {
                value: ['1', '0', null][Math.floor(seededRandom(sessionSeed + 4) * 3)],
                writable: false
            }
        });
    }

    
    function randomizeScreen() {
        const widths = [1366, 1440, 1920, 2560];
        const heights = [768, 900, 1080, 1440];
        const idx = Math.floor(seededRandom(sessionSeed + 5) * widths.length);

        Object.defineProperties(screen, {
            width: {
                value: widths[idx],
                writable: false
            },
            height: {
                value: heights[idx],
                writable: false
            },
            availWidth: {
                value: widths[idx] - randomNumber(0, 50),
                writable: false
            },
            availHeight: {
                value: heights[idx] - randomNumber(0, 100),
                writable: false
            },
            colorDepth: {
                value: [16, 24, 32][Math.floor(seededRandom(sessionSeed + 6) * 3)],
                writable: false
            },
            pixelDepth: {
                value: [16, 24, 32][Math.floor(seededRandom(sessionSeed + 7) * 3)],
                writable: false
            }
        });
    }

    
    function randomizeTimezone() {
        const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
        const randomTz = timezones[Math.floor(seededRandom(sessionSeed + 8) * timezones.length)];

        Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
            value: function() {
                const options = originalIntl.DateTimeFormat.prototype.resolvedOptions.call(this);
                options.timeZone = randomTz;
                return options;
            },
            writable: false
        });
    }

    
    function randomizeCanvas() {
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(contextType) {
            const ctx = originalGetContext.apply(this, arguments);
            if (contextType === '2d') {
                const originalFillText = ctx.fillText;
                ctx.fillText = function(text, x, y, maxWidth) {
                    const noise = seededRandom(sessionSeed + 9) * 0.1;
                    return originalFillText.call(this, text, x + noise, y + noise, maxWidth);
                };

                const originalToDataURL = this.toDataURL;
                this.toDataURL = function() {
                    const imageData = ctx.getImageData(0, 0, this.width, this.height);
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        const noise = seededRandom(sessionSeed + i) * 10 - 5;
                        imageData.data[i] += noise;
                        imageData.data[i + 1] += noise;
                        imageData.data[i + 2] += noise;
                    }
                    ctx.putImageData(imageData, 0, 0);
                    return originalToDataURL.apply(this, arguments);
                };
            }
            return ctx;
        };
    }

    
    function randomizeWebGL() {
        const vendors = ['Google Inc.', 'Mozilla', 'Apple Inc.'];
        const renderers = ['ANGLE (Intel Open Source Technology Center)', 'WebKit WebGL', 'Mesa DRI Intel(R) UHD Graphics'];

        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            switch(parameter) {
                case this.VENDOR:
                    return vendors[Math.floor(seededRandom(sessionSeed + 10) * vendors.length)];
                case this.RENDERER:
                    return renderers[Math.floor(seededRandom(sessionSeed + 11) * renderers.length)];
                case this.VERSION:
                    return 'WebGL 1.0 (OpenGL ES 2.0 Chromium)';
                case this.MAX_TEXTURE_SIZE:
                    return randomNumber(4096, 16384);
                case 37445: // UNMASKED_VENDOR_WEBGL
                    return vendors[Math.floor(seededRandom(sessionSeed + 12) * vendors.length)];
                case 37446: // UNMASKED_RENDERER_WEBGL
                    return renderers[Math.floor(seededRandom(sessionSeed + 13) * renderers.length)];
                default:
                    return originalGetParameter.apply(this, arguments);
            }
        };

        const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
        WebGLRenderingContext.prototype.getExtension = function(name) {
            if (name === 'WEBGL_debug_renderer_info') {
                return {
                    UNMASKED_VENDOR_WEBGL: 37445,
                    UNMASKED_RENDERER_WEBGL: 37446
                };
            }
            return originalGetExtension.apply(this, arguments);
        };
    }

    
    function randomizePlugins() {
        const pluginNames = [
            'Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client',
            'Widevine Content Decryption Module', 'Shockwave Flash'
        ];
        const fakePlugins = [];
        const numPlugins = randomNumber(3, 5);
        for (let i = 0; i < numPlugins; i++) {
            const name = pluginNames[Math.floor(seededRandom(sessionSeed + 14 + i) * pluginNames.length)];
            fakePlugins.push({
                name: name,
                description: `Portable Document Format or ${name}`,
                filename: `${name.toLowerCase().replace(/\s/g, '')}.dll`,
                length: 1
            });
        }

        Object.defineProperty(navigator, 'plugins', {
            value: fakePlugins,
            writable: false
        });
    }

    
    function randomizeFonts() {
        const commonFonts = [
            'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS',
            'Consolas', 'Courier New', 'Georgia', 'Helvetica', 'Impact',
            'Lucida Console', 'Tahoma', 'Times New Roman', 'Verdana'
        ];
        const fontCount = randomNumber(20, 50);
        const fakeFonts = [];
        for (let i = 0; i < fontCount; i++) {
            fakeFonts.push(commonFonts[Math.floor(seededRandom(sessionSeed + 20 + i) * commonFonts.length)]);
        }

        
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.apply(document, arguments);
            if (tagName.toLowerCase() === 'span') {
                Object.defineProperties(element, {
                    offsetWidth: {
                        get: function() {
                            return this._offsetWidth + Math.floor(seededRandom(sessionSeed + element.innerHTML.length) * 5 - 2);
                        },
                        set: function(value) {
                            this._offsetWidth = value;
                        }
                    },
                    offsetHeight: {
                        get: function() {
                            return this._offsetHeight + Math.floor(seededRandom(sessionSeed + element.innerHTML.length + 1) * 5 - 2);
                        },
                        set: function(value) {
                            this._offsetHeight = value;
                        }
                    }
                });
            }
            return element;
        };
    }

    
    function randomizeAudio() {
        const OriginalOfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (OriginalOfflineAudioContext) {
            function SpoofedOfflineAudioContext(channels, length, sampleRate) {
                const context = new OriginalOfflineAudioContext(channels, length, sampleRate);
                const originalGetChannelData = AudioBuffer.prototype.getChannelData;
                AudioBuffer.prototype.getChannelData = function(channel) {
                    const data = originalGetChannelData.call(this, channel);
                    for (let i = 0; i < data.length; i++) {
                        data[i] += seededRandom(sessionSeed + i) * 0.0002 - 0.0001;
                    }
                    return data;
                };
                return context;
            }
            window.OfflineAudioContext = window.webkitOfflineAudioContext = SpoofedOfflineAudioContext;
        }
    }

    
    function randomizeMediaDevices() {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices = function() {
                return Promise.resolve([]);
            };
        }
    }

    
    function randomizeFingerprint() {
        randomizeNavigator();
        randomizeScreen();
        randomizeTimezone();
        randomizeCanvas();
        randomizeWebGL();
        randomizePlugins();
        randomizeFonts();
        randomizeAudio();
        randomizeMediaDevices();
    }

    
    document.addEventListener('DOMContentLoaded', randomizeFingerprint);

    
    window.addEventListener('popstate', randomizeFingerprint);
    window.addEventListener('pushstate', randomizeFingerprint);
    window.addEventListener('replacestate', randomizeFingerprint);

    
    window.restoreOriginalFingerprint = function() {
        Object.assign(navigator, originalNavigator);
        Object.assign(screen, originalScreen);
        Object.assign(document, originalDocument);
        Object.assign(window, originalWindow);
        Object.assign(Intl, originalIntl);
    };
})();