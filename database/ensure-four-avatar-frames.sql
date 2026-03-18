-- 确保四个头像框全部上架且统一定价 50 币（雏菊、紫薇花、缠绕花藤、烂漫樱）
-- 执行：mysql -u app -papp123 animal_world < ensure-four-avatar-frames.sql

SET NAMES utf8mb4;
USE animal_world;

-- 1) 所有头像框类商品统一 50 币、更新图片
UPDATE products SET price = 50, image_url = '/products/avatar-frame.png' WHERE name = '雏菊' AND type IN ('avatar_frame', 'avatar_frame_premium');
UPDATE products SET price = 50, image_url = '/products/frame-gold.png'   WHERE name = '紫薇花';
UPDATE products SET price = 50, image_url = '/products/frame-crystal.png' WHERE name = '缠绕花藤';
UPDATE products SET price = 50, image_url = '/products/frame-diamond.png' WHERE name = '烂漫樱';

-- 2) 若不存在则插入（保证四个都上架）
INSERT INTO products (name, description, price, image_url, type, popularity_boost)
SELECT '雏菊', '小雏菊边框，清新可爱', 50, '/products/avatar-frame.png', 'avatar_frame', 50 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '雏菊' LIMIT 1);

INSERT INTO products (name, description, price, image_url, type, popularity_boost)
SELECT '紫薇花', '紫薇花色，温柔浪漫', 50, '/products/frame-gold.png', 'avatar_frame_premium', 50 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '紫薇花' LIMIT 1);

INSERT INTO products (name, description, price, image_url, type, popularity_boost)
SELECT '缠绕花藤', '缠绕花藤，自然清新', 50, '/products/frame-crystal.png', 'avatar_frame_premium', 50 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '缠绕花藤' LIMIT 1);

INSERT INTO products (name, description, price, image_url, type, popularity_boost)
SELECT '烂漫樱', '樱花烂漫，春日气息', 50, '/products/frame-diamond.png', 'avatar_frame_premium', 50 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '烂漫樱' LIMIT 1);

-- 3) 再次统一：凡属头像框且名为这四款，一律 50 币
UPDATE products SET price = 50 WHERE name IN ('雏菊', '紫薇花', '缠绕花藤', '烂漫樱');
