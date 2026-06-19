import mysql.connector
import pandas as pd
import os
import random
from dotenv import load_dotenv

load_dotenv()

def generate_real_ipl_fallback_data():
    """Generates 100 highly realistic players if CSV is missing to ensure perfect AI evaluation."""
    roles = ['Batter', 'Bowler', 'All-Rounder', 'Wicketkeeper']
    countries = ['India', 'Australia', 'England', 'South Africa', 'West Indies', 'New Zealand', 'Afghanistan']
    players = []
    
    # Premium Marquee Examples
    players.append(("Virat Kohli", "India", "Batter", 20000000, 7500, 38.5, 131.2, 4, 55.0, 45.0, 8.5, "Flat Track Bully. Supreme Anchor."))
    players.append(("Jasprit Bumrah", "India", "Bowler", 20000000, 60, 10.5, 95.0, 150, 22.5, 18.2, 7.3, "Pace. Elite Death Bowler. Fast surface specialist."))
    players.append(("Rashid Khan", "Afghanistan", "All-Rounder", 20000000, 450, 15.2, 155.0, 135, 20.1, 16.5, 6.6, "Elite Spin. Match winner on Dust Bowls."))
    players.append(("Andre Russell", "West Indies", "All-Rounder", 20000000, 2300, 29.5, 175.5, 95, 24.5, 17.5, 9.2, "Power hitter. Fast pace. Game changer."))
    players.append(("Heinrich Klaasen", "South Africa", "Wicketkeeper", 15000000, 1100, 35.5, 165.2, 0, 0.0, 0.0, 0.0, "Spin Destroyer. High velocity."))

    # Generate remaining 95 realistic players
    for i in range(6, 101):
        role = random.choice(roles)
        country = random.choice(countries)
        base = random.choice([2000000, 5000000, 10000000, 15000000])
        
        b_runs = random.randint(10, 3000) if role != 'Bowler' else random.randint(0, 150)
        b_avg = round(random.uniform(15.0, 40.0), 1) if role != 'Bowler' else round(random.uniform(5.0, 15.0), 1)
        b_sr = round(random.uniform(115.0, 160.0), 1) if role != 'Bowler' else round(random.uniform(80.0, 110.0), 1)
        
        w_wkts = random.randint(20, 120) if role in ['Bowler', 'All-Rounder'] else random.randint(0, 5)
        w_econ = round(random.uniform(6.5, 9.5), 1) if role in ['Bowler', 'All-Rounder'] else round(random.uniform(9.0, 12.0), 1)
        w_sr = round(random.uniform(15.0, 25.0), 1) if role in ['Bowler', 'All-Rounder'] else 0.0
        
        trait = random.choice(["Fast surface specialist", "Elite Spin", "Power hitter", "Anchor", "Pace generator"])
        players.append((f"Player_Gen_{i}", country, role, base, b_runs, b_avg, b_sr, w_wkts, 25.0, w_sr, w_econ, trait))
        
    return players

try:
    db = mysql.connector.connect(host="localhost", user="root", password=os.getenv("DB_PASSWORD"), database="ipl_auction")
    cursor = db.cursor()
except mysql.connector.Error as err:
    print(f"Error connecting: {err}")
    exit()

print("1. Tearing down database for the Final Phase 5 Upgrade...")
cursor.execute("DROP TABLE IF EXISTS franchise_history;")
cursor.execute("DROP TABLE IF EXISTS auction_players;")
cursor.execute("DROP TABLE IF EXISTS auction_teams;")
cursor.execute("DROP TABLE IF EXISTS auctions;")
cursor.execute("DROP TABLE IF EXISTS players;")
cursor.execute("DROP TABLE IF EXISTS franchises;")  

print("2. Building Advanced E-Sports Architecture...")

cursor.execute("CREATE TABLE franchises (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE);")
cursor.execute("""
CREATE TABLE franchise_history (
    id INT AUTO_INCREMENT PRIMARY KEY, franchise_id INT, auction_name VARCHAR(255),
    tbi_score DECIMAL(5,1), is_winner BOOLEAN DEFAULT FALSE, total_spent BIGINT DEFAULT 0,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);""")
cursor.execute("""
CREATE TABLE players (
    id INT AUTO_INCREMENT PRIMARY KEY, display_name VARCHAR(255), country VARCHAR(100), role VARCHAR(50),
    base_price BIGINT, batting_runs INT, batting_avg DECIMAL(5,2), batting_strike_rate DECIMAL(5,2),
    bowling_wickets INT, bowling_avg DECIMAL(5,2), bowling_strike_rate DECIMAL(5,2), bowling_economy DECIMAL(4,2),
    career_highlight VARCHAR(500)
);""")
cursor.execute("""
CREATE TABLE auctions (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), pitch_type VARCHAR(50) DEFAULT 'Standard',
    min_squad_size INT DEFAULT 15, timer_seconds INT DEFAULT 60, sudden_death_active BOOLEAN DEFAULT FALSE,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP, status VARCHAR(50) DEFAULT 'In Progress'
);""")
cursor.execute("""
CREATE TABLE auction_teams (
    id INT AUTO_INCREMENT PRIMARY KEY, auction_id INT, franchise_id INT, purse BIGINT DEFAULT 1000000000, 
    squad_size INT DEFAULT 0, is_finished BOOLEAN DEFAULT FALSE, sudden_death_draws_left INT DEFAULT 0,
    sudden_death_needs INT DEFAULT 0, FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);""")
cursor.execute("""
CREATE TABLE auction_players (
    id INT AUTO_INCREMENT PRIMARY KEY, auction_id INT, player_id INT, status VARCHAR(50) DEFAULT 'Available',
    sold_price BIGINT DEFAULT NULL, auction_team_id INT DEFAULT NULL, ai_rating INT DEFAULT 0,
    true_value BIGINT DEFAULT 0, FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE, FOREIGN KEY (auction_team_id) REFERENCES auction_teams(id) ON DELETE SET NULL
);""")
db.commit()

csv_path = os.path.join('data', 'players.csv')
insert_query = """INSERT INTO players (display_name, country, role, base_price, batting_runs, batting_avg, batting_strike_rate, bowling_wickets, bowling_avg, bowling_strike_rate, bowling_economy, career_highlight) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"""

if os.path.exists(csv_path):
    print("3. Loading the CSV Master Roster...")
    df = pd.read_csv(csv_path)
    for _, row in df.iterrows():
        cursor.execute(insert_query, (str(row['display_name']), str(row['country']), str(row['role']), int(row['base_price']), int(row['batting_runs']), float(row['batting_avg']), float(row['batting_strike_rate']), int(row['bowling_wickets']), float(row['bowling_avg']), float(row['bowling_strike_rate']), float(row['bowling_economy']), str(row['career_highlight'])))
else:
    print("3. CSV not found. Generating 100 Premium Real & Simulated Players...")
    players_data = generate_real_ipl_fallback_data()
    for p in players_data: cursor.execute(insert_query, p)

db.commit()
print("Success: Ultimate Database built and populated.")
cursor.close()
db.close()