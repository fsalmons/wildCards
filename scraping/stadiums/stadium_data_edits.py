import pandas as pd

df = pd.read_csv('data_stadiums/stadiums_unclean.csv')

cent = 'Denver Summit FC, Soccer, NWLS, Centennial Stadium, 10200, Centennial, CO, 39.59587228389544, -104.9398720763269'
ill = 'Gotham FC, Soccer, NWLS, Sports Illustrated Stadium, 25000, Harrison, NJ, 40.736667, -74.150278'
nu = 'Chicago Stars FC, Soccer, NWLS, Northwestern Medicine Field at Martin Stadium, 12023, Evanston, IL, 42.05857265463253, -87.67054376912193'

new_rows = [cent, ill, nu]

# convert to dataframe
new_df = pd.DataFrame([r.split(", ") for r in new_rows], columns=df.columns)

# append
df = pd.concat([df, new_df], ignore_index=True)

# save back
df.to_csv('data_stadiums/stadiums.csv', index=False)