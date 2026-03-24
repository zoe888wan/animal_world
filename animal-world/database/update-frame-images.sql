SET NAMES utf8mb4;
USE animal_world;

UPDATE products SET image_url = '/products/chuju.png' WHERE name = '雏菊' AND type IN ('avatar_frame', 'avatar_frame_premium');
UPDATE products SET image_url = '/products/ziweihua.png' WHERE name = '紫薇花';
UPDATE products SET image_url = '/products/chanraohuateng.png' WHERE name = '缠绕花藤';
UPDATE products SET image_url = '/products/lanmanying.png' WHERE name = '烂漫樱';
