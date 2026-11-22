"""헤드리스 크롬으로 1단계-A 흐름을 눌러 보고 화면을 저장한다."""
import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1]
out = sys.argv[2]
hour = sys.argv[3] if len(sys.argv) > 3 else None
w, h = (int(v) for v in (sys.argv[4] if len(sys.argv) > 4 else "1280x720").split("x"))

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": w, "height": h}, locale="ko-KR")
    logs = []
    pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
    pg.goto(url + (f"?hour={hour}" if hour else ""))
    pg.wait_for_timeout(2500)
    pg.screenshot(path=f"{out}-1-shop.png")
    pg.locator(".item").first.click()
    pg.wait_for_timeout(4500)
    pg.screenshot(path=f"{out}-2-picked.png")
    pg.locator("button.primary").click()
    pg.wait_for_timeout(800)
    for _ in range(3):
        pg.locator(".opt").nth(3).locator("button").nth(1).click()
    pg.wait_for_timeout(400)
    pg.screenshot(path=f"{out}-3-create.png")
    pg.locator(".create-actions button.primary").click()
    pg.wait_for_timeout(2500)
    pg.screenshot(path=f"{out}-4-world.png")
    pg.mouse.click(w // 2 + 160, h // 2 + 140)
    pg.wait_for_timeout(3000)
    pg.screenshot(path=f"{out}-5-walk.png")
    # 우주새 간판을 눌러 상점으로 돌아가기
    box = pg.evaluate("() => null")
    pg.mouse.click(w // 2 - 160 + 20, h // 2 - 90)
    pg.wait_for_timeout(4000)
    pg.screenshot(path=f"{out}-6-back.png")
    print("back in shop:", pg.locator(".scene.shop").count() > 0)
    print("\n".join(logs[-20:]))
    b.close()
