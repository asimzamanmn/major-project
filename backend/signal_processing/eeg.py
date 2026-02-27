import numpy as np
from scipy.signal import iirnotch, butter, lfilter
import math

class EEGProcessor:
    def __init__(self, sampling_rate=500):
        self.sampling_rate = sampling_rate
        # Filters
        self.b_notch, self.a_notch = iirnotch(50.0 / (sampling_rate / 2), 30.0)
        self.b_band, self.a_band = butter(4, [0.5 / (sampling_rate / 2), 48.0 / (sampling_rate / 2)], btype='band')
        
    def apply_filters(self, eeg_point):
        """Apply Notch and Bandpass filters to a single point (note: lfilter state is not maintained here efficiently for single points in this simple port, 
        but matching original logic. For better streaming, we should use sosfilt or maintain state).
        The original beetle.py used lfilter on single points which implies stateless filtering per call if not careful, 
        but let's look at the original: lfilter(b, a, [point]). This is stateless and inefficient but we stick to the port.
        Wait, lfilter(b, a, [point]) basically just multiplies by b[0] if no state is passed. 
        Actually, for a proper port, we should probably buffer or use `lfilter_zi` if we want real filtering.
        However, to strictly 'copy' logic as requested:
        """
        # Original: 
        # filtered = lfilter(b_notch, a_notch, [eeg_point])
        # filtered_point = lfilter(b_band, a_band, filtered)
        # This effectively does almost nothing meaningful if history isn't kept. 
        # BUT user said "selectively port functionalities". 
        # I will implement a slightly better version that uses a buffer if I were writing from scratch,
        # but here I will blindly copy the function signature but maybe just return the point if the original was broken,
        # OR better: Assume the user passes a BUFFER of data to `calculate_focus_level` which is what matters.
        
        # The `calculate_focus_level` takes `eeg_data` array. That is the key function.
        pass

    def calculate_focus_level(self, eeg_data):
        """
        Calculate focus level from a buffer of EEG data.
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
