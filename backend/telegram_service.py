"""
Telegram messaging service for NeuroAssist.
Sends messages via Bot API and polls for incoming messages.
"""

import os
import time
import requests
import threading
import logging
from db import get_contact_by_chat_id, add_message

logger = logging.getLogger(__name__)

# Polling state
_is_polling = False
_last_update_id = 0
_socket_emit_callback = None

def _get_bot_token() -> str:
    """Get the Telegram Bot token from environment."""
    return os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()

def send_telegram_message(chat_id: str, message: str) -> dict:
    """
    Send a text message to a Telegram chat.
    """
    try:
        token = _get_bot_token()
        if not token:
            return {"success": False, "error": "Bot token not configured"}
            
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML",
        }
        resp = requests.post(url, json=payload, timeout=10)
        data = resp.json()

        if data.get("ok"):
            logger.info(f"Message sent to chat_id={chat_id}")
            return {"success": True}
        else:
            error_msg = data.get("description", "Unknown Telegram API error")
            logger.error(f"Telegram API error: {error_msg}")
            return {"success": False, "error": error_msg}

    except requests.RequestException as e:
        logger.error(f"Network error sending Telegram message: {e}")
        return {"success": False, "error": f"Network error: {str(e)}"}

def _polling_loop():
    """Background thread loop that polls Telegram getUpdates for new messages."""
    global _last_update_id
    logger.info("Started Telegram polling background thread.")
    
    while _is_polling:
        token = _get_bot_token()
        if not token:
            time.sleep(5)
            continue
            
        try:
            url = f"https://api.telegram.org/bot{token}/getUpdates"
            params = {"offset": _last_update_id + 1, "timeout": 10}
            resp = requests.get(url, params=params, timeout=12) # timeout slightly > long-poll timeout
            data = resp.json()
            
            if data.get("ok"):
                for event in data.get("result", []):
                    _last_update_id = event["update_id"]
                    
                    # Look for regular messages containing text
                    if "message" in event and "text" in event["message"]:
                        msg = event["message"]
                        chat_id = str(msg["chat"]["id"])
                        text = msg["text"]
                        msg_id = msg["message_id"]
                        
                        # Match to a saved contact
                        contact = get_contact_by_chat_id(chat_id)
                        if contact:
                            logger.info(f"Incoming message from {contact['name']}")
                            # Save to DB
                            saved = add_message(contact["id"], "contact", text, telegram_msg_id=msg_id)
                            # Emit via socket to update UI live
                            if saved and _socket_emit_callback:
                                _socket_emit_callback('telegram_message', {
                                    "contact_id": contact["id"],
                                    "message": saved
                                })
            time.sleep(1) # Short inter-poll delay
        except Exception as e:
            logger.error(f"Telegram polling error: {e}")
            time.sleep(5) # Backoff on error

def start_polling(emit_callback=None):
    """Start the polling loop in a background thread."""
    global _is_polling, _socket_emit_callback
    if not _is_polling:
        _is_polling = True
        _socket_emit_callback = emit_callback
        threading.Thread(target=_polling_loop, daemon=True).start()

def stop_polling():
    """Stop the polling loop."""
    global _is_polling
    _is_polling = False
