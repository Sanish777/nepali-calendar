from PIL import Image

img = Image.open("/var/folders/ws/60zl87s15t72bwqjyt308rs80000gn/T/TemporaryItems/NSIRD_screencaptureui_fpx1nP/Screenshot 2026-09-05 at 22.34.09.png").convert("RGBA")
datas = img.getdata()

new_data = []
for item in datas:
    # Change all white (also shades of whites)
    # to transparent
    if item[0] > 230 and item[1] > 230 and item[2] > 230:
        new_data.append((item[0], item[1], item[2], 0))
    else:
        new_data.append(item)

img.putdata(new_data)
# Crop the image slightly if there's excess whitespace? The user provided a screenshot so it might have random borders.
# Let's get bbox
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

img.save("public/spinner.png", "PNG")
print("Saved to public/spinner.png")
