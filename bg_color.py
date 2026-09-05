from PIL import Image
img = Image.open("/var/folders/ws/60zl87s15t72bwqjyt308rs80000gn/T/TemporaryItems/NSIRD_screencaptureui_V8blrp/Screenshot 2026-09-05 at 23.03.02.png")
print("Top-left:", img.getpixel((0,0)))
print("Top-right:", img.getpixel((img.width-1,0)))
print("Center-ish (Gold):", img.getpixel((img.width//2, img.height//4)))
