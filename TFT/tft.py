import time
import threading
import math
import os
import json
from PIL import Image, ImageDraw, ImageFont
from TFT_SPI import TFT_Init

STATE_FILE    = '/tmp/tft_state.json'
QR_STATE_FILE = '/tmp/tft_qr.json'   # file riêng cho QR, chỉ server_app ghi
POLL_SEC   = 0.2   # poll mỗi 200ms

# Init display
disp, width, height = TFT_Init()

# Colors
BG_COLOR     = (0, 0, 0)
CARD_BG      = (0, 0, 0)
TEXT_WHITE   = (255, 255, 200)
CYAN_GLOW    = (70, 255, 255)
RED_TEMP     = (0, 0, 255)
GREEN_ACTIVE = (0, 180, 120)
RED_UNACTIVE = (0, 0, 240)
TEXT_GRAY    = (100, 105, 115)
WIFI_PURPLE  = (120, 60, 255)

# Fonts
try:
    font_main       = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    font_mid        = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    font_label      = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 10)
    font_small      = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
    font_smallest   = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 9)
    font_noti       = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    font_time_total = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
    font_header     = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 9)
    font_device_id  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    font_status     = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 8)
    font_wifi_name  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
    font_footer     = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 8)
    font_loading    = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
except:
    font_main = font_mid = font_label = font_small = font_loading = ImageFont.load_default()
    font_smallest = font_noti = font_time_total = font_header = ImageFont.load_default()
    font_device_id = font_status = font_wifi_name = font_footer = ImageFont.load_default()


# =============================================================
# LOADING SCREEN
# =============================================================
_stop_loading = threading.Event()
_LOADING_DOTS = 8
_DOT_R        = 3
_RING_R       = 16

def draw_loading_frame(frame):
    image = Image.new("RGB", (width, height), BG_COLOR)
    draw  = ImageDraw.Draw(image)

    txt  = "Loading"
    bbox = draw.textbbox((0, 0), txt, font=font_loading)
    tw   = bbox[2] - bbox[0]
    tx   = (width - tw) // 2
    ty   = 22
    for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        draw.text((tx + ox, ty + oy), txt, font=font_loading, fill=(0, 80, 130))
    draw.text((tx, ty), txt, font=font_loading, fill=(70, 210, 255))

    cx, cy = width // 2, 70
    head = frame % _LOADING_DOTS
    for i in range(_LOADING_DOTS):
        angle = (i / _LOADING_DOTS) * 2 * math.pi - math.pi / 2
        dx = cx + int(_RING_R * math.cos(angle))
        dy = cy + int(_RING_R * math.sin(angle))
        age   = (head - i) % _LOADING_DOTS
        bri   = max(18, 255 - age * 30)
        color = (0, int(bri * 0.65), bri)
        draw.ellipse((dx - _DOT_R, dy - _DOT_R, dx + _DOT_R, dy + _DOT_R), fill=color)

    wait = "Please wait..."
    wb   = draw.textbbox((0, 0), wait, font=font_smallest)
    ww   = wb[2] - wb[0]
    draw.text(((width - ww) // 2, height - 16), wait, font=font_smallest, fill=(50, 65, 85))
    disp.image(image)

def _loading_thread_fn():
    frame = 0
    while not _stop_loading.is_set():
        draw_loading_frame(frame)
        frame += 1
        _stop_loading.wait(0.18)


# =============================================================
# RUNNING UI
# =============================================================
def draw_state(obj, system_run):
    if system_run == 1:
        obj.rounded_rectangle((5, 5, 65, 21), radius=3, fill=GREEN_ACTIVE)
        obj.text((10, 6), "Running", font=font_small, fill=(255, 255, 255))
    else:
        obj.rounded_rectangle((5, 4, 45, 21), radius=3, fill=RED_UNACTIVE)
        obj.text((10, 6), "Stop", font=font_small, fill=(255, 255, 255))

def draw_wifi(obj, x, y, name):
    color = (255, 180, 70)
    obj.arc((x,    y,    x+12, y+10), start=210, end=330, fill=color, width=1)
    obj.arc((x+2,  y+4,  x+10, y+10), start=210, end=330, fill=color, width=1)
    obj.arc((x+4,  y+8,  x+8,  y+10), start=210, end=330, fill=color, width=1)
    display_name = name[:11] + "..." if len(name) > 11 else name
    obj.text((x + 15, y + 2), display_name, font=font_smallest, fill=TEXT_WHITE)

def draw_ui(sys_state, cycles, cycles_sp, temp, remain_sec, wifi):
    image = Image.new("RGB", (width, height), BG_COLOR)
    draw  = ImageDraw.Draw(image)

    draw_state(draw, sys_state)
    draw_wifi(draw, 70, 8, wifi)
    draw.line((5, 25, 155, 25), fill=(120, 120, 120), width=1)

    draw.rounded_rectangle((5, 28, 77, 65), radius=7, outline=(120, 120, 120), fill=CARD_BG)
    draw.text((20, 32), "SAMPLE", font=font_label, fill=TEXT_WHITE)
    draw.text((20, 44), f"{round(temp)}°C", font=font_mid, fill=RED_TEMP)

    rect_right = (83, 28, 155, 65)
    draw.rounded_rectangle(rect_right, radius=7, outline=(120, 120, 120), fill=CARD_BG)
    draw.text((100, 32), "CYCLES", font=font_label, fill=TEXT_WHITE)
    cycle_str = f"{cycles}/{cycles_sp}"
    c_bbox = draw.textbbox((0, 0), cycle_str, font=font_mid)
    c_tw   = c_bbox[2] - c_bbox[0]
    cycle_x = rect_right[0] + ((rect_right[2] - rect_right[0]) - c_tw) // 2
    draw.text((cycle_x, 44), cycle_str, font=font_mid, fill=(0, 255, 150))

    draw.rounded_rectangle((5, 70, 155, 122), radius=7, outline=(255, 150, 0), fill=(0, 0, 0))
    draw.text((36, 75), "TIME REMAINING", font=font_label, fill=(255, 180, 0))
    m, s = divmod(remain_sec, 60)
    h, m = divmod(m, 60)
    time_str = f"{h:02}:{m:02}:{s:02}"
    bbox = draw.textbbox((0, 0), time_str, font=font_main)
    tw   = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, 87), time_str, font=font_main, fill=CYAN_GLOW)
    disp.image(image)


# =============================================================
# FINISH UI
# =============================================================
def draw_finish_ui(time_total_sec):
    image = Image.new("RGB", (width, height), (5, 10, 20))
    draw  = ImageDraw.Draw(image)

    GREEN_THEME = (0, 255, 120)
    BOX_BG      = (10, 30, 35)

    draw.rectangle((5, 12, 8, 42), fill=GREEN_THEME)
    draw.multiline_text((14, 10), "COMPLETE THE\nPROGRAM!", font=font_noti,
                        fill=(255, 255, 255), spacing=2)
    draw.text((10, 50),  "FINISHED", font=font_label, fill=GREEN_THEME)
    draw.text((120, 50), "100%",     font=font_label, fill=GREEN_THEME)

    draw.rounded_rectangle((10, 67, 148, 73), radius=3, fill=(20, 50, 45))
    draw.rounded_rectangle((10, 67, 148, 73), radius=3, fill=GREEN_THEME)
    draw.rounded_rectangle((10, 80, 148, 115), radius=7, outline=(0, 80, 60), fill=BOX_BG)
    draw.text((20, 85), "TOTAL\nTIME:", font=font_small, fill=(255, 255, 255), spacing=0)

    m, s = divmod(time_total_sec, 60)
    h, m = divmod(m, 60)
    time_str = f"{h:02}:{m:02}:{s:02}"
    t_bbox = draw.textbbox((0, 0), time_str, font=font_time_total)
    t_w    = t_bbox[2] - t_bbox[0]
    draw.text((140 - t_w, 90), time_str, font=font_time_total, fill=GREEN_THEME)
    disp.image(image)


# =============================================================
# QR CODE UI
# =============================================================
def _make_qr_matrix(data):
    try:
        import qrcode
        # border=1: quiet zone tối thiểu, giữ cho cell size lớn hơn trên màn nhỏ
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_L,
                           box_size=1, border=1)
        qr.add_data(data)
        qr.make(fit=True)
        return qr.get_matrix()
    except Exception as e:
        print(f"[TFT-QR] _make_qr_matrix error: {e}")
        return None

def draw_qr_ui(url, label="PCR"):
    image = Image.new("RGB", (width, height), BG_COLOR)
    draw  = ImageDraw.Draw(image)

    matrix = _make_qr_matrix(url)
    if matrix:
        n = len(matrix)

        # TITLE_H=12 → avail_h=116 → cell=116//29=4 → QR=116px (tối đa)
        TITLE_H = 12
        avail_h = height - TITLE_H
        cell    = max(1, avail_h // n)
        qr_px   = n * cell
        ox      = (width  - qr_px) // 2
        oy      = TITLE_H + (avail_h - qr_px) // 2
        print(f"[TFT-QR] n={n}, cell={cell}, qr_px={qr_px}, pos=({ox},{oy})")

        # Tiêu đề động (PCR / SPOTCHECK / VE100)
        pb  = draw.textbbox((0, 0), label, font=font_small)
        pw  = pb[2] - pb[0]
        ph  = pb[3] - pb[1]
        draw.text(((width - pw) // 2, (TITLE_H - ph) // 2), label, font=font_small, fill=(70, 210, 255))

        # Nền trắng QR
        draw.rectangle([ox, oy, ox + qr_px - 1, oy + qr_px - 1], fill=(255, 255, 255))

        # Vẽ từng module đen
        for r, row in enumerate(matrix):
            for c, dark in enumerate(row):
                if dark:
                    x0 = ox + c * cell
                    y0 = oy + r * cell
                    draw.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1], fill=(0, 0, 0))
    else:
        draw.text((8, 20), "qrcode not found", font=font_small, fill=(255, 80, 80))

    disp.image(image)


# =============================================================
# INITIAL / IDLE UI
# =============================================================
def draw_wifi_icon(draw, x, y, size):
    draw.rounded_rectangle((x, y, x+size, y+size), radius=10, fill=WIFI_PURPLE)
    cx, cy = x + size // 2, y + size // 2 + 2
    draw.arc((cx-8, cy-6, cx+8, cy+6), start=220, end=320, fill=(255, 255, 255), width=1)
    draw.arc((cx-5, cy-3, cx+5, cy+3), start=220, end=320, fill=(255, 255, 255), width=1)
    draw.ellipse((cx-1, cy+1, cx+1, cy+3), fill=(255, 255, 255))

def draw_initial_ui(device_id, wifi):
    image = Image.new("RGB", (width, height), BG_COLOR)
    draw  = ImageDraw.Draw(image)

    draw.text((10, 15), "ACTIVE DEVICE", font=font_header, fill=TEXT_GRAY)
    draw.text((10, 28), device_id,       font=font_device_id, fill=TEXT_WHITE)
    draw.rounded_rectangle((12, 60, 148, 105), radius=12, fill=CARD_BG)
    draw_wifi_icon(draw, 10, 68, 24)

    display_wifi = wifi[:12] + "..." if len(wifi) > 12 else wifi
    draw.text((45, 68), "● CONNECTED",  font=font_status,    fill=(150, 100, 255))
    draw.text((45, 78), display_wifi,   font=font_wifi_name, fill=TEXT_WHITE)
    draw.text((120, 112), "V1.0.1",     font=font_footer,    fill=TEXT_GRAY)
    disp.image(image)


# =============================================================
# STARTUP — loading cho đến khi state file có dữ liệu
# =============================================================
print("[TFT] Loading screen started. Polling state file...")

_load_thread = threading.Thread(target=_loading_thread_fn, daemon=True)
_load_thread.start()

# Đợi state file có thông tin wifi/device (server đã init xong)
while True:
    try:
        raw = open(STATE_FILE).read().strip()
        if raw:
            data = json.loads(raw)
            if 'wifi' in data or 'device' in data:
                break
    except Exception:
        pass
    time.sleep(0.2)

_stop_loading.set()
_load_thread.join(timeout=1)
print("[TFT] State file ready. Processing data...")


# =============================================================
# MAIN LOOP — poll state file, chỉ render khi dữ liệu thay đổi
# =============================================================
state_system    = 0
current_temp    = 0.0
current_cycles  = 0
setpoint_cycles = 0
time_left       = 0
wifi_name       = ""
device_name     = "FPS-PCR"
init_drawn      = False
_wifi_ready     = False
time_total_sec  = 0
_last_key       = None      # dirty flag — tuple nhận dạng frame đang hiển thị
_last_raw       = ""        # raw JSON string — bỏ qua nếu file không đổi

# Throttle render: tối thiểu 350ms giữa 2 lần gọi disp.image()
# Tránh SPI bị chồng khi nhấn nút liên tục
MIN_RENDER_GAP = 0.6    # tối thiểu 600ms giữa 2 lần gọi disp.image()
_last_render_t  = 0.0

def _render(draw_fn, *args):
    """Gọi draw_fn(*args) chỉ khi đã qua MIN_RENDER_GAP kể từ lần render trước.
    Nếu chưa đủ thời gian, reset _last_key để poll tiếp theo sẽ thử lại."""
    global _last_render_t, _last_key
    now = time.monotonic()
    if now - _last_render_t < MIN_RENDER_GAP:
        _last_key = None   # thử lại ở poll sau
        return
    _last_render_t = now
    try:
        draw_fn(*args)
    except Exception as e:
        print(f"[TFT] Render error in {draw_fn.__name__}: {e}")
        _last_key = None   # thử lại ở poll sau
    time.sleep(0.05)   # cho display controller ổn định sau SPI transfer

while True:
    time.sleep(POLL_SEC)

    # Đọc state file chính (sensor data, wifi, device)
    try:
        raw = open(STATE_FILE).read().strip()
    except Exception:
        continue
    if not raw:
        continue

    # Đọc QR state từ file riêng (tránh race condition với PCR server)
    try:
        qr_raw = open(QR_STATE_FILE).read().strip()
    except Exception:
        qr_raw = '{"qr_until":0,"qr_url":"","qr_label":""}'

    combined_raw = raw + qr_raw

    # Bỏ qua nếu cả 2 file không đổi VÀ không có retry đang chờ
    if combined_raw == _last_raw and _last_key is not None:
        continue
    _last_raw = combined_raw

    try:
        data = json.loads(raw)
    except Exception:
        continue

    try:
        qr_data = json.loads(qr_raw)
    except Exception:
        qr_data = {"qr_until": 0, "qr_url": "", "qr_label": ""}

    # Cập nhật biến trạng thái
    state_system    = data.get("state",          state_system)
    current_temp    = data.get("temp",           current_temp)
    current_cycles  = data.get("cycle_cnt",      current_cycles)
    setpoint_cycles = data.get("cycle_setpoint", setpoint_cycles)
    time_left       = data.get("time",           time_left)
    if data.get("time_total", 0) > 0:
        time_total_sec = data["time_total"]
    if "wifi"   in data: wifi_name   = data["wifi"];   _wifi_ready = True
    if "device" in data: device_name = data["device"]; _wifi_ready = True

    # QR code — đọc từ file riêng, không bị PCR server ghi đè
    qr_until = qr_data.get("qr_until", 0)
    qr_url   = qr_data.get("qr_url",   "")

    if qr_until > time.time():
        qr_label  = qr_data.get("qr_label", "PCR")
        frame_key = ("qr", qr_url, qr_label, qr_until)
        if frame_key != _last_key:
            _last_key = frame_key
            _render(draw_qr_ui, qr_url, qr_label)
        continue

    # Màn hình bình thường
    if state_system == 0:
        if not init_drawn:
            if not _wifi_ready:
                continue
            frame_key = ("initial", device_name, wifi_name)
        else:
            frame_key = ("finish", time_total_sec)
    else:
        init_drawn = True
        frame_key  = ("run", state_system, current_cycles,
                      setpoint_cycles, int(current_temp * 10), time_left, wifi_name)

    if frame_key == _last_key:
        continue
    _last_key = frame_key

    if frame_key[0] == "initial":
        _render(draw_initial_ui, device_name, wifi_name)
    elif frame_key[0] == "finish":
        _render(draw_finish_ui, time_total_sec)
    else:
        _render(draw_ui, state_system, current_cycles, setpoint_cycles,
                current_temp, time_left, wifi_name)
