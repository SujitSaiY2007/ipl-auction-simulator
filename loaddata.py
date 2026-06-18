import mysql.connector
import pandas as pd
import os
from dotenv import load_dotenv

# Load the hidden environment variables
load_dotenv()

# 1. Connect to MySQL Server
try:
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password=os.getenv("DB_PASSWORD")  # Safely pulls the password from .env
    )
    cursor = db.cursor()
except mysql.connector.Error as err:
    print(f"Error connecting to MySQL: {err}")
    exit()

print("1. Creating database ipl_auction...")
cursor.execute("CREATE DATABASE IF NOT EXISTS ipl_auction;")
cursor.execute("USE ipl_auction;")

# 2. CREATE TEAMS TABLE FIRST (The Parent)
print("2. Creating teams table...")
cursor.execute("""
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    purse BIGINT DEFAULT 1200000000, 
    squad_size INT DEFAULT 0,
    overseas_count INT DEFAULT 0
);
""")

# Insert the 5 default teams (Using INSERT IGNORE to prevent duplicates if run twice)
print("3. Registering the 5 franchise teams...")
teams_data = [
    ("Team Alpha",), ("Team Bravo",), ("Team Charlie",), 
    ("Team Delta",), ("Team Echo",)
]
cursor.executemany("INSERT IGNORE INTO teams (name) VALUES (%s);", teams_data)

# 3. CREATE PLAYERS TABLE SECOND (The Child)
print("4. Creating players table...")

# This safely deletes the broken table structure first
cursor.execute("DROP TABLE IF EXISTS players;")
cursor.execute("""
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    role VARCHAR(50),
    base_price BIGINT,
    sold_price BIGINT DEFAULT NULL,  # <-- WE ADDED THIS LINE BACK
    batting_runs INT DEFAULT 0,
    batting_avg DECIMAL(5,2) DEFAULT 0.00,
    batting_strike_rate DECIMAL(5,2) DEFAULT 0.00,
    bowling_wickets INT DEFAULT 0,
    bowling_avg DECIMAL(5,2) DEFAULT 0.00,
    bowling_strike_rate DECIMAL(5,2) DEFAULT 0.00,
    bowling_economy DECIMAL(4,2) DEFAULT 0.00,
    career_highlight VARCHAR(500),
    status VARCHAR(50) DEFAULT 'Available',
    team_id INT DEFAULT NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);
""")

# 4. Load the CSV Data
csv_path = os.path.join('data', 'players.csv')

if os.path.exists(csv_path):
    print(f"5. Found dataset at {csv_path}. Loading players...")
    df = pd.read_csv(csv_path)
    
    insert_query = """
    INSERT INTO players (
        display_name, country, role, base_price, 
        batting_runs, batting_avg, batting_strike_rate, 
        bowling_wickets, bowling_avg, bowling_strike_rate, bowling_economy, 
        career_highlight
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """
    
    # We clear the table first so we don't duplicate players if you re-run the script
    cursor.execute("TRUNCATE TABLE players;")
    
    for _, row in df.iterrows():
        values = (
            str(row['display_name']), str(row['country']), str(row['role']), int(row['base_price']),
            int(row['batting_runs']), float(row['batting_avg']), float(row['batting_strike_rate']),
            int(row['bowling_wickets']), float(row['bowling_avg']), float(row['bowling_strike_rate']),
            float(row['bowling_economy']), str(row['career_highlight'])
        )
        cursor.execute(insert_query, values)
        
    db.commit()
    print(f"Success: Database fully built and loaded with {len(df)} players.")
else:
    print(f"Error: Could not find players.csv at path: {csv_path}. Make sure the file exists.")

cursor.close()
db.close()
