from PIL import Image
import math

def process_image(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        
        # If the pixel is pure white or very close
        if r > 240 and g > 240 and b > 240:
            new_data.append((255, 255, 255, 0))
            continue
            
        # If it's a dark color (the dark blue text: ~0, 47, 96)
        if r < 100 and g < 120 and b < 160:
            # Check how dark it is to preserve anti-aliasing
            # By scaling the alpha
            lum = (r + g + b) / 3
            if lum < 50:
                new_data.append((255, 255, 255, a))
            else:
                # Calculate an alpha based on darkness
                # darker = more opaque white
                new_alpha = int(a * (1 - lum/160.0))
                new_data.append((255, 255, 255, max(0, min(255, new_alpha))))
            continue
            
        # For anti-aliased edge pixels between white and dark blue
        if r == g and g == b and r < 240 and r > 100:
             # It's a gray pixel (anti-aliasing)
             new_alpha = int(a * (1 - r/255.0))
             new_data.append((255, 255, 255, max(0, min(255, new_alpha))))
             continue
             
        # For anti-aliased edge pixels between white and gold
        # Gold is around (207, 154, 57)
        # We just want to make the background transparent, so if it's mixed with white...
        # We can just keep it as is, or adjust alpha. Let's just keep as is for now.
        new_data.append((r, g, b, a))
        
    img.putdata(new_data)
    img.save(output_path, "PNG")

process_image('public/logo.png', 'public/logo-dark.png')
print("Done")
