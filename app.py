from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password=os.getenv("DB_PASSWORD"),
        database="ipl_auction"
    )

# --- CORE LOGIC: Auto-Manage Game Sessions ---
def get_active_auction_id(conn, cursor):
    """Finds the active game session, or creates a new one if none exists."""
    cursor.execute("SELECT id FROM auctions WHERE status = 'In Progress' ORDER BY id DESC LIMIT 1")
    auction = cursor.fetchone()
    
    if auction:
        return auction['id']
    
    # CREATE A NEW GAME SESSION
    cursor.execute("INSERT INTO auctions (name, status) VALUES ('Auction Session 1', 'In Progress')")
    auction_id = cursor.lastrowid
    
    # 1. Pull the master franchises into this specific game
    cursor.execute("SELECT id FROM franchises")
    franchises = cursor.fetchall()
    for f in franchises:
        cursor.execute("INSERT INTO auction_teams (auction_id, franchise_id) VALUES (%s, %s)", (auction_id, f['id']))
        
    # 2. Pull the master player pool into this specific game
    cursor.execute("SELECT id FROM players")
    players = cursor.fetchall()
    for p in players:
        cursor.execute("INSERT INTO auction_players (auction_id, player_id) VALUES (%s, %s)", (auction_id, p['id']))
        
    conn.commit()
    return auction_id

# --- ROUTE 1: Get Teams (For the active session) ---
@app.route('/api/teams', methods=['GET'])
def get_teams():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    auction_id = get_active_auction_id(conn, cursor)
    
    cursor.execute("""
        SELECT at.id, f.name, at.purse, at.squad_size 
        FROM auction_teams at
        JOIN franchises f ON at.franchise_id = f.id
        WHERE at.auction_id = %s
    """, (auction_id,))
    
    teams = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(teams)

# --- ROUTE 2: Next Player ---
@app.route('/api/next-player', methods=['GET'])
def get_next_player():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    auction_id = get_active_auction_id(conn, cursor)
    
    cursor.execute("""
        SELECT ap.id, p.display_name, p.role, p.country, p.base_price, p.career_highlight, 
               p.batting_avg, p.batting_strike_rate, p.bowling_avg, p.bowling_strike_rate, p.bowling_economy
        FROM auction_players ap
        JOIN players p ON ap.player_id = p.id
        WHERE ap.auction_id = %s AND ap.status = 'Available' 
        ORDER BY RAND() LIMIT 1
    """, (auction_id,))
    
    player = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if player:
        # Format the decimal stats for the frontend
        player['batting_avg'] = float(player['batting_avg'])
        player['batting_strike_rate'] = float(player['batting_strike_rate'])
        player['bowling_avg'] = float(player['bowling_avg'])
        player['bowling_strike_rate'] = float(player['bowling_strike_rate'])
        player['bowling_economy'] = float(player['bowling_economy'])
        return jsonify(player)
    else:
        return jsonify({"error": "No more available players in this session!"}), 404

# --- ROUTE 3: Resolve Player (Sold/Unsold) ---
@app.route('/api/resolve-player', methods=['POST'])
def resolve_player():
    data = request.json
    auction_player_id = data.get('player_id')  # This is now the specific session ID for the player
    status = data.get('status')
    auction_team_id = data.get('team_id')      # This is now the specific session ID for the team
    final_price = data.get('final_price', 0)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if status == 'Sold':
            cursor.execute("SELECT purse, squad_size FROM auction_teams WHERE id = %s", (auction_team_id,))
            team = cursor.fetchone()
            
            if not team:
                return jsonify({"error": "Team not found in this session"}), 400
            if team['purse'] < final_price:
                return jsonify({"error": "Not enough money in the purse!"}), 400
            if team['squad_size'] >= 25:
                return jsonify({"error": "Squad is full (Max 25)!"}), 400

            cursor.execute("""
                UPDATE auction_teams 
                SET purse = purse - %s, squad_size = squad_size + 1 
                WHERE id = %s
            """, (final_price, auction_team_id))

            cursor.execute("""
                UPDATE auction_players 
                SET status = 'Sold', sold_price = %s, auction_team_id = %s 
                WHERE id = %s
            """, (final_price, auction_team_id, auction_player_id))
            
        elif status == 'Unsold':
            cursor.execute("UPDATE auction_players SET status = 'Unsold' WHERE id = %s", (auction_player_id,))

        conn.commit()
        return jsonify({"message": f"Player successfully marked as {status}!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- ROUTE 4: View Roster ---
@app.route('/api/roster/<int:team_id>', methods=['GET'])
def get_team_roster(team_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT p.display_name, p.role, ap.sold_price 
        FROM auction_players ap
        JOIN players p ON ap.player_id = p.id
        WHERE ap.auction_team_id = %s
    """, (team_id,))
    
    roster = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(roster)

# --- ROUTE 5: Undo Last Transaction ---
@app.route('/api/undo', methods=['POST'])
def undo_transaction():
    data = request.json
    auction_player_id = data.get('player_id')
    was_sold = data.get('was_sold')
    auction_team_id = data.get('team_id')
    final_price = data.get('final_price', 0)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if was_sold:
            cursor.execute("""
                UPDATE auction_teams 
                SET purse = purse + %s, squad_size = squad_size - 1 
                WHERE id = %s
            """, (final_price, auction_team_id))

        cursor.execute("""
            UPDATE auction_players 
            SET status = 'Available', sold_price = NULL, auction_team_id = NULL 
            WHERE id = %s
        """, (auction_player_id,))
        
        conn.commit()
        return jsonify({"message": "Undo successful. Player returned to the pool."})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    print("Starting Multi-Session IPL Auction Server...")
    app.run(port=5000, debug=True)