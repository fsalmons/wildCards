import pandas as pd

df = pd.read_csv('data_players/big_ten_players_unclean.csv')

# -----------------------------
# 1. Split name column
# -----------------------------
df[['first_name', 'last_name']] = df['col_0'].str.split(' ', n=1, expand=True)
df = df.drop(columns=['col_0'])

# -----------------------------
# 2. Rename columns properly
# -----------------------------
df = df.rename(columns={
    'col_1': 'pos',
    'col_2': 'height',
    'col_3': 'weight',
    'col_4': 'team',
    'col_5': 'drop_me',
    'col_6': 'birthdate',
    'col_7': 'from_city',
    'col_8': 'from_school'
})

# -----------------------------
# 3. Drop unwanted column
# -----------------------------
df = df.drop(columns=['drop_me'])

# -----------------------------
# 4. Clean birthdate BEFORE filtering
# -----------------------------
df['birthdate'] = (
    df['birthdate']
    .replace(['N/A', '-', '—', '', ' '], pd.NA)
)

df['birthdate'] = pd.to_datetime(df['birthdate'], errors='coerce')

# -----------------------------
# 5. Filter valid rows (AFTER parsing)
# -----------------------------
df = df[df['birthdate'].notna() & df['photo_url'].notna()].copy()

# -----------------------------
# 6. Compute age correctly
# -----------------------------
today = pd.Timestamp("2026-04-11")

df['age'] = today.year - df['birthdate'].dt.year

df['age'] -= (
    (df['birthdate'].dt.month > today.month) |
    (
        (df['birthdate'].dt.month == today.month) &
        (df['birthdate'].dt.day > today.day)
    )
).astype(int)

# -----------------------------
# 7. Drop birthdate column
# -----------------------------
df = df.drop(columns=['birthdate'])

# -----------------------------
# 8. Final column ordering
# -----------------------------
df = df[[
    'first_name', 'last_name',
    'pos',  'age', 'height', 'weight',
    'team',
    'from_city', 'from_school',
    'photo_url'
   
]]

teams_df = pd.read_csv("../tables/big_ten_teams.csv")

# expects columns like:
# team, full_name (or full_team)

team_map = dict(zip(teams_df["team"], teams_df["full_name"]))

# -----------------------------
# 2. Replace team column in player df
# -----------------------------
df["team"] = df["team"].replace(team_map)

# -----------------------------
# 3. Reorder final dataframe
# -----------------------------
df = df[[
    'first_name', 'last_name',
    'pos', 'age', 'height', 'weight',
    'team',
    'from_city', 'from_school',
    'photo_url'
]]

df.to_csv('data_players/big_ten_players.csv')

