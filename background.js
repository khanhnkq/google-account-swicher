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

function getTargetGoogleUrl(rawUrl, targetGoogleIndex) {
  try {
    const url = new URL(rawUrl);

    if (!isGoogleDomain(url.hostname)) {
      return null;
    }

    // 1. URL có path /u/0/, /u/1/...
    const uRegex = /\/u\/\d+(\/|$)/;
    if (uRegex.test(url.pathname)) {
      url.pathname = url.pathname.replace(uRegex, `/u/${targetGoogleIndex}$1`);
      return url.toString();
    }

    // 2. Query param authuser
    if (url.searchParams.has("authuser")) {
      url.searchParams.set("authuser", targetGoogleIndex.toString());
      return url.toString();
    }

    // 3. Các dịch vụ chưa có /u/ trong path
    if (url.hostname === "mail.google.com") {
      url.pathname = url.pathname.replace(/^\/mail(\/|$)/, `/mail/u/${targetGoogleIndex}/`);
      return url.toString();
    }
    if (url.hostname === "drive.google.com") {
      url.pathname = url.pathname.replace(/^\/drive(\/|$)/, `/drive/u/${targetGoogleIndex}/`);
      return url.toString();
    }
    if (url.hostname === "calendar.google.com") {
      url.pathname = url.pathname.replace(/^\/calendar(\/|$)/, `/calendar/u/${targetGoogleIndex}/`);
      return url.toString();
    }
    if (url.hostname === "docs.google.com") {
      const match = url.pathname.match(/^\/([a-z0-9_-]+)(\/|$)(.*)/i);
      if (match) {
        const product = match[1];
        const remaining = match[3] || "";
        url.pathname = `/${product}/u/${targetGoogleIndex}/${remaining}`;
        return url.toString();
      }
    }
    if (url.hostname === "keep.google.com") {
      url.pathname = `/u/${targetGoogleIndex}${url.pathname}`;
      return url.toString();
    }

    // 4. Fallback gán query param authuser
    url.searchParams.set("authuser", targetGoogleIndex.toString());
    return url.toString();
  } catch (err) {
    console.error("[Account Switcher] URL parse error:", err);
    return null;
  }
}

async function switchActiveTabAccount(targetGoogleIndex) {
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].url) return;

    const activeTab = tabs[0];
    const newUrl = getTargetGoogleUrl(activeTab.url, targetGoogleIndex);
    if (newUrl && newUrl !== activeTab.url) {
      await extApi.tabs.update(activeTab.id, { url: newUrl });
    }
  } catch (error) {
    console.error("[Account Switcher] Error switching tab:", error);
  }
}

async function cycleAccount(step = 1) {
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].url) return;

    const activeTab = tabs[0];
    const currentUrl = activeTab.url;
    const parsed = new URL(currentUrl);
    if (!isGoogleDomain(parsed.hostname)) return;

    let count = 4;
    if (extApi.storage && extApi.storage.local) {
      const data = await extApi.storage.local.get("accountCount");
      if (data && typeof data.accountCount === "number") {
        count = Math.max(1, Math.min(20, data.accountCount));
      }
    }

    let currentGoogleIndex = 0;
    const uMatch = parsed.pathname.match(/\/u\/(\d+)(\/|$)/);
    if (uMatch) {
      currentGoogleIndex = parseInt(uMatch[1], 10);
    } else if (parsed.searchParams.has("authuser")) {
      currentGoogleIndex = parseInt(parsed.searchParams.get("authuser"), 10) || 0;
    }

    const nextGoogleIndex = (currentGoogleIndex + step + count) % count;
    const newUrl = getTargetGoogleUrl(currentUrl, nextGoogleIndex);
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
    const userNum = parseInt(match[1], 10); // 1..9
    const googleIndex = userNum - 1; // 0..8
    switchActiveTabAccount(googleIndex);
  }
});

// Bắt message từ popup UI hoặc content script
extApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "switch") {
    // message.index là googleIndex (0-based)
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
