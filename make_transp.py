from PIL import Image

def remove_bg(filepath):
    img = Image.open(filepath).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        # Check if pixel is light gray/white
        if item[0] > 220 and item[1] > 220 and item[2] > 220:
            new_data.append((item[0], item[1], item[2], 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(filepath, "PNG")

remove_bg("public/logo_nav.png")
print("Made logo_nav.png transparent")
