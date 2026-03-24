-- 曝光度上限与商品风格调整：单次最多 +50 曝光，商品名/描述改为简约小清新
-- 执行：mysql -u app -papp123 animal_world < cap-popularity-and-style.sql

USE animal_world;

-- 所有商品曝光加成上限为 50
UPDATE products SET popularity_boost = LEAST(COALESCE(popularity_boost, 0), 50) WHERE popularity_boost > 50;

-- 曝光卡（热度加速卡等）统一为最多 +50，并改描述
UPDATE products SET popularity_boost = 50, description = '选择一只宠物使用，为其增加最多 50 曝光度' WHERE type = 'boost' AND (name LIKE '%热度%' OR name LIKE '%加速%');
UPDATE products SET popularity_boost = LEAST(COALESCE(popularity_boost, 0), 50) WHERE type = 'boost';

-- 头像框：简约小清新风格名称与描述
UPDATE products SET name = '小清新头像框', description = '淡色边框，可爱简洁' WHERE type = 'avatar_frame' AND name LIKE '%明星%';
UPDATE products SET name = '多巴胺头像框', description = '柔和彩色圈，心情加分' WHERE type = 'avatar_frame_premium' AND (name LIKE '%璀璨%' OR name LIKE '%金框%');
UPDATE products SET name = '奶油紫头像框', description = '淡紫边框，温柔治愈' WHERE type = 'avatar_frame_premium' AND (name LIKE '%水晶%' OR name LIKE '%紫%');
UPDATE products SET name = '薄荷绿头像框', description = '清新绿边，简约可爱' WHERE type = 'avatar_frame_premium' AND (name LIKE '%钻石%' OR name LIKE '%VIP%');

-- 饰品：简约可爱风格
UPDATE products SET name = '小花朵项圈', description = '一朵小花，清新可爱' WHERE type = 'pet_accessory' AND (name LIKE '%项圈%' OR name LIKE '%可爱%');
UPDATE products SET name = '蝴蝶结发夹', description = '软萌蝴蝶结，萌宠必备' WHERE type = 'pet_accessory' AND (name LIKE '%蝴蝶%');
UPDATE products SET name = '小铃铛', description = '轻轻叮当，出行安心' WHERE type = 'pet_accessory' AND name LIKE '%铃铛%';

-- 食物描述微调
UPDATE products SET description = '小零食大满足，简约健康' WHERE type = 'pet_food' AND name LIKE '%零食%';
UPDATE products SET description = '优质蛋白，宠物最爱' WHERE type = 'pet_food' AND name LIKE '%冻干%';
