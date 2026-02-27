from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import time
import numpy as np
import logging

# Import our custom modules
from connection.manager import Connection
from signal_processing.eog import EOGProcessor
from signal_processing.eeg import EEGProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Global State
connection_manager = Connection()
eog_processor = EOGProcessor()
eeg_processor = EEGProcessor()

# Data Buffers
eeg_buffer = [] 
EEG_WINDOW_SIZE = 500  # 1 second of data at 500Hz for FFT

# Background Thread for Data Streaming
streaming_active = False

def data_stream_loop():
    global streaming_active, eeg_buffer
    logger.info("Starting data stream loop")
    
    last_log_time = time.time()
    last_emit_time = time.time()  # Throttle signal_batch emissions
    latest_payload = None         # Only send latest sample state
    
    # Debug stats
    v_buffer = []
    h_buffer = []

    while streaming_active:
        if connection_manager.running:
            # ===== CRITICAL FIX =====
            # Drain ALL queued samples and process EACH one through filters.
            # IIR filters need every sample in sequence to produce correct output.
            # The old code only read `last_sample`, skipping most samples,
            # which corrupted filter state and made blinks undetectable.
            # This is the key difference vs the working reference.
            samples_to_process = []
            while connection_manager.sample_queue:
                try:
                    samples_to_process.append(connection_manager.sample_queue.popleft())
                except IndexError:
                    break
            
            for sample in samples_to_process:
                if len(sample) >= 2:
                    vertical = sample[0]
                    horizontal = sample[1]
                    
                    v_buffer.append(vertical)
                    h_buffer.append(horizontal)
                    
                    # Process EOG - every single sample through filters
                    events = None
                    try:
                        events = eog_processor.process_sample(vertical, horizontal)
                        # Only emit ACTIONABLE command events (not None or empty)
                        if events and "action" in events:
                            socketio.emit('command', events)
                    except Exception as e:
                        logger.error(f"Error in EOG processing: {e}")
                        events = None
                    
                    # Process EEG
                    if len(sample) >= 3:
                        eeg_val = sample[2]
                        eeg_buffer.append(eeg_val)
                        if len(eeg_buffer) > EEG_WINDOW_SIZE:
                            eeg_buffer.pop(0)
    
                    # Calculate Focus every ~100ms (every 50 samples)
                    focus_level = 0
                    if len(eeg_buffer) == EEG_WINDOW_SIZE and (len(eeg_buffer) % 50 == 0):
                        focus_level = eeg_processor.calculate_focus_level(np.array(eeg_buffer))
    
                    # Keep only the LATEST payload (don't batch all 500 samples)
                    latest_payload = {
                        "raw": sample[:3],  # Limit to 3 channels
                        "events": events if events else {},
                        "focus": focus_level,
                        "envelope": eog_processor.current_envelope,
                        "horizontal_dev": eog_processor.horizontal_signal - eog_processor.horizontal_baseline.get_baseline()
                    }

            # Throttle signal_batch to ~5 emissions per second (every 200ms)
            now = time.time()
            if latest_payload and (now - last_emit_time) >= 0.2:
                socketio.emit('signal_data', latest_payload)
                last_emit_time = now
                latest_payload = None

            # Log status every 2 seconds
            if time.time() - last_log_time > 2.0:
                     if v_buffer:
                         v_min, v_max = min(v_buffer), max(v_buffer)
                         h_min, h_max = min(h_buffer), max(h_buffer)
                         v_buffer = []
                         h_buffer = []
                     last_log_time = time.time()
            
            # Use a short sleep to yield CPU
            time.sleep(0.001) 
        else:
            time.sleep(0.1)

# API Routes

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})

@app.route('/scan', methods=['GET'])
def scan_devices():
    try:
        from connection.protocols.ble import Chords_BLE # type: ignore
        import asyncio
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        devices = loop.run_until_complete(Chords_BLE.scan_devices())
        loop.close()
        
        device_list = [{"name": d.name, "address": d.address} for d in devices]
        return jsonify({"devices": device_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/connect', methods=['POST'])
def connect_device():
    data = request.json
    protocol = data.get('protocol', 'ble')
    address = data.get('address')
    
    success = False
    if protocol == 'ble':
        if not address:
            return jsonify({"error": "Address required for BLE"}), 400
        success = connection_manager.connect_ble(device_address=address)
    elif protocol == 'wifi':
        success = connection_manager.connect_wifi()
        pass
    elif protocol == 'usb':
        success = connection_manager.connect_usb()
    
    if success:
        global streaming_active
        streaming_active = True
        return jsonify({"status": "connected", "protocol": protocol})
    else:
        return jsonify({"status": "failed"}), 500

@app.route('/disconnect', methods=['POST'])
def disconnect_device():
    global streaming_active
    streaming_active = False
    connection_manager.cleanup()
    return jsonify({"status": "disconnected"})

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        "running": connection_manager.running,
        "recording": connection_manager.recording_active,
        "sample_rate": connection_manager.sampling_rate
    })

@app.route('/keyboard/enable', methods=['POST'])
def enable_keyboard():
    return jsonify({"status": "disabled", "enabled": False})

@app.route('/keyboard/status', methods=['GET'])
def get_keyboard_status():
    return jsonify({"enabled": False})

@socketio.on('connect')
def handle_connect():
    logger.info("Client connected to WebSocket")
    global streaming_active
    if not streaming_active:
        streaming_active = True
        threading.Thread(target=data_stream_loop, daemon=True).start()

@socketio.on('disconnect')
def handle_disconnect():
    logger.info("Client disconnected")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
