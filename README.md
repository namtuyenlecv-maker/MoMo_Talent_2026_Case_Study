# MoMo CX Talent Dashboard

Dashboard HTML frontend cho case study MoMo CX Talent 2026. Website trình bày mạch phân tích từ dữ liệu ticket, tỷ lệ xử lý đúng hạn, điểm nghẽn vận hành, hiệu suất nhân viên đến phản hồi khách hàng và đề xuất cải tiến.

## Cấu trúc code

- `index.html`: bố cục trang, nội dung phân tích và các vùng gắn biểu đồ.
- `assets/styles.css`: toàn bộ style, màu MoMo, layout, card, bảng và responsive.
- `assets/app.js`: đọc `Data/dashboard.json`, format số liệu và render biểu đồ/table bằng Chart.js.
- `app.py`: build dữ liệu từ Excel/CSV sang `Data/dashboard.json` và chạy static server local.
- `Data/`: dữ liệu đầu vào và file JSON đã build cho frontend.
- `momo_report.html`: redirect về `index.html` để tương thích với file cũ.

## Cách chạy local

```bash
pip install -r requirements.txt
python3 app.py --build
python3 app.py --host 127.0.0.1 --port 8501
```

Mở trình duyệt tại:

```text
http://127.0.0.1:8501/
```

## Luồng dữ liệu

1. `app.py` đọc `CX_MoMo_Data_Metrics.xlsx`, `CX_MoMo_AI_Insights.xlsx` và `Export_For_AI_DeepDive.csv`.
2. Script chuẩn hóa dữ liệu cần cho frontend, tính lại điểm mức độ bức xúc cho phản hồi khách hàng và xuất `Data/dashboard.json`.
3. `assets/app.js` fetch JSON này để render KPI, biểu đồ, bảng nhiệt, bảng nhân viên, trích dẫn phản hồi và cụm phản hồi.

## Nguyên tắc hiển thị

- Ưu tiên nhãn tiếng Việt dễ hiểu trên giao diện.
- Hạn chế thuật ngữ viết tắt; nếu dữ liệu/code dùng tên cột kỹ thuật thì chỉ giữ trong code.
- Mỗi nhóm biểu đồ có đoạn dẫn giải ngắn trước biểu đồ.
- Biểu đồ giữ vai trò bằng chứng trực quan, nội dung chỉ dẫn dắt cách đọc và ý nghĩa vận hành.
- Các số liệu chính được hiển thị trực tiếp trên biểu đồ, không chỉ phụ thuộc vào hover tooltip.
- Ý nghĩa màu sắc được đặt ngay trong từng card biểu đồ bằng legend, không dùng phụ lục bảng màu riêng.
- Biểu đồ ưu tiên được sắp xếp để nhóm cần xử lý xuất hiện trước.

## Mạch nội dung

1. Trang mở đầu và câu chuyện phân tích.
2. Thông điệp chính từ dữ liệu và KPI tổng quan.
3. Phương pháp xử lý dữ liệu.
4. Phần A: hiệu quả xử lý yêu cầu khách hàng.
5. Phần B: điểm nghẽn vận hành theo dịch vụ và nhân viên.
6. Đề xuất cải tiến.
7. Phần C: phân tích phản hồi khách hàng bằng trí tuệ nhân tạo.
8. Đọc sâu các nhóm phản hồi chính.
9. Kết luận phân tích.
