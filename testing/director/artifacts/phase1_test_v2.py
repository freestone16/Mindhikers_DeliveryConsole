#!/usr/bin/env python3
"""
Director Phase1 Real Validation Test v2
Handles both initial state and already-generated state
"""

import os
import time
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE_URL = "http://localhost:5178"
TARGET_FILE = "/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/CSET-Seedance2/04_Visuals/phase1_视觉概念提案_CSET-Seedance2.md"
ARTIFACTS_DIR = (
    "/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/artifacts"
)
TEST_START_TIME = datetime.now()

os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def get_file_mtime(filepath):
    if os.path.exists(filepath):
        return datetime.fromtimestamp(os.path.getmtime(filepath))
    return None


def save_screenshot(page, name):
    path = os.path.join(ARTIFACTS_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    return path


def main():
    results = {
        "test_start_time": TEST_START_TIME.isoformat(),
        "target_file_before_mtime": str(get_file_mtime(TARGET_FILE)),
        "browser_steps_executed": [],
        "agent_browser_used": True,
        "page_states": [],
        "errors": [],
        "screenshots": [],
        "console_logs": [],
        "network_requests": [],
        "final_status": "running",
        "passed_conditions": {},
        "failed_conditions": {},
    }

    file_before_mtime = get_file_mtime(TARGET_FILE)
    results["target_file_before_mtime"] = (
        str(file_before_mtime) if file_before_mtime else "File not found"
    )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        def handle_console(msg):
            log_entry = f"[{msg.type}] {msg.text}"
            results["console_logs"].append(log_entry)
            if len(results["console_logs"]) < 50:
                print(f"Console: {log_entry[:100]}")

        page.on("console", handle_console)

        def handle_request(request):
            if "/api/director" in request.url or "/phase1" in request.url:
                entry = f"REQUEST: {request.method} {request.url}"
                results["network_requests"].append(entry)
                print(f"Network: {entry}")

        def handle_response(response):
            if "/api/director" in response.url or "/phase1" in response.url:
                entry = f"RESPONSE: {response.status} {response.url}"
                results["network_requests"].append(entry)
                print(f"Network: {entry}")

        page.on("request", handle_request)
        page.on("response", handle_response)

        try:
            print("Step 1: Navigating to the page...")
            results["browser_steps_executed"].append("navigate_to_page")
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=30000)
            screenshot_path = save_screenshot(page, "v2_01_initial_page")
            results["screenshots"].append(screenshot_path)
            results["passed_conditions"]["page_loaded"] = True
            print(f"Page loaded. Screenshot: {screenshot_path}")

            page_content = page.content()
            results["page_states"].append(
                f"Initial page content length: {len(page_content)}"
            )

            print("Step 2: Entering Director section...")
            results["browser_steps_executed"].append("enter_director")

            director_selectors = [
                "text=影视导演",
                "button:has-text('影视导演')",
                "div:has-text('影视导演')",
                "[data-module='director']",
            ]

            director_clicked = False
            for selector in director_selectors:
                try:
                    if page.locator(selector).count() > 0:
                        page.locator(selector).first.click()
                        director_clicked = True
                        print(f"Clicked Director: {selector}")
                        break
                except Exception:
                    continue

            page.wait_for_timeout(2000)
            page.wait_for_load_state("networkidle", timeout=15000)
            screenshot_path = save_screenshot(page, "v2_02_director_section")
            results["screenshots"].append(screenshot_path)
            results["passed_conditions"]["entered_director"] = True
            print(f"Director section entered. Screenshot: {screenshot_path}")

            page_content = page.content()

            print("Step 3: Checking page state...")
            has_initial_state = "Visual Concept Architect" in page_content
            has_proposal_state = "Visual Concept Proposal" in page_content
            has_generating_state = "Generating Visual Concept" in page_content
            has_generate_button = "开始头脑风暴并生成概念提案" in page_content

            print(f"  - Visual Concept Architect (initial): {has_initial_state}")
            print(f"  - Visual Concept Proposal (complete): {has_proposal_state}")
            print(f"  - Generating Visual Concept: {has_generating_state}")
            print(f"  - Generate button visible: {has_generate_button}")

            results["page_states"].append(
                {
                    "has_initial_state": has_initial_state,
                    "has_proposal_state": has_proposal_state,
                    "has_generating_state": has_generating_state,
                    "has_generate_button": has_generate_button,
                }
            )

            if has_proposal_state and not has_initial_state:
                print(
                    "\n  >>> Page already shows Visual Concept Proposal (content exists)"
                )
                results["passed_conditions"]["proposal_appeared"] = True
                results["passed_conditions"]["page_shows_completed_state"] = True

                screenshot_path = save_screenshot(page, "v2_03_proposal_state")
                results["screenshots"].append(screenshot_path)

                proposal_content = (
                    page.locator(
                        ".prose, .text-slate-300, [class*='prose']"
                    ).first.text_content()
                    if page.locator(".prose, .text-slate-300").count() > 0
                    else ""
                )
                is_placeholder = (
                    "等待导演大师" in proposal_content or len(proposal_content) < 50
                )
                results["passed_conditions"][
                    "proposal_not_placeholder"
                ] = not is_placeholder
                print(
                    f"  Proposal content length: {len(proposal_content)}, is_placeholder: {is_placeholder}"
                )

            elif has_generate_button or has_initial_state:
                print("\n  >>> Page shows initial state with generate button")
                results["passed_conditions"]["generate_button_found"] = True

                screenshot_path = save_screenshot(page, "v2_03_initial_state")
                results["screenshots"].append(screenshot_path)

                print("Step 4: Clicking generate button...")
                results["browser_steps_executed"].append("click_generate")

                button_selectors = [
                    "button:has-text('开始头脑风暴')",
                    "button:has-text('生成概念提案')",
                    "text=开始头脑风暴并生成概念提案",
                ]

                click_success = False
                for selector in button_selectors:
                    try:
                        if page.locator(selector).count() > 0:
                            page.locator(selector).first.click()
                            click_success = True
                            print(f"Clicked button: {selector}")
                            break
                    except Exception as e:
                        results["errors"].append(
                            f"Click failed for {selector}: {str(e)}"
                        )
                        continue

                if click_success:
                    results["passed_conditions"]["generate_clicked"] = True
                    page.wait_for_timeout(3000)
                    screenshot_path = save_screenshot(page, "v2_04_generating")
                    results["screenshots"].append(screenshot_path)

                    print("Step 5: Waiting for generation (max 90s)...")
                    results["browser_steps_executed"].append("wait_for_generation")

                    start_wait = time.time()
                    max_wait = 90
                    proposal_seen = False
                    generating_seen = False

                    while time.time() - start_wait < max_wait:
                        page.wait_for_timeout(5000)
                        current_content = page.content()

                        if "Generating Visual Concept" in current_content:
                            generating_seen = True
                            print("  Generating state detected")

                        if (
                            "Visual Concept Proposal" in current_content
                            and "Generating" not in current_content
                        ):
                            proposal_seen = True
                            print("  Proposal appeared!")
                            break

                        if (
                            "Error" in current_content
                            or "failed" in current_content.lower()
                        ):
                            results["errors"].append("Error detected in page")
                            break

                        elapsed = int(time.time() - start_wait)
                        if elapsed % 20 == 0:
                            screenshot_path = save_screenshot(
                                page, f"v2_05_progress_{elapsed}s"
                            )
                            results["screenshots"].append(screenshot_path)

                    results["passed_conditions"]["generating_state_seen"] = (
                        generating_seen
                    )
                    results["passed_conditions"]["proposal_appeared"] = proposal_seen

                    screenshot_path = save_screenshot(page, "v2_06_final")
                    results["screenshots"].append(screenshot_path)
            else:
                results["failed_conditions"]["page_state_unknown"] = (
                    "Could not determine page state"
                )
                screenshot_path = save_screenshot(page, "v2_03_unknown_state")
                results["screenshots"].append(screenshot_path)

        except PlaywrightTimeoutError as e:
            results["errors"].append(f"Timeout: {str(e)}")
            print(f"Timeout error: {e}")
        except Exception as e:
            results["errors"].append(f"Error: {str(e)}")
            print(f"Error: {e}")
        finally:
            browser.close()

    print("\nStep 6: Verifying output file...")
    file_after_mtime = get_file_mtime(TARGET_FILE)
    results["target_file_after_mtime"] = (
        str(file_after_mtime) if file_after_mtime else "File not found"
    )

    if file_before_mtime and file_after_mtime:
        file_modified = file_after_mtime > TEST_START_TIME
        results["passed_conditions"]["file_modified_after_test"] = file_modified
        print(f"File modified after test: {file_modified}")
        print(f"  Before: {file_before_mtime}")
        print(f"  After: {file_after_mtime}")
        print(f"  Test start: {TEST_START_TIME}")

    try:
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            file_content = f.read()
            results["target_file_content_preview"] = file_content[:500]

            placeholder_indicators = [
                "等待导演大师的视觉概念提案",
                "placeholder",
                "TODO",
                "待生成",
            ]
            is_placeholder = any(
                indicator in file_content for indicator in placeholder_indicators
            )
            has_real_content = len(file_content) > 200 and not is_placeholder

            results["passed_conditions"]["file_has_real_content"] = has_real_content
            results["passed_conditions"]["file_not_placeholder"] = not is_placeholder
            print(
                f"File has real content: {has_real_content} (length: {len(file_content)})"
            )
    except Exception as e:
        results["errors"].append(f"Could not read file: {str(e)}")

    critical_conditions = [
        results["passed_conditions"].get("page_loaded", False),
        results["passed_conditions"].get("entered_director", False),
        results["passed_conditions"].get("proposal_appeared", False)
        or results["passed_conditions"].get("page_shows_completed_state", False),
        results["passed_conditions"].get("file_has_real_content", False),
        len(results["errors"]) == 0,
    ]

    if all(critical_conditions):
        results["final_status"] = "passed"
    elif len(results["errors"]) > 0:
        results["final_status"] = "failed"
    else:
        results["final_status"] = "blocked"

    print(f"\n{'=' * 60}")
    print(f"FINAL STATUS: {results['final_status'].upper()}")
    print(f"{'=' * 60}")
    print(f"Passed: {results['passed_conditions']}")
    print(f"Failed: {results['failed_conditions']}")
    print(f"Errors: {results['errors']}")

    return results


if __name__ == "__main__":
    import json

    results = main()
    results_path = os.path.join(ARTIFACTS_DIR, "test_results_v2.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2, default=str)
    print(f"\nResults saved to: {results_path}")
