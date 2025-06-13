'''function to calculate the summary of transactions in the table'''
import logging
import mysql.connector

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_summary():
    """
    Creates the summary table (if it doesn't exist) with four columns:
      - total: total amount of transactions 
      - incoming: count of transactions where category is 'Incoming Money'
      - payments: count of transactions for payment-related categories:
            'Payment to Code Holder', 'Transfers to Mobile Numbers',
            'Airtime Bill Payments', 'Cash Power Bill Payments',
            'Bank Transfers',
            'Internet and Voice Bundle Purchases'
      - deposits: count of transactions where category is 'Bank Deposits'
    Then, updates the single summary row (id = 1) with these counts.
    """
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="root",
            database="momo_database"
        )
        cursor = conn.cursor()

        # Create the summary table if it doesn't exist
        create_table_query = """
        CREATE TABLE IF NOT EXISTS summary (
            id INT PRIMARY KEY,
            total INT DEFAULT 0,
            incomings INT DEFAULT 0,
            payments INT DEFAULT 0,
            deposits INT DEFAULT 0
        )
        """
        cursor.execute(create_table_query)
        conn.commit()

        # Ensure a single summary row exists with id = 1
        insert_row_query = """
        INSERT IGNORE INTO summary (id, total, incomings, payments, deposits)
        VALUES (1, 0, 0, 0, 0)
        """
        cursor.execute(insert_row_query)
        conn.commit()

        # Update summary counts using subqueries from the transactions table
        update_query = """
        UPDATE summary
        SET 
            total = (
                SELECT COUNT(*) FROM transactions
            ),
            incomings = (
                SELECT COUNT(*) FROM transactions
                WHERE transactions.category = 'Incoming Money'
            ),
            payments = (
                SELECT COUNT(*) FROM transactions
                WHERE transactions.category IN (
                    'Payment to Code Holder', 
                    'Transfers to Mobile Numbers',
                    'Airtime Bill Payments',
                    'Cash Power Bill Payments',
                    'Transactions Initiated by Third Parties',
                    'Bank Transfers',
                    'Internet and Voice Bundle Purchases'
                )
            ),
            deposits = (
                SELECT COUNT(*) FROM transactions
                WHERE transactions.category = 'Bank Deposits'
            )
        WHERE id = 1
"""

        cursor.execute(update_query)
        conn.commit()

        cursor.close()
        conn.close()
        logger.info("Summary table updated successfully.")
    except mysql.connector.Error as err:
        logger.error("Database error in update_summary: %s", err)
        raise
    except Exception as e:
        logger.error("General error in update_summary: %s", e)
        raise

if __name__ == '__main__':
    update_summary()
    print("Summary updated successfully.")
