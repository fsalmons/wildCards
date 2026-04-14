import pandas as pd

ncaa_teams = pd.read_csv('data_teams/ncaa_schools.csv')

ncaa_teams['school'] = ncaa_teams['school'].str.replace(r'\[.*?\]', '', regex=True)
ncaa_teams['mascot'] = ncaa_teams['name'].str.replace(r'\[.*?\]', '', regex=True)

def map_school(df, data_map_link):

    mapping_df = pd.read_csv(data_map_link, header=None)
    mapping_dict = dict(zip(mapping_df[0], mapping_df[1]))

    df['new_school'] = df['school'].map(mapping_dict)
    df['new_school'] = df['new_school'].fillna(df['school'])
    df.drop('school', axis = 1)

    return df


ncaa_teams = map_school(ncaa_teams, '../players/data_players/wiki_to_data.csv')

ncaa_teams['team'] = ncaa_teams['new_school'] + ' ' + ncaa_teams['mascot']

ncaa_teams = ncaa_teams[['team', 'logo', 'color_hex']]

import ast

# --- STEP 1: ensure every row is a proper list ---
def ensure_list(x):
    if isinstance(x, list):
        return x
    if pd.isna(x):
        return []
    if isinstance(x, str):
        try:
            return ast.literal_eval(x)
        except:
            return [x]
    return [x]

ncaa_teams['color_hex'] = ncaa_teams['color_hex'].apply(ensure_list)


# --- STEP 2: enforce exactly 3 colors with your rules ---
def fix_colors(lst):
    lst = lst[:3]  # trim extra if any

    if len(lst) == 0:
        return ['#FFFFFF', '#FFFFFF', '#FFFFFF']
    if len(lst) == 1:
        return [lst[0], '#FFFFFF', '#FFFFFF']
    if len(lst) == 2:
        return [lst[0], lst[1], lst[1]]

    return lst

ncaa_teams['color_hex'] = ncaa_teams['color_hex'].apply(fix_colors)


# --- STEP 3: expand safely ---
cols = pd.DataFrame(
    ncaa_teams['color_hex'].tolist(),
    columns=['color1', 'color2', 'color3'],
    index=ncaa_teams.index
)


# --- STEP 4: apply fallback rules (extra safety layer) ---
cols['color2'] = cols['color2'].fillna('#FFFFFF')
cols['color3'] = cols['color3'].fillna(cols['color2'])


# --- STEP 5: assign back with new names ---
ncaa_teams[['primary_color', 'secondary_color', 'tertiary_color']] = cols

ncaa_teams = ncaa_teams.drop('color_hex', axis=1)

ncaa_teams['sport'] = 'Basketball'
ncaa_teams['league'] = 'NCAA'

print(ncaa_teams.head(3))

ncaa_teams = ncaa_teams.drop('sport', axis = 1)
ncaa_teams = ncaa_teams.rename(columns = {'team':'name', 'logo':'logo_url', 'secondary_color':'card_color', 'tertiary_color':'text_color', 'league':'sport'})
ncaa_teams.to_csv('../data/ncaa_basketball_teams.csv')