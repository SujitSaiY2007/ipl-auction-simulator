import mysql.connector
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

try:
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password=os.getenv("DB_PASSWORD"),
        database="ipl_auction"
    )
    cursor = db.cursor()
except mysql.connector.Error as err:
    print(f"Error connecting to MySQL: {err}")
    exit()

print("1. Tearing down database for AI & Sudden Death Upgrades...")
cursor.execute("DROP TABLE IF EXISTS auction_players;")
cursor.execute("DROP TABLE IF EXISTS auction_teams;")
cursor.execute("DROP TABLE IF EXISTS auctions;")
cursor.execute("DROP TABLE IF EXISTS players;")
cursor.execute("DROP TABLE IF EXISTS teams;")       # Legacy cleanup
cursor.execute("DROP TABLE IF EXISTS franchises;")  

print("2. Building AI-Ready Architecture...")

# TABLE 1: Master Franchises 
cursor.execute("""
CREATE TABLE franchises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);
""")

# TABLE 2: Master Players
cursor.execute("""
CREATE TABLE players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    role VARCHAR(50),
    base_price BIGINT,
    batting_runs INT DEFAULT 0,
    batting_avg DECIMAL(5,2) DEFAULT 0.00,
    batting_strike_rate DECIMAL(5,2) DEFAULT 0.00,
    bowling_wickets INT DEFAULT 0,
    bowling_avg DECIMAL(5,2) DEFAULT 0.00,
    bowling_strike_rate DECIMAL(5,2) DEFAULT 0.00,
    bowling_economy DECIMAL(4,2) DEFAULT 0.00,
    career_highlight VARCHAR(500)
);
""")

# TABLE 3: Auctions (Upgraded with Pitch and Minimum Squad Rules)
cursor.execute("""
CREATE TABLE auctions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    pitch_type VARCHAR(50) DEFAULT 'Standard',
    min_squad_size INT DEFAULT 15,
    sudden_death_active BOOLEAN DEFAULT FALSE,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'In Progress'
);
""")

# TABLE 4: Auction Teams (Upgraded for Sudden Death Tracking)
cursor.execute("""
CREATE TABLE auction_teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT,
    franchise_id INT,
    purse BIGINT DEFAULT 1000000000, 
    squad_size INT DEFAULT 0,
    is_finished BOOLEAN DEFAULT FALSE,
    sudden_death_draws_left INT DEFAULT 0,
    sudden_death_needs INT DEFAULT 0,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);
""")

# TABLE 5: Auction Players
cursor.execute("""
CREATE TABLE auction_players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT,
    player_id INT,
    status VARCHAR(50) DEFAULT 'Available',
    sold_price BIGINT DEFAULT NULL,
    auction_team_id INT DEFAULT NULL,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (auction_team_id) REFERENCES auction_teams(id) ON DELETE SET NULL
);
""")

db.commit()

# 4. Load the CSV Data into the Master Pool
csv_path = os.path.join('data', 'players.csv')
if os.path.exists(csv_path):
    print("3. Loading the 100-player Master Roster...")
    df = pd.read_csv(csv_path)
    
    insert_query = """
    INSERT INTO players (
        display_name, country, role, base_price, 
        batting_runs, batting_avg, batting_strike_rate, 
        bowling_wickets, bowling_avg, bowling_strike_rate, bowling_economy, 
        career_highlight
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """
    
    for _, row in df.iterrows():
        values = (
            str(row['display_name']), str(row['country']), str(row['role']), int(row['base_price']),
            int(row['batting_runs']), float(row['batting_avg']), float(row['batting_strike_rate']),
            int(row['bowling_wickets']), float(row['bowling_avg']), float(row['bowling_strike_rate']),
            float(row['bowling_economy']), str(row['career_highlight'])
        )
        cursor.execute(insert_query, values)
        
    db.commit()
    print(f"Success: AI-Ready Blank Database built. {len(df)} players loaded. 0 Franchises registered.")
else:
    print(f"Error: Could not find players.csv at {csv_path}")

cursor.close()
db.close()