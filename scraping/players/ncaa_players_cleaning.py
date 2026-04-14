import pandas as pd

ncaa_players = pd.read_csv('data_players/ncaa_players.csv')
ncaa_players = ncaa_players.rename(columns = {'col_0':'name','col_1':'position','col_2':'height','col_3':'weight','col_4':'school','col_5':'class','col_6':'birth_date', 'col_7':'birth_place', 'col_8':'high_school'})
ncaa_players_photos = pd.read_csv('data_players/ncaa_players_headshots.csv')
ncaa_teams = pd.read_csv('../teams/data_teams/ncaa_schools.csv')

ncaa_players[['first_name', 'last_name']] = ncaa_players['name'].str.split(' ', n=1, expand=True).fillna('')
ncaa_players.drop('photo_url', axis = 1)

ncaa_players['spaced_name'] = ncaa_players['name'].str.replace('-', ' ').str.lower()
#print(ncaa_players.head(3))

data = ncaa_players.merge(
    ncaa_players_photos,
    left_on='spaced_name',
    right_on='name',
    how='inner'
)
#data.drop('spaced_name', axis = 1)

stats_list = ['height', 'weight', 'class', 'birth_date', 'nationality', 'birth_place', 'hometown', 'high_school', 'nba_status']
data['stats'] = data[stats_list].apply(lambda row: row.to_dict(), axis=1)
data = data.drop(stats_list, axis = 1)

ncaa_teams['school'] = ncaa_teams['school'].str.replace(r'\[.*?\]', '', regex=True)
ncaa_teams['mascot'] = ncaa_teams['name'].str.replace(r'\[.*?\]', '', regex=True)
teams = ncaa_teams[['school', 'mascot']]

def map_school(df, data_map_link):

    mapping_df = pd.read_csv(data_map_link, header=None)
    mapping_dict = dict(zip(mapping_df[0], mapping_df[1]))

    df['new_school'] = df['school'].map(mapping_dict)
    df['new_school'] = df['new_school'].fillna(df['school'])
    df.drop('school', axis = 1)

    return df

data = map_school(data, 'data_players/data_to_wiki.csv')
teams = map_school(teams, 'data_players/wiki_to_data.csv')

data = data.merge(
    teams,
    left_on='new_school',
    right_on='new_school',
    how='inner'
)

data['team'] = data['new_school'] + ' ' + data['mascot']

data = data.drop(['school_x', 'school_y', 'photo_url_x'], axis = 1)
data = data.rename(columns = {'name_x':'name', 'photo_url_y':'photo_url', 'new_school':'school'})
data['sport'] = 'Basketball'
data['league'] = 'NCAA'
data = data[['name', 'first_name', 'last_name', 'sport', 'league', 'team', 'position', 'jersey_number', 'photo_url', 'stats']]
data = data.dropna()

position_map = {
    'F': 'Forward',
    'G': 'Guard',
    'C': 'Center',
    'GF': 'Guard-Forward',
    'PG': 'Point Guard',
    'SG': 'Shooting Guard',
    'PF': 'Power Forward',
    'SF': 'Small Forward',
    'FC': 'Forward-Center'
}

data['position'] = data['position'].map(position_map)


print(data.shape)
print(data.position.value_counts())
print(data.head(2))
print(data.info())

data = data.sort_values(by = 'last_name')
data = data.drop('sport', axis = 1)
data = data.rename(columns = {'photo_url':'face_image', 'league':'sport'})
data.to_csv('../data/ncaa_basketball_players.csv')





