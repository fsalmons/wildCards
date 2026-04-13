import pandas as pd
import re

from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

SPORTS = {
    'Hockey', 'Baseball', 'Football', 'Basketball', 'Soccer',
    'Indoor Football', 'Indoor Soccer', 'Tennis', 'Indoor Lacrosse',
    'Arena Football', 'Spring Training'
}

STADIUM_FIXES = [
    "Ross-Ade Stadium", "Save-On-Foods", "Athletics-Recreation Center",
    "Bazemore-Hyder Stadium", "Sewell-Thomas Stadium", "Bryant-Denny Stadium",
    "Coca-Cola Coliseum", "Gallagher-Iba Arena", "Mihalik-Thompson Stadium",
    "Rice-Eccles Stadium", "Carter-Finley Stadium", "Bailey-Brayton Field",
    "aught-Hemingway Stadium", "Dickey-Stephens Park",
    "Gaylord Family-Oklahoma Memorial Stadium", "Dunn-Oliver Acadome",
    "Fant-Ewing Coliseum", "Washington-Grizzly Stadium", "Co-op Place",
    "Smith-Wills Stadium", "Rice-Totten Stadium", "Carver-Hawkeye Arena",
    "Dowdy-Ficklen Stadium", "Wilkerson-Greines Activity Center",
    "Baum-Walker Stadium", "Sloan-Alumni Stadium", "Welsh-Ryan Arena",
    "O’Kelly-Riddick Stadium", "Mid-America Center", "Williams-Brice Stadium",
    "Georges-Vézina Centre", "H-E-B Center at Cedar Park",
    "Bain-Schaeffer Buffalo Stadium", "Houchens-Smith Stadium",
    "UFCU Disch-Falk Field", "Mercedes-Benz Stadium",
    "Carpenter-Haygood Stadium", "Coca-Cola Park", "Spinks-Casem Stadium",
    "Jordan-Hare Stadium", "Vincent-Beck Stadium",
    "Darrell K. Royal-Texas Memorial Stadium",
    "Navy-Marine Corps Memorial Stadium",
    "T-Mobile Park"
]

# sort longest first (critical for correct matching)
STADIUM_FIXES = sorted(STADIUM_FIXES, key=len, reverse=True)

rows = []

with open("data_stadiums/stadiums.txt", "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()

        if not line or "Arenas and Stadiums" in line or "©" in line:
            continue

        line = line.replace("\x0c", "")

        # -----------------------------
        # MISSOURI WESTERN OVERRIDE
        # -----------------------------
        if "Missouri Western State University" in line:
            # still extract location + stadium normally later
            force_missouri_western = True
        else:
            force_missouri_western = False

        # -----------------------------
        # PROTECT STADIUM NAMES
        # -----------------------------
        temp_line = line
        replacements = {}

        for i, name in enumerate(STADIUM_FIXES):
            if name in temp_line:
                token = f"__STAD_{i}__"
                replacements[token] = name
                temp_line = temp_line.replace(name, token)

        # -----------------------------
        # SPLIT
        # -----------------------------
        parts = temp_line.rsplit("-", 4)

        if len(parts) < 2:
            continue

        location = parts[0].strip()
        middle = parts[1:-1]
        stadium_raw = parts[-1].strip()

        # restore stadium name
        for token, real in replacements.items():
            stadium_raw = stadium_raw.replace(token, real)

        # -----------------------------
        # STADIUM + CAPACITY
        # -----------------------------
        match = re.match(r"(.+)\(([\d,]+)\)", stadium_raw)
        if match:
            stadium = match.group(1).strip()
            capacity = match.group(2).replace(",", "")
        else:
            stadium = stadium_raw
            capacity = None

        # -----------------------------
        # FORCE OVERRIDE CASE
        # -----------------------------
        if force_missouri_western:
            team = "Missouri Western State University"
            sport = "N/A"
            league = "N/A"

        else:
            sport = "N/A"
            league = "N/A"
            team_parts = []

            # -----------------------------
            # RIGHTMOST RULE
            # -----------------------------
            if len(middle) >= 1:
                candidate = middle[-1].strip()

                if candidate == "G-League":
                    league = "G-League"
                elif candidate in SPORTS:
                    sport = candidate
                    league = "N/A"
                else:
                    league = candidate

                remaining = middle[:-1]
            else:
                remaining = []

            # -----------------------------
            # SPORT BACKFILL
            # -----------------------------
            for item in reversed(remaining):
                item = item.strip()

                if sport == "N/A" and item in SPORTS:
                    sport = item
                    continue

                team_parts.insert(0, item)

            team = " - ".join(team_parts).strip() if team_parts else (
                remaining[0].strip() if remaining else "N/A"
            )

        rows.append([location, team, sport, league, stadium, capacity])

# -----------------------------
# OUTPUT
# -----------------------------
df = pd.DataFrame(rows, columns=[
    "Location", "Team/School", "Sport", "League", "Stadium", "Capacity"
])

df["Capacity"] = pd.to_numeric(df["Capacity"], errors="coerce")




def split_location(loc):
    # matches "City (ST)"
    match = re.match(r"(.+)\s\((.+)\)", loc.strip())
    if match:
        city = match.group(1).strip()
        state = match.group(2).strip()
        return city, state
    return loc, None

df[["City", "State"]] = df["Location"].apply(lambda x: pd.Series(split_location(x)))
df = df.drop(columns=["Location"])

# -----------------------------
# GEOCODER SETUP
# -----------------------------
geolocator = Nominatim(user_agent="stadium_geocoder", timeout=10)

geocode = RateLimiter(
    geolocator.geocode,
    min_delay_seconds=1.2,
    max_retries=5,
    error_wait_seconds=5.0
)

cache = {}

lat_list = []
lon_list = []

print('Beginning Extraction...')

for i, row in df.iterrows():
    stadium = str(row["Stadium"])
    city = str(row.get("City", ""))
    state = str(row.get("State", ""))

    # CLEAN QUERY (no empty commas)
    parts = [stadium, city, state, "USA"]
    query = ", ".join([p for p in parts if p and p != "nan"])

    if query in cache:
        loc = cache[query]
    else:
        try:
            loc = geocode(query)
        except Exception:
            loc = None
        cache[query] = loc

    if loc:
        lat_list.append(loc.latitude)
        lon_list.append(loc.longitude)
    else:
        lat_list.append(None)
        lon_list.append(None)

    if (i+1) % 50 == 0:
        print(str(i+1) , 'Coords Extracted')


print("Done — All Coords Extracted")

df['lat'] = lat_list
df['lon'] = lon_list

df.to_csv("data_stadiums/stadiums_unclean.csv", index=False, encoding="utf-8")





