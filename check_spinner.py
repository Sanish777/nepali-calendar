from PIL import Image
img = Image.open("public/spinner.png")
print("Size:", img.size)

# Let's crop it strictly to the bounding box of the non-transparent pixels!
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
    print("New Size:", img.size)
    # Ensure it's a perfect square for spinning symmetrically
    width, height = img.size
    size = max(width, height)
    new_img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    new_img.paste(img, ((size - width) // 2, (size - height) // 2))
    new_img.save("public/spinner.png")
    print("Saved symmetrical spinner")
