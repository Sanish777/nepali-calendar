from PIL import Image

# Open the new ultra-HD transparent logo
img = Image.open("public/logo_icon.png")
icon_sizes = [(16,16), (32, 32), (48, 48), (64,64), (128,128), (256,256)]
img.save("src/app/favicon.ico", format="ICO", sizes=icon_sizes)
print("Created src/app/favicon.ico from transparent HD icon")
