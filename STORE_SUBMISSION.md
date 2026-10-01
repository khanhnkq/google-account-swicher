# 📝 Thông tin nộp lên Chrome Web Store & Firefox AMO (v1.3.3)

Tài liệu này chuẩn bị sẵn toàn bộ nội dung cần điền khi nộp extension lên **Chrome Web Store** và **Mozilla Add-ons (AMO)**.

---

## 🦊 1. Nộp lên Firefox Add-ons (AMO)
* **Trang nộp:** [https://addons.mozilla.org/developers/addon/submit/upload-listed](https://addons.mozilla.org/developers/addon/submit/upload-listed)
* **File nộp:** `dist/google-account-switcher-firefox-v1.3.3.zip` (hoặc `.xpi`)

### Thông tin điền vào biểu mẫu AMO:
* **Name:** `Fast Google Account Switcher`
* **Summary (Mô tả ngắn):**
  > Switch Google accounts instantly on Gmail, Drive, Docs, Calendar, and Meet using customizable keyboard shortcuts (/u/0, /u/1, etc.).
* **Description (Mô tả chi tiết):**
  ```markdown
  A lightweight, privacy-focused extension that enables instant switching between multiple logged-in Google accounts on the same tab using customizable keyboard shortcuts or a native popup.

  ⚡ Features:
  - Instant account switching without reloading full sessions or clicking profile avatars.
  - Fully customizable keyboard shortcuts: Click on any shortcut badge in the popup to rebind it to ANY key combination.
  - Custom account index jump: Type any user number (e.g., 4, 5, 10) to switch instantly.
  - Supports all major Google services: Gmail, Google Drive, Google Docs, Sheets, Slides, Google Calendar, Google Meet, YouTube, Google Cloud Console, and Google Keep.
  - Native browser UI style with automatic Light/Dark mode support.
  - 100% private: Zero tracking, zero telemetry, all configurations stored strictly locally.

  ⌨️ Default Shortcuts:
  - Alt + Shift + 1: Switch to User 0
  - Alt + Shift + 2: Switch to User 1
  - Alt + Shift + 3: Switch to User 2
  - Alt + Shift + 4: Switch to User 3
  (You can rebind any shortcut directly inside the popup interface or via about:addons)
  ```
* **Categories:** `Productivity`, `Tabs`
* **Source code:** Chọn "No" (Mã nguồn viết trực tiếp dạng plain JS, không minified, không obfuscated).

---

## 🌐 2. Nộp lên Chrome Web Store
* **Trang nộp:** [https://chrome.google.com/webstore/devconsole/](https://chrome.google.com/webstore/devconsole/)
* **File nộp:** `dist/google-account-switcher-chrome-v1.3.2.zip`

### Thông tin điền vào biểu mẫu Chrome:
* **Item Name:** `Fast Google Account Switcher`
* **Short Description (Tối đa 132 ký tự):**
  > Switch Google accounts instantly on Gmail, Drive, Docs, and Meet using customizable keyboard shortcuts (/u/0, /u/1).
* **Detailed Description:** *(Dùng nội dung giống phần AMO ở trên)*
* **Category:** `Productivity` / `Workflow & Planning`
* **Privacy practices tab:**
  * **Single Purpose Description:**
    > Provide customizable keyboard shortcuts and a native popup menu to switch between logged-in Google accounts on Google services by updating URL parameters.
  * **Permission Justification for `tabs`:**
    > Required to detect whether the active tab is on a Google domain and update its URL to switch the account index (/u/0 to /u/1, or update authuser param).
  * **Permission Justification for `storage`:**
    > Required to store and synchronize user-defined custom keyboard shortcuts locally.
  * **Data collection declaration:**
    > Tick "I do not collect or use user data".
