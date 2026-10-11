# Thienan Growth 3.0 — Motivation OS

**183 ngày: 12/10/2026 – 12/04/2027.** Ứng dụng chạy trực tiếp bằng HTML, CSS, JavaScript. Thiết kế riêng cho kế hoạch tự phát triển: gym, IT, luyện giao tiếp, đọc sách, mục tiêu nghề nghiệp.

## Build và kiểm tra

Yêu cầu Node.js 22 trở lên; không có dependency cần cài đặt.

```sh
npm test
npm run build
npm run preview
```

Build kiểm tra cú pháp và tài nguyên rồi tạo `dist/` gồm 12 tệp phục vụ website/PWA. Preview mở tại `http://127.0.0.1:4173`. GitHub Actions tự chạy test, build và lưu artifact khi push hoặc tạo pull request. Thư mục `dist/` được sinh lại từ mã nguồn và không đưa vào Git.

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

Ứng dụng dùng Supabase Auth và một bản dữ liệu riêng cho mỗi người dùng. Khi chưa nối dịch vụ hoặc chưa đăng nhập, app tiếp tục lưu trên thiết bị.

1. Tạo dự án trong Supabase → SQL Editor → chạy `supabase_schema.sql`. File đã có Row Level Security, dữ liệu chỉ truy cập được bởi tài khoản sở hữu.
2. Authentication → Providers → bật Email OTP/Magic Link. URL Configuration → đặt **Site URL** và **Redirect URLs** là `https://thienan-growth.onrender.com/` (thêm URL localhost nếu kiểm thử).
3. Cấu hình hai biến môi trường build trên Render: `SUPABASE_URL` và `SUPABASE_PUBLISHABLE_KEY`, rồi deploy. Chỉ dùng publishable/anon key. Build tạo `cloud-config.js` công khai, không chấp nhận secret/service_role key. Nếu chưa có cấu hình chung, có thể nhập kết nối trong phần mở rộng của Cài đặt.
4. Mở **Cài đặt & dữ liệu → Đồng bộ giữa các thiết bị**, nhập cùng một email trên mỗi thiết bị và mở link đăng nhập trong trình duyệt dùng app. Thiết bị đầu tiên đưa tiến độ đang có lên cloud; thiết bị mới nhận dữ liệu cloud. App tự gửi thay đổi sau 650 ms và lấy cập nhật mỗi 20 giây khi đang mở, khi quay lại tab hoặc có mạng. Nút **Đồng bộ ngay** cập nhật theo yêu cầu. Thay đổi khi mất mạng được giữ để gửi lại.
5. Xem các chính sách RLS trong SQL trước khi dùng thực tế. Dữ liệu nhật ký nằm trong Supabase JSONB, **không có mã hóa đầu cuối**.

Đồng bộ gộp theo từng mục: hai dấu tích khác nhau, hai công việc tự thêm và hai phiên tập trung không ghi đè lẫn nhau. Database dùng revision và compare-and-swap trong transaction để thử lại khi có cập nhật đồng thời. Nếu hai thiết bị sửa cùng một mục, thay đổi được gửi thành công sau cùng sẽ thắng. Bỏ tích, xóa công việc, nhập backup và reset cũng đồng bộ. Snapshot dự phòng và lịch sử thông báo chỉ lưu tại thiết bị.

Đăng xuất giữ bản riêng của tài khoản tại thiết bị và làm trống giao diện. Đăng nhập tài khoản khác không gửi nhật ký/kết quả của tài khoản trước. Chưa có đồng bộ khi app đã đóng; thay đổi nhận khi mở lại. Các test mô phỏng hai thiết bị, lỗi mạng, tải lại, sửa trong lúc upload và đổi tài khoản chạy trong `npm test`. Cần kiểm tra thêm Auth/RLS với dự án Supabase thực sau khi nối dịch vụ.

## Những thứ chưa thể chạy cho đến khi nối dịch vụ

- Website đã triển khai tại https://thienan-growth.onrender.com/.
- Supabase chỉ hoạt động khi bạn cấu hình dự án và đăng nhập, và có kết nối internet.
- **Không có push notifications nền khi app đã đóng.** Dùng xuất file `.ics` sang Calendar để có thông báo khi trang web đã đóng. Push thật cần VAPID/service worker Push API, bảng subscription, scheduler/Edge Functions, quản lý múi giờ và opt-in.
- Không có AI tự học / GPT API; gợi ý thông minh là thuật toán theo quy tắc dựa trên dữ liệu checklist.
- Những milestone trong tương lai không thể tự hoàn thành; bản gamification không cố ý “cộng điểm giả”.

## Quyền riêng tư

Dữ liệu nhật ký nên được xem là riêng tư. File backup JSON chứa toàn bộ dữ liệu; chỉ lưu ở nơi an toàn. Auth session được Supabase SDK quản lý trong localStorage trên domain website; chỉ chạy trên HTTPS đáng tin cậy. Nếu dùng máy chung, hãy đăng xuất. Không lưu khóa `service_role` lên trình duyệt.

## Kiểm tra

`npm test` kiểm tra khởi tạo, điều hướng mobile, cài đặt, 183 ngày, XP không cộng trùng, đồng bộ hai thiết bị và tách dữ liệu giữa các tài khoản. Giao diện được kiểm tra trên trình duyệt ở kích thước điện thoại; chưa kiểm tra trên iPhone thật. Auth/RLS cần kiểm tra với dự án Supabase thực sau khi nối dịch vụ.


## Lịch mới 12/10/2026
- Tuần đầu từ 12 đến 18/10 có đúng 21 nhiệm vụ theo kế hoạch mới (3 nhiệm vụ/ngày).
- Các chặng tháng và bộ đếm ngày chuyển sang 12/10/2026–12/04/2027.
- Dữ liệu đã lưu trong trình duyệt vẫn giữ nguyên; các ngày 10–11/10 nằm ngoài kỳ kế hoạch mới.
