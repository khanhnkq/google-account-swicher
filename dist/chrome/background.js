/**
 * Fast Google Account Switcher - Background Service
 */

const extApi = typeof browser !== "undefined" ? browser : chrome;

function isGoogleDomain(hostname) {
  return (
    hostname === "google.com" ||
    hostname.endsWith(".google.com") ||
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  );
}

function getTargetGoogleUrl(rawUrl, targetIndex) {
  try {
    const url = new URL(rawUrl);

    if (!isGoogleDomain(url.hostname)) {
      return null;
    }

    // 1. URL có path /u/0/, /u/1/...
    const uRegex = /\/u\/\d+(\/|$)/;
    if (uRegex.test(url.pathname)) {
      url.pathname = url.pathname.replace(uRegex, `/u/${targetIndex}$1`);
      return url.toString();
    }

    // 2. Query param authuser
    if (url.searchParams.has("authuser")) {
      url.searchParams.set("authuser", targetIndex.toString());
      return url.toString();
    }

    // 3. Các dịch vụ chưa có /u/ trong path
    if (url.hostname === "mail.google.com") {
      url.pathname = url.pathname.replace(/^\/mail(\/|$)/, `/mail/u/${targetIndex}/`);
      return url.toString();
    }
    if (url.hostname === "drive.google.com") {
      url.pathname = url.pathname.replace(/^\/drive(\/|$)/, `/drive/u/${targetIndex}/`);
      return url.toString();
    }
    if (url.hostname === "calendar.google.com") {
      url.pathname = url.pathname.replace(/^\/calendar(\/|$)/, `/calendar/u/${targetIndex}/`);
      return url.toString();
    }
    if (url.hostname === "docs.google.com") {
      const match = url.pathname.match(/^\/([a-z0-9_-]+)(\/|$)(.*)/i);
      if (match) {
        const product = match[1];
        const remaining = match[3] || "";
        url.pathname = `/${product}/u/${targetIndex}/${remaining}`;
        return url.toString();
      }
    }
    if (url.hostname === "keep.google.com") {
      url.pathname = `/u/${targetIndex}${url.pathname}`;
      return url.toString();
    }

    // 4. Fallback gán query param authuser
    url.searchParams.set("authuser", targetIndex.toString());
    return url.toString();
  } catch (err) {
    console.error("[Account Switcher] URL parse error:", err);
    return null;
  }
}

async function switchActiveTabAccount(targetIndex) {
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].url) return;

    const activeTab = tabs[0];
    const newUrl = getTargetGoogleUrl(activeTab.url, targetIndex);
    if (newUrl && newUrl !== activeTab.url) {
      await extApi.tabs.update(activeTab.id, { url: newUrl });
    }
  } catch (error) {
    console.error("[Account Switcher] Error switching tab:", error);
  }
}

/**
 * Xoay vòng tài khoản (Cycle between accounts: 0 -> 1 -> 2 -> ... -> 0)
 */
async function cycleAccount(step = 1) {
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].url) return;

    const activeTab = tabs[0];
    const currentUrl = activeTab.url;
    const parsed = new URL(currentUrl);
    if (!isGoogleDomain(parsed.hostname)) return;

    // Lấy số lượng tài khoản đã cấu hình (mặc định 4)
    let count = 4;
    if (extApi.storage && extApi.storage.local) {
      const data = await extApi.storage.local.get("accountCount");
      if (data && typeof data.accountCount === "number") {
        count = Math.max(1, Math.min(20, data.accountCount));
      }
    }

    // Xác định index hiện tại
    let currentIndex = 0;
    const uMatch = parsed.pathname.match(/\/u\/(\d+)(\/|$)/);
    if (uMatch) {
      currentIndex = parseInt(uMatch[1], 10);
    } else if (parsed.searchParams.has("authuser")) {
      currentIndex = parseInt(parsed.searchParams.get("authuser"), 10) || 0;
    }

    const nextIndex = (currentIndex + step + count) % count;
    const newUrl = getTargetGoogleUrl(currentUrl, nextIndex);
    if (newUrl && newUrl !== currentUrl) {
      await extApi.tabs.update(activeTab.id, { url: newUrl });
    }
  } catch (err) {
    console.error("[Account Switcher] Error cycling account:", err);
  }
}

// Bắt sự kiện phím tắt trình duyệt (commands)
extApi.commands.onCommand.addListener((command) => {
  if (command === "cycle-next") {
    cycleAccount(1);
    return;
  }
  const match = command.match(/^switch-to-(\d+)$/);
  if (match) {
    const idx = parseInt(match[1], 10);
    switchActiveTabAccount(idx);
  }
});

// Bắt message từ popup UI hoặc content script
extApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "switch") {
    switchActiveTabAccount(message.index).then(() => {
      sendResponse({ status: "ok" });
    });
    return true;
  }
  if (message.action === "cycle") {
    cycleAccount(message.step || 1).then(() => {
      sendResponse({ status: "ok" });
    });
    return true;
  }
});

function injectContentScriptToOpenTabs() {
  extApi.tabs.query({ url: ["*://*.google.com/*", "*://*.youtube.com/*"] }, (tabs) => {
    if (!tabs) return;
    for (const tab of tabs) {
      try {
        if (extApi.scripting && extApi.scripting.executeScript) {
          extApi.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          }).catch(() => {});
        } else if (extApi.tabs.executeScript) {
          extApi.tabs.executeScript(tab.id, { file: "content.js" }).catch(() => {});
        }
      } catch (e) {}
    }
  });
}

extApi.runtime.onInstalled.addListener(() => {
  injectContentScriptToOpenTabs();
});
