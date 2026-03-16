#!/usr/bin/env python3
import os
import sys
import time
from datetime import datetime
from playwright.sync_api import sync_playwright

ARTIFACTS_DIR = (
    "/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/artifacts"
)


def log_message(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}")
    sys.stdout.flush()


def main():
    results = {
        "start_time": datetime.now().isoformat(),
        "steps": [],
        "errors": [],
        "screenshots": [],
        "success": False,
    }

    with sync_playwright() as p:
        try:
            log_message("Launching browser...")
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1280, "height": 720}, locale="zh-CN"
            )
            page = context.new_page()

            console_logs = []
            page.on(
                "console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}")
            )

            log_message("Step 1: Opening http://localhost:5178/")
            page.goto("http://localhost:5178/", timeout=60000)
            page.wait_for_load_state("networkidle", timeout=30000)

            screenshot_path = os.path.join(ARTIFACTS_DIR, "step1_homepage.png")
            page.screenshot(path=screenshot_path, full_page=True)
            results["screenshots"].append(screenshot_path)
            results["steps"].append(
                {
                    "step": 1,
                    "action": "Open homepage",
                    "status": "completed",
                    "screenshot": screenshot_path,
                }
            )

            log_message("Step 2: Looking for Director (影视导演) navigation...")
            time.sleep(2)

            director_found = False
            selectors = [
                "text=影视导演",
                "text=导演",
                "text=Director",
                "[data-testid='director-nav']",
                "button:has-text('导演')",
                "a:has-text('导演')",
            ]

            for selector in selectors:
                try:
                    element = page.locator(selector).first
                    if element.is_visible(timeout=2000):
                        log_message(
                            f"Found Director navigation with selector: {selector}"
                        )
                        element.click()
                        director_found = True
                        break
                except:
                    continue

            if not director_found:
                screenshot_path = os.path.join(
                    ARTIFACTS_DIR, "step2_no_director_nav.png"
                )
                page.screenshot(path=screenshot_path, full_page=True)
                results["screenshots"].append(screenshot_path)

                page_content = page.content()
                content_path = os.path.join(ARTIFACTS_DIR, "step2_page_content.html")
                with open(content_path, "w", encoding="utf-8") as f:
                    f.write(page_content)

                results["errors"].append(
                    {
                        "step": 2,
                        "error": "Could not find Director navigation element",
                        "selectors_tried": selectors,
                        "page_content_saved": content_path,
                    }
                )
                results["steps"].append(
                    {
                        "step": 2,
                        "action": "Enter Director",
                        "status": "failed",
                        "screenshot": screenshot_path,
                    }
                )
            else:
                page.wait_for_load_state("networkidle", timeout=10000)
                screenshot_path = os.path.join(ARTIFACTS_DIR, "step2_director_page.png")
                page.screenshot(path=screenshot_path, full_page=True)
                results["screenshots"].append(screenshot_path)
                results["steps"].append(
                    {
                        "step": 2,
                        "action": "Enter Director",
                        "status": "completed",
                        "screenshot": screenshot_path,
                    }
                )

            if director_found:
                log_message("Step 3-4: Verifying project and script selection...")
                time.sleep(2)

                screenshot_path = os.path.join(
                    ARTIFACTS_DIR, "step3_project_script.png"
                )
                page.screenshot(path=screenshot_path, full_page=True)
                results["screenshots"].append(screenshot_path)

                try:
                    project_text = page.locator("text=CSET-Seedance2").first
                    if project_text.is_visible(timeout=2000):
                        log_message("Project 'CSET-Seedance2' is visible")
                        results["steps"].append(
                            {
                                "step": 3,
                                "action": "Verify project selection",
                                "status": "completed",
                                "note": "Project CSET-Seedance2 visible",
                            }
                        )
                except:
                    log_message("Could not verify project selection")
                    results["steps"].append(
                        {
                            "step": 3,
                            "action": "Verify project selection",
                            "status": "skipped",
                            "note": "Could not find project selector",
                        }
                    )

                log_message("Step 5: Looking for Phase1 button...")
                time.sleep(1)

                phase1_clicked = False
                phase1_selectors = [
                    "text=Phase1",
                    "text=Phase 1",
                    "text=概念提案",
                    "button:has-text('Phase1')",
                    "button:has-text('Phase 1')",
                    "button:has-text('概念提案')",
                    "[data-testid='phase1-button']",
                ]

                for selector in phase1_selectors:
                    try:
                        element = page.locator(selector).first
                        if element.is_visible(timeout=2000):
                            log_message(
                                f"Found Phase1 button with selector: {selector}"
                            )

                            screenshot_path = os.path.join(
                                ARTIFACTS_DIR, "step5_before_click.png"
                            )
                            page.screenshot(path=screenshot_path, full_page=True)
                            results["screenshots"].append(screenshot_path)

                            element.click()
                            phase1_clicked = True
                            log_message("Clicked Phase1 button")

                            log_message("Waiting for Phase1 generation...")
                            time.sleep(5)
                            page.wait_for_load_state("networkidle", timeout=30000)

                            screenshot_path = os.path.join(
                                ARTIFACTS_DIR, "step5_after_generation.png"
                            )
                            page.screenshot(path=screenshot_path, full_page=True)
                            results["screenshots"].append(screenshot_path)

                            results["steps"].append(
                                {
                                    "step": 5,
                                    "action": "Click Phase1 button",
                                    "status": "completed",
                                    "screenshot": screenshot_path,
                                }
                            )
                            break
                    except:
                        continue

                if not phase1_clicked:
                    screenshot_path = os.path.join(
                        ARTIFACTS_DIR, "step5_no_phase1_button.png"
                    )
                    page.screenshot(path=screenshot_path, full_page=True)
                    results["screenshots"].append(screenshot_path)

                    results["errors"].append(
                        {
                            "step": 5,
                            "error": "Could not find Phase1 button",
                            "selectors_tried": phase1_selectors,
                        }
                    )
                    results["steps"].append(
                        {
                            "step": 5,
                            "action": "Click Phase1 button",
                            "status": "failed",
                            "screenshot": screenshot_path,
                        }
                    )

                log_message("Step 6: Recording final page state...")
                time.sleep(2)

                screenshot_path = os.path.join(ARTIFACTS_DIR, "step6_final_state.png")
                page.screenshot(path=screenshot_path, full_page=True)
                results["screenshots"].append(screenshot_path)

                page_text = page.content()

                if "成功" in page_text or "success" in page_text.lower():
                    log_message("Found success indicator on page")
                    results["steps"].append(
                        {
                            "step": 6,
                            "action": "Record final state",
                            "status": "completed",
                            "note": "Success message found",
                        }
                    )
                    results["success"] = True
                elif "错误" in page_text or "error" in page_text.lower():
                    log_message("Found error indicator on page")
                    results["steps"].append(
                        {
                            "step": 6,
                            "action": "Record final state",
                            "status": "completed",
                            "note": "Error message found",
                        }
                    )
                else:
                    log_message("No clear success/error indicator found")
                    results["steps"].append(
                        {
                            "step": 6,
                            "action": "Record final state",
                            "status": "completed",
                            "note": "No clear status indicator",
                        }
                    )

            log_path = os.path.join(ARTIFACTS_DIR, "console_logs.txt")
            with open(log_path, "w", encoding="utf-8") as f:
                f.write("\n".join(console_logs))
            results["console_log_path"] = log_path

            browser.close()

        except Exception as e:
            log_message(f"Fatal error: {str(e)}")
            results["errors"].append({"fatal": str(e)})
            import traceback

            results["traceback"] = traceback.format_exc()

        finally:
            results["end_time"] = datetime.now().isoformat()

    import json

    print("\n=== TEST RESULTS ===")
    print(json.dumps(results, indent=2, ensure_ascii=False))

    return results


if __name__ == "__main__":
    main()
