"""헤드리스 크롬으로 1단계 흐름을 눌러 보고 화면을 저장한다.
상점 안(첫 장면) → 미스 황 대화·상품 창 → 문 → 앵무새 → 몸 고르기 → 거리 → 상점 이름표 → 다시 상점
사용: python3 playtest.py URL 출력접두어 [시각] [가로x세로]
"""
import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1]
out = sys.argv[2]
hour = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "-" else None
w, h = (int(v) for v in (sys.argv[4] if len(sys.argv) > 4 else "1280x720").split("x"))
mobile = w < 700

q = "?debug" + (f"&hour={hour}" if hour else "")


def center(pg, expr):
    b = pg.evaluate(f"() => {{ const b = {expr}.getBounds(); return [b.x + b.width / 2, b.y + b.height / 2, b.y]; }}")
    return b


def advance(pg, n=1, wait=1400):
    for _ in range(n):
        pg.wait_for_timeout(wait)
        pg.mouse.click(w // 2, 80)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    ctx = b.new_context(viewport={"width": w, "height": h}, locale="ko-KR", has_touch=mobile, is_mobile=mobile, device_scale_factor=2 if mobile else 1)
    pg = ctx.new_page()
    logs = []
    pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
    pg.goto(url + q)
    pg.wait_for_timeout(2500)
    pg.screenshot(path=f"{out}-1-shop.png")
    # 미스 황을 누른다
    x, y, top = center(pg, "__hm.shop().hwang")
    pg.mouse.click(x, top + 40)
    pg.wait_for_timeout(3200)
    pg.screenshot(path=f"{out}-2-greet.png")
    for _ in range(5):
        if pg.locator(".menu-item").count():
            break
        advance(pg, 1, 1200)
    pg.wait_for_timeout(1500)
    pg.screenshot(path=f"{out}-3-menu.png")
    pg.locator(".menu-item").nth(4).click()  # 밧줄
    for _ in range(8):
        if pg.locator(".dlg-choices button").count():
            break
        advance(pg, 1, 1300)
    pg.wait_for_timeout(500)
    pg.screenshot(path=f"{out}-4-choices.png")
    pg.locator(".dlg-choices button").first.click()  # 나가기
    pg.wait_for_timeout(4500)
    pg.screenshot(path=f"{out}-5-parrot.png")
    for _ in range(6):
        if pg.locator(".look-panel").count():
            break
        advance(pg, 1, 1300)
    pg.wait_for_timeout(800)
    for _ in range(2):
        pg.locator(".look-panel .opt").nth(3).locator("button").nth(1).click()
    pg.wait_for_timeout(600)
    pg.screenshot(path=f"{out}-6-body.png")
    pg.locator(".look-actions button.primary").click()
    pg.wait_for_timeout(1800)
    pg.screenshot(path=f"{out}-6b-farewell.png")
    for _ in range(4):
        if pg.evaluate("() => !!__hm.world()"):
            break
        advance(pg, 1, 1200)
    pg.wait_for_timeout(4000)
    pg.screenshot(path=f"{out}-7-street.png")
    # 우주새 건물을 누른다 → 이름표 → 걸어 들어감
    pos = pg.evaluate("""() => { const w = __hm.world(); for (const [k, s] of w.bSprites) if (w.zone.buildings[k].cat === 'ujusae') { const b = s.getBounds(); return [b.x + b.width / 2, b.y + b.height * 0.45]; } return null; }""")
    print("shop building on screen:", pos)
    if pos:
        pg.mouse.click(pos[0], pos[1])
        pg.wait_for_timeout(600)
        pg.screenshot(path=f"{out}-8-label.png")
        pg.wait_for_timeout(5000)
    pg.screenshot(path=f"{out}-9-back.png")
    print("scene after re-entry visible shop:", pg.evaluate("() => __hm.shop().root.visible"))
    x, y, top = center(pg, "__hm.shop().hwang")
    pg.mouse.click(x, top + 40)
    pg.wait_for_timeout(3500)
    for _ in range(5):
        if pg.locator(".menu-item").count():
            break
        advance(pg, 1, 1200)
    pg.wait_for_timeout(1500)
    tabs = pg.locator(".menu-tabs button")
    if tabs.count() > 1:
        tabs.nth(1).click()
        pg.wait_for_timeout(400)
    pg.screenshot(path=f"{out}-10-weapons.png")
    print("tabs:", tabs.count(), "items:", pg.locator(".menu-item").count())
    print("\n".join(logs[-20:]))
    b.close()
