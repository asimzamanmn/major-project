import numpy as np
from collections import deque
import time

# High-Pass Butterworth IIR digital filter
# Sampling rate: 500.0 Hz, frequency: 1.0 Hz
class EOGFilter:
    def __init__(self):
        self.z1_0 = 0.0
        self.z2_0 = 0.0

    def process(self, input_sample):
        output = input_sample
        x = output - (-1.98222893 * self.z1_0) - (0.98238545 * self.z2_0)
        output = 0.99115360 * x + -1.98230719 * self.z1_0 + 0.99115360 * self.z2_0
        self.z2_0 = self.z1_0
        self.z1_0 = x
        return output

    def reset(self):
        self.z1_0 = 0.0
        self.z2_0 = 0.0

# Low-Pass Butterworth IIR digital filter
# Sampling rate: 500.0 Hz, frequency: 10.0 Hz
class LowPassFilter:
    def __init__(self):
        self.z1_0 = 0.0
        self.z2_0 = 0.0

    def process(self, input_sample):
        output = input_sample
        x = output - (-1.82269493 * self.z1_0) - (0.83718165 * self.z2_0)
        output = 0.00362168 * x + 0.00724336 * self.z1_0 + 0.00362168 * self.z2_0
        self.z2_0 = self.z1_0
        self.z1_0 = x
        return output

    def reset(self):
        self.z1_0 = 0.0
        self.z2_0 = 0.0

# Band-Stop Butterworth IIR digital filter
# Sampling rate: 500.0 Hz, frequency: [48.0, 52.0] Hz
class NotchFilter:
    def __init__(self):
        self.z1_0 = 0.0
        self.z2_0 = 0.0
        self.z1_1 = 0.0
        self.z2_1 = 0.0

    def process(self, input_sample):
        output = input_sample
        x = output - (-1.56858163 * self.z1_0) - (0.96424138 * self.z2_0)
        output = 0.96508099 * x + -1.56202714 * self.z1_0 + 0.96508099 * self.z2_0
        self.z2_0 = self.z1_0
        self.z1_0 = x
        x = output - (-1.61100358 * self.z1_1) - (0.96592171 * self.z2_1)
        output = 1.00000000 * x + -1.61854514 * self.z1_1 + 1.00000000 * self.z2_1
        self.z2_1 = self.z1_1
        self.z1_1 = x
        return output

    def reset(self):
        self.z1_0 = 0.0
        self.z2_0 = 0.0
        self.z1_1 = 0.0
        self.z2_1 = 0.0

class EnvelopeDetector:
    def __init__(self, window_size):
        self.window_size = window_size
        self.buffer = np.zeros(window_size)
        self.index = 0
        self.sum = 0.0
    
    def update(self, sample):
        abs_sample = abs(sample)
        self.sum -= self.buffer[self.index]
        self.sum += abs_sample
        self.buffer[self.index] = abs_sample
        self.index = (self.index + 1) % self.window_size
        envelope = self.sum / self.window_size
        return envelope

class BaselineTracker:
    """Baseline tracker for horizontal EOG — ALWAYS updates (like CHORDS reference)"""
    def __init__(self, window_size=512):
        self.window_size = window_size
        self.buffer = np.zeros(window_size)
        self.index = 0
        self.sum = 0.0
        self.filled = False
    
    def update(self, sample):
        self.sum -= self.buffer[self.index]
        self.sum += sample
        self.buffer[self.index] = sample
        self.index += 1
        if self.index >= self.window_size:
            self.index = 0
            self.filled = True
    
    def get_baseline(self):
        if not self.filled and self.index == 0:
            return 0.0
        count = self.window_size if self.filled else self.index
        return self.sum / count if count > 0 else 0.0

class EOGProcessor:
    def __init__(self):
        self.sampling_rate = 500
        
        # ADC config
        self.adc_resolution = 12
        self.adc_max = (2 ** self.adc_resolution) - 1
        self.adc_mid = self.adc_max / 2.0
        
        # --- Blink Detection (from CHORDS reference) ---
        self.BLINK_DEBOUNCE_MS = 200
        self.DOUBLE_BLINK_MS = 1000
        self.TRIPLE_BLINK_MS = 1500
        self.BLINK_THRESHOLD = 200.0       # Adjustable from frontend slider
        self.BLINK_RELEASE_THRESHOLD = self.BLINK_THRESHOLD / 2
        
        self.last_blink_time = 0
        self.first_blink_time = 0
        self.second_blink_time = 0
        self.blink_count = 0
        self.blink_active = False
        self.blink_released = True
        
        # --- Eye Movement Detection (CHORDS approach: user adjusts threshold) ---
        self.EYE_MOVEMENT_DEBOUNCE_MS = 750
        self.EYE_MOVEMENT_THRESHOLD = 250.0   # Adjustable from frontend slider
        self.EYE_MOVEMENT_RELEASE_THRESHOLD = 20.0  # Like CHORDS reference
        self.last_eye_movement_time = 0
        self.eye_movement_active = False
        self.eye_movement_released = True
        self.last_direction = None
        self.previous_deviation = 0.0
        
        # Return-to-center overshoot suppression
        # After a movement is released, block opposite-direction detection for this duration
        self.OVERSHOOT_SUPPRESSION_MS = 500
        self._last_released_direction = None   # Direction that was just released
        self._release_time_ms = 0              # When it was released
        
        # Filters
        self.eog_filter_vertical = EOGFilter()
        self.notch_filter_vertical = NotchFilter()
        self.lowpass_filter_vertical = LowPassFilter()
        self.eog_filter_horizontal = EOGFilter()
        self.notch_filter_horizontal = NotchFilter()
        self.lowpass_filter_horizontal = LowPassFilter()
        
        # Envelope detector (100ms window) — same as CHORDS
        envelope_window_ms = 100
        envelope_window_size = (envelope_window_ms * self.sampling_rate) // 1000
        self.envelope_detector = EnvelopeDetector(envelope_window_size)
        
        # Baseline tracker — ALWAYS updating, same as CHORDS (window=512)
        self.horizontal_baseline = BaselineTracker(window_size=512)
        
        self.current_envelope = 0.0
        self.horizontal_signal = 0.0
        self._last_log_ms = 0
        self._blink_suppression_ms = 0  # Suppress eye detection after blinks

    def set_thresholds(self, blink_threshold=None, eye_threshold=None):
        """Called from frontend slider to adjust sensitivity per user."""
        if blink_threshold is not None:
            self.BLINK_THRESHOLD = float(blink_threshold)
            self.BLINK_RELEASE_THRESHOLD = self.BLINK_THRESHOLD / 2
            print(f"[EOG] Blink threshold updated: {self.BLINK_THRESHOLD}")
        if eye_threshold is not None:
            self.EYE_MOVEMENT_THRESHOLD = float(eye_threshold)
            print(f"[EOG] Eye movement threshold updated: {self.EYE_MOVEMENT_THRESHOLD}")

    def process_sample(self, raw_vertical, raw_horizontal):
        """Process a single sample through filters and detect events."""
        # Center raw values
        raw_vertical = raw_vertical - self.adc_mid
        raw_horizontal = raw_horizontal - self.adc_mid
        
        # Process vertical EOG for blink detection
        filt_vertical = self.notch_filter_vertical.process(raw_vertical)
        filt_vertical = self.eog_filter_vertical.process(filt_vertical)
        filt_vertical = self.lowpass_filter_vertical.process(filt_vertical)
        self.current_envelope = self.envelope_detector.update(filt_vertical)
        
        # Process horizontal EOG for left/right detection
        filt_horizontal = self.notch_filter_horizontal.process(raw_horizontal)
        filt_horizontal = self.eog_filter_horizontal.process(filt_horizontal)
        filt_horizontal = self.lowpass_filter_horizontal.process(filt_horizontal)
        self.horizontal_signal = filt_horizontal
        
        # ALWAYS update baseline — like CHORDS reference (never lock it)
        self.horizontal_baseline.update(filt_horizontal)
        
        now_ms = int(time.time() * 1000)
        
        # Throttled debug logging
        if now_ms - self._last_log_ms > 500:
            baseline = self.horizontal_baseline.get_baseline()
            deviation = self.horizontal_signal - baseline
            print(f"[EOG] Env={self.current_envelope:.1f} | Dev={deviation:.1f} BlinkTh={self.BLINK_THRESHOLD:.0f} EyeTh={self.EYE_MOVEMENT_THRESHOLD:.0f}")
            self._last_log_ms = now_ms
        
        events = {}
        
        blink_event = self.detect_blinks(now_ms)
        if blink_event:
            events.update(blink_event)
            
        eye_event = self.detect_eye_movement(now_ms)
        if eye_event:
            events.update(eye_event)
            
        return events if events else None

    def detect_blinks(self, now_ms):
        """Blink detection — same as CHORDS reference."""
        envelope_high = self.current_envelope > self.BLINK_THRESHOLD
        envelope_low = self.current_envelope < self.BLINK_RELEASE_THRESHOLD
        
        if envelope_low and self.blink_active:
            self.blink_released = True
            self.blink_active = False
        
        time_since_last = now_ms - self.last_blink_time
        can_detect = self.blink_released and (time_since_last >= self.BLINK_DEBOUNCE_MS)
        
        if envelope_high and not self.blink_active and can_detect:
            self.last_blink_time = now_ms
            self.blink_released = False
            self.blink_active = True
            
            if self.blink_count == 0:
                self.first_blink_time = now_ms
                self.blink_count = 1
                print("\n[BLINK 1]", end="", flush=True)
            elif self.blink_count == 1 and (now_ms - self.first_blink_time) <= self.DOUBLE_BLINK_MS:
                self.second_blink_time = now_ms
                self.blink_count = 2
                print(" [BLINK 2]", end="", flush=True)
            elif self.blink_count == 2 and (now_ms - self.second_blink_time) <= self.TRIPLE_BLINK_MS:
                print("\n>>> TRIPLE BLINK <<<")
                self.blink_count = 0
                return {"type": "blink", "count": 3, "action": "BACKSPACE"}
            else:
                self.first_blink_time = now_ms
                self.blink_count = 1
                print("\n[BLINK 1]", end="", flush=True)
        
        # Check for double blink timeout
        if self.blink_count == 2 and (now_ms - self.second_blink_time) > self.TRIPLE_BLINK_MS:
            print("\n>>> DOUBLE BLINK <<<")
            self.blink_count = 0
            return {"type": "blink", "count": 2, "action": "ENTER"}
        
        # Check for single blink timeout
        if self.blink_count == 1 and (now_ms - self.first_blink_time) > self.DOUBLE_BLINK_MS:
            self.blink_count = 0
        
        return None

    def detect_eye_movement(self, now_ms):
        """Eye movement detection — CHORDS approach + overshoot suppression."""
        
        # Suppress eye detection during and shortly after blinks (blink artifacts)
        if self.current_envelope > self.BLINK_RELEASE_THRESHOLD:
            self._blink_suppression_ms = now_ms
            return None
        if (now_ms - self._blink_suppression_ms) < 300:
            return None
        
        baseline = self.horizontal_baseline.get_baseline()
        deviation = self.horizontal_signal - baseline
        abs_deviation = abs(deviation)
        
        # Determine current direction
        if deviation < -self.EYE_MOVEMENT_THRESHOLD:
            current_direction = "LEFT"
        elif deviation > self.EYE_MOVEMENT_THRESHOLD:
            current_direction = "RIGHT"
        else:
            current_direction = None
        
        # Track release state — must return to low deviation before next movement
        if abs_deviation < self.EYE_MOVEMENT_RELEASE_THRESHOLD and self.eye_movement_active:
            self._last_released_direction = self.last_direction  # Remember what was released
            self._release_time_ms = now_ms
            self.eye_movement_released = True
            self.eye_movement_active = False
            self.last_direction = None
        
        # Check if deviation is increasing (moving away from baseline, not returning)
        # This is the CHORDS approach from morse_decoder.py
        deviation_increasing = False
        if current_direction == "LEFT" and deviation < self.previous_deviation:
            deviation_increasing = True  # Moving more negative
        elif current_direction == "RIGHT" and deviation > self.previous_deviation:
            deviation_increasing = True  # Moving more positive
        
        self.previous_deviation = deviation
        
        # OVERSHOOT SUPPRESSION: After releasing a LEFT movement, block RIGHT for 500ms
        # (and vice versa). This prevents the return-to-center overshoot from triggering
        # a false opposite-direction detection.
        opposite_suppressed = False
        if self._last_released_direction and current_direction:
            time_since_release = now_ms - self._release_time_ms
            if time_since_release < self.OVERSHOOT_SUPPRESSION_MS:
                # Block the OPPOSITE direction only
                if self._last_released_direction == "LEFT" and current_direction == "RIGHT":
                    opposite_suppressed = True
                elif self._last_released_direction == "RIGHT" and current_direction == "LEFT":
                    opposite_suppressed = True
            else:
                # Suppression window expired, clear it
                self._last_released_direction = None
        
        # Detect new movement
        if not self.eye_movement_active and current_direction is not None and \
           self.eye_movement_released and \
           (now_ms - self.last_eye_movement_time) >= self.EYE_MOVEMENT_DEBOUNCE_MS and \
           (self.last_direction is None or current_direction != self.last_direction) and \
           deviation_increasing and \
           not opposite_suppressed:
            
            self.eye_movement_active = True
            self.eye_movement_released = False
            self.last_eye_movement_time = now_ms
            self.last_direction = current_direction
            
            if current_direction == "LEFT":
                print(f"\n>>> LEFT <<< (dev={deviation:.1f})")
                return {"type": "direction", "action": "LEFT", "value": deviation}
            else:
                print(f"\n>>> RIGHT <<< (dev={deviation:.1f})")
                return {"type": "direction", "action": "RIGHT", "value": deviation}
            
        return None
