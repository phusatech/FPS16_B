# Copy đoạn này để lấy dữ liệu 8000 mẫu
import math

# Tạo danh sách 8000 mẫu hình sine từ 25 đến 95
data = [round(35 * math.sin(i * 2 * math.pi / 8000) + 60, 1) for i in range(8000)]

# In ra toàn bộ nội dung để bạn copy hoặc ghi vào file
print(data)