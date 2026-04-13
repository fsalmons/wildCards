import pandas as pd
from playwright.sync_api import sync_playwright

base_url = "https://www.nwslsoccer.com/teams/index"

rows_data = []

# =========================
# STAGE 1: SCRAPE MAIN PAGE ONLY
# =========================
with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    print(f"Scraping table: {base_url}")

    page.goto(base_url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(4000)  # allow JS to render logos

    # =========================
    # EXTRACT TEAM BLOCKS
    # =========================
    team_cards = page.query_selector_all("a[href*='/teams/']")

    seen = set()

    for card in team_cards:
        try:
            href = card.get_attribute("href")
            if not href:
                continue

            team_url = "https://www.nwslsoccer.com" + href

            # ---- get image ----
            img = card.query_selector("img")
            if not img:
                continue

            logo_url = (
                img.get_attribute("src")
                or img.get_attribute("data-src")
            )

            if logo_url[:2] == '/_':
                logo_url = 'https://www.nwslsoccer.com' + logo_url

            # ---- get team name ----
            team_name = img.get_attribute("alt")
            if not team_name:
                team_name = card.inner_text().strip()

            if not team_name or team_name in seen:
                continue

            seen.add(team_name)

            rows_data.append({
                "team": team_name,
                "logo_url": logo_url
            })

        except Exception as e:
            print(f"Skipping card due to error: {e}")
            continue

    browser.close()

# =========================
# STAGE 2: DATAFRAME OUTPUT
# =========================
df = pd.DataFrame(rows_data)

print(df)

df.to_csv("data_teams/nwsl_logos.csv", index=False)
