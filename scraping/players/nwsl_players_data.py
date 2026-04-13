import pandas as pd

df = pd.read_csv("data_players/nwsl_players_info.txt", sep="\t")
# strip whitespace from column names
df.columns = df.columns.str.strip()

# keep only needed columns and rename
df = df[['Player', 'Nation', 'Pos', 'Squad', 'Age']].copy()
df = df.rename(columns={'Squad': 'Team'})

# strip column names just in case
df.columns = df.columns.str.strip()

# remove header-repeated row if it exists
df = df[df['Player'] != 'Player'].copy()

# keep only last 3 letters of Nation (e.g. "NGA")
df['Nation'] = df['Nation'].str.strip().str[-3:]

age = df['Age'].str.extract(r'(\d{1,2})')[0]
df['Age'] = pd.to_numeric(age, errors='coerce').astype('Int64')


# optional: ensure Player is clean string
df['Player'] = df['Player'].str.strip()

photos = pd.read_csv("data/nwsl_players_with_photos.csv")

# optional safety: clean join keys
df['Player'] = df['Player'].str.strip()
photos['name'] = photos['name'].str.strip()

# left join so df is preserved
df = df.merge(
    photos[['name', 'photo_url']],
    how='left',
    left_on='Player',
    right_on='name'
)

# drop redundant column from merge
df = df.drop(columns=['name'])
df[['first_name', 'last_name']] = df['Player'].str.split(' ', n=1, expand=True)
df = df.drop('Player', axis = 1)
df = df[['first_name', 'last_name'] + [c for c in df.columns if c not in ['first_name', 'last_name']]]

rename_map = {
    "Boston Legacy": "Boston Legacy FC",
    "Chicago Stars": "Chicago Stars FC",
    "Denver Summit": "Denver Summit FC",
    "Current": "Kansas City Current",
    "NC Courage": "North Carolina Courage",
    "Portland Thorns": "Portland Thorns FC",
    "Racing Louisville": "Racing Louisville FC",
    "Reign": "Seattle Reign FC",
    "Royals": "Utah Royals",
    "SD Wave": "San Diego Wave FC"
}

df["Team"] = df["Team"].replace(rename_map)


df.to_csv('data/nwls_players.csv', index=False)

df_filtered = df.dropna()

# save filtered version
df_filtered.to_csv('../tables/nwls_players_with_photos.csv', index=False)
