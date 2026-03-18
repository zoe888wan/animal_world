-- 删除一个营养主粮（与 add-shop-products 保持一致，不再保留营养主粮）
-- 执行：mysql -u app -papp123 animal_world < remove-one-nutrition-main.sql
USE animal_world;
DELETE FROM products WHERE name = '营养主粮' AND type = 'pet_food' LIMIT 1;
