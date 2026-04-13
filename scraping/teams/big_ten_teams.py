import pandas as pd

# -----------------------------
# 1. Load txt file
# -----------------------------
df = pd.read_csv(
    "data/big_ten.txt",
    sep="\t",
    header=None,
    names=["team", "nickname", "school", "conference", "location", "stadium"]
)

# -----------------------------
# 2. Fix stadium renames
# -----------------------------
df["stadium"] = df["stadium"].replace({
    "Alaska Airlines Arena at Hec Edmundson Pavilion": "Alaska Airlines Arena",
    "Value City Arena": "Schottenstein Center",
    "Simon Skjodt Assembly Hall": "Assembly Hall"
})

# -----------------------------
# 3. Create full_name (team + nickname)
# -----------------------------
df["full_name"] = df["team"] + " " + df["nickname"]

# -----------------------------
# 4. Drop unwanted columns
# -----------------------------
df = df.drop(columns=["nickname", "school", "conference", "location"])

# -----------------------------
# 5. Final column order
# -----------------------------
df = df[["team", "full_name", "stadium"]]

df['Sport'] = 'Basketball'

df.to_csv('../tables/big_ten_teams.csv')
