# MoMo Customer Experience Dashboard

MoMo Customer Experience Dashboard là website báo cáo tĩnh cho case study MoMo Talent 2026, tập trung vào chất lượng vận hành chăm sóc khách hàng, mức độ đáp ứng SLA và các tín hiệu trải nghiệm người dùng từ dữ liệu phản hồi.

Trang chính sử dụng nhận diện mới ở thanh điều hướng: logo `momotrasparent.png`, nhãn `Customer Experience Excellence`, favicon từ `MOMO-Logo-App.png` và tiêu đề tab `MoMo Customer Experience Dashboard`.

## Điểm nổi bật

- Tổng hợp KPI về tổng ticket, tỷ lệ xử lý đúng hạn, ticket trễ và thời gian xử lý so với cam kết.
- Trực quan hóa xu hướng theo tuần, theo ngày trong tuần, theo dịch vụ và theo nhóm vận hành.
- Xếp hạng dịch vụ cần ưu tiên dựa trên khối lượng ticket, tỷ lệ trễ và thời gian trễ trung bình.
- Phân tích phản hồi khách hàng để nhận diện cụm vấn đề lặp lại, mức độ bức xúc và chủ đề cần xử lý sớm.
- Đề xuất hướng cải thiện trải nghiệm khách hàng theo góc nhìn vận hành và dữ liệu.

## Cấu trúc thư mục

- `index.html`: dashboard chính.
- `assets/styles.css`: layout, màu sắc, responsive và nhận diện thương hiệu.
- `assets/app.js`: tải `Data/dashboard.json`, render KPI, biểu đồ, bảng và các khối phân tích.
- `app.py`: build dữ liệu dashboard và chạy server local.
- `Data/`: dữ liệu nguồn, file phân tích và `dashboard.json` cho frontend.
- `momotrasparent.png`: logo MoMo dùng trên thanh điều hướng.
- `MOMO-Logo-App.png`: biểu tượng dùng cho favicon/tab trình duyệt.
- `momo_report.html`: trang chuyển hướng về `index.html` để giữ tương thích với đường dẫn cũ.

## Yêu cầu

- Python 3.10 trở lên.
- Các thư viện trong `requirements.txt`.
- Các file dữ liệu nguồn trong thư mục `Data/`.

## Chạy local

Cài thư viện:

```bash
pip install -r requirements.txt
```

Build lại dữ liệu dashboard:

```bash
python3 app.py --build
```

Chạy server local:

```bash
python3 app.py --host 127.0.0.1 --port 8501
```

Mở dashboard tại:

```text
http://127.0.0.1:8501/
```

## Luồng dữ liệu

1. `app.py` đọc `CX_MoMo_Data_Metrics.xlsx`, `CX_MoMo_AI_Insights.xlsx` và `Export_For_AI_DeepDive.csv` trong thư mục `Data/`.
2. Dữ liệu được làm sạch, chuẩn hóa và tổng hợp thành cấu trúc JSON.
3. `Data/dashboard.json` được frontend tải trực tiếp để vẽ biểu đồ và hiển thị nội dung phân tích.

## Cập nhật dữ liệu

Khi thay đổi dữ liệu nguồn trong `Data/`, chạy lại:

```bash
python3 app.py --build
```

Sau đó refresh trình duyệt để xem dashboard mới nhất. Nếu chỉ cần xem nhanh, chạy `python3 app.py`; lệnh này mặc định vừa build dữ liệu vừa mở server local.

## Mục tiêu phân tích

Dashboard giúp trả lời các câu hỏi chính:

- Khối lượng ticket đang tập trung ở tuần, ngày hoặc dịch vụ nào.
- Tỷ lệ xử lý đúng hạn đang giảm ở đâu.
- Dịch vụ nào tạo áp lực vận hành lớn nhất.
- Phản hồi khách hàng đang nhắc lại những vấn đề nào.
- Nên ưu tiên cải thiện trải nghiệm khách hàng theo hướng nào trong ngắn hạn.
