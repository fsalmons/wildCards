import pandas as pd

import string
import time
import re

from playwright.sync_api import sync_playwright

base_url = "https://basketball.realgm.com/ncaa/players/2026/{}"

rows_data = []

# =========================
# STAGE 1: SCRAPE MAIN TABLE ONLY
# =========================
with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    for letter in string.ascii_uppercase:
        url = base_url.format(letter)
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
# STAGE 3: PROFILE ENRICHMENT (IMAGE + JERSEY + HOMETOWN + NATIONALITY + NBA STATUS)
# =========================

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    photo_urls = []
    jersey_numbers = []
    hometowns = []
    nationalities = []
    nba_statuses = []

    for i, url in enumerate(df["profile_url"]):
        print(f"Fetching player {i+1}/{len(df)}")

        if not url:
            photo_urls.append(None)
            jersey_numbers.append(None)
            hometowns.append(None)
            nationalities.append(None)
            nba_statuses.append(None)
            continue

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(800)

            # -------------------------
            # IMAGE
            # -------------------------
            img = (
                page.query_selector(".profile-box img") or
                page.query_selector("img[alt*='Player']") or
                page.query_selector("img")
            )

            if img:
                photo_urls.append(
                    "https://basketball.realgm.com" + img.get_attribute("src")
                )
            else:
                photo_urls.append(None)

            # -------------------------
            # PROFILE TEXT BLOCK
            # -------------------------
            profile_box = page.query_selector(".profile-box")
            text = profile_box.inner_text() if profile_box else ""

            # -------------------------
            # JERSEY NUMBER
            # -------------------------
            match_num = re.search(r"#(\d+)", text)
            jersey_numbers.append(int(match_num.group(1)) if match_num else None)

            # -------------------------
            # HOMETOWN
            # -------------------------
            match_home = re.search(r"Hometown:\s*(.+)", text)
            hometowns.append(match_home.group(1).strip() if match_home else None)

            # -------------------------
            # NATIONALITY
            # -------------------------
            match_nat = re.search(r"Nationality:\s*(.+)", text)
            nationalities.append(match_nat.group(1).strip() if match_nat else None)

            # -------------------------
            # NBA STATUS
            # -------------------------
            match_status = re.search(r"NBA Status:\s*(.+)", text)
            nba_statuses.append(match_status.group(1).strip() if match_status else None)

        except Exception as e:
            print(f"Error on {url}: {e}")
            photo_urls.append(None)
            jersey_numbers.append(None)
            hometowns.append(None)
            nationalities.append(None)
            nba_statuses.append(None)

        time.sleep(0.8)

    browser.close()

# =========================
# FINAL CLEANUP
# =========================

df["photo_url"] = photo_urls
df["jersey_number"] = jersey_numbers
df["hometown"] = hometowns
df["nationality"] = nationalities
df["nba_status"] = nba_statuses

df = df.drop(columns=["profile_url"])

print(df.head())
print(df.shape)

df.to_csv("../tables/ncaa_players.csv", index=False)

