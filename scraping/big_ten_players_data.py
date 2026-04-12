import pandas as pd
import string
import time
from playwright.sync_api import sync_playwright
from io import StringIO

base_url = "https://basketball.realgm.com/ncaa/conferences/Big-Ten-Conference/2/players/2026"

rows_data = []

# =========================
# STAGE 1: SCRAPE MAIN TABLE ONLY
# =========================
with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    url = base_url

    print(f"Scraping table: {url}")

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3000)

        table_rows = page.query_selector_all("table tbody tr")

        for row in table_rows:
            cols = row.query_selector_all("td")

            if len(cols) < 1:
                continue

            # extract full row text (table data only)
            row_values = [col.inner_text().strip() for col in cols]

            # get player name + link (NOT saving link)
            link_el = cols[0].query_selector("a")
            profile_url = None

            if link_el:
                href = link_el.get_attribute("href")
                if href:
                    profile_url = "https://basketball.realgm.com" + href

            # store table row + hidden url for later scraping
            rows_data.append({
                "row_values": row_values,
                "profile_url": profile_url
            })

    except Exception as e:
        print(f"Error on {letter}: {e}")

    browser.close()

print(f"Collected {len(rows_data)} players from tables")

# =========================
# STAGE 2: BUILD DATAFRAME FROM TABLE ONLY
# =========================

# parse first row to infer structure
sample_cols = rows_data[0]["row_values"]
n_cols = len(sample_cols)

df = pd.DataFrame(
    [r["row_values"] for r in rows_data],
    columns=[f"col_{i}" for i in range(n_cols)]
)

# add profile_url temporarily for scraping images
df["profile_url"] = [r["profile_url"] for r in rows_data]


# =========================
# STAGE 3: VISIT PROFILES FOR IMAGES ONLY
# =========================

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    photo_urls = []

    for i, url in enumerate(df["profile_url"]):
        print(f"Fetching image {i+1}/{len(df)}")

        if not url:
            photo_urls.append(None)
            continue

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(20)

            # best selectors (RealGM varies a lot)
            img = (
                page.query_selector(".profile-box img") or
                page.query_selector("img[alt*='Player']") or
                page.query_selector("img")
            )

            if img:
                photo_urls.append('https://basketball.realgm.com'+img.get_attribute("src"))
            else:
                photo_urls.append(None)

        except Exception as e:
            print(f"Error: {e}")
            photo_urls.append(None)

        time.sleep(1)

    browser.close()


# =========================
# FINAL CLEANUP
# =========================

df["photo_url"] = photo_urls

# remove profile_url (NOT wanted in final output)
df = df.drop(columns=["profile_url"])

print(df.head())
print(df.shape)

df.to_csv("data/big_ten_players_unclean.csv", index=False)
