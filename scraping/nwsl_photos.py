from playwright.sync_api import sync_playwright
import pandas as pd

URL = "https://www.nwslsoccer.com/players/index"

def scrape_players():
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(URL, wait_until="networkidle")

        # Let JS fully render
        page.wait_for_timeout(5000)

        # Scroll to load all players (important: infinite scroll)
        last_height = 0
        while True:
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(2000)

            new_height = page.evaluate("document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

        # Extract player cards
        cards = page.query_selector_all("a, div")

        for c in cards:
            img = c.query_selector("img")
            if not img:
                continue

            src = img.get_attribute("src")
            alt = img.get_attribute("alt")

            # Filter only player-like entries
            if src and ("player" in src or "cdn" in src):
                name = alt.strip() if alt else None

                if name:
                    results.append({
                        "name": name,
                        "photo_url": src
                    })

        browser.close()

    return results


data = scrape_players()

df = pd.DataFrame(data).drop_duplicates()
df.to_csv("nwsl_players_with_photos.csv", index=False)

print(df.head())
print(f"Saved {len(df)} players")
