#!/usr/bin/env python3
"""Focused contract test for Android version sync fix files.

This does NOT run the Windows PowerShell script. It verifies the cloud-served
files that the user will download: app.json and sync-ui-fix.ps1.
"""

import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


BASE_URL = "https://gift-hub-sync.preview.emergentagent.com/api/fix-files"
OUT_PATH = Path("/app/test_reports/version_fix_contract_results.json")


def fetch_bytes(name: str):
    url = f"{BASE_URL}/{name}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "bug-verification-version-fix/1.0"})
        with urllib.request.urlopen(req, timeout=30) as response:
            return {
                "name": name,
                "url": url,
                "status": response.status,
                "headers": dict(response.headers.items()),
                "body_bytes": response.read(),
                "error": None,
            }
    except urllib.error.HTTPError as exc:
        body = exc.read() if exc.fp else b""
        return {"name": name, "url": url, "status": exc.code, "headers": {}, "body_bytes": body, "error": str(exc)}
    except Exception as exc:  # noqa: BLE001 - report exact fetch blocker
        return {"name": name, "url": url, "status": None, "headers": {}, "body_bytes": b"", "error": repr(exc)}


def main() -> int:
    app_resp = fetch_bytes("app.json")
    ps1_resp = fetch_bytes("sync-ui-fix.ps1")

    app_text = app_resp["body_bytes"].decode("utf-8-sig", errors="replace")
    ps1_bytes = ps1_resp["body_bytes"]
    stripped_ps1_bytes = ps1_bytes[3:] if ps1_bytes.startswith(b"\xef\xbb\xbf") else ps1_bytes
    ps1_text = stripped_ps1_bytes.decode("utf-8", errors="replace")
    ps1_has_bom = ps1_bytes.startswith(b"\xef\xbb\xbf")

    checks = []

    def add_check(name: str, passed: bool, detail: str):
        checks.append({"name": name, "passed": bool(passed), "detail": detail})

    add_check("app.json HTTP 200", app_resp["status"] == 200, f"status={app_resp['status']} error={app_resp['error']}")

    app_version = None
    app_version_code = None
    try:
        app_json = json.loads(app_text)
        app_version = app_json.get("expo", {}).get("version")
        app_version_code = app_json.get("expo", {}).get("android", {}).get("versionCode")
    except Exception as exc:  # noqa: BLE001
        app_json = None
        add_check("app.json parses as JSON", False, repr(exc))
    else:
        add_check("app.json parses as JSON", True, "parsed")

    add_check("expo.version is 1.0.7", app_version == "1.0.7", f"expo.version={app_version!r}")
    add_check("expo.android.versionCode is 8", app_version_code == 8, f"expo.android.versionCode={app_version_code!r}")

    add_check("sync-ui-fix.ps1 HTTP 200", ps1_resp["status"] == 200, f"status={ps1_resp['status']} error={ps1_resp['error']}")
    add_check(
        "sync-ui-fix.ps1 has build.gradle sync banner",
        "Syncing versionCode + versionName from app.json into build.gradle" in ps1_text,
        "required banner string present" if "Syncing versionCode + versionName from app.json into build.gradle" in ps1_text else "missing required banner string",
    )
    version_code_regex_substring = "versionCode\\s+)\\d+"
    version_name_regex_substring = 'versionName\\s+")[^"]+("'
    add_check(
        "sync-ui-fix.ps1 has versionCode regex patch",
        version_code_regex_substring in ps1_text,
        "found regex substring for versionCode" if version_code_regex_substring in ps1_text else "missing versionCode regex substring",
    )
    add_check(
        "sync-ui-fix.ps1 has versionName regex patch",
        version_name_regex_substring in ps1_text,
        "found regex substring for versionName" if version_name_regex_substring in ps1_text else "missing versionName regex substring",
    )

    non_ascii = [b for b in stripped_ps1_bytes if b > 0x7F]
    add_check(
        "sync-ui-fix.ps1 ASCII after optional UTF-8 BOM stripped",
        len(non_ascii) == 0,
        f"non_ascii_byte_count={len(non_ascii)} bom_present={ps1_has_bom}",
    )

    result = {
        "base_url": BASE_URL,
        "all_passed": all(c["passed"] for c in checks),
        "checks": checks,
        "observed": {
            "app_status": app_resp["status"],
            "app_expo_version": app_version,
            "app_android_versionCode": app_version_code,
            "ps1_status": ps1_resp["status"],
            "ps1_bom_present": ps1_has_bom,
            "ps1_non_ascii_after_bom_count": len(non_ascii),
            "ps1_length_bytes": len(ps1_bytes),
        },
    }
    OUT_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0 if result["all_passed"] else 1


if __name__ == "__main__":
    sys.exit(main())