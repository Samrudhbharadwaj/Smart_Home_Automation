from flask import Flask, render_template, request, jsonify, session, redirect
from uuid import uuid4
from io import StringIO, BytesIO
import csv
import random
import datetime
import cv2
import threading
import platform

app = Flask(__name__)
app.secret_key = "SMART_HOME_V74_SECRET"

# Raspberry Pi hardware pin assignments
PIN_LIGHT_RELAY = 17
PIN_FAN_RELAY = 27
PIN_DOOR_SERVO = 22
PIN_GATE_SERVO = 23
PIN_BUZZER = 24
PIN_RFID_RST = 25
PIN_DHT11 = 4
PIN_GAS_SENSOR = 26
RELAY_ACTIVE_HIGH = False  # Set True if using a high-trigger relay module

is_rpi = platform.system() == "Linux"
hardware = {
    "light": None,
    "fan": None,
    "door_servo": None,
    "gate_servo": None,
    "buzzer": None,
    "rfid_reader": None,
    "dht_lib": None,
    "dht_type": None,
    "gas_sensor": None,
}


def init_hardware():
    global is_rpi

    try:
        from gpiozero import OutputDevice, Servo, LED, InputDevice
    except Exception:
        is_rpi = False
        return

    if not is_rpi:
        return

    try:
        hardware["light"] = OutputDevice(
            PIN_LIGHT_RELAY,
            active_high=RELAY_ACTIVE_HIGH,
            initial_value=False
        )
        hardware["fan"] = OutputDevice(
            PIN_FAN_RELAY,
            active_high=RELAY_ACTIVE_HIGH,
            initial_value=False
        )
        hardware["door_servo"] = Servo(PIN_DOOR_SERVO)
        hardware["gate_servo"] = Servo(PIN_GATE_SERVO)
        hardware["buzzer"] = LED(PIN_BUZZER)
        hardware["gas_sensor"] = InputDevice(PIN_GAS_SENSOR, pull_up=False)
    except Exception:
        is_rpi = False
        return

    try:
        import Adafruit_DHT
        hardware["dht_lib"] = Adafruit_DHT
        hardware["dht_type"] = Adafruit_DHT.DHT11
    except Exception:
        hardware["dht_lib"] = None
        hardware["dht_type"] = None

    try:
        from mfrc522 import SimpleMFRC522
        hardware["rfid_reader"] = SimpleMFRC522()
    except Exception:
        hardware["rfid_reader"] = None


def set_relay(name, value):
    if is_rpi and hardware.get(name) is not None:
        try:
            if value:
                hardware[name].on()
            else:
                hardware[name].off()
        except Exception:
            pass
    global_state[name] = value


def set_servo(name, opened):
    servo_key = f"{name}_servo"
    if is_rpi and hardware.get(servo_key) is not None:
        try:
            hardware[servo_key].value = 1 if opened else -1
        except Exception:
            pass
    global_state[name] = opened


def set_buzzer(value):
    if is_rpi and hardware.get("buzzer") is not None:
        try:
            if value:
                hardware["buzzer"].on()
            else:
                hardware["buzzer"].off()
        except Exception:
            pass
    global_state["buzzer"] = value


def read_rfid_card():
    if not is_rpi or hardware.get("rfid_reader") is None:
        return None
    try:
        card_id, _ = hardware["rfid_reader"].read()
        return str(card_id)
    except Exception:
        return None


def read_temperature_sensor():
    if not is_rpi or hardware.get("dht_lib") is None:
        return False

    try:
        humidity, temperature = hardware["dht_lib"].read_retry(
            hardware["dht_type"],
            PIN_DHT11
        )
        if humidity is None or temperature is None:
            return False

        state = get_state()
        state["temperature"] = round(max(0.0, min(50.0, temperature)), 1)
        state["humidity"] = round(max(0.0, min(100.0, humidity)), 1)
        return True
    except Exception:
        return False


def read_gas_sensor():
    if not is_rpi or hardware.get("gas_sensor") is None:
        state = get_state()
        state["gas_sensor_available"] = False
        return False

    try:
        triggered = hardware["gas_sensor"].value
        state = get_state()
        state["gas_sensor_available"] = True

        if triggered:
            state["gas"] = 85
            state["gas_status"] = "DANGER"
            set_buzzer(True)
        else:
            state["gas"] = 15
            state["gas_status"] = "SAFE"
            set_buzzer(False)

        return True
    except Exception:
        state = get_state()
        state["gas_sensor_available"] = False
        return False


# ==========================
# CAMERA STREAMING
# ==========================

camera = None
camera_lock = threading.Lock()


def get_camera():
    global camera
    
    try:
        if camera is None:
            camera = cv2.VideoCapture(0)
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            camera.set(cv2.CAP_PROP_FPS, 15)
        
        return camera
    except:
        return None


def generate_frames():
    global camera
    
    cam = get_camera()
    
    if cam is None:
        return
    
    while global_state["camera"]:
        with camera_lock:
            success, frame = cam.read()
            
            if not success:
                break
            
            ret, buffer = cv2.imencode('.jpg', frame)
            
            if not ret:
                break
            
            frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n'
               b'Content-Length: ' + 
               str(len(frame_bytes)).encode() + 
               b'\r\n\r\n' + frame_bytes + b'\r\n')

# ==========================
# GLOBAL SHARED STATE
# ==========================

global_state = {
    "light": False,
    "fan": False,
    "fan_mode": "auto",
    "door": False,
    "gate": False,
    "gas": 20,
    "gas_status": "SAFE",
    "gas_sensor_available": False,
    "buzzer": False,
    "temperature": 28.0,
    "humidity": 0.0,
    "camera": False,
    "camera_owner_sid": None,
    "rfid_unlocked": False
}

global_logs = []
camera_share_ids = {}


def get_state():
    
    if "sid" not in session:
        session["sid"] = str(uuid4())

    return global_state


def add_log(event):
    
    global_logs.insert(
        0,
        {
            "time":
            datetime.datetime.now().strftime(
                "%H:%M:%S"
            ),

            "event":
            event
        }
    )

    global_logs[:] = global_logs[:30]


# ==========================
# LOGIN
# ==========================

@app.route("/", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        username = request.form.get(
            "username"
        )

        password = request.form.get(
            "password"
        )

        if (
            username == "admin"
            and
            password == "SmartHome@2026"
        ):

            session["user"] = username

            # Mark that this session has just logged in so a
            # subsequent first load of /dashboard will succeed
            session["just_logged_in"] = True

            if "sid" not in session:
                session["sid"] = str(uuid4())

            add_log(
                "✅ User Logged In"
            )

            return redirect(
                "/dashboard"
            )

    return render_template(
        "login.html"
    )


# ==========================
# LOGOUT
# ==========================

@app.route("/logout")
def logout():

    session.clear()

    return redirect("/")


# ==========================
# DASHBOARD
# ==========================

@app.route("/dashboard")
def dashboard():

    # Require login on each page load — allow only immediately after a
    # successful POST login. This causes a browser reload to land on
    # the login page instead of the dashboard.
    if "user" not in session:
        return redirect("/")

    if not session.get("just_logged_in"):
        # User exists in session but did not just log in — force logout
        session.clear()
        return redirect("/")

    # Consume the flag so immediate subsequent reloads don't re-check it
    session.pop("just_logged_in", None)

    return render_template(
        "dashboard.html"
    )
# ==========================
# STATUS API
# ==========================

@app.route("/api/status")
def status():

    state = get_state()

    read_temperature_sensor()
    read_gas_sensor()

    # AUTO FAN CONTROL (only active after RFID unlocked globally)

    rfid_ok = global_state.get("rfid_unlocked", False)

    if state["fan_mode"] == "auto":

        if rfid_ok:

            if state["temperature"] > 27:

                state["fan"] = True

            elif state["temperature"] < 25:

                state["fan"] = False
        else:
            # Prevent auto fan from turning on before global RFID unlock
            state["fan"] = False

    if state["gas_status"] == "DANGER":

        state["buzzer"] = True

    # Build response: global state + session-specific flags
    resp = dict(state)

    resp["is_camera_owner"] = (
        state.get("camera_owner_sid") == session.get("sid")
    )

    resp["rfid_unlocked"] = rfid_ok

    return jsonify(resp)


# ==========================
# TEMPERATURE
# ==========================

@app.route("/api/temperature")
def temperature():

    state = get_state()

    if not read_temperature_sensor():
        state["temperature"] += random.uniform(
            -1,
            1
        )

        state["temperature"] = max(
            20,
            min(
                40,
                state["temperature"]
            )
        )

        state["temperature"] = round(
            state["temperature"],
            1
        )

    return jsonify(
        {
            "temperature":
            state["temperature"],
            "humidity":
            state["humidity"]
        }
    )


# ==========================
# LIGHT
# ==========================

@app.route(
    "/api/light/toggle",
    methods=["POST"]
)
def light_toggle():

    if not global_state.get("rfid_unlocked", False):
        add_log("⚠ Light toggle denied: RFID required")
        return jsonify(success=False, error="RFID_REQUIRED")

    state = get_state()
    new_value = not state["light"]
    set_relay("light", new_value)

    add_log(
        f"💡 Light {'ON' if new_value else 'OFF'}"
    )

    return jsonify(
        success=True
    )


# ==========================
# FAN MODE
# ==========================

@app.route(
    "/api/fan/mode",
    methods=["POST"]
)
def fan_mode():

    state = get_state()

    mode = request.json.get(
        "mode",
        "auto"
    )

    state["fan_mode"] = mode

    add_log(
        f"🌀 Fan Mode: {mode.upper()}"
    )

    return jsonify(
        success=True
    )


# ==========================
# FAN ON
# ==========================

@app.route(
    "/api/fan/on",
    methods=["POST"]
)
def fan_on():

    if not global_state.get("rfid_unlocked", False):
        add_log("⚠ Fan ON denied: RFID required")
        return jsonify(success=False, error="RFID_REQUIRED")

    state = get_state()

    if state["fan_mode"] == "manual":
        set_relay("fan", True)
        add_log(
            "🌀 Fan ON"
        )

    return jsonify(
        success=True
    )


# ==========================
# FAN OFF
# ==========================

@app.route(
    "/api/fan/off",
    methods=["POST"]
)
def fan_off():

    if not global_state.get("rfid_unlocked", False):
        add_log("⚠ Fan OFF denied: RFID required")
        return jsonify(success=False, error="RFID_REQUIRED")

    state = get_state()

    if state["fan_mode"] == "manual":
        set_relay("fan", False)
        add_log(
            "🌀 Fan OFF"
        )

    return jsonify(
        success=True
    )


# ==========================
# DOOR
# ==========================

@app.route(
    "/api/door/toggle",
    methods=["POST"]
)
def door_toggle():

    if not global_state.get("rfid_unlocked", False):
        add_log("⚠ Door toggle denied: RFID required")
        return jsonify(success=False, error="RFID_REQUIRED")

    state = get_state()
    new_value = not state["door"]
    set_servo("door", new_value)

    add_log(
        f"🚪 Door {'OPENED' if new_value else 'CLOSED'}"
    )

    return jsonify(
        success=True
    )


# ==========================
# GATE
# ==========================

@app.route(
    "/api/gate/toggle",
    methods=["POST"]
)
def gate_toggle():

    if not global_state.get("rfid_unlocked", False):
        add_log("⚠ Gate toggle denied: RFID required")
        return jsonify(success=False, error="RFID_REQUIRED")

    state = get_state()
    new_value = not state["gate"]
    set_servo("gate", new_value)

    add_log(
        f"🏡 Gate {'OPENED' if new_value else 'CLOSED'}"
    )

    return jsonify(
        success=True
    )


# ==========================
# RFID
# ==========================

VALID_CARDS = [
    "12345678",
    "87654321",
    "11112222"
]


@app.route(
    "/api/rfid",
    methods=["POST"]
)
def rfid():

    card = request.json.get(
        "card",
        ""
    ).strip()

    if not card:
        card = read_rfid_card()
        if card is None:
            return jsonify(
                granted=False,
                message="NO_RFID_READER",
                rfid_unlocked=False
            )

    if card in VALID_CARDS:

        state = get_state()

        new_door_state = not state["door"]
        set_servo("door", new_door_state)
        set_buzzer(False)

        global_state["rfid_unlocked"] = True

        add_log(
            "🔐 RFID Access Granted - Controls Enabled (GLOBAL)"
        )

        return jsonify(
            granted=True,
            message="Access Granted",
            rfid_unlocked=True
        )

    state = get_state()
    set_buzzer(True)

    add_log(
        "❌ RFID Access Denied"
    )

    return jsonify(
        granted=False,
        message="Access Denied",
        rfid_accepted=False
    )


# ==========================
# GAS SENSOR
# ==========================

@app.route(
    "/api/gas",
    methods=["POST"]
)
def gas():

    state = get_state()

    if state.get("gas_sensor_available", False):
        read_gas_sensor()
        return jsonify(success=True)

    value = int(
        request.json.get(
            "value",
            0
        )
    )

    state["gas"] = value

    if value <= 30:

        state["gas_status"] = "SAFE"

        state["buzzer"] = False

    elif value <= 60:

        state["gas_status"] = "WARNING"

        state["buzzer"] = False

    else:

        state["gas_status"] = "DANGER"

        state["buzzer"] = True

    old_status = state["gas_status"]

    if old_status != state["gas_status"]:

        add_log(
            f"⛽ Gas {state['gas_status']}"
        )

    return jsonify(
        success=True
    )


# ==========================
# CAMERA
# ==========================

@app.route("/api/video_feed")
def video_feed():
    
    if not global_state["camera"]:
        return jsonify(
            error="Camera not active"
        ), 403
    
    return (
        generate_frames(),
        200,
        {
            "Content-Type": 
            "multipart/x-mixed-replace; boundary=frame"
        }
    )


@app.route(
    "/api/camera/toggle",
    methods=["POST"]
)
def camera_toggle():

    state = get_state()

    state["camera"] = \
    not state["camera"]

    if state["camera"]:
        
        state["camera_owner_sid"] = \
        session["sid"]

    else:
        
        state["camera_owner_sid"] = None

    add_log(
        f"📹 Camera {'ON' if state['camera'] else 'OFF'}"
    )

    return jsonify(
        success=True,
        is_owner=True
    )

# ==========================
# ACKNOWLEDGE ALARM
# ==========================

@app.route(
    "/api/alarm/ack",
    methods=["POST"]
)
def alarm_ack():

    state = get_state()

    state["buzzer"] = False

    add_log(
        "🔕 Alarm Silenced"
    )

    return jsonify(
        success=True
    )

# ==========================
# LOGS
# ==========================

@app.route("/api/logs")
def logs():

    return jsonify(global_logs)

# ==========================
# CLEAR LOGS
# ==========================

@app.route(
    "/api/logs/clear",
    methods=["POST"]
)
def clear_logs():

    global global_logs
    
    global_logs = []

    return jsonify(
        success=True
    )

# ==========================
# EXPORT CSV
# ==========================

@app.route("/export/csv")
def export_csv():

    output = StringIO()

    writer = csv.writer(
        output
    )

    writer.writerow(
        [
            "Time",
            "Event"
        ]
    )

    for item in global_logs:

        writer.writerow(
            [
                item["time"],
                item["event"]
            ]
        )

    output.seek(0)

    return (

        output.getvalue(),

        200,

        {
            "Content-Type":
            "text/csv",

            "Content-Disposition":
            "attachment; filename=smart_home_logs.csv"
        }

    )


# ==========================
# RUN APP
# ==========================

if __name__ == "__main__":
    init_hardware()
    app.run(
        host="0.0.0.0",
        port=5000,
        threaded=True,
        debug=False
    )