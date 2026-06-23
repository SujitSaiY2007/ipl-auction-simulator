from curses import meta

from flask import Flask, jsonify, request, g
from flask_cors import CORS
import sqlite3
import math
import traceback
import os
import shutil
import random
import string

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_TEMPLATE = os.path.join(BASE_DIR, "ipl_auction.db")
SANDBOX_DIR = os.path.join(BASE_DIR, "sandboxes")
ROOMS_DIR = os.path.join(BASE_DIR, "rooms")

def upgrade_db_schema(conn):
    """Dynamically patches legacy databases with new multiplayer columns."""
    cursor = conn.cursor()
    
    # 1. Patch franchises table for Ownership (What we did earlier)
    cursor.execute("PRAGMA table_info(franchises)")
    if 'owner_token' not in [info[1] for info in cursor.fetchall()]:
        cursor.execute("ALTER TABLE franchises ADD COLUMN owner_token TEXT")
        
    # 2. 🌟 NEW: Patch auction_meta table for Live Broadcasting
    cursor.execute("PRAGMA table_info(auction_meta)")
    if 'live_state' not in [info[1] for info in cursor.fetchall()]:
        cursor.execute("ALTER TABLE auction_meta ADD COLUMN live_state TEXT")
        
    conn.commit()

def get_db_connection():
    """Routes traffic based on multiplayer headers or falls back to solo sandbox."""
    room_code = request.headers.get('X-Room-Code')

    if room_code and room_code.strip():
        # 👥 MULTIPLAYER MODE
        room_code = "".join([c for c in room_code if c.isalnum()]).upper()[:4]
        db_path = os.path.join(ROOMS_DIR, f"{room_code}.db")
        if not os.path.exists(db_path):
            raise FileNotFoundError("Room does not exist.")
    else:
        # 🕹️ SOLO SANDBOX MODE
        user_token = request.headers.get('X-User-Token', 'default_guest')
        user_token = "".join([c for c in user_token if c.isalnum() or c in ('_', '-')])
        db_path = os.path.join(SANDBOX_DIR, f"{user_token}.db")
        
        if not os.path.exists(db_path):
            os.makedirs(SANDBOX_DIR, exist_ok=True)
            shutil.copy(MASTER_TEMPLATE, db_path)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    # 🌟 NEW: Auto-patch the database before letting the app use it!
    upgrade_db_schema(conn)

    return conn

@app.route('/api/create-room', methods=['POST'])
def create_room():
    os.makedirs(ROOMS_DIR, exist_ok=True)
    while True:
        code = "".join(random.choices(string.ascii_uppercase, k=4))
        db_path = os.path.join(ROOMS_DIR, f"{code}.db")
        if not os.path.exists(db_path):
            break
            
    shutil.copy(MASTER_TEMPLATE, db_path)
    return jsonify({"room_code": code})

@app.route('/api/check-room/<code>', methods=['GET'])
def check_room(code):
    sanitized = "".join([c for c in code if c.isalnum()]).upper()[:4]
    if os.path.exists(os.path.join(ROOMS_DIR, f"{sanitized}.db")):
        return jsonify({"valid": True})
    return jsonify({"error": "Room not found"}), 404

def get_active_auction_id(cursor):
    cursor.execute("SELECT id, name, pitch_type, min_squad_size, timer_seconds, sudden_death_active FROM auctions WHERE status = 'In Progress' ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    return dict(row) if row else None

def safe_float(val):
    if val is None: return 0.0
    try:
        f = float(val)
        return 0.0 if math.isnan(f) else f
    except: return 0.0

def calculate_ai_player_metrics(player, pitch_type):
    role = str(player.get('role') or '').lower()
    highlight = str(player.get('career_highlight') or '').lower()
    pitch = str(pitch_type or 'Standard')
    
    bat_avg, bat_sr = safe_float(player.get('batting_avg')), safe_float(player.get('batting_strike_rate'))
    bowl_econ, bowl_sr = safe_float(player.get('bowling_economy')), safe_float(player.get('bowling_strike_rate'))
    
    bat_score = bowl_score = 0
    
    if 'batter' in role or 'wicketkeeper' in role or 'all-rounder' in role:
        avg_pts = min(45, (bat_avg / 35.0) * 45) if bat_avg > 0 else 0
        sr_pts = min(55, (bat_sr / 150.0) * 55) if bat_sr > 0 else 0
        bat_score = avg_pts + sr_pts
        
    if 'bowler' in role or 'all-rounder' in role:
        econ_pts = max(0, 50 - ((bowl_econ - 6.5) * 12)) if bowl_econ > 0 else 0
        sr_pts = max(0, 50 - ((bowl_sr - 16.0) * 3)) if bowl_sr > 0 else 0
        bowl_score = min(100, econ_pts + sr_pts)
        
    if 'batter' in role or 'wicketkeeper' in role: base_rating = bat_score
    elif 'bowler' in role: base_rating = bowl_score
    else: base_rating = (bat_score * 0.5) + (bowl_score * 0.5) + 8 
        
    if pitch == 'Green Top' and ('fast' in highlight or 'pace' in highlight or role == 'bowler'):
        base_rating *= 1.15
    elif pitch == 'Dust Bowl' and 'spin' in highlight:
        base_rating *= 1.20
    elif pitch == 'Flat Track' and ('batter' in role or 'power' in highlight):
        base_rating *= 1.15
        
    final_rating = max(10, min(99, int(base_rating)))
    
    if final_rating < 50: true_value_cr = 0.5 + ((final_rating - 40) * 0.1)
    elif final_rating < 75: true_value_cr = 2.0 + ((final_rating - 50) * 0.2)
    else: true_value_cr = 7.0 + ((final_rating - 75) * 0.4)
        
    true_value = max(int(player.get('base_price', 2000000)), int(true_value_cr * 10000000))
    
    return final_rating, true_value

# --- API SERVICES ---

@app.route('/api/lobby/data', methods=['GET'])
def get_lobby_data():
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM franchises ORDER BY name ASC")
        franchises = [dict(row) for row in cursor.fetchall()]
        cursor.execute("SELECT * FROM auctions ORDER BY id DESC")
        auctions = [dict(row) for row in cursor.fetchall()]
        return jsonify({"franchises": franchises, "auctions": auctions})
    finally:
        cursor.close(); conn.close()

@app.route('/api/franchises/history', methods=['GET'])
def get_hall_of_fame():
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT f.id, f.name, COUNT(fh.id) as matches_played, COALESCE(SUM(fh.is_winner), 0) as trophies,
                   COALESCE(AVG(fh.tbi_score), 0) as avg_tbi, COALESCE(AVG(fh.total_spent), 0) as avg_spent
            FROM franchises f LEFT JOIN franchise_history fh ON f.id = fh.franchise_id
            GROUP BY f.id ORDER BY trophies DESC, avg_tbi DESC
        """)
        return jsonify([dict(row) for row in cursor.fetchall()])
    finally:
        cursor.close(); conn.close()

@app.route('/api/franchises/past-squads/<int:f_id>', methods=['GET'])
def get_past_squads(f_id):
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT auction_name, tbi_score, is_winner, total_spent 
            FROM franchise_history WHERE franchise_id = ? ORDER BY id DESC
        """, (f_id,))
        seasons = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute("""
            SELECT p.display_name, p.role, ap.sold_price, ap.ai_rating, a.name as auction_name
            FROM auction_players ap JOIN players p ON ap.player_id = p.id
            JOIN auction_teams at ON ap.auction_team_id = at.id JOIN auctions a ON at.auction_id = a.id
            WHERE at.franchise_id = ? AND a.status = 'Completed'
        """, (f_id,))
        players = [dict(row) for row in cursor.fetchall()]

        for s in seasons:
            s['roster'] = [p for p in players if p['auction_name'] == s['auction_name']]
            
        return jsonify(seasons)
    finally:
        cursor.close(); conn.close()

@app.route('/api/franchises/add', methods=['POST'])
def add_franchise():
    data = request.json
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO franchises (name) VALUES (?)", (data.get('name'),))
        conn.commit(); return jsonify({"message": "Added!"})
    except:
        return jsonify({"error": "Already exists"}), 400
    finally:
        cursor.close(); conn.close()


# 🌟 NEW ENDPOINT: Claim a Franchise
@app.route('/api/franchises/claim', methods=['POST'])
def claim_franchise():
    try:
        data = request.json
        franchise_id = data.get('franchise_id')
        user_token = request.headers.get('X-User-Token')
        
        db = get_db_connection()
        
        # 1. Check if the franchise exists and isn't already claimed
        team = db.execute("SELECT owner_token, name FROM franchises WHERE id = ?", (franchise_id,)).fetchone()
        
        if not team:
            return jsonify({"error": "Franchise not found."}), 404
            
        if team['owner_token']:
            if team['owner_token'] == user_token:
                return jsonify({"status": "success", "message": "You already own this team."})
            return jsonify({"error": f"{team['name']} has already been claimed by another player!"}), 400
            
        # 2. Lock the franchise to this specific user's token
        db.execute("UPDATE franchises SET owner_token = ? WHERE id = ?", (user_token, franchise_id))
        db.commit()
        
        return jsonify({"status": "success", "message": f"Successfully claimed {team['name']}!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/franchises/delete', methods=['POST'])
def delete_franchise():
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM franchises WHERE id = ?", (request.json.get('franchise_id'),))
        conn.commit(); return jsonify({"message": "Deleted!"})
    finally:
        cursor.close(); conn.close()

@app.route('/api/lobby/new', methods=['POST'])
def create_new_auction():
    data = request.json
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        starting_purse = int(float(data.get('budget', 100)) * 10000000)
        cursor.execute("UPDATE auctions SET status = 'Paused'")
        cursor.execute("INSERT INTO auctions (name, pitch_type, min_squad_size, timer_seconds, status) VALUES (?, ?, ?, ?, 'In Progress')", 
                       (data.get('name'), data.get('pitch_type'), int(data.get('min_squad_size')), int(data.get('timer_seconds', 60))))
        auction_id = cursor.lastrowid
        
        for f_id in data.get('franchise_ids', []):
            cursor.execute("INSERT INTO auction_teams (auction_id, franchise_id, purse, squad_size) VALUES (?, ?, ?, 0)", (auction_id, f_id, starting_purse))
            
        cursor.execute("SELECT id FROM players")
        player_ids = [row['id'] for row in cursor.fetchall()]
        for p_id in player_ids:
            cursor.execute("INSERT INTO auction_players (auction_id, player_id, status) VALUES (?, ?, 'Available')", (auction_id, p_id))
            
        conn.commit(); return jsonify({"message": "Online"})
    finally:
        cursor.close(); conn.close()

@app.route('/api/lobby/load', methods=['POST'])
def load_auction():
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("UPDATE auctions SET status = 'Paused'")
        cursor.execute("UPDATE auctions SET status = 'In Progress' WHERE id = ?", (request.json.get('auction_id'),))
        conn.commit(); return jsonify({"message": "Loaded"})
    finally:
        cursor.close(); conn.close()

@app.route('/api/lobby/delete', methods=['POST'])
def delete_auction():
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM auctions WHERE id = ?", (request.json.get('auction_id'),))
        conn.commit(); return jsonify({"message": "Deleted"})
    finally:
        cursor.close(); conn.close()

@app.route('/api/teams', methods=['GET'])
def get_teams():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        auction_info = get_active_auction_id(cursor)
        if not auction_info: 
            return jsonify({"error": "No active session"}), 400

        # 🌟 FIX 1: Added f.owner_token to your brilliant SELECT statement!
        cursor.execute("""
            SELECT at.id, f.name, f.owner_token, at.purse, at.squad_size, at.is_finished, at.sudden_death_draws_left, at.sudden_death_needs,
                   (SELECT COALESCE(SUM(sold_price), 0) FROM auction_players WHERE auction_team_id = at.id) as spent
            FROM auction_teams at 
            JOIN franchises f ON at.franchise_id = f.id 
            WHERE at.auction_id = ?
        """, (auction_info['id'],))
        
        teams = [dict(row) for row in cursor.fetchall()]

        # 🌟 FIX 2: Safely grab the viewer's token
        user_token = request.headers.get('X-User-Token', 'default_guest')

        # 🌟 FIX 3: Replaced the undefined 'meta' variable with your 'auction_info' variable
        return jsonify({
            "meta": dict(auction_info),
            "teams": teams,
            "viewer_token": user_token
        })
        
    except Exception as e:
        # If Python crashes, return the exact error message so we can read it!
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": f"Python Error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/live-highlights', methods=['GET'])
def get_live_highlights():
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        auction_info = get_active_auction_id(cursor)
        if not auction_info: return jsonify({})
        
        cursor.execute("""
            SELECT p.display_name, ap.sold_price, f.name as team_name, ap.ai_rating, ap.true_value
            FROM auction_players ap JOIN players p ON ap.player_id = p.id 
            JOIN auction_teams at ON ap.auction_team_id = at.id JOIN franchises f ON at.franchise_id = f.id
            WHERE ap.auction_id = ? AND ap.status = 'Sold'
        """, (auction_info['id'],))
        all_sold = [dict(row) for row in cursor.fetchall()]
        
        if not all_sold: return jsonify({"highest": None, "steal": None, "overpaid": None})
        
        highest = max(all_sold, key=lambda x: x['sold_price'])
        steal = max(all_sold, key=lambda x: x['true_value'] / max(x['sold_price'], 1))
        overpaid = max(all_sold, key=lambda x: x['sold_price'] - x['true_value'])
        
        return jsonify({"highest": highest, "steal": steal, "overpaid": overpaid})
    finally:
        cursor.close(); conn.close()

@app.route('/api/next-player', methods=['GET'])
def get_next_player():
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        auction_info = get_active_auction_id(cursor)
        if not auction_info: return jsonify({"error": "No active game"}), 400
        
        cursor.execute("SELECT at.id, f.name FROM auction_teams at JOIN franchises f ON at.franchise_id = f.id WHERE at.auction_id = ? AND at.is_finished = 0 AND at.sudden_death_draws_left > 0 LIMIT 1", (auction_info['id'],))
        sd_row = cursor.fetchone()
        sd_team = dict(sd_row) if sd_row else None
        
        # FIXED: Replaced MySQL RAND() with SQLite RANDOM()
        cursor.execute("""
            SELECT ap.id as auction_player_id, p.id, p.display_name, p.role, p.country, p.base_price, p.career_highlight,
                   p.batting_runs, p.batting_avg, p.batting_strike_rate, p.bowling_wickets, p.bowling_economy, p.bowling_strike_rate
            FROM auction_players ap JOIN players p ON ap.player_id = p.id
            WHERE ap.auction_id = ? AND ap.status = 'Available' ORDER BY RANDOM() LIMIT 1
        """, (auction_info['id'],))
        p_row = cursor.fetchone()
        
        if p_row:
            player = dict(p_row)
            ai_rating, true_val = calculate_ai_player_metrics(player, auction_info['pitch_type'])
            player['ai_rating'] = ai_rating
            player['true_value'] = true_val
            
            cursor.execute("UPDATE auction_players SET ai_rating = ?, true_value = ? WHERE id = ?", (ai_rating, true_val, player['auction_player_id']))
            conn.commit()
            return jsonify({"player": player, "sudden_death_turn": sd_team})
        else:
            return jsonify({"error": "No players left!"}), 404
    finally:
        cursor.close(); conn.close()

@app.route('/api/resolve-player', methods=['POST'])
def resolve_player():
    data = request.json
    ap_id, status, at_id, final_price = data.get('player_id'), data.get('status'), data.get('team_id'), data.get('final_price', 0)
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT auction_id FROM auction_players WHERE id = ?", (ap_id,))
        auction_id = cursor.fetchone()['auction_id']

        if status == 'Sold':
            cursor.execute("SELECT purse, squad_size, sudden_death_draws_left FROM auction_teams WHERE id = ?", (at_id,))
            team = dict(cursor.fetchone())
            if team['purse'] < final_price: return jsonify({"error": "Insufficient Funds!"}), 400
            if team['squad_size'] >= 25: return jsonify({"error": "Squad limit of 25 reached!"}), 400

            cursor.execute("UPDATE auction_teams SET purse = purse - ?, squad_size = squad_size + 1 WHERE id = ?", (final_price, at_id))
            cursor.execute("UPDATE auction_players SET status = 'Sold', sold_price = ?, auction_team_id = ? WHERE id = ?", (final_price, at_id, ap_id))
            
            if team['sudden_death_draws_left'] > 0:
                # FIXED: Replaced MySQL GREATEST() with SQLite MAX()
                cursor.execute("UPDATE auction_teams SET sudden_death_draws_left = sudden_death_draws_left - 1, sudden_death_needs = MAX(0, sudden_death_needs - 1) WHERE id = ?", (at_id,))
                
        elif status == 'Unsold':
            cursor.execute("UPDATE auction_players SET status = 'Unsold' WHERE id = ?", (ap_id,))
            if at_id: 
                cursor.execute("UPDATE auction_teams SET sudden_death_draws_left = sudden_death_draws_left - 1 WHERE id = ?", (at_id,))

        if at_id:
            cursor.execute("SELECT sudden_death_draws_left, sudden_death_needs, squad_size FROM auction_teams WHERE id = ?", (at_id,))
            check = dict(cursor.fetchone())
            cursor.execute("SELECT min_squad_size FROM auctions WHERE id = ?", (auction_id,))
            min_size = cursor.fetchone()['min_squad_size']
            if (check['sudden_death_draws_left'] == 0 and check['sudden_death_needs'] > 0) or check['squad_size'] >= min_size:
                if check['sudden_death_draws_left'] > 0: 
                    cursor.execute("UPDATE auction_teams SET is_finished = 1, sudden_death_draws_left = 0 WHERE id = ?", (at_id,))

        conn.commit(); return jsonify({"message": "Resolved"})
    finally:
        cursor.close(); conn.close()

@app.route('/api/teams/complete', methods=['POST'])
def complete_team_normal():
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT auction_id, squad_size FROM auction_teams WHERE id = ?", (request.json.get('team_id'),))
        team_state = dict(cursor.fetchone())
        cursor.execute("SELECT min_squad_size FROM auctions WHERE id = ?", (team_state['auction_id'],))
        min_size = cursor.fetchone()['min_squad_size']
        if team_state['squad_size'] < min_size: return jsonify({"error": "Minimum squad limit not reached."}), 400
            
        cursor.execute("UPDATE auction_teams SET is_finished = 1 WHERE id = ?", (request.json.get('team_id'),))
        cursor.execute("SELECT id, squad_size FROM auction_teams WHERE auction_id = ? AND is_finished = 0", (team_state['auction_id'],))
        lagging = [dict(row) for row in cursor.fetchall()]
        
        if len(lagging) > 0:
            cursor.execute("UPDATE auctions SET sudden_death_active = 1 WHERE id = ?", (team_state['auction_id'],))
            for lt in lagging:
                needs = max(0, min_size - lt['squad_size'])
                cursor.execute("UPDATE auction_teams SET sudden_death_needs = ?, sudden_death_draws_left = ? WHERE id = ?", (needs, needs * 2, lt['id']))
        conn.commit(); return jsonify({"message": "Locked"})
    finally:
        cursor.close(); conn.close()

@app.route('/api/auctions/finish', methods=['POST'])
def finish_and_crown_auction():
    xi_data = request.json.get('xi_data', {})
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        auction_info = get_active_auction_id(cursor)
        cursor.execute("SELECT at.id, f.id as franchise_id, f.name, at.squad_size, (SELECT COALESCE(SUM(sold_price),0) FROM auction_players WHERE auction_team_id = at.id) as spent FROM auction_teams at JOIN franchises f ON at.franchise_id = f.id WHERE at.auction_id = ?", (auction_info['id'],))
        teams = [dict(row) for row in cursor.fetchall()]
        
        report_cards = []
        for t in teams:
            selected_xi_ids = xi_data.get(str(t['id']), [])
            cursor.execute("SELECT p.id, p.role, ap.ai_rating FROM auction_players ap JOIN players p ON ap.player_id = p.id WHERE ap.auction_team_id = ?", (t['id'],))
            roster = [dict(row) for row in cursor.fetchall()]
            
            playing_xi = [p for p in roster if p['id'] in selected_xi_ids]
            bench = [p for p in roster if p['id'] not in selected_xi_ids]
            if not playing_xi: playing_xi = roster[:11] 
            
            batters = sorted([p['ai_rating'] for p in playing_xi if 'batter' in p['role'].lower() or 'all-rounder' in p['role'].lower()], reverse=True)
            bowlers = sorted([p['ai_rating'] for p in playing_xi if 'bowler' in p['role'].lower() or 'all-rounder' in p['role'].lower()], reverse=True)
            
            core_batting = (sum(batters[:5]) / 5) if len(batters) >= 5 else (sum(batters) / max(1, len(batters)))
            core_bowling = (sum(bowlers[:5]) / 5) if len(bowlers) >= 5 else (sum(bowlers) / max(1, len(bowlers)))
            
            xi_rating = (core_batting * 0.5) + (core_bowling * 0.5)
            bench_rating_avg = sum(p['ai_rating'] for p in bench) / max(1, len(bench)) if bench else 0
            tbi_score = (xi_rating * 0.85) + (bench_rating_avg * 0.15)
            
            highs, lows = [], []
            if core_batting >= 85: highs.append("Elite Top-Order Batting")
            if core_bowling >= 85: highs.append("Lethal 5-Man Bowling Attack")
            if bench_rating_avg >= 75: highs.append("Excellent Bench Depth")
            
            if len(bowlers) < 5: 
                tbi_score -= 15; lows.append("Critical: Lacks 5th Bowling Option")
            if not any('wicketkeeper' in p['role'].lower() for p in playing_xi): 
                tbi_score -= 10; lows.append("No Specialist Wicketkeeper in XI")

            stars = round((max(1, min(100, tbi_score)) / 100) * 5, 1)
            report_cards.append({
                "franchise_id": t['franchise_id'], "team_name": t['name'], 
                "tbi_score": round(tbi_score, 1), "stars": stars, "spent": safe_float(t['spent']),
                "highlights": highs, "drawbacks": lows
            })
            
        report_cards.sort(key=lambda x: x['tbi_score'], reverse=True)

        cursor.execute("SELECT status FROM auctions WHERE id = ?", (auction_info['id'],))
        if cursor.fetchone()['status'] != 'Completed':
            cursor.execute("UPDATE auctions SET status = 'Completed' WHERE id = ?", (auction_info['id'],))
            for index, rc in enumerate(report_cards):
                cursor.execute("INSERT INTO franchise_history (franchise_id, auction_name, tbi_score, is_winner, total_spent) VALUES (?, ?, ?, ?, ?)", 
                               (rc['franchise_id'], auction_info['name'], rc['tbi_score'], 1 if index == 0 else 0, rc['spent']))
        conn.commit(); return jsonify({"rankings": report_cards})
    finally:
        cursor.close(); conn.close()

@app.route('/api/undo', methods=['POST'])
def undo_transaction():
    data = request.json
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        if data.get('was_sold'):
            cursor.execute("UPDATE auction_teams SET purse = purse + ?, squad_size = squad_size - 1, is_finished = 0 WHERE id = ?", (data.get('final_price', 0), data.get('team_id')))
        cursor.execute("UPDATE auction_players SET status = 'Available', sold_price = NULL, auction_team_id = NULL WHERE id = ?", (data.get('player_id'),))
        conn.commit(); return jsonify({"message": "Undo successful."})
    finally:
        cursor.close(); conn.close()

@app.route('/api/roster/<int:team_id>', methods=['GET'])
def get_team_roster(team_id):
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT p.id, p.display_name, p.role, p.country, ap.sold_price, ap.ai_rating FROM auction_players ap JOIN players p ON ap.player_id = p.id WHERE ap.auction_team_id = ?", (team_id,))
        return jsonify([dict(row) for row in cursor.fetchall()])
    finally:
        cursor.close(); conn.close()

@app.route('/api/pool', methods=['GET'])
def get_player_pool():
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        auction_info = get_active_auction_id(cursor)
        if not auction_info: return jsonify([])
        cursor.execute("SELECT p.display_name, p.role, p.base_price, ap.status FROM auction_players ap JOIN players p ON ap.player_id = p.id WHERE ap.auction_id = ? ORDER BY p.display_name ASC", (auction_info['id'],))
        return jsonify([dict(row) for row in cursor.fetchall()])
    finally:
        cursor.close(); conn.close()

@app.route('/api/auctions/<int:auction_id>/details', methods=['GET'])
def get_season_details(auction_id):
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT fh.tbi_score, fh.is_winner, fh.total_spent, f.name 
            FROM franchise_history fh JOIN franchises f ON fh.franchise_id = f.id 
            JOIN auctions a ON fh.auction_name = a.name WHERE a.id = ? ORDER BY fh.tbi_score DESC
        """, (auction_id,))
        standings = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute("""
            SELECT p.display_name, p.role, ap.sold_price, ap.ai_rating, f.name as team_name
            FROM auction_players ap JOIN players p ON ap.player_id = p.id
            JOIN auction_teams at ON ap.auction_team_id = at.id JOIN franchises f ON at.franchise_id = f.id
            WHERE ap.auction_id = ? AND ap.status = 'Sold' ORDER BY ap.sold_price DESC
        """, (auction_id,))
        players = [dict(row) for row in cursor.fetchall()]

        return jsonify({"standings": standings, "rosters": players})
    finally:
        cursor.close(); conn.close()

# 🌟 NEW ENDPOINT: Multiplayer Screen Synchronization
@app.route('/api/broadcast', methods=['GET', 'POST'])
def broadcast_state():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        auction_info = get_active_auction_id(cursor)
        if not auction_info: 
            return jsonify({"error": "No active session"}), 400

        if request.method == 'POST':
            # Host or Guest is pushing a new Bid or Timer state to the server
            state_data = request.json.get('state', '{}')
            cursor.execute("UPDATE auction_meta SET live_state = ? WHERE id = ?", (state_data, auction_info['id']))
            conn.commit()
            return jsonify({"status": "success"})
        else:
            # Guest is pulling the live state to update their screen
            row = cursor.execute("SELECT live_state FROM auction_meta WHERE id = ?", (auction_info['id'],)).fetchone()
            return jsonify({"state": row['live_state'] if row and row['live_state'] else '{}'})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True)