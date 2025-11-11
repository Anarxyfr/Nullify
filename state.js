(() => {
  const listeners = new Set();
  let blockingEnabled = true;
  let hasNotifiedInitial = false;
  let pageCount = 0;
  let bufferedIncrement = 0;
  let flushTimer = null;

  function flushIncrement() {
    if (bufferedIncrement <= 0 || !chrome?.runtime?.sendMessage) {
      bufferedIncrement = 0;
      return;
    }

    const amount = bufferedIncrement;
    bufferedIncrement = 0;

    try {
      chrome.runtime.sendMessage({ type: "adIncrement", amount });
    } catch (error) {
      // ignore missing background contexts
    }
  }

  function queueIncrement(amount = 1) {
    if (!blockingEnabled) {
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    pageCount += amount;
    bufferedIncrement += amount;

    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushIncrement();
      }, 250);
    }
  }

  function notifyReset() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    if (bufferedIncrement > 0) {
      flushIncrement();
    }

    pageCount = 0;

    if (!chrome?.runtime?.sendMessage) {
      return;
    }

    try {
      chrome.runtime.sendMessage({ type: "adReset" });
    } catch (error) {
      // ignore
    }
  }

  function notifyListeners(enabled, reason) {
    listeners.forEach((listener) => {
      try {
        listener(enabled, reason);
      } catch (error) {
        console.error("Nullify listener error:", error);
      }
    });
  }

  function setBlockingEnabled(nextValue, reason = "update") {
    const normalized = Boolean(nextValue);
    const changed = normalized !== blockingEnabled;
    blockingEnabled = normalized;

    if (!blockingEnabled) {
      notifyReset();
    }

    if (!hasNotifiedInitial || changed) {
      hasNotifiedInitial = true;
      notifyListeners(blockingEnabled, reason);
    }
  }

  function requestInitialState() {
    if (!chrome?.runtime?.sendMessage) {
      setBlockingEnabled(true, "no-runtime");
      return;
    }

    try {
      chrome.runtime.sendMessage({ type: "getBlockingState" }, (response) => {
        if (chrome.runtime.lastError) {
          return;
        }

        if (response && typeof response.enabled === "boolean") {
          setBlockingEnabled(response.enabled, "initial-response");
        } else {
          setBlockingEnabled(true, "initial-fallback");
        }
      });
    } catch (error) {
      setBlockingEnabled(true, "initial-error");
    }
  }

  if (!window.nullifyBlocking) {
    window.nullifyBlocking = {
      notifyIncrement: queueIncrement,
      notifyReset,
      getPageCount() {
        return pageCount;
      },
      isEnabled() {
        return blockingEnabled;
      },
      subscribe(listener, options = {}) {
        if (typeof listener !== "function") {
          return () => {};
        }

        listeners.add(listener);

        if (options?.immediate !== false) {
          try {
            listener(blockingEnabled, "immediate");
          } catch (error) {
            console.error("Nullify listener error:", error);
          }
        }

        return () => {
          listeners.delete(listener);
        };
      }
    };

    requestInitialState();

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === "setBlockingState") {
        setBlockingEnabled(message.enabled, "push");
        return;
      }

      if (message?.type === "getPageStats") {
        sendResponse({
          current: pageCount,
          enabled: blockingEnabled
        });
      }
    });

    window.addEventListener(
      "beforeunload",
      () => {
        flushIncrement();
      },
      { once: true }
    );
  }
})();

