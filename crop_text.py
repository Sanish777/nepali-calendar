from PIL import Image

# Open the horizontal gold logo
img = Image.open("public/logo_horizontal_gold.png")
width, height = img.size

# MITI CALENDAR is at the bottom right. Let's see where it is by looking at horizontal projections.
# Actually, the easiest way is to just erase pixels below a certain Y coordinate that are on the right side.
# The mandala is on the left (x < width/3 roughly). The text is on the right.
# Let's erase anything where x > width*0.4 and y > height*0.75
datas = img.getdata()
new_data = []

# Let's inspect the bounding box of the right side to be safe.
# Or I can just manually set the alpha to 0 for the region.
for y in range(height):
    for x in range(width):
        r, g, b, a = img.getpixel((x, y))
        if x > width * 0.4 and y > height * 0.70:
            # Erase MITI CALENDAR
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append((r, g, b, a))

img.putdata(new_data)
# Trim again
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
img.save("public/logo_horizontal_gold_no_eng.png")

