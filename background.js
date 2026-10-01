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
    // Ví dụ: mail.google.com/mail/u/0/#inbox, drive.google.com/drive/u/0/my-drive
    const uRegex = /\/u\/\d+(\/|$)/;
    if (uRegex.test(url.pathname)) {
      url.pathname = url.pathname.replace(uRegex, `/u/${targetIndex}$1`);
      return url.toString();
    }

    // 2. Trường hợp query param authuser đã tồn tại
    // Ví dụ: console.cloud.google.com/?authuser=0, meet.google.com/?authuser=1
    if (url.searchParams.has("authuser")) {
      url.searchParams.set("authuser", targetIndex.toString());
      return url.toString();
    }

    // 3. Trường hợp các dịch vụ chưa có /u/ trong path
    // 3.1. Gmail: mail.google.com/mail/
    if (url.hostname === "mail.google.com") {
      url.pathname = url.pathname.replace(/^\/mail(\/|$)/, `/mail/u/${targetIndex}/`);
      return url.toString();
    }

    // 3.2. Google Drive: drive.google.com/drive/
    if (url.hostname === "drive.google.com") {
      url.pathname = url.pathname.replace(/^\/drive(\/|$)/, `/drive/u/${targetIndex}/`);
      return url.toString();
    }

    // 3.3. Google Calendar: calendar.google.com/calendar/
    if (url.hostname === "calendar.google.com") {
      url.pathname = url.pathname.replace(/^\/calendar(\/|$)/, `/calendar/u/${targetIndex}/`);
      return url.toString();
    }

    // 3.4. Google Docs / Sheets / Slides
    if (url.hostname === "docs.google.com") {
      const match = url.pathname.match(/^\/([a-z0-9_-]+)(\/|$)(.*)/i);
      if (match) {
        const product = match[1]; // document, spreadsheets, presentation...
        const remaining = match[3] || "";
        url.pathname = `/${product}/u/${targetIndex}/${remaining}`;
        return url.toString();
      }
    }

    // 3.5. Google Keep
    if (url.hostname === "keep.google.com") {
      url.pathname = `/u/${targetIndex}${url.pathname}`;
      return url.toString();
    }

    // 4. Mặc định fallback: Gán query param authuser
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

// Bắt sự kiện phím tắt (commands)
extApi.commands.onCommand.addListener((command) => {
  if (command === "switch-to-0") switchActiveTabAccount(0);
  else if (command === "switch-to-1") switchActiveTabAccount(1);
  else if (command === "switch-to-2") switchActiveTabAccount(2);
  else if (command === "switch-to-3") switchActiveTabAccount(3);
});

// Bắt message từ popup UI (nếu người dùng bấm trong giao diện popup)
extApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "switch") {
    switchActiveTabAccount(message.index).then(() => {
      sendResponse({ status: "ok" });
    });
    return true; // Cho biết async response
  }
});
