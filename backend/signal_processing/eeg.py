import numpy as np
from scipy.signal import iirnotch, butter, lfilter
import math
import time
import logging

logger = logging.getLogger(__name__)

class EEGProcessor:
    def __init__(self, sampling_rate=500):
        self.sampling_rate = sampling_rate
        # Filters
        self.b_notch, self.a_notch = iirnotch(50.0 / (sampling_rate / 2), 30.0)
        self.b_band, self.a_band = butter(4, [0.5 / (sampling_rate / 2), 48.0 / (sampling_rate / 2)], btype='band')
        
        # --- Focus State Detection (inspired by Brain Bubbles beta threshold) ---
        # Hysteresis thresholds: enter FOCUSED at high, exit at low
        self.FOCUS_HIGH_THRESHOLD = 0.45   # beta+gamma ratio to enter FOCUSED
        self.FOCUS_LOW_THRESHOLD  = 0.30   # beta+gamma ratio to exit FOCUSED
        self.FOCUS_HOLD_TIME_S    = 2.0    # minimum seconds before state can change again
        
        # Moving average smoother for focus level
        self.SMOOTH_WINDOW = 5
        self._focus_buffer = []
        
        # State tracking
        self._focus_state = "RELAXED"      # "FOCUSED" or "RELAXED"
        self._last_state_change = 0.0      # timestamp of last transition
        
    def apply_filters(self, eeg_point):
        """Apply Notch and Bandpass filters (stateless per-call, kept for API compat)."""
        pass

    def calculate_focus_level(self, eeg_data):
        """
        Calculate focus level from a buffer of EEG data.
        Returns beta+gamma ratio (0.0 to 1.0).
        """
        if len(eeg_data) == 0:
            return 0.0

        window = np.hanning(len(eeg_data))  
        eeg_data_windowed = eeg_data * window
        fft_data = np.abs(np.fft.fft(eeg_data_windowed))[:len(eeg_data_windowed) // 2]
        fft_data /= len(eeg_data_windowed)
        freqs = np.fft.fftfreq(len(eeg_data_windowed), d=1 / self.sampling_rate)[:len(eeg_data_windowed) // 2]
        
        delta_power = math.sqrt(np.sum((fft_data[(freqs >= 0.5) & (freqs <= 4)]) ** 2))
        theta_power = math.sqrt(np.sum((fft_data[(freqs >= 4) & (freqs <= 8)]) ** 2))
        alpha_power = math.sqrt(np.sum((fft_data[(freqs >= 8) & (freqs <= 13)]) ** 2))
        beta_power = math.sqrt(np.sum((fft_data[(freqs >= 13) & (freqs <= 30)]) ** 2))
        gamma_power = math.sqrt(np.sum((fft_data[(freqs >= 30) & (freqs <= 45)]) ** 2))
        
        total_power = delta_power + theta_power + alpha_power + beta_power + gamma_power
        if total_power == 0:
            return 0.0
            
        power = (beta_power + gamma_power) / total_power
        return power

    def update_focus_state(self, focus_level):
        """
        Track smoothed focus level and detect state transitions.
        Returns a command event dict on transitions, or None if no change.
        
        Uses hysteresis to prevent rapid flickering:
          - Enter FOCUSED when smoothed level >= FOCUS_HIGH_THRESHOLD
          - Exit  FOCUSED when smoothed level <= FOCUS_LOW_THRESHOLD
          - Must hold state for FOCUS_HOLD_TIME_S before changing again
        """
        # Update moving average
        self._focus_buffer.append(focus_level)
        if len(self._focus_buffer) > self.SMOOTH_WINDOW:
            self._focus_buffer.pop(0)
        
        smoothed = sum(self._focus_buffer) / len(self._focus_buffer)
        
        now = time.time()
        time_since_change = now - self._last_state_change
        
        # Don't allow state change until hold time has passed
        if time_since_change < self.FOCUS_HOLD_TIME_S:
            return None
        
        new_state = self._focus_state
        
        if self._focus_state == "RELAXED" and smoothed >= self.FOCUS_HIGH_THRESHOLD:
            new_state = "FOCUSED"
        elif self._focus_state == "FOCUSED" and smoothed <= self.FOCUS_LOW_THRESHOLD:
            new_state = "RELAXED"
        
        if new_state != self._focus_state:
            old_state = self._focus_state
            self._focus_state = new_state
            self._last_state_change = now
            logger.info(f"[FOCUS] State change: {old_state} → {new_state} (smoothed={smoothed:.3f})")
            
            # Emit as a command event — mapped to keyboard key on frontend
            return {
                "type": "focus",
                "action": "FOCUS",
                "state": new_state,
                "focus_level": round(smoothed, 3)
            }
        
        return None
