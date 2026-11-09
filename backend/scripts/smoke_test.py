"""End-to-end API smoke test: register -> org -> knowledge -> review -> decision -> impact."""
import sys
import time

import httpx

BASE = "http://127.0.0.1:8000/api/v1"
c = httpx.Client(base_url=BASE, timeout=30)
FAILURES = []


def check(name, cond, extra=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {name} {extra}")
    if not cond:
        FAILURES.append(name)


def auth_headers(token, org_id=None):
    h = {"Authorization": f"Bearer {token}"}
    if org_id:
        h["X-Org-Id"] = org_id
    return h


# 1. health
r = httpx.get("http://127.0.0.1:8000/health", timeout=10)
check("health", r.status_code == 200, r.text[:120])

# 2. register + login
email = f"smoke{int(time.time())}@example.com"
r = c.post("/auth/register", json={"email": email, "password": "SmokeTest123!", "full_name": "Smoke Tester"})
check("register", r.status_code == 201, r.text[:150])
r = c.post("/auth/login", json={"email": email, "password": "SmokeTest123!"})
check("login", r.status_code == 200)
token = r.json()["access_token"]

# 3. org
r = c.post("/auth/orgs", json={"name": "Smoke Org"}, headers=auth_headers(token))
check("create org", r.status_code == 201, r.text[:150])
org_id = r.json()["id"]
H = auth_headers(token, org_id)

# 4. brand profile
r = c.put("/knowledge/brand-profile", headers=H,
          json={"name": "Acme", "description": "Test brand", "voice_tone": {"tone": "friendly"}, "colors": ["#FF0000"]})
check("brand profile", r.status_code == 200)

# 5. knowledge items: fact + prohibited term
r = c.post("/knowledge/items", headers=H, json={
    "type": "FACT", "title": "Battery life", "body": "The Acme X1 battery lasts 12 hours.",
    "structured": {"value": 12, "unit": "hours"}})
check("create fact (pending)", r.status_code == 200 and r.json()["status"] == "PENDING")
fact_id = r.json()["id"]
r = c.post("/knowledge/items", headers=H, json={
    "type": "PROHIBITED_TERM", "title": "No 'cheap'", "body": "Never use the word cheap.",
    "structured": {"term": "cheap", "replacement": "affordable"}})
check("create prohibited term", r.status_code == 200)
term_id = r.json()["id"]

# 6. approve both
r = c.post(f"/knowledge/items/{fact_id}/approve", headers=H)
check("approve fact", r.status_code == 200 and r.json()["status"] == "APPROVED")
r = c.post(f"/knowledge/items/{term_id}/approve", headers=H)
check("approve term", r.status_code == 200)

# 7. submit review with violating content
r = c.post("/reviews", headers=H, json={
    "title": "Smoke ad", "input_type": "TEXT",
    "raw_text": "The Acme X1 is cheap and its battery lasts 48 hours! The best product ever made.",
    "channel": "social", "content_type": "ad", "audience": "consumers"})
check("submit review", r.status_code == 200, r.text[:150])
review_id = r.json()["id"]

# 8. poll until done
final = None
for _ in range(150):
    r = c.get(f"/reviews/{review_id}", headers=H)
    d = r.json()
    st = d["review"]["status"]
    if st in ("AWAITING_REVIEW", "FAILED", "COMPLETED"):
        final = d
        break
    time.sleep(2)
check("review finished", final is not None, f"status={final['review']['status'] if final else 'timeout'}")
if final:
    check("review not failed", final["review"]["status"] != "FAILED", final["review"].get("error") or "")
    agents = final["agents"]
    check("7 agent runs recorded", len(agents) == 7, f"got {len(agents)}")
    check("all agents succeeded or N/A", all(a["status"] in ("SUCCESS", "NOT_APPLICABLE", "SKIPPED") for a in agents),
          str([(a['agent_id'], a['status']) for a in agents]))
    findings = final["findings"]
    check("findings produced", len(findings) > 0, f"got {len(findings)}")
    prohibited = [f for f in findings if "cheap" in f["original_text"].lower()]
    check("prohibited term detected", len(prohibited) > 0)
    battery = [f for f in findings if "48" in f["original_text"]]
    check("contradicted battery claim detected", len(battery) > 0,
          str([(f['status'], f['severity']) for f in battery]))
    ev = [e for f in findings for e in f["evidence"]]
    check("evidence linked", len(ev) > 0, f"{len(ev)} refs")
    check("corrections produced", len(final["corrections"]) > 0, f"{len(final['corrections'])}")
    check("risk classified", final["review"]["risk"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL"),
          str(final["review"]["risk"]))

    # 9. decision blocked on critical? then override path
    r = c.post(f"/reviews/{review_id}/decision", headers=H, json={"decision": "APPROVE"})
    if r.status_code == 409:
        check("critical override guard", True, "blocked as expected")
        r = c.post(f"/reviews/{review_id}/decision", headers=H,
                   json={"decision": "APPROVE", "override_critical": True, "reason": "smoke override"})
    check("decision recorded", r.status_code == 200, r.text[:150])

    # 10. knowledge version change -> impact event
    r = c.post(f"/knowledge/items/{fact_id}/versions", headers=H,
               json={"body": "The Acme X1 battery lasts 10 hours.", "change_note": "Corrected battery spec"})
    check("version created", r.status_code == 200, r.text[:200])
    impact_id = r.json().get("impact_event_id")
    check("impact event created", impact_id is not None, f"affected={r.json().get('affected_count')}")
    if impact_id:
        r = c.get(f"/knowledge-graph/impact/{impact_id}", headers=H)
        check("impact detail", r.status_code == 200, f"affected={len(r.json().get('affected', []))}")

# 11. graph snapshot
r = c.get("/knowledge-graph", headers=H)
check("graph snapshot", r.status_code == 200 and len(r.json()["nodes"]) > 0,
      f"nodes={len(r.json().get('nodes', []))} edges={len(r.json().get('edges', []))}")

# 12. dashboard
r = c.get("/dashboard/summary", headers=H)
check("dashboard", r.status_code == 200, r.text[:150])

# 13. audit chain
r = c.get("/audit/verify", headers=H)
check("audit chain valid", r.status_code == 200 and r.json()["valid"], r.text[:120])

# 14. org isolation: second user cannot access
r = c.post("/auth/register", json={"email": f"other{int(time.time())}@example.com", "password": "Other12345!", "full_name": "Other"})
t2 = r.json()["access_token"] if r.status_code == 201 else None
r = c.get("/reviews", headers=auth_headers(t2, org_id))
check("org isolation enforced", r.status_code == 403, f"got {r.status_code}")

print()
if FAILURES:
    print(f"{len(FAILURES)} FAILURES: {FAILURES}")
    sys.exit(1)
print("ALL SMOKE TESTS PASSED")