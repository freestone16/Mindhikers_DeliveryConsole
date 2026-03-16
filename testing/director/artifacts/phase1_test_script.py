#!/usr/bin/env python3
"""
Director Phase1 Real Validation Test
Using Playwright browser automation
"""

import os
import time
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# Configuration
BASE_URL = "http://localhost:5178"
TARGET_FILE = "/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/CSET-Seedance2/04_Visuals/phase1_视觉概念提案_CSET-Seedance2.md"
ARTIFACTS_DIR = (
    "/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/artifacts"
)
TEST_START_TIME = datetime.now()
EXPECTED_PROJECT = "CSET-Seedance2"
EXPECTED_SCRIPT = "CSET-seedance2_深度文稿_v2.1.md"

# Ensure artifacts directory exists
os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def get_file_mtime(filepath):
    """Get file modification time as datetime"""
    if os.path.exists(filepath):
        return datetime.fromtimestamp(os.path.getmtime(filepath))
    return None


def save_screenshot(page, name):
    """Save screenshot to artifacts directory"""
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

    # Record initial file state
    file_before_mtime = get_file_mtime(TARGET_FILE)
    results["target_file_before_mtime"] = (
        str(file_before_mtime) if file_before_mtime else "File not found"
    )

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console logs
        def handle_console(msg):
            log_entry = f"[{msg.type}] {msg.text}"
            results["console_logs"].append(log_entry)
            print(f"Console: {log_entry}")

        page.on("console", handle_console)

        # Capture network requests
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
            # Step 1: Navigate to the page
            print("Step 1: Navigating to the page...")
            results["browser_steps_executed"].append("navigate_to_page")
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=30000)
            screenshot_path = save_screenshot(page, "01_initial_page")
            results["screenshots"].append(screenshot_path)
            results["passed_conditions"]["page_loaded"] = True
            print(f"Page loaded successfully. Screenshot saved: {screenshot_path}")

            # Step 2: Verify project is CSET-Seedance2
            print("Step 2: Verifying project selection...")
            results["browser_steps_executed"].append("verify_project")
            page_content = page.content()

            # Check for project selector or project name in page
            project_found = False
            try:
                # Look for project name in various possible locations
                project_selectors = [
                    f"text={EXPECTED_PROJECT}",
                    f"[data-project='{EXPECTED_PROJECT}']",
                    f".project-name:has-text('{EXPECTED_PROJECT}')",
                    f"text=CSET-Seedance2",
                ]
                for selector in project_selectors:
                    if page.locator(selector).count() > 0:
                        project_found = True
                        break
            except Exception as e:
                results["errors"].append(f"Project verification error: {str(e)}")

            if EXPECTED_PROJECT in page_content:
                project_found = True

            results["passed_conditions"]["project_verified"] = project_found
            print(f"Project verification: {'PASSED' if project_found else 'CHECKING'}")

            # Step 3: Verify script selection
            print("Step 3: Verifying script selection...")
            results["browser_steps_executed"].append("verify_script")
            script_found = (
                EXPECTED_SCRIPT.replace(".md", "") in page_content
                or EXPECTED_SCRIPT in page_content
            )
            results["passed_conditions"]["script_verified"] = script_found
            print(f"Script verification: {'PASSED' if script_found else 'CHECKING'}")

            # Step 4: Navigate to Director section (影视导演)
            print("Step 4: Entering Director section...")
            results["browser_steps_executed"].append("enter_director")

            director_selectors = [
                "text=影视导演",
                "text=Director",
                "[data-module='director']",
                "button:has-text('导演')",
                "a:has-text('导演')",
                "div:has-text('影视导演')",
            ]

            director_clicked = False
            for selector in director_selectors:
                try:
                    if page.locator(selector).count() > 0:
                        page.locator(selector).first.click()
                        director_clicked = True
                        print(f"Clicked Director using selector: {selector}")
                        break
                except Exception:
                    continue

            if director_clicked:
                page.wait_for_timeout(2000)
                page.wait_for_load_state("networkidle", timeout=15000)
                screenshot_path = save_screenshot(page, "02_director_section")
                results["screenshots"].append(screenshot_path)
                results["passed_conditions"]["entered_director"] = True
                print(f"Entered Director section. Screenshot: {screenshot_path}")
            else:
                # Maybe we're already in Director section, take screenshot anyway
                screenshot_path = save_screenshot(page, "02_director_section_attempt")
                results["screenshots"].append(screenshot_path)
                print("Could not find Director button - may already be in section")

            # Step 5: Look for Phase1 generate button
            print("Step 5: Looking for Phase1 generate button...")
            results["browser_steps_executed"].append("find_generate_button")

            # Take screenshot before clicking
            screenshot_path = save_screenshot(page, "03_before_generate")
            results["screenshots"].append(screenshot_path)

            generate_button_selectors = [
                "text=开始头脑风暴并生成概念提案",
                "text=生成概念提案",
                "text=Generate Concept",
                "button:has-text('头脑风暴')",
                "button:has-text('生成')",
                "[data-phase='1'] button",
                ".phase-1 button",
            ]

            generate_button_found = False
            for selector in generate_button_selectors:
                try:
                    count = page.locator(selector).count()
                    if count > 0:
                        generate_button_found = True
                        print(f"Found generate button using selector: {selector}")
                        break
                except Exception:
                    continue

            # Check page content for generate button text
            page_content = page.content()
            if (
                "开始头脑风暴" in page_content
                or "概念提案" in page_content
                or "Generate" in page_content
            ):
                generate_button_found = True

            results["passed_conditions"]["generate_button_found"] = (
                generate_button_found
            )
            print(f"Generate button found: {generate_button_found}")

            # Step 6: Click generate button
            print("Step 6: Clicking generate button...")
            results["browser_steps_executed"].append("click_generate")

            click_success = False
            for selector in generate_button_selectors:
                try:
                    if page.locator(selector).count() > 0:
                        page.locator(selector).first.click()
                        click_success = True
                        print(f"Clicked generate button: {selector}")
                        break
                except Exception as e:
                    results["errors"].append(
                        f"Click attempt failed for {selector}: {str(e)}"
                    )
                    continue

            if click_success:
                results["passed_conditions"]["generate_clicked"] = True
                page.wait_for_timeout(3000)
                screenshot_path = save_screenshot(page, "04_generating_state")
                results["screenshots"].append(screenshot_path)
                print(f"Generate clicked. Screenshot: {screenshot_path}")
            else:
                results["failed_conditions"]["generate_clicked"] = (
                    "Could not find or click generate button"
                )
                print("Failed to click generate button")

            # Step 7: Wait for generation to complete (up to 90 seconds)
            print("Step 7: Waiting for generation to complete (max 90s)...")
            results["browser_steps_executed"].append("wait_for_generation")

            generation_complete = False
            generating_seen = False
            proposal_seen = False
            error_seen = False

            start_wait = time.time()
            max_wait = 90

            while time.time() - start_wait < max_wait:
                page.wait_for_timeout(5000)  # Check every 5 seconds
                page_content = page.content()

                # Check for generating state
                if (
                    "Generating" in page_content
                    or "生成中" in page_content
                    or "Loading" in page_content
                ):
                    generating_seen = True
                    print("Generating state detected...")

                # Check for completion
                if (
                    "Visual Concept Proposal" in page_content
                    or "视觉概念提案" in page_content
                ):
                    proposal_seen = True
                    print("Proposal content detected!")

                # Check for errors
                if (
                    "Generation failed" in page_content
                    or "Error" in page_content
                    or "KIMI_API_KEY" in page_content
                ):
                    error_seen = True
                    results["errors"].append(
                        "Error detected in page content during generation"
                    )
                    print("Error detected in page!")
                    break

                # Take periodic screenshots
                elapsed = int(time.time() - start_wait)
                if elapsed % 15 == 0:  # Every 15 seconds
                    screenshot_path = save_screenshot(
                        page, f"05_generation_progress_{elapsed}s"
                    )
                    results["screenshots"].append(screenshot_path)
                    print(f"Progress screenshot at {elapsed}s: {screenshot_path}")

                # If proposal is visible, we're done
                if proposal_seen:
                    generation_complete = True
                    break

            # Final screenshot
            screenshot_path = save_screenshot(page, "06_final_state")
            results["screenshots"].append(screenshot_path)
            print(f"Final screenshot: {screenshot_path}")

            results["passed_conditions"]["generating_state_seen"] = generating_seen
            results["passed_conditions"]["proposal_appeared"] = proposal_seen
            results["passed_conditions"]["no_errors"] = not error_seen

            print(
                f"Generation results - generating_seen: {generating_seen}, proposal_seen: {proposal_seen}, error_seen: {error_seen}"
            )

        except PlaywrightTimeoutError as e:
            results["errors"].append(f"Timeout error: {str(e)}")
            print(f"Timeout error: {e}")
        except Exception as e:
            results["errors"].append(f"Unexpected error: {str(e)}")
            print(f"Unexpected error: {e}")
        finally:
            browser.close()

    # Step 8: Verify output file modification
    print("Step 8: Verifying output file modification...")
    file_after_mtime = get_file_mtime(TARGET_FILE)
    results["target_file_after_mtime"] = (
        str(file_after_mtime) if file_after_mtime else "File not found"
    )

    if file_before_mtime and file_after_mtime:
        file_modified = file_after_mtime > TEST_START_TIME
        results["passed_conditions"]["file_modified_after_test"] = file_modified
        print(f"File modified after test start: {file_modified}")
        print(
            f"Before: {file_before_mtime}, After: {file_after_mtime}, Test start: {TEST_START_TIME}"
        )
    else:
        results["failed_conditions"]["file_modified_after_test"] = (
            "Could not verify file timestamps"
        )

    # Read file content to verify it's not placeholder
    try:
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            file_content = f.read()
            results["target_file_content_preview"] = file_content[:500]

            # Check for placeholder content
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
            print(f"File has real content (not placeholder): {has_real_content}")
    except Exception as e:
        results["errors"].append(f"Could not read target file: {str(e)}")

    # Determine final status
    critical_conditions = [
        results["passed_conditions"].get("page_loaded", False),
        results["passed_conditions"].get("generate_button_found", False),
        results["passed_conditions"].get("proposal_appeared", False),
        results["passed_conditions"].get("file_modified_after_test", False),
        results["passed_conditions"].get("file_has_real_content", False),
        results["passed_conditions"].get("no_errors", True),
    ]

    if all(critical_conditions):
        results["final_status"] = "passed"
    elif len(results["errors"]) > 0:
        results["final_status"] = "failed"
    else:
        results["final_status"] = "blocked"

    print(f"\n=== FINAL STATUS: {results['final_status'].upper()} ===")
    print(f"Passed conditions: {results['passed_conditions']}")
    print(f"Failed conditions: {results['failed_conditions']}")
    print(f"Errors: {results['errors']}")

    return results


if __name__ == "__main__":
    import json

    results = main()
    # Write results to a JSON file for report generation
    results_path = os.path.join(ARTIFACTS_DIR, "test_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2, default=str)
    print(f"\nResults saved to: {results_path}")
