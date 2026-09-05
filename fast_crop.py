from PIL import Image, ImageDraw

def remove_english_text(filename):
    img = Image.open(filename).convert("RGBA")
    width, height = img.size
    
    # We want to erase the English text at the bottom right.
    # We create a transparent rectangle over that area.
    draw = ImageDraw.Draw(img)
    
    # Mandala is roughly the left 40%. Text is right 60%.
    # "MITI CALENDAR" is at the bottom 25-30% of the image.
    # So we draw a transparent rectangle over x > width * 0.35, y > height * 0.70
    draw.rectangle(
        [width * 0.35, height * 0.65, width, height],
        fill=(0, 0, 0, 0)
    )
    
    # Crop to new bounding box to trim the empty space at the bottom
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(filename)
    # Also save to src/assets
    assets_filename = filename.replace("public/", "src/assets/")
    img.save(assets_filename)
    print(f"Cleaned {filename}")

remove_english_text("public/logo_horizontal_gold.png")
remove_english_text("public/logo_horizontal_white.png")
