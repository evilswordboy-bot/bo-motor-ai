/*
  ============================================================
  BO MOTOR AI - Predictive Maintenance & Intelligent Fault Detection
  Firmware: ESP32 DevKit V1 + MPU6050 + L298N + Temperature Sensor
  Tagline: "Sense. Learn. Predict. Prevent."
  ============================================================

  Wiring Guide:
  ESP32 DevKit V1 (38-pin / 30-pin):
    - MPU6050 SDA  -> GPIO 21
    - MPU6050 SCL  -> GPIO 22
    - MPU6050 VCC  -> 3.3V
    - MPU6050 GND  -> GND

  L298N Motor Driver:
    - IN1          -> GPIO 18
    - IN2          -> GPIO 19
    - ENA (PWM)    -> GPIO 23 (LEDC PWM Channel 0)
    - Motor VCC    -> External 6V Battery / DC Power Supply
    - Common GND   -> ESP32 GND + Power Supply GND

  Temperature Sensor:
    - DS18B20 Data -> GPIO 4 (with 4.7k pullup) OR MPU6050 internal die temperature
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>

// ================= CONFIGURATION =================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Replace with the IP address of your host machine running BO MOTOR AI backend
const char* serverUrl = "http://192.168.1.100:8000/api/ingest";

// Hardware Pin Definitions
#define MPU6050_ADDR 0x68
#define PIN_IN1 18
#define PIN_IN2 19
#define PIN_ENA 23

#define PWM_FREQ 1000
#define PWM_RES  8     // 8-bit resolution (0-255)
#define PWM_CHAN 0

// Sampling & Reporting Rate
const unsigned long REPORT_INTERVAL_MS = 1000; // 1 Hz HTTP report
unsigned long lastReportTime = 0;

void setupMPU6050() {
  Wire.begin(21, 22);
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0);    // Wake up MPU-6050
  Wire.endTransmission(true);
  Serial.println("[MPU6050] Initialized on I2C (SDA:21, SCL:22)");
}

void setupMotor() {
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  ledcAttach(PIN_ENA, PWM_FREQ, PWM_RES);

  // Set motor forward direction
  digitalWrite(PIN_IN1, HIGH);
  digitalWrite(PIN_IN2, LOW);

  // Set nominal PWM duty cycle (80% duty = ~204 / 255)
  ledcWrite(PIN_ENA, 204);
  Serial.println("[L298N] Motor Forward @ 80% PWM Duty Cycle");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n================================================");
  Serial.println("  BO MOTOR AI - ESP32 Telemetry Node Initializing");
  Serial.println("================================================");

  setupMPU6050();
  setupMotor();

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[Wi-Fi] Warning: Connection failed. Operating in offline logging mode.");
  }
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastReportTime >= REPORT_INTERVAL_MS) {
    lastReportTime = currentMillis;

    // Read MPU6050 Raw Registers
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x3B); // Starting with register 0x3B (ACCEL_XOUT_H)
    Wire.endTransmission(false);
    Wire.requestFrom((uint16_t)MPU6050_ADDR, (uint8_t)14, true);

    int16_t raw_ax = Wire.read() << 8 | Wire.read();
    int16_t raw_ay = Wire.read() << 8 | Wire.read();
    int16_t raw_az = Wire.read() << 8 | Wire.read();
    int16_t raw_temp = Wire.read() << 8 | Wire.read();
    int16_t raw_gx = Wire.read() << 8 | Wire.read();
    int16_t raw_gy = Wire.read() << 8 | Wire.read();
    int16_t raw_gz = Wire.read() << 8 | Wire.read();

    // Scale factors: +/- 2g range -> 16384 LSB/g
    float ax = (float)raw_ax / 16384.0;
    float ay = (float)raw_ay / 16384.0;
    float az = (float)raw_az / 16384.0;

    // Temperature formula for MPU-6050 die temperature in °C
    float temperature = ((float)raw_temp / 340.0) + 36.53;

    // Gyroscope scaled to deg/s (+/- 250 deg/s range -> 131 LSB/(deg/s))
    float gx = (float)raw_gx / 131.0;
    float gy = (float)raw_gy / 131.0;
    float gz = (float)raw_gz / 131.0;

    float pwm_duty = 80.0; // 80%

    // Print Telemetry Summary
    Serial.printf("[TELEMETRY] Ax:%.2fg Ay:%.2fg Az:%.2fg | Temp:%.1fC | PWM:%.0f%%\n",
                  ax, ay, az, temperature, pwm_duty);

    // Send HTTP POST if connected
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");

      char jsonPayload[320];
      snprintf(jsonPayload, sizeof(jsonPayload),
        "{\"motor_id\":\"BO_MOTOR_01\",\"temperature\":%.2f,\"ax\":%.4f,\"ay\":%.4f,\"az\":%.4f,\"gyro_x\":%.4f,\"gyro_y\":%.4f,\"gyro_z\":%.4f,\"pwm_duty\":%.1f,\"source\":\"real\"}",
        temperature, ax, ay, az, gx, gy, gz, pwm_duty
      );

      int httpResponseCode = http.POST(jsonPayload);
      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("[HTTP %d] Telemetry ingested successfully\n", httpResponseCode);
      } else {
        Serial.printf("[HTTP ERROR] %s\n", http.errorToString(httpResponseCode).c_str());
      }
      http.end();
    }
  }
}
