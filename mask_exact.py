from PIL import Image

img = Image.open("/var/folders/ws/60zl87s15t72bwqjyt308rs80000gn/T/TemporaryItems/NSIRD_screencaptureui_V8blrp/Screenshot 2026-09-05 at 23.03.02.png").convert("RGBA")
datas = img.getdata()

new_data = []
target_gold = (200, 168, 100) # approximate gold

for item in datas:
    r, g, b = item[:3]
    
    # We can measure the distance to the background navy color (roughly 40, 50, 80)
    # vs the gold color (roughly 210, 180, 110).
    # Easier: Use R channel. Gold has high R (150-240), Navy has low R (30-60).
    
    if r < 70:
        # Background
        new_data.append((r, g, b, 0))
    elif r < 140:
        # Transition/Antialiasing edge
        alpha = int(255 * (r - 70) / 70.0)
        new_data.append((r, g, b, alpha))
    else:
        # Solid gold
        new_data.append((r, g, b, 255))

img.putdata(new_data)

# Crop exactly to the non-transparent bounding box
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
    # Make it a perfect square
    width, height = img.size
    size = max(width, height)
    square_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    square_img.paste(img, ((size - width) // 2, (size - height) // 2))
    img = square_img

img.save("public/spinner.png", "PNG")
img.save("public/logo_icon.png", "PNG")
img.save("src/assets/logo_icon_hd.png", "PNG")
img.save("src/assets/spinner_hd.png", "PNG")
print("Saved perfect screenshot-extracted transparent PNGs.")
