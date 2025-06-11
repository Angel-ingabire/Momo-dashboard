"""Script to extract and categorize SMS-based mobile money transactions from an XML file."""

import xml.etree.ElementTree as ET
import re
import logging
from datetime import datetime

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

    transactions.append({
        "category": CATEGORY,
        "date": formatted_date,
        "time": formatted_time,
        "amount": amount,
        "transaction_id": transaction_id,
        "body": smsbody
    })

# Print results (for preview)
for transaction in transactions:
    print(transaction)
