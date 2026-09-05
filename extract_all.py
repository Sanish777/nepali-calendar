from PIL import Image

def process_region(img, bbox, fg_color, bg_color_check, out_name):
    print(f"Processing {out_name} at {bbox}...")
    region = img.crop(bbox)
    datas = region.getdata()
    new_data = []
    
    # fg_color is the color we want the output to be (R,G,B).
    # bg_color_check is a function to see if a pixel is background.
    for item in datas:
        r, g, b = item[:3]
        
        # We can determine alpha by distance to background vs distance to foreground.
        # But simpler: if bg_color_check is True, alpha = 0.
        # Let's use a continuous blending based on luminance or specific channels to get anti-aliasing!
        
        is_bg, alpha = bg_color_check(r, g, b)
        if alpha == 0:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append((fg_color[0], fg_color[1], fg_color[2], alpha))
            
    region.putdata(new_data)
    
    # Trim transparent edges
    real_bbox = region.getbbox()
    if real_bbox:
        region = region.crop(real_bbox)
        region.save(f"public/{out_name}.png", "PNG")
        print(f"Saved public/{out_name}.png")
    else:
        print(f"Failed to find content in {out_name}")

img = Image.open("src/assets/color-variation.jpeg").convert("RGBA")

# 1. Vertical Gold (from second icon: Solid Navy bg, Gold fg)
def check_bg_navy(r, g, b):
    # Navy is dark blue. Gold is bright red/yellow.
    # Higher red -> more gold.
    if r < 60: return True, 0
    elif r < 160: return False, int(255 * (r - 60)/100.0)
    else: return False, 255
process_region(img, (800, 200, 1400, 700), (184, 156, 84), check_bg_navy, "logo_vertical_gold")

# 2. Vertical Navy (from third icon: Gold bg, Navy fg)
def check_bg_gold(r, g, b):
    # Background is gold (high red/green). Foreground is navy (low red).
    # We want Navy! So lower red -> more opaque.
    if r > 150: return True, 0
    elif r > 50: return False, int(255 * (150 - r)/100.0)
    else: return False, 255
process_region(img, (1400, 200, 2000, 700), (18, 42, 90), check_bg_gold, "logo_vertical_navy")

# 3. Vertical White (from fourth icon: Navy bg, White fg)
def check_bg_navy_white(r, g, b):
    # Navy bg (r~20, b~90), White fg (r>200, g>200, b>200)
    # Higher red -> more white
    if r < 70: return True, 0
    elif r < 200: return False, int(255 * (r - 70)/130.0)
    else: return False, 255
process_region(img, (2200, 200, 2800, 700), (255, 255, 255), check_bg_navy_white, "logo_vertical_white")

# 4. Horizontal Gold (from middle left: Light bg, Gold fg)
def check_bg_light(r, g, b):
    # Background is white/light-gray (r>220). Foreground is Gold (r~184, b~84)
    # Better check: blue channel. Light bg has high blue (240+). Gold has low blue (80-120).
    if b > 200: return True, 0
    elif b > 100: return False, int(255 * (200 - b)/100.0)
    else: return False, 255
process_region(img, (100, 650, 950, 1000), (184, 156, 84), check_bg_light, "logo_horizontal_gold")

# 5. Horizontal White (from middle right: Light bg with dark shadow? Wait, middle right is white logo on light gray bg!)
# Let's check how to isolate it. Actually, white on light gray is hard. Let's just create it by coloring the horizontal gold one white!
process_region(img, (100, 650, 950, 1000), (255, 255, 255), check_bg_light, "logo_horizontal_white")

