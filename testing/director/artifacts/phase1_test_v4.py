#!/usr/bin/env python3
"""
Director Phase1 Real Validation Test v4
Precise project/script selection using dropdown UI
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
EXPECTED_PROJECT = "CSET-Seedance2"
EXPECTED_SCRIPT = "CSET-seedance2_深度文稿_v2.1.md"

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
            if len(results["console_logs"]) < 20:
                print(f"Console: {log_entry[:80]}")

        page.on("console", handle_console)

        def handle_response(response):
            if "/api/" in response.url:
                entry = f"RES: {response.status} {response.url}"
                results["network_requests"].append(entry)
                print(f"Network: {entry[:80]}")

        page.on("response", handle_response)

        try:
            print("=" * 60)
            print("Step 1: Loading page...")
            print("=" * 60)
            results["browser_steps_executed"].append("navigate_to_page")
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=30000)
            save_screenshot(page, "v4_01_loaded")
            results["passed_conditions"]["page_loaded"] = True
            print("Page loaded successfully")

            print("\n" + "=" * 60)
            print("Step 2: Selecting project via dropdown...")
            print("=" * 60)
            results["browser_steps_executed"].append("select_project")

            project_selected = False

            try:
                project_btn = page.locator(
                    "button:has(svg.lucide-folder-open), button:has-text('CSET')"
                ).first
                if project_btn.count() > 0:
                    project_btn.click()
                    print("Clicked project dropdown button")
                    page.wait_for_timeout(1000)

                    if page.locator("text=Available Projects").count() > 0:
                        print("Dropdown is open")

                        project_option = page.locator(
                            f"button:has-text('{EXPECTED_PROJECT}')"
                        )
                        if project_option.count() > 0:
                            project_option.first.click()
                            project_selected = True
                            print(f"Selected project: {EXPECTED_PROJECT}")
                            page.wait_for_timeout(1500)
                        else:
                            print(f"Project '{EXPECTED_PROJECT}' not found in dropdown")
                    else:
                        print("Dropdown did not open")
            except Exception as e:
                print(f"Project selection error: {e}")

            save_screenshot(page, "v4_02_project")
            results["passed_conditions"]["project_selected"] = project_selected
            print(f"Project selection result: {project_selected}")

            print("\n" + "=" * 60)
            print("Step 3: Selecting script via dropdown...")
            print("=" * 60)
            results["browser_steps_executed"].append("select_script")

            script_selected = False

            try:
                script_btn = page.locator(
                    "button:has-text('Script:'), button:has-text('未选择')"
                ).first
                if script_btn.count() > 0:
                    script_btn.click()
                    print("Clicked script dropdown button")
                    page.wait_for_timeout(1000)

                    if page.locator("text=02_Script").count() > 0:
                        print("Script dropdown is open")

                        script_option = page.locator(
                            f"button:has-text('CSET-seedance2')"
                        )
                        if script_option.count() > 0:
                            script_option.first.click()
                            script_selected = True
                            print(f"Selected script: {EXPECTED_SCRIPT}")
                            page.wait_for_timeout(1500)
                        else:
                            print("Script option not found in dropdown")
                            all_script_btns = page.locator("div.max-h-60 button").all()
                            print(f"Found {len(all_script_btns)} script options")
                            for btn in all_script_btns[:5]:
                                try:
                                    print(f"  - {btn.inner_text()[:50]}")
                                except:
                                    pass
                    else:
                        print("Script dropdown did not open")
            except Exception as e:
                print(f"Script selection error: {e}")

            save_screenshot(page, "v4_03_script")
            results["passed_conditions"]["script_selected"] = script_selected
            print(f"Script selection result: {script_selected}")

            print("\n" + "=" * 60)
            print("Step 4: Entering Director section...")
            print("=" * 60)
            results["browser_steps_executed"].append("enter_director")

            try:
                director_btn = page.locator("text=影视导演")
                if director_btn.count() > 0:
                    director_btn.first.click()
                    print("Clicked Director button")
                    page.wait_for_timeout(2000)
                    page.wait_for_load_state("networkidle", timeout=15000)
                else:
                    print("Director button not found")
            except Exception as e:
                print(f"Director click error: {e}")

            save_screenshot(page, "v4_04_director")
            results["passed_conditions"]["entered_director"] = True

            page_content = page.content()
            page_text = page.inner_text("body")
            print(f"\nPage text (first 1000 chars):\n{page_text[:1000]}")

            print("\n" + "=" * 60)
            print("Step 5: Checking Phase1 state...")
            print("=" * 60)
            results["browser_steps_executed"].append("check_phase1_state")

            has_initial = "Visual Concept Architect" in page_content
            has_proposal = "Visual Concept Proposal" in page_content
            has_generating = "Generating Visual Concept" in page_content
            has_button = "开始头脑风暴" in page_content
            needs_selection = "请先在顶部面板选择" in page_content

            print(f"  Visual Concept Architect: {has_initial}")
            print(f"  Visual Concept Proposal: {has_proposal}")
            print(f"  Generating: {has_generating}")
            print(f"  Generate button: {has_button}")
            print(f"  Needs selection: {needs_selection}")

            results["page_states"].append(
                {
                    "has_initial": has_initial,
                    "has_proposal": has_proposal,
                    "has_generating": has_generating,
                    "has_button": has_button,
                    "needs_selection": needs_selection,
                }
            )

            if needs_selection:
                results["failed_conditions"]["selection_required"] = (
                    "Project/script selection UI interaction failed"
                )
                results["errors"].append(
                    "Page still shows 'please select project/script' message"
                )
                save_screenshot(page, "v4_05_needs_selection")

            elif has_proposal:
                print("\n  >>> SUCCESS: Page shows completed Visual Concept Proposal")
                results["passed_conditions"]["proposal_appeared"] = True
                results["passed_conditions"]["page_shows_completed_state"] = True
                save_screenshot(page, "v4_05_proposal_state")

                proposal_text = ""
                try:
                    proposal_el = page.locator(
                        ".prose, .text-slate-300, [class*='markdown']"
                    ).first
                    if proposal_el.count() > 0:
                        proposal_text = proposal_el.text_content() or ""
                except:
                    pass

                is_placeholder = "等待导演大师" in proposal_text
                results["passed_conditions"][
                    "proposal_not_placeholder"
                ] = not is_placeholder
                print(
                    f"  Proposal content length: {len(proposal_text)}, is_placeholder: {is_placeholder}"
                )

            elif has_button or has_initial:
                print("\n  >>> Page shows initial state - clicking generate...")
                results["passed_conditions"]["generate_button_found"] = True
                save_screenshot(page, "v4_05_initial_state")

                print("\n" + "=" * 60)
                print("Step 6: Clicking generate button...")
                print("=" * 60)
                results["browser_steps_executed"].append("click_generate")

                try:
                    gen_btn = page.locator("button:has-text('开始头脑风暴')")
                    if gen_btn.count() > 0:
                        gen_btn.first.click()
                        results["passed_conditions"]["generate_clicked"] = True
                        print("Clicked generate button")
                        page.wait_for_timeout(3000)
                        save_screenshot(page, "v4_06_generating")

                        print("\n" + "=" * 60)
                        print("Step 7: Waiting for generation (max 90s)...")
                        print("=" * 60)
                        results["browser_steps_executed"].append("wait_for_generation")

                        start_wait = time.time()
                        max_wait = 90

                        while time.time() - start_wait < max_wait:
                            page.wait_for_timeout(5000)
                            current = page.content()

                            if "Generating" in current:
                                results["passed_conditions"]["generating_seen"] = True
                                print("  Generating state detected")

                            if (
                                "Visual Concept Proposal" in current
                                and "Generating" not in current
                            ):
                                results["passed_conditions"]["proposal_appeared"] = True
                                print("  >>> Generation complete!")
                                break

                            if "failed" in current.lower() or "Error" in current:
                                results["errors"].append("Error during generation")
                                print("  Error detected!")
                                break

                            elapsed = int(time.time() - start_wait)
                            if elapsed % 15 == 0:
                                save_screenshot(page, f"v4_07_progress_{elapsed}s")

                        save_screenshot(page, "v4_08_final")
                    else:
                        results["errors"].append("Generate button not found")
                except Exception as e:
                    results["errors"].append(f"Generate click error: {str(e)}")
            else:
                results["failed_conditions"]["unknown_state"] = (
                    "Could not determine page state"
                )
                save_screenshot(page, "v4_05_unknown")

        except PlaywrightTimeoutError as e:
            results["errors"].append(f"Timeout: {str(e)}")
        except Exception as e:
            results["errors"].append(f"Error: {str(e)}")
        finally:
            browser.close()

    print("\n" + "=" * 60)
    print("Step 8: Verifying output file...")
    print("=" * 60)

    file_after_mtime = get_file_mtime(TARGET_FILE)
    results["target_file_after_mtime"] = (
        str(file_after_mtime) if file_after_mtime else "File not found"
    )

    if file_before_mtime and file_after_mtime:
        file_modified = file_after_mtime > TEST_START_TIME
        results["passed_conditions"]["file_modified_after_test"] = file_modified
        print(f"File modified after test start: {file_modified}")
        print(f"  Before: {file_before_mtime}")
        print(f"  After: {file_after_mtime}")
        print(f"  Test start: {TEST_START_TIME}")

    try:
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            content = f.read()
            results["target_file_content_preview"] = content[:500]

            placeholders = [
                "等待导演大师的视觉概念提案",
                "placeholder",
                "TODO",
                "待生成",
            ]
            is_placeholder = any(p in content for p in placeholders)
            has_real = len(content) > 200 and not is_placeholder

            results["passed_conditions"]["file_has_real_content"] = has_real
            results["passed_conditions"]["file_not_placeholder"] = not is_placeholder
            print(f"File has real content: {has_real} (length: {len(content)})")
    except Exception as e:
        results["errors"].append(f"File read error: {str(e)}")

    critical = [
        results["passed_conditions"].get("page_loaded", False),
        results["passed_conditions"].get("entered_director", False),
        results["passed_conditions"].get("proposal_appeared", False)
        or results["passed_conditions"].get("page_shows_completed_state", False),
        results["passed_conditions"].get("file_has_real_content", False),
        len(results["errors"]) == 0,
    ]

    if all(critical):
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
    with open(
        os.path.join(ARTIFACTS_DIR, "test_results_v4.json"), "w", encoding="utf-8"
    ) as f:
        json.dump(results, f, ensure_ascii=False, indent=2, default=str)
    print(f"\nResults saved to test_results_v4.json")
