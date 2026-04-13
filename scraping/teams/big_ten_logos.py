import pandas as pd
from playwright.sync_api import sync_playwright

base_url = "https://sportslogohistory.com/big-10-primary-logo/"

logo_urls = []

# =========================
# SCRAPE SINGLE PAGE ONLY
# =========================
with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    print(f"Scraping: {base_url}")

    page.goto(base_url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(4000)  # allow logos to load

    # =========================
    # GET ALL IMAGES ON PAGE
    # =========================
    imgs = page.query_selector_all("img")

    for img in imgs:
        src = img.get_attribute("src") or img.get_attribute("data-src")

        if not src:
            continue

        src_lower = src.lower()

        # =========================
        # FILTER OUT NON-LOGOS
        # =========================
        if any(x in src_lower for x in [
            "ads",
            "banner",
            "icon",
            "spinner",
            "pixel",
            "social",
            "button",
            "wp-content/uploads/2020"  # often junk or unrelated assets
        ]):
            continue

        # =========================
        # KEEP ONLY LIKELY LOGOS
        # =========================
        if any(x in src_lower for x in [
            "logo",
            "big",
            "big10",
            "primary"
        ]):
            logo_urls.append(src)

    browser.close()

# =========================
# OUTPUT (ONLY URLS)
# =========================
df = pd.DataFrame({"logo_url": logo_urls})

print(df)

df.to_csv("big_ten_logos.csv", index=False)

