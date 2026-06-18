from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import os
import random
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
    cursor.execute("SELECT id, pitch_type, min_squad_size, sudden_death_active FROM auctions WHERE status = 'In Progress' ORDER BY id DESC LIMIT 1")
    return cursor.fetchone()

# ==========================================
# ADVANCED AI EVALUATION CORE ENGINE
# ==========================================
def calculate_ai_player_metrics(player, pitch_type):
    base_rating = 50.0
    
    # SAFE CASTING: Protects against NULL/empty cells in the database
    role = str(player.get('role') or '').lower()
    highlight = str(player.get('career_highlight') or '').lower()
    pitch_type = str(pitch_type or 'Standard')
    
    bat_avg = float(player.get('batting_avg') or 0)
    bat_sr = float(player.get('batting_strike_rate') or 0)
    
    if 'batter' in role or 'all-rounder' in role or 'wicketkeeper' in role:
        sr_bonus = ((bat_sr - 120) * 0.7) if bat_sr > 120 else ((bat_sr - 120) * 0.4)
        avg_bonus = (bat_avg - 25) * 0.5
        base_rating += (sr_bonus + avg_bonus)

    bowl_econ = float(player.get('bowling_economy') or 0)
    bowl_sr = float(player.get('bowling_strike_rate') or 0)
    
    if 'bowler' in role or 'all-rounder' in role:
        if bowl_econ > 0:
            econ_bonus = (7.5 - bowl_econ) * 6.0
            sr_bowling_bonus = (24 - bowl_sr) * 0.4 if bowl_sr > 0 else 0
            base_rating += (econ_bonus + sr_bowling_bonus)

    rating = max(15, min(95, int(base_rating)))
    advice = "Standard performance variables. High-utility selections recommended."
    
    if pitch_type == 'Green Top':
        if 'fast' in highlight or 'pace' in highlight or 'seam' in highlight or role == 'bowler':
            rating = min(99, int(rating * 1.20))
            advice = "🌱 Green Top Modifier: Seam velocity and bounce frequency metrics heavily boosted."
        elif 'spin' in highlight:
            rating = max(10, int(rating * 0.85))
            advice = "🌱 Green Top Modifier: Surface friction reduced. Spin depth may suffer containment issues."
            
    elif pitch_type == 'Dust Bowl':
        if 'spin' in highlight or 'turn' in highlight or 'finger' in highlight:
            rating = min(99, int(rating * 1.25))
            advice = "🌪️ Dust Bowl Modifier: Elite spin variants gain severe kinetic friction and grip variables."
        elif 'batter' in role:
            advice = "🌪️ Dust Bowl Modifier: Low-risk technical anchors heavily preferred over power-hitters here."
            
    elif pitch_type == 'Flat Track':
        if 'batter' in role or 'hitter' in highlight or 'six' in highlight:
            rating = min(99, int(rating * 1.20))
            advice = "超 Flat Track Modifier: Boundary strike-rate velocity heavily favored. Pure batting depth is vital."
        elif role == 'bowler':
            rating = max(10, int(rating * 0.80))
            advice = "超 Flat Track Modifier: Extreme boundary clearing hazard. Bowling containment is penalized."

    return rating, advice

# ==========================================
# LOBBY & SYSTEM CORE MANAGEMENT ROUTES
# ==========================================

@app.route('/api/lobby/data', methods=['GET'])
def get_lobby_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM franchises ORDER BY name ASC")
    franchises = cursor.fetchall()
    cursor.execute("SELECT * FROM auctions ORDER BY id DESC")
    auctions = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"franchises": franchises, "auctions": auctions})

@app.route('/api/franchises/add', methods=['POST'])
def add_franchise():
    data = request.json
    name = data.get('name')
    if not name: return jsonify({"error": "Name field blank"}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO franchises (name) VALUES (%s)", (name,))
        conn.commit()
        return jsonify({"message": "Permanent franchise registered!"})
    except Exception:
        conn.rollback()
        return jsonify({"error": "Franchise unique constraint failure."}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/lobby/new', methods=['POST'])
def create_new_auction():
    data = request.json
    name = data.get('name', 'Custom Auction')
    franchise_ids = data.get('franchise_ids', [])
    budget_cr = data.get('budget', 100)
    pitch_type = data.get('pitch_type', 'Standard')
    min_squad_size = data.get('min_squad_size', 15)
    starting_purse = int(budget_cr) * 10000000 
    if not franchise_ids: return jsonify({"error": "Roster composition empty!"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("UPDATE auctions SET status = 'Paused'")
        cursor.execute("""
            INSERT INTO auctions (name, pitch_type, min_squad_size, status) 
            VALUES (%s, %s, %s, 'In Progress')
        """, (name, pitch_type, min_squad_size))
        auction_id = cursor.lastrowid
        
        for f_id in franchise_ids:
            cursor.execute("""
                INSERT INTO auction_teams (auction_id, franchise_id, purse, squad_size) 
                VALUES (%s, %s, %s, 0)
            """, (auction_id, f_id, starting_purse))
            
        cursor.execute("SELECT id FROM players")
        players = cursor.fetchall()
        for p in players:
            cursor.execute("INSERT INTO auction_players (auction_id, player_id, status) VALUES (%s, %s, 'Available')", (auction_id, p['id']))
            
        conn.commit()
        return jsonify({"message": "Auction Engine Online", "auction_id": auction_id})
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
    return jsonify({"message": "State verification verified."})

@app.route('/api/lobby/delete', methods=['POST'])
def delete_auction():
    data = request.json
    auction_id = data.get('auction_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM auctions WHERE id = %s", (auction_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Cascaded cleanup successful."})

# ==========================================
# LIVE AUCTION GAMEPLAY & SYSTEM ROUTING
# ==========================================

@app.route('/api/teams', methods=['GET'])
def get_teams():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    auction_info = get_active_auction_id(cursor)
    if not auction_info: return jsonify({"error": "No active session"}), 400
        
    cursor.execute("""
        SELECT at.id, f.name, at.purse, at.squad_size, at.is_finished, 
               at.sudden_death_draws_left, at.sudden_death_needs,
               (SELECT COALESCE(SUM(sold_price), 0) FROM auction_players WHERE auction_team_id = at.id) as spent
        FROM auction_teams at
        JOIN franchises f ON at.franchise_id = f.id
        WHERE at.auction_id = %s
    """, (auction_info['id'],))
    teams = cursor.fetchall()
    
    # SAFE CASTING: Ensure Decimals are stripped before sending to JSON
    for t in teams:
        t['spent'] = float(t['spent'] or 0)
        t['purse'] = float(t['purse'] or 0)

    cursor.close()
    conn.close()
    return jsonify({"teams": teams, "meta": auction_info})

@app.route('/api/next-player', methods=['GET'])
def get_next_player():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    auction_info = get_active_auction_id(cursor)
    if not auction_info: return jsonify({"error": "Active reference error"}), 400
    
    cursor.execute("""
            SELECT at.id, f.name, at.sudden_death_draws_left, at.sudden_death_needs 
            FROM auction_teams at
            JOIN franchises f ON at.franchise_id = f.id
            WHERE at.auction_id = %s AND at.is_finished = 0 AND at.sudden_death_draws_left > 0 
            LIMIT 1
    """, (auction_info['id'],))
    sd_team = cursor.fetchone()
    
    cursor.execute("""
        SELECT ap.id as auction_player_id, p.id, p.display_name, p.role, p.country, p.base_price, p.career_highlight,
               p.batting_avg, p.batting_strike_rate, p.bowling_economy, p.bowling_strike_rate
        FROM auction_players ap
        JOIN players p ON ap.player_id = p.id
        WHERE ap.auction_id = %s AND ap.status = 'Available' 
        ORDER BY RAND() LIMIT 1
    """, (auction_info['id'],))
    player = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if player:
        # SAFE CASTING: Cast database Decimal objects into standard Python floats
        player['batting_avg'] = float(player.get('batting_avg') or 0)
        player['batting_strike_rate'] = float(player.get('batting_strike_rate') or 0)
        player['bowling_economy'] = float(player.get('bowling_economy') or 0)
        player['bowling_strike_rate'] = float(player.get('bowling_strike_rate') or 0)

        ai_rating, ai_advice = calculate_ai_player_metrics(player, auction_info['pitch_type'])
        player['ai_rating'] = ai_rating
        player['ai_advice'] = ai_advice
        return jsonify({
            "player": player,
            "sudden_death_turn": sd_team
        })
    else:
        return jsonify({"error": "Roster indexing exhausted!"}), 404

@app.route('/api/resolve-player', methods=['POST'])
def resolve_player():
    data = request.json
    ap_id = data.get('player_id')
    status = data.get('status')
    at_id = data.get('team_id')
    final_price = data.get('final_price', 0)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT auction_id FROM auction_players WHERE id = %s", (ap_id,))
        ap_info = cursor.fetchone()
        auction_id = ap_info['auction_id']

        if status == 'Sold':
            cursor.execute("SELECT purse, squad_size, sudden_death_draws_left FROM auction_teams WHERE id = %s", (at_id,))
            team = cursor.fetchone()
            if team['purse'] < final_price: return jsonify({"error": "Purse limit constraint violation!"}), 400

            cursor.execute("UPDATE auction_teams SET purse = purse - %s, squad_size = squad_size + 1 WHERE id = %s", (final_price, at_id))
            cursor.execute("UPDATE auction_players SET status = 'Sold', sold_price = %s, auction_team_id = %s WHERE id = %s", (final_price, at_id, ap_id))
            
            if team['sudden_death_draws_left'] > 0:
                cursor.execute("""
                    UPDATE auction_teams 
                    SET sudden_death_draws_left = sudden_death_draws_left - 1,
                        sudden_death_needs = GREATEST(0, sudden_death_needs - 1)
                    WHERE id = %s
                """, (at_id,))
                
        elif status == 'Unsold':
            cursor.execute("UPDATE auction_players SET status = 'Unsold' WHERE id = %s", (ap_id,))
            if at_id:
                cursor.execute("UPDATE auction_teams SET sudden_death_draws_left = sudden_death_draws_left - 1 WHERE id = %s", (at_id,))

        if at_id:
            cursor.execute("SELECT sudden_death_draws_left, sudden_death_needs, squad_size FROM auction_teams WHERE id = %s", (at_id,))
            check = cursor.fetchone()
            cursor.execute("SELECT min_squad_size FROM auctions WHERE id = %s", (auction_id,))
            min_size = cursor.fetchone()['min_squad_size']
            
            if (check['sudden_death_draws_left'] == 0 and check['sudden_death_needs'] > 0) or check['squad_size'] >= min_size:
                if check['sudden_death_draws_left'] > 0: 
                    cursor.execute("UPDATE auction_teams SET is_finished = 1, sudden_death_draws_left = 0 WHERE id = %s", (at_id,))

        conn.commit()
        return jsonify({"message": "Mutation matrix successful"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ==========================================
# SUDDEN DEATH STATE TRIGGER ROUTING
# ==========================================

@app.route('/api/teams/complete', methods=['POST'])
def complete_team_normal():
    data = request.json
    at_id = data.get('team_id')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT auction_id, squad_size FROM auction_teams WHERE id = %s", (at_id,))
        team_state = cursor.fetchone()
        auc_id = team_state['auction_id']
        
        cursor.execute("SELECT min_squad_size FROM auctions WHERE id = %s", (auc_id,))
        min_size = cursor.fetchone()['min_squad_size']
        
        if team_state['squad_size'] < min_size:
            return jsonify({"error": "Roster structural composition minimum requirement failure."}), 400
            
        cursor.execute("UPDATE auction_teams SET is_finished = 1 WHERE id = %s", (at_id,))
        cursor.execute("SELECT id, squad_size FROM auction_teams WHERE auction_id = %s AND is_finished = 0", (auc_id,))
        lagging_teams = cursor.fetchall()
        
        if len(lagging_teams) > 0:
            cursor.execute("UPDATE auctions SET sudden_death_active = 1 WHERE id = %s", (auc_id,))
            for lt in lagging_teams:
                needs = max(0, min_size - lt['squad_size'])
                draws = needs * 2
                cursor.execute("""
                    UPDATE auction_teams 
                    SET sudden_death_needs = %s, sudden_death_draws_left = %s 
                    WHERE id = %s
                """, (needs, draws, lt['id']))
                
        conn.commit()
        return jsonify({"message": "Roster calculation sealed. Operational state initialized."})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ==========================================
# POST-AUCTION SQUAD ANALYTICS REPORTING
# ==========================================

@app.route('/api/auctions/rate-squads', methods=['GET'])
def rate_squads_end():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    auction_info = get_active_auction_id(cursor)
    
    if not auction_info: return jsonify({"error": "No tracking context active"}), 400
    
    cursor.execute("""
        SELECT at.id, f.name, at.purse, at.squad_size
        FROM auction_teams at
        JOIN franchises f ON at.franchise_id = f.id
        WHERE at.auction_id = %s
    """, (auction_info['id'],))
    teams = cursor.fetchall()
    
    report_cards = []
    for t in teams:
        cursor.execute("""
            SELECT p.role, p.batting_avg, p.batting_strike_rate, p.bowling_economy, p.career_highlight, ap.sold_price
            FROM auction_players ap
            JOIN players p ON ap.player_id = p.id
            WHERE ap.auction_team_id = %s
        """, (t['id'],))
        roster = cursor.fetchall()
        
        # SAFE CASTING applied heavily to analytical aggregations
        batters_count = sum(1 for p in roster if 'batter' in str(p.get('role') or '').lower() or 'all-rounder' in str(p.get('role') or '').lower())
        bowlers_count = sum(1 for p in roster if 'bowler' in str(p.get('role') or '').lower() or 'all-rounder' in str(p.get('role') or '').lower())
        keepers_count = sum(1 for p in roster if 'wicketkeeper' in str(p.get('role') or '').lower())
        
        avg_sr = sum(float(p.get('batting_strike_rate') or 0) for p in roster) / max(1, len(roster))
        avg_econ = sum(float(p.get('bowling_economy') or 0) for p in roster if float(p.get('bowling_economy') or 0) > 0) / max(1, bowlers_count)
        
        tbi_score = 50
        tbi_score += (batters_count * 3) + (bowlers_count * 3)
        if keepers_count >= 1: tbi_score += 15
        else: tbi_score -= 20 
        
        if avg_sr > 135: tbi_score += 10
        if avg_econ > 0 and avg_econ < 7.8: tbi_score += 15
        
        pitch = auction_info['pitch_type']
        surface_match = "Neutral parameters"
        if pitch == 'Green Top':
            pacers = sum(1 for p in roster if 'fast' in str(p.get('career_highlight') or '').lower() or 'pace' in str(p.get('career_highlight') or '').lower())
            if pacers >= 3: tbi_score += 15; surface_match = "Elite Pace Optimization Matrix verified."
        elif pitch == 'Dust Bowl':
            spinners = sum(1 for p in roster if 'spin' in str(p.get('career_highlight') or '').lower() or 'turn' in str(p.get('career_highlight') or '').lower())
            if spinners >= 3: tbi_score += 15; surface_match = "Elite Rotation Core optimized for turning surfaces."
            
        tbi_score = max(30, min(100, tbi_score))
        
        if tbi_score >= 90: grade = 'S'
        elif tbi_score >= 75: grade = 'A'
        elif tbi_score >= 60: grade = 'B'
        elif tbi_score >= 45: grade = 'C'
        else: grade = 'D'
        
        report_cards.append({
            "team_name": t['name'],
            "grade": grade,
            "tbi_score": tbi_score,
            "batting_velocity": "High Impact" if avg_sr > 135 else "Conservative Anchor Formulation",
            "bowling_containment": f"Phase Average: {avg_econ:.2f} RPO" if avg_econ > 0 else "Insufficient Data",
            "surface_alignment": surface_match
        })
        
    cursor.close()
    conn.close()
    return jsonify(report_cards)

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
            cursor.execute("UPDATE auction_teams SET purse = purse + %s, squad_size = squad_size - 1, is_finished = 0 WHERE id = %s", (final_price, team_id))
        cursor.execute("UPDATE auction_players SET status = 'Available', sold_price = NULL, auction_team_id = NULL WHERE id = %s", (player_id,))
        conn.commit()
        return jsonify({"message": "Transaction trace neutralized."})
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

@app.route('/api/pool', methods=['GET'])
def get_player_pool():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    auction_info = get_active_auction_id(cursor)
    if not auction_info: return jsonify([])
    cursor.execute("""
        SELECT p.display_name, p.role, p.base_price, ap.status 
        FROM auction_players ap
        JOIN players p ON ap.player_id = p.id
        WHERE ap.auction_id = %s
        ORDER BY p.display_name ASC
    """, (auction_info['id'],))
    pool = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(pool)

if __name__ == '__main__':
    app.run(port=5000, debug=True)