from PIL import Image

def process_image():
    # Load the high-res 1024x1024 AI generated image
    # Note: logo_white_gold.jpg has a white background and a gold mandala
    img = Image.open("public/logo_white_gold.jpg").convert("RGBA")
    
    # We want to crop it first because AI sometimes leaves borders
    # Let's just use the center square where the mandala is
    # The mandala is centered.
    
    datas = img.getdata()
    new_data = []
    
    # Target pure gold color for the edges to prevent white fringing
    target_r, target_g, target_b = 184, 156, 84
    
    for item in datas:
        r, g, b = item[:3]
        
        # Calculate how "white" the pixel is
        # Perfect white is 255, 255, 255
        whiteness = (r + g + b) / 3.0
        
        if whiteness > 245:
            # Pure white or almost pure white -> Fully transparent
            new_data.append((r, g, b, 0))
        elif whiteness > 150:
            # Edge pixel (blend of gold and white)
            # Calculate alpha based on whiteness (150 -> 255, 245 -> 0)
            alpha = int(255 * (245 - whiteness) / 95.0)
            
            # Since it was blended with white, we replace its color with pure gold
            # to prevent it from looking like a white halo on dark backgrounds
            new_data.append((target_r, target_g, target_b, alpha))
        else:
            # Solid gold
            new_data.append((r, g, b, 255))
            
    img.putdata(new_data)
    
    # Let's crop it tightly to the mandala bounding box
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        # Make it a perfect square
        width, height = img.size
        size = max(width, height)
        square_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        square_img.paste(img, ((size - width) // 2, (size - height) // 2))
        img = square_img
        
    img.save("public/spinner.png", "PNG")
    img.save("public/logo_icon.png", "PNG")
    print("Saved ultra-HD transparent PNGs to public/")

process_image()
