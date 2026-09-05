from PIL import Image
img = Image.open("public/logo_login.png").convert("RGBA")
print(img.getpixel((0,0)))
