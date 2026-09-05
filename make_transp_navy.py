from PIL import Image

def remove_navy(filepath):
    img = Image.open(filepath).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        # Navy blue #122A5A is approx 18, 42, 90
        # Screenshot says 23, 39, 80.
        if item[0] < 45 and item[1] < 55 and item[2] < 110 and item[0] > 5 and item[2] > 50:
            new_data.append((item[0], item[1], item[2], 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(filepath, "PNG")

remove_navy("public/logo_login.png")
print("Made logo_login.png transparent")
