# Analytics

Server phát signup/login/first_cast/first_catch/fish_caught/item_purchased/item_equipped/mission_completed/session_started/session_ended trong transaction nghiệp vụ. Client endpoint chỉ nhận allowlist sự kiện UX (tutorial, page/session/daily login), không nhận event cấp thưởng; dedupe eventId và dùng server time, giới hạn20 events/request và10 primitive properties/event. Không gửi email/password/token vào properties.

Admin aggregate roles ANALYST/GAME_ADMIN/SUPER_ADMIN: rolling DAU/WAU/MAU sourceSERVER; D1/D7/D30 dùng cohort đã trưởng thành theo ngày Việt Nam, trả mẫu số và null khi chưa đủ dữ liệu; first catch conversion và tutorial completion có samplecounts; averageFishingSessionSeconds đo phiên câu đã kết thúc. Payments disabled nên revenue/ARPU/ARPPU/paying conversion null, không giả lập số tiền.

`analytics_events` được ghi nguyên tử trong DB và là dữ liệu durable cho báo cáo trực tiếp. `processedAt/attempts` dành extension export; chưa có external analytics worker/outboxdelivery đang chạy, không tuyên bố đã tích hợp third-party. Retention/PII export phải theo review pháp lý. Tutorial clientevents không dùng ra quyết định kinh tế/chốnggianlận.
