# MoMo CX Talent Dashboard

MoMo CX Talent Dashboard là một website báo cáo tĩnh cho case study MoMo CX Talent 2026. Dự án tổng hợp dữ liệu ticket, SLA, hiệu suất nhân viên, độ trễ xử lý và phản hồi khách hàng để tạo thành một dashboard trực quan phục vụ phân tích vận hành.

## Nội dung chính

- KPI tổng quan về khối lượng ticket, SLA và độ trễ.
- Biểu đồ theo tuần, theo dịch vụ, theo nhân viên và theo nhóm phản hồi.
- Phân tích phản hồi khách hàng bằng quy tắc NLP đơn giản để tái tính điểm ưu tiên.
- Các bảng tóm tắt, trích dẫn và cụm phản hồi nổi bật.

## Cấu trúc dự án

- `index.html`: trang dashboard chính.
- `assets/styles.css`: toàn bộ phần giao diện, layout và responsive.
- `assets/app.js`: đọc dữ liệu JSON và render KPI, biểu đồ, bảng.
- `app.py`: tạo `Data/dashboard.json` từ file dữ liệu nguồn và chạy server local.
- `Data/`: chứa dữ liệu đầu vào và file JSON đã build cho frontend.
- `momo_report.html`: trang chuyển hướng về `index.html` để tương thích với tên file cũ.

## Yêu cầu môi trường

- Python 3.10+.
- Các thư viện trong `requirements.txt`.
- Dữ liệu nguồn trong thư mục `Data/`.

## Cách chạy local

### 1. Cài phụ thuộc

```bash
pip install -r requirements.txt
```

### 2. Tạo file dashboard JSON

```bash
python3 app.py --build
```

Lệnh này sẽ đọc dữ liệu nguồn và xuất ra `Data/dashboard.json`.

### 3. Chạy server xem dashboard

```bash
python3 app.py --host 127.0.0.1 --port 8501
```

Mở trình duyệt tại:

```text
http://127.0.0.1:8501/
```

## Luồng dữ liệu

1. `app.py` đọc các file nguồn trong `Data/`, gồm `CX_MoMo_Data_Metrics.xlsx`, `CX_MoMo_AI_Insights.xlsx` và `Export_For_AI_DeepDive.csv` nếu có.
2. Dữ liệu được chuẩn hóa và tổng hợp thành cấu trúc JSON phù hợp cho frontend.
3. `assets/app.js` tải `Data/dashboard.json` để vẽ biểu đồ, hiển thị KPI và render các khối nội dung phân tích.

## Đầu ra của `app.py`

Khi chạy `--build`, file `Data/dashboard.json` sẽ được tạo hoặc cập nhật với các nhóm dữ liệu chính:

- KPI tổng quan.
- Biểu đồ theo tuần và theo ngày trong tuần.
- Phân tích dịch vụ, nhân viên và độ trễ.
- Nhóm chủ đề phản hồi và trích dẫn tiêu biểu.
- Dữ liệu chất lượng và các bảng hỗ trợ phân tích.

## Ghi chú sử dụng

- Đây là dashboard tĩnh, không cần backend riêng ngoài script build dữ liệu.
- Nếu thay đổi dữ liệu nguồn trong `Data/`, hãy chạy lại `python3 app.py --build` trước khi mở dashboard.
- `python3 app.py` mặc định vừa build dữ liệu vừa chạy server local.

## Mục tiêu phân tích

Dashboard được thiết kế để trả lời nhanh các câu hỏi sau:

- Ticket tập trung nhiều ở đâu.
- SLA đang chậm ở tuần hoặc nhóm dịch vụ nào.
- Nhân viên hoặc nhóm nào đang có rủi ro vận hành.
- Phản hồi khách hàng đang chứa các cụm vấn đề nào lặp lại.
- Nên ưu tiên cải tiến gì trong 30, 60 và 90 ngày.