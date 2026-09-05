from PIL import Image

img = Image.open("/var/folders/ws/60zl87s15t72bwqjyt308rs80000gn/T/TemporaryItems/NSIRD_screencaptureui_WueXn5/Screenshot 2026-09-05 at 22.33.33.png").convert("RGBA")
datas = img.getdata()
width, height = img.size

def is_navy(r, g, b):
    # #122A5A is (18, 42, 90)
    return r < 40 and 20 < g < 60 and 60 < b < 120

min_x, min_y, max_x, max_y = width, height, 0, 0
# search only top-left region: x < 300, y < 300
for y in range(300):
    for x in range(300):
        r, g, b, a = datas[y * width + x]
        if is_navy(r, g, b):
            if x < min_x: min_x = x
            if y < min_y: min_y = y
            if x > max_x: max_x = x
            if y > max_y: max_y = y

print(f"Top-left Navy Icon Bounds: {min_x}, {min_y}, {max_x}, {max_y}")

if max_x > min_x and max_y > min_y:
    logo = img.crop((min_x, min_y, max_x, max_y))
    logo.save("public/logo_extracted.png", "PNG")
    print("Saved public/logo_extracted.png")
