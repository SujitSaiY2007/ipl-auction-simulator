import sqlite3
import pandas as pd
import os
import random

# Instead of connecting to a MySQL server with passwords, 
# SQLite just creates a clean local file inside your folder!
db = sqlite3.connect("ipl_auction.db")
cursor = db.cursor()

print("1. Tearing down any old tables for SQLite Migration...")
cursor.execute("DROP TABLE IF EXISTS franchise_history;")
cursor.execute("DROP TABLE IF EXISTS auction_players;")
cursor.execute("DROP TABLE IF EXISTS auction_teams;")
cursor.execute("DROP TABLE IF EXISTS auctions;")
cursor.execute("DROP TABLE IF EXISTS players;")
cursor.execute("DROP TABLE IF EXISTS franchises;")  

print("2. Building portable database tables...")

# SQLite uses 'INTEGER PRIMARY KEY AUTOINCREMENT' instead of MySQL's syntax
cursor.execute("""
CREATE TABLE franchises (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT NOT NULL UNIQUE
);""")

cursor.execute("""
CREATE TABLE franchise_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    franchise_id INTEGER, 
    auction_name TEXT,
    tbi_score REAL, 
    is_winner INTEGER DEFAULT 0, 
    total_spent INTEGER DEFAULT 0,
    date DATETIME DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);""")

cursor.execute("""
CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    display_name TEXT, 
    country TEXT, 
    role TEXT,
    base_price INTEGER, 
    batting_runs INTEGER, 
    batting_avg REAL, 
    batting_strike_rate REAL,
    bowling_wickets INTEGER, 
    bowling_avg REAL, 
    bowling_strike_rate REAL, 
    bowling_economy REAL,
    career_highlight TEXT
);""")

cursor.execute("""
CREATE TABLE auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    pitch_type TEXT DEFAULT 'Standard',
    min_squad_size INTEGER DEFAULT 15, 
    timer_seconds INTEGER DEFAULT 60, 
    sudden_death_active INTEGER DEFAULT 0,
    date_created DATETIME DEFAULT CURRENT_TIMESTAMP, 
    status TEXT DEFAULT 'In Progress'
);""")

cursor.execute("""
CREATE TABLE auction_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    auction_id INTEGER, 
    franchise_id INTEGER, 
    purse INTEGER DEFAULT 1000000000, 
    squad_size INTEGER DEFAULT 0, 
    is_finished INTEGER DEFAULT 0, 
    sudden_death_draws_left INTEGER DEFAULT 0,
    sudden_death_needs INTEGER DEFAULT 0, 
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);""")

cursor.execute("""
CREATE TABLE auction_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    auction_id INTEGER, 
    player_id INTEGER, 
    status TEXT DEFAULT 'Available',
    sold_price INTEGER DEFAULT NULL, 
    auction_team_id INTEGER DEFAULT NULL, 
    ai_rating INTEGER DEFAULT 0,
    true_value INTEGER DEFAULT 0, 
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE, 
    FOREIGN KEY (auction_team_id) REFERENCES auction_teams(id) ON DELETE SET NULL
);""")
db.commit()

# SQLite uses standard '?' markers for variables instead of MySQL's '%s'
insert_query = """
INSERT INTO players (
    display_name, country, role, base_price, batting_runs, batting_avg, 
    batting_strike_rate, bowling_wickets, bowling_avg, bowling_strike_rate, 
    bowling_economy, career_highlight
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
"""

# Dynamic real player generator fallback
def generate_real_ipl_fallback_data():
    roles = ['Batter', 'Bowler', 'All-Rounder', 'Wicketkeeper']
    countries = ['India', 'Australia', 'England', 'South Africa', 'West Indies']
    fallback_players = [
        ("Virat Kohli", "India", "Batter", 20000000, 7500, 38.5, 131.2, 4, 55.0, 45.0, 8.5, "Supreme Anchor."),
        ("Jasprit Bumrah", "India", "Bowler", 20000000, 60, 10.5, 95.0, 150, 22.5, 18.2, 7.3, "Elite Death Bowler."),
        ("Rashid Khan", "Afghanistan", "All-Rounder", 20000000, 450, 15.2, 155.0, 135, 20.1, 16.5, 6.6, "Elite Spin Core."),
        ("Andre Russell", "West Indies", "All-Rounder", 20000000, 2300, 29.5, 175.5, 95, 24.5, 17.5, 9.2, "Power hitter."),
        ("Heinrich Klaasen", "South Africa", "Wicketkeeper", 15000000, 1100, 35.5, 165.2, 0, 0.0, 0.0, 0.0, "Spin Destroyer.")
    ]
    for i in range(6, 101):
        fallback_players.append((f"Player_Gen_{i}", random.choice(countries), random.choice(roles), random.choice([2000000, 5000000, 10000000]), random.randint(10, 3000), round(random.uniform(15.0, 40.0), 1), round(random.uniform(115.0, 160.0), 1), random.randint(20, 120), 25.0, 18.0, round(random.uniform(6.5, 9.5), 1), "Simulated Roster Node."))
    return fallback_players

csv_path = os.path.join('data', 'players.csv')

if os.path.exists(csv_path):
    print("3. Loading players from CSV dataset...")
    df = pd.read_csv(csv_path)
    for _, row in df.iterrows():
        cursor.execute(insert_query, (str(row['display_name']), str(row['country']), str(row['role']), int(row['base_price']), int(row['batting_runs']), float(row['batting_avg']), float(row['batting_strike_rate']), int(row['bowling_wickets']), float(row['bowling_avg']), float(row['bowling_strike_rate']), float(row['bowling_economy']), str(row['career_highlight'])))
else:
    print("3. CSV not found. Populating 100 Player Simulated Roster...")
    for p in generate_real_ipl_fallback_data():
        cursor.execute(insert_query, p)

db.commit()
print("Success: Portable SQLite Database file ('ipl_auction.db') created and seeded perfectly!")
cursor.close()
db.close()