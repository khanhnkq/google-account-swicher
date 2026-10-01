/**
 * Fast Google Account Switcher - Background Service
 */

const extApi = typeof browser !== "undefined" ? browser : chrome;

/**
 * Kiểm tra xem hostname có thuộc hệ sinh thái Google hay không
 */
function isGoogleDomain(hostname) {
  return (
    hostname === "google.com" ||
    hostname.endsWith(".google.com") ||
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  );
}

/**
 * Tính toán URL mới với index tài khoản mong muốn
 */
function getTargetGoogleUrl(rawUrl, targetIndex) {
  try {
    const url = new URL(rawUrl);

    if (!isGoogleDomain(url.hostname)) {
      return null;
    }

    // 1. Trường hợp URL đã có path dạng /u/0/, /u/1/...
    const uRegex = /\/u\/\d+(\/|$)/;
    if (uRegex.test(url.pathname)) {
      url.pathname = url.pathname.replace(uRegex, `/u/${targetIndex}$1`);
      return url.toString();
    }

    // 2. Trường hợp query param authuser đã tồn tại
    if (url.searchParams.has("authuser")) {
      url.searchParams.set("authuser", targetIndex.toString());
      return url.toString();
    }

    // 3. Trường hợp các dịch vụ chưa có /u/ trong path
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

/**
 * Thực hiện chuyển tab hiện tại sang tài khoản targetIndex
 */
async function switchActiveTabAccount(targetIndex) {
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return;

    const activeTab = tabs[0];
    if (!activeTab.url) return;

    const newUrl = getTargetGoogleUrl(activeTab.url, targetIndex);
    if (newUrl && newUrl !== activeTab.url) {
      await extApi.tabs.update(activeTab.id, { url: newUrl });
    }
  } catch (error) {
    console.error("[Account Switcher] Error switching tab:", error);
  }
}

// Bắt sự kiện phím tắt trình duyệt (commands) cho switch-to-0..8
extApi.commands.onCommand.addListener((command) => {
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
});

// Tự động nạp content.js vào các tab Google đang mở để nhận phím tắt ngay lập tức
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
