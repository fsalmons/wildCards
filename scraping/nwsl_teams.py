import pandas as pd
import re

# 1. Read file (pretend this is your txt file)
with open("data/nwsl_teams.txt", "r", encoding="utf-8") as f:
    raw = f.read()

# 2. Remove Wikipedia-style footnotes like [a], [b], [36]
cleaned = re.sub(r"\[[^\]]*\]", "", raw)

# 3. Split into lines and remove empty ones
lines = [line.strip() for line in cleaned.split("\n") if line.strip()]

# 4. Find header row (first row with multiple tabs)
header_idx = next(i for i, l in enumerate(lines) if "Team" in l)

header = lines[header_idx].split("\t")

# 5. Parse rows
rows = []
for line in lines[header_idx + 1:]:
    parts = line.split("\t")
    if len(parts) == len(header):
        rows.append(parts)

# 6. Build DataFrame
df = pd.DataFrame(rows, columns=header)
df = df.rename(columns={
    "Overview of National Women's Soccer League teams Team ": "Team"
})
df.columns = df.columns.str.strip()

# Keep only selected columns
df_small = df[["Team", "Head coach", "Stadium", "Founded", "Joined"]]
df_small = df_small.apply(lambda col: col.str.strip())
df_small.to_csv('../tables/nwls_teams.csv', index=False)


