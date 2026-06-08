# Smart Home Raspberry Pi 4 Setup

This project is a Flask-based smart home dashboard designed for Raspberry Pi 4 Model B (2GB) and integrates the following hardware:

- Light control via relay
- Fan control via relay
- Door control via servo
- Gate control via servo
- Buzzer output
- RC522 RFID reader
- USB camera for live CCTV feed

## Supported Hardware

- Raspberry Pi 4 Model B
- USB webcam (`/dev/video0`)
- 2-channel or 4-channel relay module
- SG90 / MG90S servo motors for door and gate
- Passive buzzer
- MFRC522 RFID reader module
- Jumper wires, breadboard or screw terminal block

## Pin Assignments

| Function | Raspberry Pi GPIO | Description |
|----------|-------------------|-------------|
| Light relay | `GPIO17` | Relay input for light control |
| Fan relay | `GPIO27` | Relay input for fan control |
| Door servo | `GPIO22` | Servo signal for door actuator |
| Gate servo | `GPIO23` | Servo signal for gate actuator |
| Buzzer | `GPIO24` | Digital buzzer output |
| DHT11 data | `GPIO4` | Temperature/humidity sensor | 
| Gas sensor digital output | `GPIO26` | Gas alarm input |
| RFID RST | `GPIO25` | RC522 reset pin |
| RFID SDA | `GPIO8` | RC522 chip select (SPI0 CE0) |
| RFID SCK | `GPIO11` | RC522 clock (SPI0 SCLK) |
| RFID MOSI | `GPIO10` | RC522 MOSI |
| RFID MISO | `GPIO9` | RC522 MISO |
| USB Camera | `/dev/video0` | Webcam device for OpenCV stream |

## Wiring Diagram

```
Raspberry Pi 4 GPIO Header (BCM numbering)

      +-----+-----+  5V
      | 2  4|  6   GND
      | 3  5|  7   GPIO4
      | 9 14|  8   GPIO14
      | 10  1| 12   GPIO18
      | 11 13| 14  GND
      | 15 16| 18  GPIO24  <-- Buzzer
      | 19 21| 22  GPIO25  <-- RFID RST
      | 23 24| 26  GND
      | 27 28| 29  GPIO5
      | 30 31| 32  GPIO12
      | 33 34| 34  GND
      | 35 36| 36  GPIO16
      | 37 38| 38  GPIO20
      | 39 40| 40  GPIO21
      +-----------+

Actual wiring used by this app:

- Light relay signal -> GPIO17 (pin 11)
- Fan relay signal -> GPIO27 (pin 13)
- Door servo signal -> GPIO22 (pin 15)
- Gate servo signal -> GPIO23 (pin 16)
- Buzzer output -> GPIO24 (pin 18)
- DHT11 data -> GPIO4 (pin 7)
- Gas sensor digital output -> GPIO26 (pin 37)
- RC522 RST -> GPIO25 (pin 22)
- RC522 SDA/SS -> GPIO8  (pin 24)
- RC522 SCK -> GPIO11 (pin 23)
- RC522 MOSI -> GPIO10 (pin 19)
- RC522 MISO -> GPIO9  (pin 21)
- USB camera -> USB port

![Wiring Diagram](./wiring-diagram.svg)

![Power and Ground Diagram](./wiring-diagram-power.svg)

Additional power and ground connections:
- Relay VCC -> 5V power
- Relay GND -> Pi GND
- Servo VCC -> 5V power (or external 5V supply, common ground with Pi)
- Servo GND -> Pi GND
- Buzzer VCC -> 5V or 3.3V depending on buzzer type, common ground
- DHT11 VCC -> 3.3V
- DHT11 GND -> Pi GND
- Gas sensor VCC -> 5V power
- Gas sensor GND -> Pi GND
- RC522 VCC -> 3.3V
- RC522 GND -> Pi GND
```

## Safety and Power Best Practices

- Use a separate 5V power supply for relays and servos when possible. High current draw from servos can cause the Pi to reboot if powered from the Pi 5V rail directly.
- Always share a common ground between the Raspberry Pi and any external power supply.
- Use an opto-isolated relay module or add flyback diodes when switching inductive loads to protect GPIO and the Pi.
- Connect servo signal wires to the Pi GPIO only, while powering servo VCC and GND from the external supply.
- Do not power high-current devices (motors, fans, large relays) directly from the Pi GPIO.
- Double-check wiring before powering the system and avoid loose jumper wires on the Pi header.

> Note: Use a proper 5V power supply for servos and relays. Keep grounds common between the Pi and external power supplies.

## Software Installation

Install dependencies in the Raspberry Pi environment:

```bash
sudo apt update
sudo apt install python3-pip libatlas-base-dev libopenjp2-7 libqtgui4 -y
pip3 install -r requirements.txt
```

If `RPi.GPIO` fails to install, use:

```bash
sudo apt install python3-rpi.gpio
```

And for the RC522 library:

```bash
pip3 install mfrc522
```

## Run the App

Start the Flask server:

```bash
python3 app.py
```

Open a browser to:

```text
http://<raspberry-pi-ip>:5000
```

Login credentials:

- Username: `admin`
- Password: `SmartHome@2026`

## Notes

- The app checks for Raspberry Pi hardware and gracefully falls back if GPIO packages are unavailable.
- The dashboard reads the RFID card ID from the web input field, and hardware RFID scanning is supported if the RC522 module is connected.
- The camera feed uses OpenCV from the connected USB webcam.

## Troubleshooting

- If the camera feed does not start, verify the webcam at `/dev/video0` and install `v4l-utils`.
- If a servo jitter occurs, use a powered servo driver or external 5V supply with shared ground.
- If the RC522 does not read, verify SPI is enabled with `sudo raspi-config` -> Interface Options -> SPI.

## Output

<img width="1280" height="574" alt="WhatsApp Image 2026-06-05 at 9 51 00 PM" src="https://github.com/user-attachments/assets/bead2211-1b31-4d4d-abf9-9489e3ea0b5e" />
<img width="1280" height="574" alt="WhatsApp Image 2026-06-05 at 9 51 00 PM (1)" src="https://github.com/user-attachments/assets/099d1ff1-63fb-4ce4-aae3-e1f27f14472b" />
<img width="1280" height="574" alt="WhatsApp Image 2026-06-05 at 9 51 01 PM" src="https://github.com/user-attachments/assets/ee16e27e-9cb1-46bd-8a6e-d8891daafaec" />
<img width="1280" height="574" alt="WhatsApp Image 2026-06-05 at 9 50 55 PM" src="https://github.com/user-attachments/assets/de023e9e-d062-4bb0-9275-1d93a0a5e5c3" />
<img width="1280" height="574" alt="WhatsApp Image 2026-06-05 at 9 50 57 PM" src="https://github.com/user-attachments/assets/d2925d23-7533-4bdf-9037-978fec3aa4da" />
<img width="1280" height="574" alt="WhatsApp Image 2026-06-05 at 9 50 57 PM (1)" src="https://github.com/user-attachments/assets/c42a334e-3efe-41fd-a0ae-a1c52fc31b95" />
<img width="1280" height="574" alt="WhatsApp Image 2026-06-05 at 9 50 57 PM (2)" src="https://github.com/user-attachments/assets/088ed362-d1b4-42df-aaf7-7153d6c3d992" />
<img width="1280" height="963" alt="WhatsApp Image 2026-06-05 at 9 50 59 PM" src="https://github.com/user-attachments/assets/3ddf7255-168c-4d4d-9a88-5d008910c58e" />
