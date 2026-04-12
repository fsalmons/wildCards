import pandas as pd
import string
import time
import re
from playwright.sync_api import sync_playwright

base_url = "https://en.wikipedia.org/wiki/List_of_NCAA_Division_I_institutions"

rows_data = []


def extract_infobox_data(page):
    box = page.query_selector(".infobox")
    if not box:
        return {}

    data = {}
    rows = box.query_selector_all("tr")

    for r in rows:
        th = r.query_selector("th")
        td = r.query_selector("td")

        if not th or not td:
            continue

        key = th.inner_text().strip()
        val = td.inner_text().strip()
        data[key] = val

    return data


def extract_infobox_colors(page):
    box = page.query_selector(".infobox")
    if not box:
        return None

    colors = set()

    # Extract hex codes from inline styles
    styled_elements = box.query_selector_all("[style*='background'], [style*='color']")
    for el in styled_elements:
        style = el.get_attribute("style")
        if style:
            matches = re.findall(r"#(?:[0-9a-fA-F]{3}){1,2}", style)
            for m in matches:
                colors.add(m)

    # Extract hex codes directly from text (if present)
    rows = box.query_selector_all("tr")
    for r in rows:
        th = r.query_selector("th")
        td = r.query_selector("td")

        if th and td and "color" in th.inner_text().lower():
            text = td.inner_text()
            matches = re.findall(r"#(?:[0-9a-fA-F]{3}){1,2}", text)
            for m in matches:
                colors.add(m)

    return list(colors) if colors else None


# =========================
# STAGE 1: SCRAPE TABLE
# =========================
with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto(base_url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(2000)

    table_rows = page.query_selector_all("table.wikitable tbody tr")
    for row in table_rows[1:366]:
        cols = row.query_selector_all("td")

        if len(cols) < 2:
            continue

        row_values = [col.inner_text().strip() for col in cols]

        link_el = cols[2].query_selector("a")
        profile_url = None

        if link_el:
            href = link_el.get_attribute("href")
            if href and href.startswith("/wiki/"):
                profile_url = "https://en.wikipedia.org" + href

        rows_data.append({
            "row_values": row_values,
            "profile_url": profile_url
        })

    browser.close()
#print([r["row_values"] for r in rows_data[-5:]])
print(f"Collected {len(rows_data)} schools")


# =========================
# STAGE 2: DATAFRAME BUILD
# =========================
df = pd.DataFrame(
    [r["row_values"] for r in rows_data[1:]],
    columns=['index', 'school', 'name', 'team', 'city' 'state', 'type', 'subdivision', 'conference']
)

df["profile_url"] = [r["profile_url"] for r in rows_data[1:]]


# =========================
# STAGE 3: PROFILE SCRAPING
# =========================
with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    logos = []
    football_stadium = []
    baseball_stadium = []
    basketball_arena = []
    softball_stadium = []
    soccer_stadium = []
    volleyball_arena = []
    ice_hockey_arena = []
    other_stadiums = []
    colors_hex = []

    for i, url in enumerate(df["profile_url"]):
        print(f"Scraping school {i+1}/{len(df)}")

        if not url:
            logos.append(None)
            football_stadium.append(None)
            baseball_stadium.append(None)
            basketball_arena.append(None)
            softball_stadium.append(None)
            soccer_stadium.append(None)
            volleyball_arena.append(None)
            ice_hockey_arena.append(None)
            other_stadiums.append(None)
            colors_hex.append(None)
            continue

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)

            data = extract_infobox_data(page)

            # LOGO
            img = page.query_selector(".infobox img")
            if img:
                src = img.get_attribute("src")
                logos.append("https:" + src if src.startswith("//") else src)
            else:
                logos.append(None)

            # STADIUMS / ARENAS
            football_stadium.append(data.get("Football stadium"))
            baseball_stadium.append(data.get("Baseball stadium"))
            basketball_arena.append(data.get("Basketball arena"))
            softball_stadium.append(data.get("Softball stadium"))
            soccer_stadium.append(data.get("Soccer stadium"))
            volleyball_arena.append(data.get('Volleyball arena'))
            ice_hockey_arena.append(data.get('Ice\xa0hockey arena'))

            known_keys = {
                "Football stadium",
                "Baseball stadium",
                "Basketball arena",
                "Softball stadium",
                "Soccer stadium",
                'Volleyball arena',
                'Ice\xa0hockey arena'
            }

            other_stadiums.append(
                {
                    k: v for k, v in data.items()
                    if ("stadium" in k.lower() or "arena" in k.lower())
                    and k not in known_keys
                } or None
            )

            # COLORS (EXACT HEX FROM WIKIPEDIA INFBOX)
            colors_hex.append(extract_infobox_colors(page))

        except Exception as e:
            print(f"Error: {e}")
            logos.append(None)
            football_stadium.append(None)
            baseball_stadium.append(None)
            basketball_arena.append(None)
            softball_stadium.append(None)
            soccer_stadium.append(None)
            volleyball_arena.append(None)
            ice_hockey_arena.append(None)
            other_stadiums.append(None)
            colors_hex.append(None)

        time.sleep(0.8)

    browser.close()


# =========================
# FINAL OUTPUT
# =========================
df["logo"] = logos
df["football_stadium"] = football_stadium
df["baseball_stadium"] = baseball_stadium
df["basketball_stadium"] = basketball_arena
df["softball_stadium"] = softball_stadium
df["soccer_stadium"] = soccer_stadium
df['volleyball_stadium'] = volleyball_arena
df['ice_hockey_stadium'] = ice_hockey_arena
df["other_stadiums"] = other_stadiums
df["color_hex"] = colors_hex

df.to_csv("../tables/ncaa_schools.csv", index=False)

print(df.head())
print(df.shape)
