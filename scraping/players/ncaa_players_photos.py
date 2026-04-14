import time
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.options import Options

import requests

def is_valid_image(url, timeout=3):
    try:
        response = requests.head(url, timeout=timeout)
        
        # Some servers don't support HEAD, fallback to GET
        if response.status_code != 200:
            response = requests.get(url, stream=True, timeout=timeout)

        return response.status_code == 200
    except:
        return False

# -------------------------
# SETUP DRIVER
# -------------------------
options = Options()
#options.add_argument("--headless")
options.add_argument("--disable-blink-features=AutomationControlled")

driver = webdriver.Chrome(options=options)

BASE_URL = "https://www.espn.com/mens-college-basketball/stats/player"
driver.get(BASE_URL)
time.sleep(3)

# -------------------------
# LOAD ALL PLAYERS ("SHOW MORE")
# -------------------------
i = 0
while True:
    try:
        i = i +1
        print('Clicking To Show More ... (Attempt ' + str(i) + ')')
        show_more = driver.find_element(By.XPATH, "//a[contains(text(),'Show More')]")
        
        # Scroll into view (important)
        driver.execute_script("arguments[0].scrollIntoView();", show_more)
        time.sleep(1)

        # Click via JS (more reliable than .click())
        driver.execute_script("arguments[0].click();", show_more)
        time.sleep(2)

    except:
        break

print("Finished loading all players")

# -------------------------
# GET PLAYER LINKS
# -------------------------
player_links = []

rows = driver.find_elements(By.XPATH, "//table//tbody//tr")

for row in rows:
    try:
        link = row.find_element(By.XPATH, ".//a").get_attribute("href")
        player_links.append(link)
    except:
        continue

print(f"Collected {len(player_links)} player links")

# -------------------------
# VISIT EACH PLAYER PAGE
# -------------------------
data = []

for i, link in enumerate(player_links):
    try:
        before, sep, name = link.rpartition('/')
        before, sep, id = before.rpartition('/') 

        name = name.replace("-", " ")
        img_url = 'https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/'+id +'.png&w=350&h=254'

        if is_valid_image(img_url):
            photo_url = img_url
        else:
            photo_url = None
            print(name, 'has invalid image, saving as NONE')

        data.append({
            "name": name,
            "photo_url": img_url
        })

    except Exception as e:
        print(f"Error on {link}: {e}")
        continue

# -------------------------
# CREATE DATAFRAME
# -------------------------
df = pd.DataFrame(data)

print(df.head())

# Optional: save
df.to_csv("data_players/ncaa_players_headshots.csv", index=False)

driver.quit()
