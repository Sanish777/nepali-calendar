from PIL import Image

# Open the perfect logo
img = Image.open("public/logo_navy_gold.jpg")

# Convert to RGBA (required for some icon operations or just good practice)
img = img.convert("RGBA")

# Resize to icon sizes
icon_sizes = [(16,16), (32, 32), (48, 48), (64,64), (128,128), (256,256)]
img.save("src/app/favicon.ico", format="ICO", sizes=icon_sizes)
print("Created src/app/favicon.ico")

# Also save a standard logo.jpg just in case they need it for general use
img.convert("RGB").save("public/logo.jpg", "JPEG")
print("Created public/logo.jpg")

