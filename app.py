from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import os
from dotenv import load_dotenv

# Load hidden password
load_dotenv()

app = Flask(__name__)
CORS(app)  # Allows your local web browser to talk to this server

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password=os.getenv("DB_PASSWORD"),
        database="ipl_auction"
    )

# --- ROUTE 1: Get the 5 Teams and their Budgets ---
@app.route('/api/teams', methods=['GET'])
def get_teams():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True) # Returns data as a dictionary
    
    cursor.execute("SELECT * FROM teams")
    teams = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return jsonify(teams)

# --- ROUTE 2: Fetch the Next Available Player ---
@app.route('/api/next-player', methods=['GET'])
def get_next_player():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Grab one random player who hasn't been sold yet
    cursor.execute("SELECT * FROM players WHERE status = 'Available' ORDER BY RAND() LIMIT 1")
    player = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if player:
        # Convert decimal values to floats so they format nicely for the web
        player['batting_avg'] = float(player['batting_avg'])
        player['batting_strike_rate'] = float(player['batting_strike_rate'])
        player['bowling_avg'] = float(player['bowling_avg'])
        player['bowling_strike_rate'] = float(player['bowling_strike_rate'])
        player['bowling_economy'] = float(player['bowling_economy'])
        return jsonify(player)
    else:
        return jsonify({"error": "No more available players!"}), 404

# --- ROUTE 3: Process a Bid (Sold or Unsold) ---
@app.route('/api/resolve-player', methods=['POST'])
def resolve_player():
    data = request.json
    player_id = data.get('player_id')
    status = data.get('status')  # 'Sold' or 'Unsold'
    team_id = data.get('team_id')
    final_price = data.get('final_price', 0)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if status == 'Sold':
            # 1. Check if the team has enough money and space
            cursor.execute("SELECT purse, squad_size FROM teams WHERE id = %s", (team_id,))
            team = cursor.fetchone()
            
            if not team:
                return jsonify({"error": "Team not found"}), 400
            if team['purse'] < final_price:
                return jsonify({"error": "Not enough money in the purse!"}), 400
            if team['squad_size'] >= 25:
                return jsonify({"error": "Squad is full (Max 25)!"}), 400

            # 2. Update the team's budget and roster size
            cursor.execute("""
                UPDATE teams 
                SET purse = purse - %s, squad_size = squad_size + 1 
                WHERE id = %s
            """, (final_price, team_id))

            # 3. Update the player's profile to 'Sold'
            cursor.execute("""
                UPDATE players 
                SET status = 'Sold', sold_price = %s, team_id = %s 
                WHERE id = %s
            """, (final_price, team_id, player_id))
            
        elif status == 'Unsold':
            cursor.execute("UPDATE players SET status = 'Unsold' WHERE id = %s", (player_id,))

        conn.commit()
        return jsonify({"message": f"Player successfully marked as {status}!"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    # Starts the server on port 5000
    print("Starting IPL Auction Server...")
    app.run(port=5000, debug=True)