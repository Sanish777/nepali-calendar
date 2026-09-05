from PIL import Image

img = Image.open("/var/folders/ws/60zl87s15t72bwqjyt308rs80000gn/T/TemporaryItems/NSIRD_screencaptureui_WueXn5/Screenshot 2026-09-05 at 22.33.33.png").convert("RGBA")

# Let's just crop a fixed area since it's a screenshot and we can guess the top-left icon position.
# Better yet, I can find the bounding box of the dark blue `#122A5A` color in the top left.
datas = img.getdata()
width, height = img.size

# Find first pixel of deep navy (approx rgb: 18, 42, 90)
min_x, min_y, max_x, max_y = width, height, 0, 0
for y in range(height):
    for x in range(width):
        r, g, b, a = datas[y * width + x]
        if r < 30 and g > 20 and g < 60 and b > 70 and b < 110: # Rough bounds for #122A5A
            if x < min_x: min_x = x
            if y < min_y: min_y = y
            if x > max_x: max_x = x
            if y > max_y: max_y = y

# Since there are multiple navy icons, we just want the top-left one.
# So let's restrict the search to the top-left quadrant!
min_x, min_y, max_x, max_y = width, height, 0, 0
for y in range(height // 2):
    for x in range(width // 2):
        r, g, b, a = datas[y * width + x]
        if r < 30 and 30 < g < 60 and 80 < b < 120:
            if x < min_x: min_x = x
            if y < min_y: min_y = y
            if x > max_x: max_x = x
            if y > max_y: max_y = y

print(f"Found bounds: {min_x}, {min_y}, {max_x}, {max_y}")

if max_x > min_x and max_y > min_y:
    logo = img.crop((min_x, min_y, max_x, max_y))
    logo.save("public/logo.png", "PNG")
    print("Saved public/logo.png")
else:
    print("Could not find the logo bounding box")
