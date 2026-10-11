# Thienan Growth 3.0 — Motivation OS

**183 ngày: 12/10/2026 – 12/04/2027.** Ứng dụng chạy trực tiếp bằng HTML, CSS, JavaScript. Thiết kế riêng cho kế hoạch tự phát triển: gym, IT, luyện giao tiếp, đọc sách, mục tiêu nghề nghiệp.

## Build và kiểm tra

Yêu cầu Node.js 22 trở lên; không có dependency cần cài đặt.

```sh
npm test
npm run build
npm run preview
```

Build kiểm tra cú pháp và tài nguyên rồi tạo `dist/` gồm 9 tệp phục vụ website/PWA. Preview mở tại `http://127.0.0.1:4173`. GitHub Actions tự chạy test, build và lưu artifact khi push hoặc tạo pull request. Thư mục `dist/` được sinh lại từ mã nguồn và không đưa vào Git.

Giao diện điện thoại có thanh điều hướng cố định, menu “Thêm” để mở đủ các mục, bố cục checklist gọn và vùng chạm lớn. `mobile.css` điều chỉnh màn hình 320–680 px; biểu mẫu dùng chữ 16 px để tránh tự phóng to khi nhập trên iPhone.

Để deploy trên hosting tĩnh, dùng lệnh build `npm run build` và output directory `dist`. Nếu dùng GitHub Pages, tải nội dung `dist/` lên Pages. Tệp SQL chỉ dùng để cấu hình Supabase, không nằm trong bản website.

## Triển khai trên Render

Repo có `render.yaml` để tạo Static Site bằng Render Blueprint từ nhánh `main`. Lệnh triển khai là `npm test && npm run build`, publish directory là `dist`, Node.js 22 được xác định trong `.node-version`. Render tự deploy lại khi nhánh `main` có commit mới.

Mở https://dashboard.render.com/select-repo?type=blueprint và chọn repo `thienan0404/My-app`, kiểm tra cấu hình rồi tạo Blueprint. Nếu tạo Static Site trực tiếp, chọn cùng repo/nhánh, nhập Build Command `npm test && npm run build` và Publish Directory `dist`. Ứng dụng không cần Start Command hoặc biến môi trường.

Nếu dùng đồng bộ Supabase, thêm URL Render thực tế vào Site URL và Redirect URLs trong Supabase sau khi deploy.

## Chạy ngay

- Mở `index.html` để trải nghiệm nhanh (offline). Tính năng nhắc hệ thống/đăng nhập có thể bị hạn chế ở chế độ `file://`.
- Để chạy chuẩn: giải nén ZIP → trong thư mục chứa `index.html` chạy `python -m http.server 8080` → mở `http://localhost:8080`.
- Toàn bộ app có thể đưa lên **Vercel** (Static/Other; build `npm run build`, output `dist`) hoặc GitHub Pages. HTTPS hỗ trợ PWA và link đăng nhập Supabase.

## Những chức năng chạy thật

1. **Lộ trình & checklist:** 183 ngày tự sinh kế hoạch theo thứ, 6 chặng × 4 mục tiêu, thêm/xóa việc, chọn ngày, tháng, tâm trạng và nhật ký. Có chế độ Chủ nhật nghỉ gym.
2. **Motivation Engine:** XP từ **từng nhiệm vụ đã hoàn thành** (gỡ dấu tích sẽ gỡ XP; không farm XP bằng tick qua lại), 250 XP/level, 12 huy hiệu, chuỗi ngày, mức phát triển của Growth Garden, lời động viên theo 4 phong cách.
3. **Celebrations:** Hiệu ứng XP nhỏ, âm thanh (mặc định tắt), pháo hoa/confetti khi đạt ngày 100%, lên level, hoàn thành Pomodoro; mức chúc mừng ngày được giới hạn một lần/ngày để tránh pop-up lặp. Nút xem thử không cộng điểm. Tùy chọn tắt hiệu ứng, tuân thủ `prefers-reduced-motion`.
4. **Automation:** routine theo ngày trong tuần; chỉnh giờ, bật/tắt, tạo routine riêng; nhắc giờ *khi app đang mở*, chỉ nhắc một lần/ngày/routine, giờ yên lặng; chuyển việc cá nhân chưa hoàn thành sang hôm sau (tùy chọn); phân tích mức hoàn thành và lời khuyên phục hồi sau hai ngày thấp; tổng kết tuần, tải TXT; xuất lịch `.ics` để nhập vào ứng dụng Calendar có chức năng nhắc khi app đóng.
5. **Focus Mode:** Pomodoro 25 phút / nghỉ 5 phút (thời gian được tính theo đồng hồ thật, không trôi khi tab chạy nền), cộng 25 XP khi phiên 25 phút thực sự kết thúc, không cộng khi chỉ bấm chuyển tab.
6. **Dữ liệu:** tự động lưu localStorage, giữ tối đa 7 bản chụp theo ngày, xuất/nhập JSON, tùy chọn khôi phục backup. Tiếp tục dùng storage key `thienan-growth-v1` để nhận lại dữ liệu phiên bản cũ **trên cùng domain và trình duyệt**.
7. **PWA:** manifest + service worker cache khi truy cập qua HTTP(S) localhost hoặc HTTPS và đã tải trang ít nhất một lần.

## Thiết lập Supabase để dùng nhiều thiết bị

Không có URL và publishable/anon key nào được nhúng sẵn vì đây phải là **dự án Supabase do bạn sở hữu**.

1. Tạo dự án trong Supabase → SQL Editor → chạy `supabase_schema.sql`. File đã có Row Level Security, dữ liệu chỉ truy cập được bởi tài khoản sở hữu.
2. Authentication → Providers → bật Email OTP/Magic Link. URL Configuration → thêm URL public Vercel của website vào **Site URL** và **Redirect URLs**.
3. Mở website đã deploy bằng HTTPS → **Cài đặt & dữ liệu → Đồng bộ Supabase** → nhập Project URL và **publishable/anon key** (không dùng service_role) → nhập email → bấm gửi link → mở email và đăng nhập.
4. Nhấn **Tải dữ liệu lên** (thiết bị đang có dữ liệu) hoặc **Tải dữ liệu xuống** (thiết bị mới). Mỗi thao tác có hộp thoại xác nhận trước khi **ghi đè** dữ liệu. Đây là sync snapshot **thủ công**, chưa có background realtime/merge xung đột.
5. Xem các chính sách RLS trong SQL trước khi dùng thực tế. Dữ liệu nhật ký nằm trong Supabase JSONB, **không có mã hóa đầu cuối**.

## Những thứ chưa thể chạy cho đến khi nối dịch vụ

- Chưa có URL hosting công khai do chưa deploy lên tài khoản Vercel/GitHub của người dùng.
- Supabase chỉ hoạt động khi bạn cấu hình dự án và đăng nhập, và có kết nối internet.
- **Không có push notifications nền khi app đã đóng.** Dùng xuất file `.ics` sang Calendar để có thông báo khi trang web đã đóng. Push thật cần VAPID/service worker Push API, bảng subscription, scheduler/Edge Functions, quản lý múi giờ và opt-in.
- Không có AI tự học / GPT API; gợi ý thông minh là thuật toán theo quy tắc dựa trên dữ liệu checklist.
- Những milestone trong tương lai không thể tự hoàn thành; bản gamification không cố ý “cộng điểm giả”.

## Quyền riêng tư

Dữ liệu nhật ký nên được xem là riêng tư. File backup JSON chứa toàn bộ dữ liệu; chỉ lưu ở nơi an toàn. Auth session được Supabase SDK quản lý trong localStorage trên domain website; chỉ chạy trên HTTPS đáng tin cậy. Nếu dùng máy chung, hãy đăng xuất. Không lưu khóa `service_role` lên trình duyệt.

## Kiểm tra

Đã kiểm tra cú pháp JavaScript và chạy `node tests/smoke.js`: khởi tạo app, điều hướng, chế độ động lực, cài đặt, 183 ngày, XP không cộng trùng và có thể hoàn tác. Việc render đồ họa thực trên Chromium/thiết bị di động chưa được kiểm thử end-to-end trong môi trường này. Sync cloud cần tài khoản Supabase thật nên phải kiểm tra tiếp trong môi trường chủ tài khoản.


## Lịch mới 12/10/2026
- Tuần đầu từ 12 đến 18/10 có đúng 21 nhiệm vụ theo kế hoạch mới (3 nhiệm vụ/ngày).
- Các chặng tháng và bộ đếm ngày chuyển sang 12/10/2026–12/04/2027.
- Dữ liệu đã lưu trong trình duyệt vẫn giữ nguyên; các ngày 10–11/10 nằm ngoài kỳ kế hoạch mới.
