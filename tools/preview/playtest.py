"""헤드리스 크롬으로 1단계 흐름을 눌러 보고 화면을 저장한다.
상점 안(무작위 처음 모습) → 미스 황 대화·상품 창 → 문 → "나는 누구였지" → 이번 생의 모습 → 거리 → 상점 이름표 → 다시 상점
사용: python3 playtest.py URL 출력접두어 [시각|-] [가로x세로] [처음모습]
"""
import sys
from playwright.sync_api import sync_playwright

url, out = sys.argv[1], sys.argv[2]
hour = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "-" else None
w, h = (int(v) for v in (sys.argv[4] if len(sys.argv) > 4 else "1280x720").split("x"))
form = sys.argv[5] if len(sys.argv) > 5 else "raincoat"
mobile = w < 700
q = f"?debug&form={form}" + (f"&hour={hour}" if hour else "")


def center(pg, expr):
    return pg.evaluate(f"() => {{ const b = {expr}.getBounds(); return [b.x + b.width / 2, b.y + b.height / 2, b.y]; }}")


def tap(pg):
    pg.mouse.click(w // 2, 60)


def until(pg, sel, n=8, wait=1100):
    for _ in range(n):
        if pg.locator(sel).count():
            return True
        pg.wait_for_timeout(wait)
        tap(pg)
    return pg.locator(sel).count() > 0


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    ctx = b.new_context(viewport={"width": w, "height": h}, locale="ko-KR", has_touch=mobile, is_mobile=mobile, device_scale_factor=2 if mobile else 1)
    pg = ctx.new_page()
    logs = []
    pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
    pg.goto(url + q)
    pg.wait_for_timeout(2500)
    pg.screenshot(path=f"{out}-1-shop.png")
    x, y, top = center(pg, "__hm.shop().hwang")
    pg.mouse.click(x, top + 10)
    pg.wait_for_timeout(2800)
    pg.screenshot(path=f"{out}-2-greet.png")
    until(pg, ".menu-item")
    pg.wait_for_timeout(800)
    pg.locator(".menu-tabs button").nth(1).click()
    pg.wait_for_timeout(300)
    pg.screenshot(path=f"{out}-3-menu.png")
    print("tabs:", pg.locator(".menu-tabs button").count(), "weapons:", pg.locator(".menu-item").count())
    pg.locator(".menu-item").nth(2).click()
    until(pg, ".dlg-choices button", 10, 1200)
    pg.locator(".dlg-choices button").first.click()
    pg.wait_for_timeout(3800)
    pg.screenshot(path=f"{out}-4-who.png")
    until(pg, ".look-panel", 6, 1200)
    pg.wait_for_timeout(600)
    pg.screenshot(path=f"{out}-5-body.png")
    pg.locator(".look-actions button.primary").click()
    pg.wait_for_timeout(5000)
    pg.screenshot(path=f"{out}-6-street.png")
    pos = pg.evaluate("""() => { const w = __hm.world(); for (const [k, s] of w.bSprites) if (w.zone.buildings[k].cat === 'ujusae') { const b = s.getBounds(); return [b.x + b.width / 2, b.y + b.height * 0.45]; } return null; }""")
    if pos:
        pg.mouse.click(pos[0], pos[1])
        pg.wait_for_timeout(250)
        pg.screenshot(path=f"{out}-7-label.png")
        pg.wait_for_timeout(3500)
    print("back in shop:", pg.evaluate("() => __hm.shop().root.visible"))
    pg.screenshot(path=f"{out}-8-back.png")
    print("\n".join(logs[-12:]))
    b.close()
