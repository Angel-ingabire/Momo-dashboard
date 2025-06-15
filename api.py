from flask import Flask, jsonify
import mysql.connector
from flask_cors import CORS
from datetime import datetime, time, timedelta
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="momo_database"
    )

# Custom JSON encoder to handle datetime and timedelta
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, time)):
            return obj.isoformat()
        elif isinstance(obj, timedelta):
            return str(obj)
        return super().default(obj)

app.json_encoder = CustomJSONEncoder

@app.route('/api/transactions')
def get_transactions():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Explicitly select columns to avoid any unexpected types
        cursor.execute("""
            SELECT 
                transaction_id,
                category,
                sms_body,
                DATE(sms_date) as sms_date,
                TIME(sms_time) as sms_time,
                amount,
                type
            FROM transactions 
            ORDER BY sms_date DESC, sms_time DESC
        """)
        transactions = cursor.fetchall()
        
        # Convert any remaining non-serializable types
        for tx in transactions:
            if 'sms_time' in tx and tx['sms_time']:
                if isinstance(tx['sms_time'], timedelta):
                    tx['sms_time'] = str(tx['sms_time'])
        
        return jsonify(transactions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/summary')
def get_summary():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM summary WHERE id = 1")
        summary = cursor.fetchone()
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)