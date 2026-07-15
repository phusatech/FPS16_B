# FPS16B — PCR System Software

Hệ thống phần mềm điều khiển máy PCR chạy trên Raspberry Pi, giao tiếp với vi điều khiển STM32 qua Modbus RTU UART, phục vụ giao diện web realtime và màn hình TFT vật lý.

---

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                     Raspberry Pi                            │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │  Node.js     │   │  Python      │   │  STM32         │  │
│  │  server_pcr  │   │  tft.py      │   │  (Slave)       │  │
│  │  port :3000  │   │  160×128 SPI │   │  Modbus RTU    │  │
│  └──────┬───────┘   └──────┬───────┘   └───────┬────────┘  │
│         │                  │                   │            │
│         │   /tmp/tft_state.json                │            │
│         ├──────────────────┘                   │            │
│         │                         UART /dev/serial0        │
│         └──────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
         ↕ Socket.IO / HTTP
    [ Browser Web UI ]
```

---

## Cấu trúc thư mục

```
PCR/
├── server_pcr.js                  # Entry point — khởi động toàn hệ thống
├── http_server.js                 # Express HTTP server, serve static files
│
├── Modbus/
│   ├── Modbus_Client.js           # Driver UART RTU (modbus-serial)
│   ├── Modbus_Process.js          # Khởi tạo kết nối và bắt đầu polling
│   ├── Polling_engine.js          # Vòng lặp polling 200ms, xử lý lỗi, cập nhật TFT
│   ├── Modbus_Map.js              # Bản đồ địa chỉ input/holding registers
│   ├── Modbus_Decoder.js          # Giải mã raw registers → giá trị có nghĩa
│   ├── Modbus_Package.js          # Đóng gói và ghi lệnh xuống STM32
│   ├── Modbus_Constants.js        # Hằng số lệnh, trạng thái, giới hạn mảng
│   └── Cache_Mapper.js            # Bộ đệm toàn cục (Cache) + expandCache()
│
├── Runtime/
│   └── runtime_manager.js         # RAM mirror trạng thái chạy, đọc/ghi current_run.json
│
├── socket/
│   ├── socket_server.js           # Khởi tạo Socket.IO
│   └── socket_handlers.js         # Xử lý tất cả sự kiện socket, realtime emitter 200ms
│
├── services/
│   ├── recovery_service.js        # Phát hiện và phục hồi sau mất nguồn
│   ├── history_service.js         # Lưu/đọc lịch sử lần chạy (Storage/YYYY.MM.DD/)
│   ├── SavedProtocolService.js    # Lưu/đọc protocol đã lưu (Protocols/)
│   ├── tft_service.js             # Ghi dữ liệu vào /tmp/tft_state.json cho TFT
│   ├── device_service.js          # Đọc/ghi thông tin thiết bị (information.json)
│   ├── wifi_service.js            # Quản lý WiFi qua nmcli
│   ├── github_service.js          # Cập nhật firmware qua GitHub
│   └── storageService.js          # Tiện ích lưu trữ file chung
│
└── public/PCR/
    ├── core/
    │   ├── api.js                 # window.API — giao diện gọi socket từ UI
    │   ├── socket_client.js       # Kết nối Socket.IO phía client
    │   └── store.js               # State toàn cục phía client
    ├── shared/
    │   ├── Handle.js              # Xử lý nút RUN/STOP/PAUSE + auto-save draft
    │   ├── PageRouter.js          # Điều hướng trang
    │   ├── Convert.js             # Hàm chuyển đổi định dạng
    │   └── Data_config.js         # Cấu hình dữ liệu chung
    ├── components/
    │   ├── header/header.js       # Navbar, error banner, power loss alert
    │   ├── notification.js        # Modal thông báo (Show_Notification)
    │   ├── Render_Managers.js     # Render stage PCR, xử lý thay đổi thông số
    │   └── program/program.js     # Component hiển thị chương trình
    └── features/
        ├── PCR_New/               # Tab New — soạn và chạy protocol mới
        ├── PCR_History/           # Tab History — xem lịch sử các lần chạy
        ├── PCR_Saved/             # Tab Saved — quản lý protocol đã lưu
        ├── PCR_Calib/             # Trang Calibration — ghi calib xuống STM32
        ├── PCR_Temp_Calib/        # Hiệu chỉnh nhiệt độ cảm biến
        ├── PCR_Config/            # Cấu hình hệ thống (debug, simulate, device)
        ├── PCR_Wifi_Config/       # Cấu hình WiFi
        ├── PCR_Set_Time/          # Đặt ngày giờ hệ thống
        ├── PCR_Session_Info/      # Thông tin phiên chạy hiện tại
        ├── PCR_Run_Review/        # Xem lại kết quả lần chạy
        ├── PCR_Update_Protocol/   # Cập nhật protocol
        ├── PCR_Base/              # Base logic chung
        ├── PCR_Admin/             # Quản trị hệ thống
        └── PCR_Elements/          # Create_UI.js, Update_UI.js — vẽ chart, render UI

TFT/
├── tft.py                         # Vẽ màn hình TFT 160×128, đọc /tmp/tft_state.json mỗi 200ms
└── TFT_SPI.py                     # Driver SPI ST7735R
```

---

## Luồng khởi động server

```
server_pcr.js
  1. Modbus_Process.startSystem()
       → ModbusClient.connect()  (UART /dev/serial0, 115200 baud, slave ID=1)
       → PollingEngine.init(client)
       → PollingEngine.start()   (setInterval 200ms)
  2. RecoveryService.checkAndRecover()  (async, background)
  3. createHttpServer()  → Express, serve /public
  4. createSocket(server) → Socket.IO handlers
  5. server.listen(3000, "0.0.0.0")
```

---

## Polling Engine (vòng lặp 200ms)

File: `Modbus/Polling_engine.js`

```
loop()
  │
  ├─ 1. Xử lý hàng đợi lệnh (commandQueue) — ưu tiên cao nhất
  │       executeCommand("SYSTEM_RUN / STOP / PAUSE / AUTO")
  │       executeCommand("WRITE_PROTOCOL_CONFIG")
  │       executeCommand("WRITE_PRO_STATE")
  │       executeCommand("WRITE_CALIB")  → _pollCalibSaveStatus() (poll 50ms, timeout 5s)
  │
  ├─ 2. readInputIfReady()  — đọc input[0], nếu = 1 → đọc toàn bộ input registers
  │       → expandCache() → Cache.Show_UI, Cache.Measure, Cache.Vbuck,
  │                          Cache.Setpoint, Cache.Pro_State, Cache.System...
  │
  ├─ 3. readHoldingIfReady() — đọc holding[0], nếu = 1 → đọc toàn bộ holding registers
  │       → expandCache() → Cache.Calib, Cache.System, Cache.Pro_Conf,
  │                          Cache.Flag (Error_Sensor/Power/Timeout/Memory)
  │
  ├─ 4. _checkErrors()
  │       → Chỉ hoạt động khi Cache.System.State = 1 (đang chạy)
  │       → Cache.Flag.Error_Sensor = 1  → Notification + SYSTEM_STOP
  │       → Cache.Flag.Error_Power  = 1  → Notification + SYSTEM_STOP
  │       → Cache.Flag.Error_Timeout = 1 → Notification (không stop)
  │       → Cache.Flag.Error_Memory  = 1 → Notification (không stop)
  │       → _notifiedErrors Set: mỗi lỗi chỉ ghi 1 lần/lần chạy
  │       → Clear _notifiedErrors khi state ≠ 1
  │
  └─ 5. _updateTFT() — throttle 500ms
          → Đọc Cache + Runtime → ghi /tmp/tft_state.json
          → Hoạt động độc lập, không cần browser kết nối
```

---

## Bản đồ Modbus Registers

### Input Registers (3xxxx) — slave gửi khi input flag (addr 0) = 1

| Địa chỉ | Tên | Kiểu | Mô tả |
|---|---|---|---|
| 1–2 | Show_UI_Block | float | Nhiệt độ block hiển thị (°C) |
| 3–4 | Show_UI_Lid | float | Nhiệt độ nắp hiển thị (°C) |
| 5–6 | Measure_Heatsink | float | Cảm biến heatsink |
| 7–8 | Measure_Lid | float | Cảm biến nắp |
| 9–18 | Measure_Pel1/2/3 | float | Cảm biến Peltier 1/2/3 |
| 15–24 | Measure_Card1/2/3 | float | Cảm biến card nhiệt 1/2/3 |
| 21–28 | Vbuck_Pel1/2/3/Fan | float | Điện áp buck converter (V) |
| 29–34 | Setpoint_Block/Time/Lid | float | Giá trị đặt hiện tại |
| 35 | Fan_State | u8 | Trạng thái quạt |
| 36 | Control_State | u8 | Trạng thái bộ điều khiển |
| 37–48 | Pro_State_* | u8/u16 | Trạng thái thực thi protocol |
| 49–52 | Pro_State_Cycles_PCR_Cnt[4] | u8 | Số cycles đã chạy mỗi PCR loop |
| 53 | Calib_Save_Status | u8 | Kết quả lưu calib (0=idle, 1=OK, 2=fail) |

### Holding Registers (4xxxx) — slave gửi khi holding flag (addr 0) = 1

| Địa chỉ | Tên | Mô tả |
|---|---|---|
| 1–43 | Calib_* | Dữ liệu calibration (threshold, speed, …) |
| 44 | System_State | 0=Stop, 1=Run, 2=Pause, 3=Auto |
| 45–47 | System_Debug/Simulate/Device | Cấu hình hệ thống |
| 48–107 | ProConf_Block[30] | Nhiệt độ setpoint 30 bước (float) |
| 108–167 | ProConf_Time[30] | Thời gian setpoint 30 bước (float) |
| 168–169 | ProConf_Lid | Nhiệt độ nắp setpoint |
| 170–181 | ProConf_Liquid/Hold/Loop/… | Cấu hình cấu trúc protocol |
| 182 | Flag_Error_Timeout | Cờ lỗi timeout điều khiển |
| 183 | Flag_Error_Sensor | Cờ lỗi cảm biến nhiệt độ |
| 184 | Flag_Error_Power | Cờ lỗi bộ điều khiển công suất |
| 185 | Flag_Error_Memory | Cờ lỗi ghi flash |

### Lệnh ghi xuống slave (Master → addr 0, holding)

| Lệnh | Giá trị cmd | Mô tả |
|---|---|---|
| MT_UPDATE_SYSTEM_STATE | 2 | Thay đổi trạng thái Run/Stop/Pause/Auto |
| MT_UPDATE_BLOCK_TIME_CONFIG | 3 | Ghi Block temp + Time setpoints |
| MT_UPDATE_PROTOCOL_CONFIG | 4 | Ghi Lid, Liquid, Loop config |
| MT_UPDATE_CALIB_CONFIG | 1 | Ghi calib + system config vào flash |
| MT_UPDATE_PRO_STATE | 5 | Ghi trạng thái thực thi protocol (recovery) |

---

## Runtime Manager

File: `Runtime/runtime_manager.js`

RAM mirror của `current_run.json` — lưu toàn bộ trạng thái lần chạy:

```json
{
  "System_State": 1,
  "PROTOCOL_NAME": "PCR_Test",
  "Block": [95.0, 60.0, 72.0, "...30 phần tử"],
  "Time":  [30, 45, 20, "...30 phần tử"],
  "Lid": 105.0,
  "Liquid": 25,
  "Hold_Start": 1,
  "PCR_Loop": 2,
  "Cycles_PCR": [30, 25, 0, 0],
  "Date_Run": "09/07/2026",
  "Time_Run_Start": "14:30:00",
  "Notifications": [
    { "Error_Code": "ERR_SENSOR", "Message": "[14:32:07] Temperature sensor error | ..." }
  ],
  "Measured_Temperature_Array": ["...tối đa 8000 mẫu"],
  "Target_Temperature_Array":   ["...tối đa 8000 mẫu"],
  "Runtime_State": {
    "PCR_Loop_Index": 0,
    "Cycles_PCR_Cnt": [3, 0, 0, 0],
    "Time_Run_Cnt": 138
  }
}
```

Ghi file mỗi 2 giây khi đang chạy → cơ chế phát hiện mất nguồn.

---

## Socket Events

### Client → Server

| Event | Mô tả |
|---|---|
| `system_run` | Ghi protocol + chạy (bị chặn nếu có error flag) |
| `system_stop` | Dừng chương trình |
| `system_pause` | Tạm dừng |
| `system_auto` | Chế độ auto |
| `calib:write` | Ghi calibration xuống STM32 + lưu flash |
| `history:run_trigger` | Load protocol từ history vào runtime |
| `history:rerun` | Chạy lại protocol cũ (bị chặn nếu có error flag) |
| `protocol:update_draft` | Auto-save thông số đang chỉnh sửa vào runtime |
| `device:get_error_state` | Lấy trạng thái cờ lỗi hiện tại |
| `device:get_power_loss` | Kiểm tra có mất nguồn trước đó không |
| `device:ack_power_loss` | Xác nhận đã đọc cảnh báo mất nguồn |

### Server → Client

| Event | Tần suất | Mô tả |
|---|---|---|
| `EMIT_REALTIME_DEVICE_DATA` | 200ms/socket | Nhiệt độ, state, chart data, error flags |
| `device:error` | Khi thay đổi | Trạng thái cờ lỗi hardware |
| `device:power_loss_alert` | 1 lần/boot | Cảnh báo mất nguồn chưa acknowledged |
| `device_info` | Khi connect | Thông tin thiết bị (tên, serial) |

---

## Xử lý lỗi

### Các loại lỗi và hành vi

| Error Code | Nguồn | Hành vi | Message |
|---|---|---|---|
| `ERR_SENSOR` | `Cache.Flag.Error_Sensor = 1` | Notification + **SYSTEM_STOP** | `[HH:MM:SS] Temperature sensor error \| Heatsink=...°C Pel1=...°C ...` |
| `ERR_POWER` | `Cache.Flag.Error_Power = 1` | Notification + **SYSTEM_STOP** | `[HH:MM:SS] Power controller error` |
| `ERR_TIMEOUT` | `Cache.Flag.Error_Timeout = 1` | Notification (không stop) | `[HH:MM:SS] Control timeout — Loop X, Cycle Y/Z` |
| `ERR_MEMORY` | `Cache.Flag.Error_Memory = 1` | Notification (không stop) | `[HH:MM:SS] Memory error — flash write failed` |
| `ERR_POWER_LOSS` | `System_State=1` lúc boot | Recovery + cảnh báo | `Power lost on DD/MM/YYYY at HH:MM` |

### Khóa RUN khi có lỗi

- **Server**: `system_run`, `history:rerun` bị reject ngay, emit `system_run_rejected`
- **UI**: Nút START bị `disabled` mỗi 200ms khi `hasError = true`
- **Banner**: `⚠ Sensor Error & Power Error` hiển thị trên đầu trang khi có cờ lỗi

---

## Power Loss Recovery

File: `services/recovery_service.js`

Khi server khởi động, nếu `current_run.json` có `System_State = 1`:

```
1. Chờ Modbus sẵn sàng (tối đa 12 giây)
2. Ghi Notification ERR_POWER_LOSS (ngày giờ + vị trí cycle/loop)
3. Frame 1+2: WRITE_PROTOCOL_CONFIG  → khôi phục Block/Time/Lid/Loop config
4. Frame 3:   WRITE_PRO_STATE        → khôi phục vị trí trong protocol
5. Frame 4:   SYSTEM_RUN             → tiếp tục chạy
6. Banner + modal "Power Loss Warning" trên web UI
   → User bấm X: modal đóng, banner vẫn giữ hiển thị
```

---

## Cache Mapper

File: `Modbus/Cache_Mapper.js`

`expandCache(Cache, decoded)` tự động phân nhóm key theo tiền tố trước dấu `_` đầu tiên:

| Key Modbus | Cache path |
|---|---|
| `Show_UI_Block` | `Cache.Show_UI.Block` |
| `Measure_Heatsink` | `Cache.Measure.Heatsink` |
| `Vbuck_Pel1` | `Cache.Vbuck.Pel1` |
| `System_State` | `Cache.System.State` |
| `Pro_State_PCR_Loop_Index` | `Cache.Pro_State.PCR_Loop_Index` |
| `Flag_Error_Sensor` | `Cache.Flag.Error_Sensor` |
| `Calib_Control_Timeout` | `Cache.Calib.Control_Timeout` |
| `ProConf_Block` | `Cache.Pro_Conf.Block` |

---

## TFT Display

File: `TFT/tft.py`

Màn hình SPI 160×128 ST7735R, poll `/tmp/tft_state.json` mỗi 200ms.  
Cập nhật từ `_updateTFT()` trong Polling Engine mỗi 500ms (độc lập browser).

| Thông số | Nguồn dữ liệu |
|---|---|
| Nhiệt độ block | `Cache.Show_UI.Block` → `round()` |
| Cycle X / tổng | `Cycles_PCR_Cnt[loopIndex]` / `Runtime.Cycles_PCR[loopIndex]` |
| Thời gian chạy | `Runtime_State.Time_Run_Cnt` |
| Thời gian tổng | `Runtime.Time_Run_Total_Sec` |
| Trạng thái | `Cache.System.State` |
| WiFi / Device ID | `information.json` |

---

## Lưu trữ

```
/home/pi/FPS16_B/
├── PCR/Storage/YYYY.MM.DD/
│   └── ProtocolName.json          # Kết quả lần chạy (auto-save khi STOP)
├── PCR/Protocols/CategoryName/
│   └── ProtocolName.json          # Protocol lưu thủ công
├── PCR/Runtime/
│   └── current_run.json           # Trạng thái lần chạy hiện tại (RAM mirror)
├── PCR/Config/
│   └── default_protocol.json      # Protocol mặc định khi mở New
└── information.json               # Thông tin thiết bị (tên, serial)
```

---

## Khởi động

```bash
# Server Node.js
cd /home/pi/FPS16_B/PCR
sudo node server_pcr.js

# Màn hình TFT (chạy song song)
cd /home/pi/FPS16_B/TFT
python3 tft.py
```

Truy cập web: `http://<IP_Raspberry>:3000`
