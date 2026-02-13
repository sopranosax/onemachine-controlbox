/**
 * Configuration file for IoT Control WebApp
 */

const Config = {
    // Google Apps Script Web App URL
    // Replace with your deployed Apps Script Web App URL
    API_BASE_URL: 'h/**
        * CtrlBx ESP32 - Configuration Header
 * IoT Access Control Platform
    *
 * Define all pin assignments and configuration constants
    */

#ifndef CONFIG_H
#define CONFIG_H

// Uncomment the following line to enable debug output
#define DEBUG

// ==================== API CONFIGURATION ====================
// Replace with your Google Apps Script Web App URL
#define API_BASE_URL                                                           \
"https://script.google.com/macros/s/"                                        \
"AKfycbx04MS_V64sWhrK647mPkhyF36jR6nb3IlmpSDE_"                              \
"RfL0G32mX14Ic95xqNqPRkWswq81Q/exec"

// Fallback token type (only used on first boot before backend config is
// fetched)
#define DEVICE_TOKEN_TYPE "WSH" // Overridden by backend config once connected

// ==================== FIRST BOOT DEFAULTS ====================
// These are used on first boot to connect to WiFi and register the device
#define DEFAULT_WIFI_SSID "AndroidAP2D14" // Change before flashing
#define DEFAULT_WIFI_PASS "igkz1998"      // Change before flashing
#define DEFAULT_LOCATION "NEW DEVICE"     // Default location name

// ==================== PIN DEFINITIONS ====================

// RFID MFRC522 Pins (SPI)
#define RFID_SS_PIN 5   // SDA/SS
#define RFID_RST_PIN 27 // RST
// SCK  = GPIO 18 (Hardware SPI)
// MOSI = GPIO 23 (Hardware SPI)
// MISO = GPIO 19 (Hardware SPI)

// LCD I2C Pins
#define LCD_SDA_PIN 21    // I2C Data
#define LCD_SCL_PIN 22    // I2C Clock
#define LCD_I2C_ADDR 0x27 // I2C Address (try 0x3F if 0x27 doesn't work)

// RTC DS3231 (shares I2C bus with LCD)
#define RTC_I2C_ADDR 0x68 // DS3231 I2C Address
#define LCD_COLS 16
#define LCD_ROWS 2

// Relay Pin
#define RELAY_PIN 26

// LED Pins
#define LED_BLUE_PIN 2  // WiFi status (built-in LED on most ESP32)
#define LED_GREEN_PIN 4 // Relay ON indicator
#define LED_RED_PIN 15  // IDLE/Standby indicator

// Buzzer Pin
#define BUZZER_PIN 25

// ==================== TIMING CONSTANTS ====================

// WiFi connection
#define WIFI_CONNECT_TIMEOUT_MS 15000   // 15 seconds timeout per attempt
#define WIFI_MAX_RETRIES 3              // Max retries before SAFE_MODE
#define WIFI_CHECK_INTERVAL_MS 30000    // Check WiFi every 30 seconds
#define WIFI_RECONNECT_INTERVAL_MS 5000 // Wait between reconnect attempts

// RFID
#define RFID_READ_DELAY_MS 500 // Delay after reading a card

// Display
#define DISPLAY_MESSAGE_DELAY_MS 2000 // Time to show messages (2 seconds)
#define COUNTDOWN_UPDATE_MS 1000      // Update countdown every second
#define REGISTRATION_DISPLAY_MS                                                \
10000 // Time to show registration message (10 seconds)

// Watchdog
#define WDT_TIMEOUT_SEC 30 // Watchdog timeout (30 seconds)

// NTP
#define NTP_SERVER "pool.ntp.org"
// Chile/Santiago: CLT (UTC-4) / CLST (UTC-3) with DST
#define NTP_TIMEZONE "<-04>4<-03>,M10.2.6/24,M3.2.6/24"
#define NTP_SYNC_TIMEOUT_MS 10000 // 10 seconds timeout for NTP sync

// Sleep Mode
#define SLEEP_CHECK_INTERVAL_MS 60000 // Check time window every 60 seconds

// API
#define API_TIMEOUT_MS 10000 // HTTP request timeout (10 seconds)

// ==================== DEFAULT VALUES ====================
// These are used if not configured from backend

#define DEFAULT_TIME_LIMIT_MIN 30 // Default relay activation time
#define DEFAULT_RECONNECT_SEC 60  // Default WiFi reconnect interval

// ==================== STORAGE KEYS ====================
// Keys for Preferences library

#define PREF_NAMESPACE "ctrlbx"
#define KEY_WIFI_SSID "wifi_ssid"
#define KEY_WIFI_PASS "wifi_pass"
#define KEY_TIME_LIMIT "time_limit"
#define KEY_RECONNECT_SEC "reconnect_sec"
#define KEY_MASTERKEYS "masterkeys"
#define KEY_DEVICE_ID "device_id"
#define KEY_TW_START "tw_start"
#define KEY_TW_END "tw_end"
#define KEY_TOKEN_TYPE "token_type"
#define KEY_REGISTERED "registered"

// ==================== STATE DEFINITIONS ====================

enum SystemState {
    STATE_BOOT,           // Initial boot
    STATE_CONNECTING,     // Connecting to WiFi
    STATE_IDLE,           // Waiting for RFID card
    STATE_VALIDATING,     // Querying backend
    STATE_ACCESS_GRANTED, // Relay active with countdown
    STATE_ACCESS_DENIED,  // Access rejected
    STATE_IN_USE,         // System busy (relay already active)
    STATE_SAFE_MODE,      // No WiFi, only MASTERKEY works
    STATE_RECOVERING,     // Attempting reconnection
    STATE_REGISTERING,    // Registering device on backend
    STATE_FINISHED,       // Countdown completed
    STATE_SLEEP_MODE      // Outside time window, only MASTERKEY works
};

// ==================== EVENT TYPES ====================

#define EVENT_ACCESS_GRANTED "ACCESS_GRANTED"
#define EVENT_ACCESS_DENIED "ACCESS_DENIED"
#define EVENT_NO_TOKENS "NO_TOKENS"
#define EVENT_INVALID_TOKEN "INVALID_TOKEN_TYPE"
#define EVENT_USER_INACTIVE "USER_INACTIVE"
#define EVENT_UNREGISTERED "UNREGISTERED"
#define EVENT_MASTERKEY "MASTERKEY_ACCESS"
#define EVENT_DEVICE_ONLINE "DEVICE_ONLINE"
#define EVENT_DEVICE_OFFLINE "DEVICE_OFFLINE"
#define EVENT_OUTSIDE_TIME_WINDOW "OUTSIDE_TIME_WINDOW"
#define EVENT_DEVICE_REGISTERED "DEVICE_REGISTERED"

// ==================== BUZZER FREQUENCIES ====================

// Musical notes (Hz)
#define NOTE_C4 262
#define NOTE_D4 294
#define NOTE_E4 330
#define NOTE_F4 349
#define NOTE_G4 392
#define NOTE_A4 440
#define NOTE_B4 494
#define NOTE_C5 523
#define NOTE_D5 587
#define NOTE_E5 659
#define NOTE_F5 698
#define NOTE_G5 784

#endif // CONFIG_H
',

// Roles
ROLES: {
    MASTER: 'MASTER',
        ADMIN: 'ADMIN',
            VIEWER: 'VIEWER'
},

// Status values
STATUS: {
    ACTIVE: 'ACTIVO',
        INACTIVE: 'INACTIVO'
},

// Event types
EVENT_TYPES: {
    ACCESS_GRANTED: 'ACCESS_GRANTED',
        ACCESS_DENIED: 'ACCESS_DENIED',
            IN_USE: 'IN_USE',
                ERROR: 'ERROR',
                    WIFI_DOWN: 'WIFI_DOWN',
                        WIFI_RESTORED: 'WIFI_RESTORED',
                            DEVICE_RESTARTED: 'DEVICE_RESTARTED'
},

// UI Settings
UI: {
    OFFLINE_THRESHOLD_MIN: 5,
        RECENT_EVENTS_LIMIT: 10,
            ITEMS_PER_PAGE: 20,
                TOAST_DURATION: 4000
},

// Local Storage Keys
STORAGE_KEYS: {
    USER_EMAIL: 'iot_user_email',
        USER_ROLE: 'iot_user_role',
            USER_NAME: 'iot_user_name'
}
};

Object.freeze(Config);
Object.freeze(Config.ROLES);
Object.freeze(Config.STATUS);
Object.freeze(Config.EVENT_TYPES);
Object.freeze(Config.UI);
Object.freeze(Config.STORAGE_KEYS);
