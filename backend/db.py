import sqlite3
import os
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "neuroassist.db")

def get_db():
    """Get a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database schema."""
    conn = get_db()
    c = conn.cursor()
    
    # Contacts table
    c.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            chat_id TEXT NOT NULL UNIQUE
        )
    ''')
    
    # Messages table
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id TEXT NOT NULL,
            sender TEXT NOT NULL, -- 'user' or 'contact'
            text TEXT NOT NULL,
            timestamp REAL NOT NULL,
            read_status INTEGER DEFAULT 0, -- 0=unread, 1=read
            telegram_msg_id INTEGER, -- to avoid duplicates
            FOREIGN KEY (contact_id) REFERENCES contacts(id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize on module load
init_db()

# --- Contacts API ---

import uuid

def get_contacts():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id, name, chat_id FROM contacts')
    rows = c.fetchall()
    conn.close()
    return [{"id": r["id"], "name": r["name"], "chat_id": r["chat_id"]} for r in rows]

def get_contact_by_chat_id(chat_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id, name, chat_id FROM contacts WHERE chat_id = ?', (str(chat_id),))
    row = c.fetchone()
    conn.close()
    if row:
        return {"id": row["id"], "name": row["name"], "chat_id": row["chat_id"]}
    return None

def add_contact(name, chat_id):
    existing = get_contact_by_chat_id(chat_id)
    if existing:
        return {"error": f"Contact with chat ID {chat_id} already exists"}
        
    conn = get_db()
    c = conn.cursor()
    contact_id = str(uuid.uuid4())[:8]
    c.execute('INSERT INTO contacts (id, name, chat_id) VALUES (?, ?, ?)', (contact_id, name, str(chat_id)))
    conn.commit()
    conn.close()
    return {"id": contact_id, "name": name, "chat_id": str(chat_id)}

def delete_contact(contact_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM contacts WHERE id = ?', (contact_id,))
    deleted = c.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# --- Messages API ---

def add_message(contact_id, sender, text, telegram_msg_id=None):
    """
    Save a message.
    sender should be 'user' (outgoing) or 'contact' (incoming).
    """
    # Check for duplicates if it's an incoming message
    conn = get_db()
    c = conn.cursor()
    
    if telegram_msg_id is not None:
        c.execute('SELECT id FROM messages WHERE telegram_msg_id = ?', (telegram_msg_id,))
        if c.fetchone():
            conn.close()
            return None # Already exists
            
    timestamp = time.time()
    c.execute('''
        INSERT INTO messages (contact_id, sender, text, timestamp, telegram_msg_id)
        VALUES (?, ?, ?, ?, ?)
    ''', (contact_id, sender, text, timestamp, telegram_msg_id))
    
    msg_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": msg_id,
        "contact_id": contact_id,
        "sender": sender,
        "text": text,
        "timestamp": timestamp
    }

def get_messages(contact_id, limit=50):
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT id, sender, text, timestamp, read_status
        FROM messages
        WHERE contact_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    ''', (contact_id, limit))
    rows = c.fetchall()
    
    # Mark as read
    c.execute('UPDATE messages SET read_status = 1 WHERE contact_id = ? AND sender = "contact"', (contact_id,))
    conn.commit()
    conn.close()
    
    # Return chronologically (oldest first)
    messages = [{"id": r["id"], "sender": r["sender"], "text": r["text"], "timestamp": r["timestamp"]} for r in rows]
    return list(reversed(messages))

def get_chats_overview():
    """Get all contacts with their latest message details."""
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT c.id, c.name, c.chat_id, 
               m.text as last_message, m.timestamp, m.sender,
               (SELECT COUNT(*) FROM messages WHERE contact_id = c.id AND sender = 'contact' AND read_status = 0) as unread_count
        FROM contacts c
        LEFT JOIN messages m ON m.id = (
            SELECT id FROM messages 
            WHERE contact_id = c.id 
            ORDER BY timestamp DESC LIMIT 1
        )
        ORDER BY m.timestamp DESC NULLS LAST
    ''')
    rows = c.fetchall()
    conn.close()
    
    return [{
        "id": r["id"],
        "name": r["name"],
        "chat_id": r["chat_id"],
        "last_message": r["last_message"],
        "timestamp": r["timestamp"],
        "last_sender": r["sender"],
        "unread_count": r["unread_count"]
    } for r in rows]
