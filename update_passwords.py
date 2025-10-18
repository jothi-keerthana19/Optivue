#!/usr/bin/env python3
"""
Script to update all user passwords to "123456"
"""
import sqlite3
import bcrypt

def update_all_passwords():
    # Hash the new password
    new_password = "123456"
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Connect to database
    conn = sqlite3.connect('database.db')
    cur = conn.cursor()
    
    try:
        # Get all users
        cur.execute('SELECT id, username FROM users')
        users = cur.fetchall()
        
        print(f"Found {len(users)} users to update:")
        for user in users:
            print(f"  - ID: {user[0]}, Username: {user[1]}")
        
        # Update all passwords
        cur.execute('UPDATE users SET password_hash = ?', (password_hash,))
        rows_affected = cur.rowcount
        
        # Commit changes
        conn.commit()
        
        print(f"\n✅ Successfully updated passwords for {rows_affected} users")
        print("All user passwords are now set to: 123456")
        
        # Verify the update
        print("\nVerification - Users after update:")
        cur.execute('SELECT id, username FROM users')
        updated_users = cur.fetchall()
        for user in updated_users:
            print(f"  - ID: {user[0]}, Username: {user[1]} ✓")
            
    except Exception as e:
        print(f"❌ Error updating passwords: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    update_all_passwords()