from PIL import Image
img = Image.open("src/assets/color-variation.jpeg")
region = img.crop((800, 200, 1400, 700))
region.save("public/test_region.jpg")
