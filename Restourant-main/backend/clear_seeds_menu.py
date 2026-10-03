with open('app/seeds.py', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "CATEGORIES = ["
end_marker = "DEFAULT_FLOOR_ZONES = ["

if start_marker in content and end_marker in content:
    pre = content[:content.index(start_marker)]
    post = content[content.index(end_marker):]
    new_content = pre + "CATEGORIES = []\nMENU_ITEMS = []\n" + post
    with open('app/seeds.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully cleared CATEGORIES and MENU_ITEMS in seeds.py")
else:
    print("Markers not found!")
