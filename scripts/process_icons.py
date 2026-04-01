"""
去背 + resize PWA icons
策略：用 rounded-rect mask 保留圓角圖示內容，外部背景變透明
"""
from PIL import Image, ImageDraw
import numpy as np

SRC = r"d:\bedtime story\public\pwa-512x512.png"

def remove_bg_and_resize(src_path, out_path, size):
    img = Image.open(src_path).convert("RGBA")
    # 先統一縮到 512x512 的基礎上處理
    base = img.resize((512, 512), Image.LANCZOS)
    
    data = np.array(base, dtype=np.float32)
    r, g, b, a = data[...,0], data[...,1], data[...,2], data[...,3]
    
    # 深藍色背景判斷：R 低、B 高、G 中
    # 典型深藍: R≈15-40, G≈30-70, B≈90-130
    is_dark_blue = (
        (r < 80) &
        (b > 80) &
        (b > r * 1.5) &
        (b > g * 1.2)
    )
    
    # 也抓接近邊角的純色區域（flood fill 感覺的邊角）
    # 用距離邊緣的漸層軟化，避免硬邊
    # 先建一個圓角 mask，把圓角外完全透明
    mask = Image.new("L", (512, 512), 0)
    draw = ImageDraw.Draw(mask)
    radius = 80  # 圓角半徑（原圖的圓角）
    draw.rounded_rectangle([0, 0, 511, 511], radius=radius, fill=255)
    mask_arr = np.array(mask)
    
    # 在圓角內，把深藍背景的 alpha 設為 0
    new_alpha = np.where(mask_arr == 0, 0,  # 圓角外透明
                np.where(is_dark_blue, 0,    # 深藍背景透明
                255)).astype(np.uint8)
    
    # 邊緣軟化：對深藍判斷做一點模糊讓邊緣不那麼硬
    from PIL import ImageFilter
    alpha_img = Image.fromarray(new_alpha, "L")
    # 膨脹再模糊，避免把圖示邊緣的深色也吃掉
    alpha_img = alpha_img.filter(ImageFilter.SMOOTH_MORE)
    
    result = base.copy()
    result.putalpha(alpha_img)
    
    # Resize 到目標尺寸
    if size != 512:
        result = result.resize((size, size), Image.LANCZOS)
    
    result.save(out_path, "PNG")
    print(f"儲存: {out_path} ({size}x{size})")

# 處理兩個尺寸
remove_bg_and_resize(SRC, r"d:\bedtime story\public\pwa-192x192.png", 192)
remove_bg_and_resize(SRC, r"d:\bedtime story\public\pwa-512x512.png", 512)
print("完成！")
