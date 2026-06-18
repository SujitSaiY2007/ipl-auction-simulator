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

# --- ROUTE 1: Get Teams ---
@app.route('/api/teams', methods=['GET'])
def get_teams():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM teams")
    teams = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(teams)

# --- ROUTE 2: Next Player ---
@app.route('/api/next-player', methods=['GET'])
def get_next_player():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM players WHERE status = 'Available' ORDER BY RAND() LIMIT 1")
    player = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if player:
        player['batting_avg'] = float(player['batting_avg'])
        player['batting_strike_rate'] = float(player['batting_strike_rate'])
        player['bowling_avg'] = float(player['bowling_avg'])
        player['bowling_strike_rate'] = float(player['bowling_strike_rate'])
        player['bowling_economy'] = float(player['bowling_economy'])
        return jsonify(player)
    else:
        return jsonify({"error": "No more available players!"}), 404

# --- ROUTE 3: Resolve Player (Sold/Unsold) ---
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
            cursor.execute("SELECT purse, squad_size FROM teams WHERE id = %s", (team_id,))
            team = cursor.fetchone()
            if not team:
                return jsonify({"error": "Team not found"}), 400
            if team['purse'] < final_price:
                return jsonify({"error": "Not enough money in the purse!"}), 400
            if team['squad_size'] >= 25:
                return jsonify({"error": "Squad is full (Max 25)!"}), 400

            cursor.execute("UPDATE teams SET purse = purse - %s, squad_size = squad_size + 1 WHERE id = %s", (final_price, team_id))
            cursor.execute("UPDATE players SET status = 'Sold', sold_price = %s, team_id = %s WHERE id = %s", (final_price, team_id, player_id))
            
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

# --- ROUTE 4: View Roster ---
@app.route('/api/roster/<int:team_id>', methods=['GET'])
def get_team_roster(team_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT display_name, role, sold_price FROM players WHERE team_id = %s", (team_id,))
    roster = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(roster)

# --- ROUTE 5: Undo Last Transaction ---
@app.route('/api/undo', methods=['POST'])
def undo_transaction():
    data = request.json
    player_id = data.get('player_id')
    was_sold = data.get('was_sold')
    team_id = data.get('team_id')
    final_price = data.get('final_price', 0)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if was_sold:
            cursor.execute("UPDATE teams SET purse = purse + %s, squad_size = squad_size - 1 WHERE id = %s", (final_price, team_id))

        cursor.execute("UPDATE players SET status = 'Available', sold_price = NULL, team_id = NULL WHERE id = %s", (player_id,))
        conn.commit()
        return jsonify({"message": "Undo successful. Player returned to the pool."})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    print("Starting IPL Auction Server...")
    app.run(port=5000, debug=True)