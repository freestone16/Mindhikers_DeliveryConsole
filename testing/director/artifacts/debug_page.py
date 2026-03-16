#!/usr/bin/env python3
"""
Debug script to capture page state
"""

import os
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5178"
ARTIFACTS_DIR = (
    "/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/artifacts"
)

os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to page...")
        page.goto(BASE_URL, timeout=30000)
        page.wait_for_load_state("networkidle", timeout=30000)

        page.screenshot(
            path=os.path.join(ARTIFACTS_DIR, "debug_01_homepage.png"), full_page=True
        )

        content = page.content()
        print(f"\n=== Homepage content preview (first 2000 chars) ===")
        print(content[:2000])

        all_text = page.inner_text("body")
        print(f"\n=== All visible text on page ===")
        print(all_text[:3000])

        print("\n\nClicking Director section...")
        try:
            page.locator("text=影视导演").first.click()
            page.wait_for_timeout(3000)
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception as e:
            print(f"Click failed: {e}")

        page.screenshot(
            path=os.path.join(ARTIFACTS_DIR, "debug_02_director.png"), full_page=True
        )

        director_content = page.content()
        print(f"\n=== Director section content preview ===")
        print(director_content[:3000])

        director_text = page.inner_text("body")
        print(f"\n=== Director section visible text ===")
        print(director_text[:4000])

        with open(
            os.path.join(ARTIFACTS_DIR, "debug_page_content.html"),
            "w",
            encoding="utf-8",
        ) as f:
            f.write(director_content)
        print(f"\nFull HTML saved to debug_page_content.html")

        browser.close()


if __name__ == "__main__":
    main()
