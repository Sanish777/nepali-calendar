from PIL import Image
img = Image.open("/var/folders/ws/60zl87s15t72bwqjyt308rs80000gn/T/TemporaryItems/NSIRD_screencaptureui_V8blrp/Screenshot 2026-09-05 at 23.03.02.png").convert("RGB")
datas = img.getdata()
max_b = 0
min_b = 255
max_px = None
min_px = None
for item in datas:
    b = sum(item)/3
    if b > max_b: max_b = b; max_px = item
    if b < min_b: min_b = b; min_px = item
print("Max (Gold):", max_px)
print("Min (Navy):", min_px)
