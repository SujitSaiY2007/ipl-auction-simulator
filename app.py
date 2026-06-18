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

def get_active_auction_id(cursor):
    cursor.execute("SELECT id FROM auctions WHERE status = 'In Progress' ORDER BY id DESC LIMIT 1")
    auction = cursor.fetchone()
    return auction['id'] if auction else None

# ==========================================
# LOBBY & GAME MANAGEMENT ROUTES
# ==========================================

@app.route('/api/lobby/data', methods=['GET'])
def get_lobby_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM franchises")
    franchises = cursor.fetchall()
    cursor.execute("SELECT * FROM auctions ORDER BY id DESC")
    auctions = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"franchises": franchises, "auctions": auctions})

@app.route('/api/lobby/new', methods=['POST'])
def create_new_auction():
    data = request.json
    name = data.get('name', 'Custom Auction')
    franchise_ids = data.get('franchise_ids', [])
    if not franchise_ids: return jsonify({"error": "Select at least one franchise!"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("UPDATE auctions SET status = 'Paused'")
        cursor.execute("INSERT INTO auctions (name, status) VALUES (%s, 'In Progress')", (name,))
        auction_id = cursor.lastrowid
        
        for f_id in franchise_ids:
            cursor.execute("INSERT INTO auction_teams (auction_id, franchise_id, purse, squad_size) VALUES (%s, %s, 1000000000, 0)", (auction_id, f_id))
            
        cursor.execute("SELECT id FROM players")
        players = cursor.fetchall()
        for p in players:
            cursor.execute("INSERT INTO auction_players (auction_id, player_id, status) VALUES (%s, %s, 'Available')", (auction_id, p['id']))
            
        conn.commit()
        return jsonify({"message": "Auction Created", "auction_id": auction_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/lobby/load', methods=['POST'])
def load_auction():
    data = request.json
    auction_id = data.get('auction_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE auctions SET status = 'Paused'")
    cursor.execute("UPDATE auctions SET status = 'In Progress' WHERE id = %s", (auction_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Auction Loaded successfully!"})

# ==========================================
# AUCTION GAMEPLAY ROUTES
# ==========================================

@app.route('/api/teams', methods=['GET'])
def get_teams():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    auction_id = get_active_auction_id(cursor)
    if not auction_id: return jsonify({"error": "No active auction"}), 400
        
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

@app.route('/api/next-player', methods=['GET'])
def get_next_player():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    auction_id = get_active_auction_id(cursor)
    
    cursor.execute("""
        SELECT ap.id, p.display_name, p.role, p.country, p.base_price, p.career_highlight
        FROM auction_players ap
        JOIN players p ON ap.player_id = p.id
        WHERE ap.auction_id = %s AND ap.status = 'Available' 
        ORDER BY RAND() LIMIT 1
    """, (auction_id,))
    
    player = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if player: return jsonify(player)
    else: return jsonify({"error": "No more available players!"}), 404

@app.route('/api/resolve-player', methods=['POST'])
def resolve_player():
    data = request.json
    player_id = data.get('player_id')
    status = data.get('status')
    team_id = data.get('team_id')
    final_price = data.get('final_price', 0)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if status == 'Sold':
            cursor.execute("SELECT purse, squad_size FROM auction_teams WHERE id = %s", (team_id,))
            team = cursor.fetchone()
            if not team: return jsonify({"error": "Team not found"}), 400
            if team['purse'] < final_price: return jsonify({"error": "Not enough money!"}), 400
            if team['squad_size'] >= 25: return jsonify({"error": "Squad is full!"}), 400

            cursor.execute("UPDATE auction_teams SET purse = purse - %s, squad_size = squad_size + 1 WHERE id = %s", (final_price, team_id))
            cursor.execute("UPDATE auction_players SET status = 'Sold', sold_price = %s, auction_team_id = %s WHERE id = %s", (final_price, team_id, player_id))
        elif status == 'Unsold':
            cursor.execute("UPDATE auction_players SET status = 'Unsold' WHERE id = %s", (player_id,))
        conn.commit()
        return jsonify({"message": "Success!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/undo', methods=['POST'])
def undo_transaction():
    data = request.json
    player_id = data.get('player_id')
    was_sold = data.get('was_sold')
    team_id = data.get('team_id')
    final_price = data.get('final_price', 0)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if was_sold:
            cursor.execute("UPDATE auction_teams SET purse = purse + %s, squad_size = squad_size - 1 WHERE id = %s", (final_price, team_id))
        cursor.execute("UPDATE auction_players SET status = 'Available', sold_price = NULL, auction_team_id = NULL WHERE id = %s", (player_id,))
        conn.commit()
        return jsonify({"message": "Undo successful."})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

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

# --- NEW ROUTE: Fetch the full pool for the sidebar ---
@app.route('/api/pool', methods=['GET'])
def get_player_pool():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    auction_id = get_active_auction_id(cursor)
    
    if not auction_id:
        return jsonify([])

    cursor.execute("""
        SELECT p.display_name, p.role, p.base_price, ap.status 
        FROM auction_players ap
        JOIN players p ON ap.player_id = p.id
        WHERE ap.auction_id = %s
        ORDER BY p.display_name ASC
    """, (auction_id,))
    
    pool = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(pool)

if __name__ == '__main__':
    app.run(port=5000, debug=True)