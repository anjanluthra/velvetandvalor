#!/usr/bin/env python3
"""Export Instagram carousel slides as 1080×1350 PNGs."""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

CAROUSEL_DIR = Path(__file__).parent

CAROUSELS = [
    {
        "html": CAROUSEL_DIR / "horse-bond.html",
        "out_dir": CAROUSEL_DIR / "exports" / "horse-bond",
        "slides": 7,
    },
    {
        "html": CAROUSEL_DIR / "build-the-bond.html",
        "out_dir": CAROUSEL_DIR / "exports" / "build-the-bond",
        "slides": 7,
    },
]

VIEW_W = 420
VIEW_H = 525  # 4:5 aspect of 420
SCALE = 1080 / 420  # 2.5714... -> output 1080×1350


async def export_carousel(playwright, html_path: Path, out_dir: Path, total_slides: int):
    out_dir.mkdir(parents=True, exist_ok=True)
    browser = await playwright.chromium.launch()
    page = await browser.new_page(
        viewport={"width": VIEW_W, "height": VIEW_H},
        device_scale_factor=SCALE,
    )

    html_content = html_path.read_text(encoding="utf-8")
    # Use file:// base URL so relative resources resolve from the carousel directory
    await page.set_content(html_content, wait_until="networkidle")
    await page.wait_for_timeout(3500)  # fonts + images

    # Hide IG frame chrome and lock viewport sizing
    await page.evaluate(
        """() => {
            document.querySelectorAll('.ig-header,.ig-dots,.ig-actions,.ig-caption')
                .forEach(el => el.style.display = 'none');
            const frame = document.querySelector('.ig-frame');
            frame.style.cssText = 'width:420px;height:525px;max-width:none;border-radius:0;box-shadow:none;overflow:hidden;margin:0;padding:0;';
            const viewport = document.querySelector('.carousel-viewport');
            viewport.style.cssText = 'width:420px;height:525px;aspect-ratio:unset;overflow:hidden;cursor:default;';
            document.body.style.cssText = 'padding:0;margin:0;display:block;overflow:hidden;background:#fff;';
            document.documentElement.style.cssText = 'padding:0;margin:0;';
        }"""
    )
    await page.wait_for_timeout(500)

    for i in range(total_slides):
        await page.evaluate(
            """(idx) => {
                const track = document.querySelector('.carousel-track');
                track.style.transition = 'none';
                track.style.transform = 'translateX(' + (-idx * 420) + 'px)';
            }""",
            i,
        )
        await page.wait_for_timeout(450)
        out_path = out_dir / f"slide_{i+1}.png"
        await page.screenshot(
            path=str(out_path),
            clip={"x": 0, "y": 0, "width": VIEW_W, "height": VIEW_H},
        )
        print(f"  ✓ {out_path.name}")

    await browser.close()


async def main():
    async with async_playwright() as p:
        for c in CAROUSELS:
            print(f"\nExporting {c['html'].name} → {c['out_dir']}")
            await export_carousel(p, c["html"], c["out_dir"], c["slides"])
    print("\n✅ All slides exported.")


if __name__ == "__main__":
    asyncio.run(main())
