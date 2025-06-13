"""Script to extract and categorize SMS-based mobile money transactions from an XML file."""

import xml.etree.ElementTree as ET
import re
import logging
from datetime import datetime

import mysql.connector

print("Connected successfully!")

# Configure logging for unprocessed messages
logging.basicConfig(
    filename='unprocessed_sms.log',
    level=logging.WARNING,
    format='%(asctime)s - %(message)s'
)

# Parse XML file
tree = ET.parse('modified_sms_v2.xml')
root = tree.getroot()


def extract_amount(sms_body):
    """Extracts the transaction amount from the SMS body."""
    match = re.search(r'([0-9]+[,.]?[0-9]*) RWF', sms_body)
    return int(match.group(1).replace(',', '')) if match else None


def extract_transaction_id(sms_body):
    """Extracts the transaction ID from the SMS body."""
    match = re.search(r'TxId[:\s]+(\d+)', sms_body)
    return match.group(1) if match else None


def format_date(timestamp):
    """Converts a timestamp to a readable date and time format."""
    try:
        dt = datetime.fromtimestamp(int(timestamp) / 1000)
        return dt.strftime('%Y-%m-%d'), dt.strftime('%H:%M:%S')
    except ValueError:
        return None, None


# Define transaction categories
CATEGORIES = {
    "Incoming Money": ["received"],
    "Payment to Code Holder": ["payment"],
    "Transfers to Mobile Numbers": ["transferred"],
    "Bank Deposits": ["deposit"],
    "Airtime Bill Payments": ["Airtime"],
    "Cash Power Bill Payments": ["Power"],
    "Transactions Initiated by Third Parties": ["transaction"],
    "Withdrawals from Agents": ["via agent"],
    "Bank Transfers": ["bank transfer"],
    "Internet and Voice Bundle Purchases": ["Bundles"]
}

# Initialize data structure for relational database
transactions = []

# Process SMS data
for sms in root.findall('sms'):
    smsbody = sms.get('body', "")
    sms_date = sms.get('date')
    formatted_date, formatted_time = format_date(sms_date)
    amount = extract_amount(smsbody)
    transaction_id = extract_transaction_id(smsbody)

    # Ignore SMS without essential data
    if not smsbody or not formatted_date or amount is None:
        logging.warning("Unprocessed SMS: %s", smsbody)
        continue

    CATEGORY = "Text to ignore"
    for cat, keywords in CATEGORIES.items():
        if any(keyword in smsbody for keyword in keywords):
            CATEGORY = cat
            break
    TYPE_VALUE = "credit" if "received" in smsbody.lower() else "debit"

    transactions.append({
        "category": CATEGORY,
        "date": formatted_date,
        "time": formatted_time,
        "amount": amount,
        "transaction_id": transaction_id,
        "body": smsbody,
        "type": TYPE_VALUE
    })

# MySQL Connection Setup
try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="momo_database"
    )
    print("Connected to MySQL database!")
except mysql.connector.Error as err:
    print(f"Error connecting to MySQL: {err}")
    exit()
cursor = conn.cursor()

# Create table if not exists
CREATE_TABLE_QUERY = """
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50) NULL,
    category VARCHAR(255),
    sms_body TEXT,
    sms_date DATE,
    sms_time TIME,
    amount DECIMAL(10,2),
    type VARCHAR(50)
);
"""
cursor.execute(CREATE_TABLE_QUERY)
conn.commit()

# Insert Transactions into MySQL
INSERT_QUERY = """
    INSERT INTO transactions (transaction_id, category, sms_body, sms_date, sms_time, amount, type)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
"""

for transaction in transactions:
    try:
        cursor.execute(INSERT_QUERY, (
            transaction["transaction_id"],
            transaction["category"],
            transaction["body"],
            transaction["date"],
            transaction["time"],
            transaction["amount"],
            transaction["type"]
        ))
    except mysql.connector.Error as e:
        logging.error("Error inserting transaction: %s\n%s", transaction["body"], e)
# Commit and Close Connection
conn.commit()
cursor.close()
conn.close()

print("Transactions successfully inserted into MySQL!")
