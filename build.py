#!/usr/bin/env python3
"""
Build script for Google Account Switcher
Outputs production-ready zip / xpi packages for Chrome Web Store and Firefox Add-ons (AMO).
Supports i18n, native UI, and custom user number input.
"""

import json
import os
import shutil
import subprocess
import zipfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")
CHROME_DIST = os.path.join(DIST_DIR, "chrome")
FIREFOX_DIST = os.path.join(DIST_DIR, "firefox")

COMMON_FILES = [
    "background.js",
    "popup.html",
    "popup.js",
    "popup.css",
]

COMMON_DIRS = [
    "icons",
    "_locales",
]

COMMANDS_CONFIG = {
    "switch-to-0": {
        "suggested_key": {
            "default": "Alt+Shift+1",
            "mac": "Alt+Shift+1"
        },
        "description": "__MSG_shortcutCmd0__"
    },
    "switch-to-1": {
        "suggested_key": {
            "default": "Alt+Shift+2",
            "mac": "Alt+Shift+2"
        },
        "description": "__MSG_shortcutCmd1__"
    },
    "switch-to-2": {
        "suggested_key": {
            "default": "Alt+Shift+3",
            "mac": "Alt+Shift+3"
        },
        "description": "__MSG_shortcutCmd2__"
    },
    "switch-to-3": {
        "suggested_key": {
            "default": "Alt+Shift+4",
            "mac": "Alt+Shift+4"
        },
        "description": "__MSG_shortcutCmd3__"
    }
}

ICONS_CONFIG = {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png",
    "128": "icons/icon-128.png"
}


def generate_icons():
    icons_dir = os.path.join(BASE_DIR, "icons")
    os.makedirs(icons_dir, exist_ok=True)
    svg_path = os.path.join(BASE_DIR, "icon.svg")

    sizes = [16, 32, 48, 96, 128]
    for size in sizes:
        png_path = os.path.join(icons_dir, f"icon-{size}.png")
        if not os.path.exists(png_path) or os.path.getmtime(svg_path) > os.path.getmtime(png_path):
            print(f"Generating icon-{size}.png...")
            subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), svg_path, "-o", png_path], check=True)


def copy_common(target_dir):
    for fname in COMMON_FILES:
        shutil.copy2(os.path.join(BASE_DIR, fname), os.path.join(target_dir, fname))
    for dname in COMMON_DIRS:
        dest = os.path.join(target_dir, dname)
        if os.path.exists(dest):
            shutil.rmtree(dest)
        shutil.copytree(os.path.join(BASE_DIR, dname), dest)


def create_zip(source_dir, output_zip_path):
    with zipfile.ZipFile(output_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(source_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                zf.write(full_path, rel_path)
    print(f"📦 Created package: {output_zip_path} ({os.path.getsize(output_zip_path):,} bytes)")


def build_chrome():
    print("\n--- Building for Chrome Web Store ---")
    if os.path.exists(CHROME_DIST):
        shutil.rmtree(CHROME_DIST)
    os.makedirs(CHROME_DIST, exist_ok=True)

    copy_common(CHROME_DIST)

    manifest = {
        "manifest_version": 3,
        "default_locale": "en",
        "name": "__MSG_extensionName__",
        "version": "1.1.0",
        "description": "__MSG_extensionDescription__",
        "permissions": ["tabs"],
        "background": {
            "service_worker": "background.js"
        },
        "action": {
            "default_title": "__MSG_title__",
            "default_popup": "popup.html",
            "default_icon": ICONS_CONFIG
        },
        "icons": ICONS_CONFIG,
        "commands": COMMANDS_CONFIG
    }

    with open(os.path.join(CHROME_DIST, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    chrome_zip = os.path.join(DIST_DIR, "google-account-switcher-chrome-v1.1.0.zip")
    create_zip(CHROME_DIST, chrome_zip)


def build_firefox():
    print("\n--- Building for Firefox Add-ons (AMO) ---")
    if os.path.exists(FIREFOX_DIST):
        shutil.rmtree(FIREFOX_DIST)
    os.makedirs(FIREFOX_DIST, exist_ok=True)

    copy_common(FIREFOX_DIST)

    manifest = {
        "manifest_version": 3,
        "default_locale": "en",
        "name": "__MSG_extensionName__",
        "version": "1.1.0",
        "description": "__MSG_extensionDescription__",
        "browser_specific_settings": {
            "gecko": {
                "id": "fast-google-account-switcher@khanhnkq.local",
                "strict_min_version": "109.0"
            }
        },
        "permissions": ["tabs"],
        "background": {
            "scripts": ["background.js"]
        },
        "action": {
            "default_title": "__MSG_title__",
            "default_popup": "popup.html",
            "default_icon": ICONS_CONFIG
        },
        "icons": ICONS_CONFIG,
        "commands": COMMANDS_CONFIG
    }

    with open(os.path.join(FIREFOX_DIST, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    firefox_zip = os.path.join(DIST_DIR, "google-account-switcher-firefox-v1.1.0.zip")
    firefox_xpi = os.path.join(DIST_DIR, "google-account-switcher-firefox-v1.1.0.xpi")
    create_zip(FIREFOX_DIST, firefox_zip)
    shutil.copy2(firefox_zip, firefox_xpi)
    print(f"📦 Created package: {firefox_xpi}")


def main():
    print("🚀 Starting build process v1.1.0...")
    os.makedirs(DIST_DIR, exist_ok=True)
    generate_icons()
    build_chrome()
    build_firefox()
    print("\n✅ Build completed successfully! Packages are in ./dist/")


if __name__ == "__main__":
    main()
