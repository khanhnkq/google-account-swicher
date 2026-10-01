# 📝 Thông tin nộp lên Chrome Web Store & Firefox AMO

Tài liệu này chuẩn bị sẵn toàn bộ nội dung cần điền khi nộp extension lên **Chrome Web Store** và **Mozilla Add-ons (AMO)**.

---

## 🦊 1. Nộp lên Firefox Add-ons (AMO)
* **Trang nộp:** [https://addons.mozilla.org/developers/addon/submit/upload-listed](https://addons.mozilla.org/developers/addon/submit/upload-listed)
* **File nộp:** `dist/google-account-switcher-firefox-v1.0.0.zip`

### Thông tin điền vào biểu mẫu AMO:
* **Name:** `Fast Google Account Switcher`
* **Summary (Mô tả ngắn):**
  > Switch Google accounts instantly on Gmail, Drive, Docs, Calendar, and Meet using keyboard shortcuts (/u/0, /u/1, etc.).
* **Description (Mô tả chi tiết):**
  ```markdown
  A lightweight, privacy-focused extension that enables instant switching between multiple logged-in Google accounts on the same tab using keyboard shortcuts.

  ⚡ Features:
  - Instant account switching without reloading full sessions or clicking profile avatars.
  - Supports all major Google services: Gmail, Google Drive, Google Docs, Sheets, Slides, Google Calendar, Google Meet, YouTube, Google Cloud Console, and Google Keep.
  - Clean popup interface showing active account index (/u/0, /u/1, /u/2...).
  - 100% private: Zero tracking, zero telemetry, no external server requests.

  ⌨️ Default Shortcuts:
  - Alt + Shift + 1: Switch to Account 0 (/u/0/)
  - Alt + Shift + 2: Switch to Account 1 (/u/1/)
  - Alt + Shift + 3: Switch to Account 2 (/u/2/)
  - Alt + Shift + 4: Switch to Account 3 (/u/3/)
  (Shortcuts can be customized anytime via about:addons -> Manage Extension Shortcuts)
  ```
* **Categories:** `Productivity`, `Tabs`
* **Source code:** Chọn "No" (Mã nguồn đã viết trực tiếp dạng plain JS, không minified, không obfuscated).

---

## 🌐 2. Nộp lên Chrome Web Store
* **Trang nộp:** [https://chrome.google.com/webstore/devconsole/](https://chrome.google.com/webstore/devconsole/)
* **File nộp:** `dist/google-account-switcher-chrome-v1.0.0.zip`

### Thông tin điền vào biểu mẫu Chrome:
* **Item Name:** `Fast Google Account Switcher`
* **Short Description (Tối đa 132 ký tự):**
  > Switch Google accounts instantly on Gmail, Drive, Docs, and Meet using customizable keyboard shortcuts (/u/0, /u/1).
* **Detailed Description:** *(Dùng nội dung giống phần AMO ở trên)*
* **Category:** `Productivity` / `Workflow & Planning`
* **Privacy practices tab:**
  * **Single Purpose Description:**
    > Provide fast keyboard shortcuts and a popup menu to switch between logged-in Google accounts on Google services by updating URL parameters.
  * **Permission Justification for `tabs`:**
    > Required to detect whether the active tab is on a Google domain and update its URL to switch the account index (/u/0 to /u/1, or update authuser param).
  * **Data collection declaration:**
    > Tick "I do not collect or use user data".
