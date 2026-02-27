import pyautogui
import logging

logger = logging.getLogger(__name__)

class KeyboardController:
    def __init__(self):
        self.enabled = False
        # Map signals to keys
        # We can make this configurable later
        self.key_map = {
            "DOT": "left",          # Left Arrow
            "DASH": "right",        # Right Arrow
            "SEND": "enter",        # Enter / Select
            "BACKSPACE": "backspace", # Backspace
            "DOUBLE_BLINK": "enter",
            "TRIPLE_BLINK": "backspace"
        }
        
        # Safety fail-safe: moving mouse to corner throws exception
        pyautogui.FAILSAFE = True
        
    def set_enabled(self, enabled: bool):
        self.enabled = enabled
        logger.info(f"Keyboard Controller {'Enabled' if enabled else 'Disabled'}")

    def process_event(self, action: str):
        if not self.enabled:
            return
            
        if action in self.key_map:
            key = self.key_map[action]
            try:
                logger.info(f"Simulating Key Press: {key}")
                pyautogui.press(key)
            except Exception as e:
                logger.error(f"Error simulating key press: {e}")
