import os
import math
import random
import json
import base64
from io import BytesIO
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
from PIL import Image, ImageDraw, ImageFont

from ..database import get_db

GUJARATI_DAYS = {
    "MONDAY": "સોમવાર",
    "TUESDAY": "મંગળવાર",
    "WEDNESDAY": "બુધવાર",
    "THURSDAY": "ગુરુવાર",
    "FRIDAY": "શુક્રવાર",
    "SATURDAY": "શનિવાર",
    "SUNDAY": "રવિવાર"
}

GUJARATI_DIGITS = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
}

def to_gujarati_digits(text: str) -> str:
    return "".join(GUJARATI_DIGITS.get(ch, ch) for ch in str(text))

CATEGORY_GUJARATI_HEADERS = {
    "cat_sweet": "સ્વીટ",
    "cat_subji_1": "૧. સબ્જી (સ્પેશિયલ)",
    "cat_subji_2": "૨. સબ્જી (કાઠિયાવાડી & પનીર)",
    "cat_subji_3": "૩. સબ્જી (શાક)",
    "cat_farsan": "ફરસાણ",
    "cat_tadka": "ગુજરાતી તડકા",
    "cat_rotla": "રોટલા & પરોઠા",
    "cat_salad": "સલાડ & ચટણી",
    "cat_chhas": "પીણું"
}

AI_PALETTES = {
    "royal_maroon": {
        "name": "રોયલ કાઠિયાવાડી મરૂન & ગોલ્ડ",
        "bg_color": (43, 0, 5),
        "card_bg": (70, 5, 12),
        "gold_primary": (245, 175, 40),
        "gold_secondary": (212, 139, 40),
        "text_white": (255, 255, 255),
        "text_gold": (255, 216, 117),
        "badge_bg": (245, 175, 40),
        "badge_text": (38, 0, 4)
    },
    "saffron": {
        "name": "સૌરાષ્ટ્ર શાહી કેસરી & રજવાડી સુવર્ણ",
        "bg_color": (58, 17, 0),
        "card_bg": (80, 25, 5),
        "gold_primary": (247, 176, 54),
        "gold_secondary": (217, 139, 26),
        "text_white": (255, 255, 255),
        "text_gold": (255, 224, 153),
        "badge_bg": (247, 176, 54),
        "badge_text": (51, 14, 0)
    },
    "parchment": {
        "name": "દેશી કાગળ & હેરિટેજ ફાનસ",
        "bg_color": (246, 240, 228),
        "card_bg": (255, 252, 245),
        "gold_primary": (140, 34, 34),
        "gold_secondary": (99, 21, 21),
        "text_white": (36, 19, 11),
        "text_gold": (115, 28, 28),
        "badge_bg": (140, 34, 34),
        "badge_text": (255, 255, 255)
    },
    "sapphire": {
        "name": "મિડનાઇટ નેવી & રોયલ પેલેસ",
        "bg_color": (4, 13, 26),
        "card_bg": (10, 30, 60),
        "gold_primary": (245, 175, 40),
        "gold_secondary": (212, 139, 40),
        "text_white": (255, 255, 255),
        "text_gold": (255, 216, 117),
        "badge_bg": (245, 175, 40),
        "badge_text": (4, 13, 26)
    },
    "emerald": {
        "name": "શાહી લીલો & સુવર્ણ દરબાર",
        "bg_color": (6, 26, 16),
        "card_bg": (15, 45, 28),
        "gold_primary": (243, 188, 66),
        "gold_secondary": (201, 148, 38),
        "text_white": (255, 255, 255),
        "text_gold": (255, 229, 163),
        "badge_bg": (243, 188, 66),
        "badge_text": (6, 26, 16)
    },
    "lipan": {
        "name": "કચ્છ લિપન આર્ટ & માટીકામ",
        "bg_color": (59, 37, 24),
        "card_bg": (65, 40, 25),
        "gold_primary": (240, 202, 163),
        "gold_secondary": (207, 157, 111),
        "text_white": (255, 249, 242),
        "text_gold": (255, 217, 179),
        "badge_bg": (207, 157, 111),
        "badge_text": (38, 22, 12)
    },
    "royal_plum": {
        "name": "શાહી જાંબલી વેલ્વેટ",
        "bg_color": (30, 5, 36),
        "card_bg": (55, 12, 65),
        "gold_primary": (248, 195, 82),
        "gold_secondary": (209, 156, 40),
        "text_white": (255, 255, 255),
        "text_gold": (255, 228, 158),
        "badge_bg": (248, 195, 82),
        "badge_text": (30, 5, 36)
    }
}

FORMAT_IDS = [
    "FORMAT_KATHIYAWADI_CARD",
    "FORMAT_JHAROKHA",
    "FORMAT_MODERN_CHIC",
    "FORMAT_DESHI_TORAN",
    "FORMAT_FESTIVE_PATRIKA",
    "FORMAT_VINTAGE_SEAL"
]

class PosterService:
    @staticmethod
    def get_font(size: int, bold: bool = False):
        gujarati_font_path = Path(__file__).resolve().parent.parent / "assets" / "fonts" / "NotoSansGujarati.ttf"
        if gujarati_font_path.exists():
            try:
                return ImageFont.truetype(str(gujarati_font_path), size)
            except Exception:
                pass
        font_path = "C:/Windows/Fonts/Nirmala.ttc"
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size, index=1 if bold else 0)
            except Exception:
                pass
        return ImageFont.load_default()

    @staticmethod
    def generate_menu_poster(
        day_of_week: str,
        price: int = 250,
        theme: str = "ai",
        format_style: str = "random",
        custom_date_str: Optional[str] = None,
        item_ids: Optional[List[str]] = None
    ) -> BytesIO:
        db = get_db()
        day_upper = day_of_week.upper()
        if item_ids is None:
            menu = db.daily_menus.find_one({"dayOfWeek": day_upper}) or {}
            item_ids = menu.get("itemIds", [])

        # Fetch strictly the scheduled items
        items = list(db.menu_items.find({"id": {"$in": item_ids}}, {"_id": 0}))

        # Select Palette
        theme_key = theme.lower()
        if theme_key in ("ai", "random", "") or theme_key not in AI_PALETTES:
            palette = random.choice(list(AI_PALETTES.values()))
        else:
            palette = AI_PALETTES[theme_key]

        # Select Format
        if format_style in ("random", "ai", "") or format_style not in FORMAT_IDS:
            fmt_id = random.choice(FORMAT_IDS)
        else:
            fmt_id = format_style

        bg_color = palette["bg_color"]
        card_bg = palette["card_bg"]
        gold_primary = palette["gold_primary"]
        gold_secondary = palette["gold_secondary"]
        text_white = palette["text_white"]
        text_gold = palette["text_gold"]
        badge_bg = palette["badge_bg"]
        badge_text = palette["badge_text"]

        width, height = 1080, 1528
        img = Image.new("RGB", (width, height), bg_color)
        draw = ImageDraw.Draw(img)

        # Fonts
        font_phones = PosterService.get_font(34, bold=True)
        font_title = PosterService.get_font(76, bold=True)
        font_sub = PosterService.get_font(42, bold=True)
        font_badge = PosterService.get_font(34, bold=True)
        font_item_lg = PosterService.get_font(64, bold=True)
        font_item = PosterService.get_font(36, bold=True)
        font_price = PosterService.get_font(68, bold=True)
        font_addr = PosterService.get_font(28, bold=True)

        # 1. BORDER & COMPOSITION BASED ON FORMAT
        if fmt_id == "FORMAT_MODERN_CHIC":
            # Chamfered modern border
            border_inset = 35
            draw.rectangle([border_inset, border_inset, width - border_inset, height - border_inset], outline=gold_primary, width=4)
            draw.rectangle([border_inset + 14, border_inset + 14, width - border_inset - 14, height - border_inset - 14], outline=gold_secondary, width=2)
            # Modern grid lines
            draw.line([(80, 290), (width - 80, 290)], fill=gold_secondary, width=1)
            draw.line([(80, 1180), (width - 80, 1180)], fill=gold_secondary, width=1)

        elif fmt_id == "FORMAT_DESHI_TORAN":
            # Wood slate border
            draw.rectangle([30, 30, width - 30, height - 30], outline=gold_primary, width=12)
            draw.rectangle([44, 44, width - 44, height - 44], outline=gold_secondary, width=2)
            # Hanging Toran across top (at y=92 above diamond)
            toran_y = 92
            draw.line([(45, toran_y), (width - 45, toran_y)], fill=gold_primary, width=4)
            for tx in range(80, width - 80, 60):
                draw.ellipse([tx - 12, toran_y + 4, tx + 12, toran_y + 36], fill=(46, 125, 50)) # green leaf
                draw.ellipse([tx - 10, toran_y - 2, tx + 10, toran_y + 16], fill=(255, 152, 0)) # orange marigold

        elif fmt_id == "FORMAT_FESTIVE_PATRIKA":
            # Patrika border with corner accents
            draw.rectangle([32, 32, width - 32, height - 32], outline=gold_primary, width=8)
            draw.rectangle([46, 46, width - 46, height - 46], outline=gold_secondary, width=2)
            # Corner Diyas
            for cx, cy in [(65, 65), (width - 65, 65), (65, height - 65), (width - 65, height - 65)]:
                draw.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], outline=gold_primary, width=3)
                draw.ellipse([cx - 5, cy - 22, cx + 5, cy - 8], fill=(255, 152, 0))

        elif fmt_id == "FORMAT_VINTAGE_SEAL":
            # Braided vintage border
            draw.rectangle([30, 30, width - 30, height - 30], outline=gold_primary, width=10)
            draw.rectangle([45, 45, width - 45, height - 45], outline=gold_secondary, width=3)

        elif fmt_id == "FORMAT_KATHIYAWADI_CARD":
            # Fixed approved menu-card frame: deep maroon, double gold border,
            # and a ceremonial gold header band.
            draw.rectangle([20, 20, width - 20, height - 20], outline=gold_primary, width=10)
            draw.rectangle([38, 38, width - 38, height - 38], outline=gold_secondary, width=3)
            draw.rectangle([0, 115, width, 292], fill=gold_secondary)
            draw.rectangle([0, 128, width, 278], fill=gold_primary)
            draw.rectangle([0, 115, width, 128], fill=card_bg)
            draw.rectangle([0, 278, width, 292], fill=card_bg)
            # Decorative corner arcs echo the printed-card ornamentation.
            for cx, cy, start, end in [(90, height - 110, 180, 350), (width - 90, height - 110, 190, 360)]:
                draw.arc([cx - 115, cy - 115, cx + 115, cy + 115], start, end, fill=gold_secondary, width=4)
                draw.arc([cx - 82, cy - 82, cx + 82, cy + 82], start, end, fill=gold_primary, width=3)
            # Fixed village-hut illustration in the lower-right, as in the approved card.
            hut_x, hut_y = width - 205, height - 165
            draw.polygon([(hut_x - 95, hut_y), (hut_x, hut_y - 105), (hut_x + 95, hut_y)], fill=gold_primary, outline=gold_secondary)
            for offset in range(-70, 80, 22):
                draw.line([(hut_x + offset, hut_y - 5), (hut_x + offset // 2, hut_y - 90)], fill=gold_secondary, width=2)
            draw.rectangle([hut_x - 65, hut_y, hut_x + 65, hut_y + 72], fill=(151, 93, 37), outline=gold_primary, width=3)
            draw.rectangle([hut_x - 13, hut_y + 26, hut_x + 13, hut_y + 72], fill=card_bg, outline=gold_primary, width=2)
            draw.rectangle([hut_x + 30, hut_y + 22, hut_x + 51, hut_y + 42], fill=card_bg, outline=gold_primary, width=2)

        else: # FORMAT_JHAROKHA
            # Royal Pillars on Left and Right
            draw.rectangle([32, 32, width - 32, height - 32], outline=gold_primary, width=8)
            draw.rectangle([48, 48, width - 48, height - 48], outline=gold_secondary, width=2)
            # Pillars
            draw.rectangle([40, 60, 66, height - 60], fill=gold_primary)
            draw.rectangle([width - 66, 60, width - 40, height - 60], fill=gold_primary)

        # 2. TOP PHONE NUMBERS
        phone1 = "૮૯૮૦૧૧૫૫૭૭"
        phone2 = "૭૫૬૭૭૮૮૦૫૧"
        draw.text((85, 48), phone1, font=font_phones, fill=gold_primary)
        draw.text((width - 310, 48), phone2, font=font_phones, fill=gold_primary)

        # 3. HEADER TITLE & MOTIFS
        diamond_cx = width // 2
        diamond_cy = 180

        if fmt_id == "FORMAT_VINTAGE_SEAL":
            # Proclamation Banner
            banner_w = 720
            banner_h = 90
            draw.rounded_rectangle([diamond_cx - banner_w // 2, 125, diamond_cx + banner_w // 2, 215], radius=14, fill=badge_bg, outline=(255, 216, 117), width=3)
            p_title = "રાજવી ફરમાન • ભાતીગળ ભાણું"
            ptw = draw.textlength(p_title, font=font_badge)
            draw.text(((width - ptw) // 2, 147), p_title, font=font_badge, fill=badge_text)

            sub_txt = "સૌરાષ્ટ્રનું પરંપરાગત શાહી રજવાડી અતિથિ ભોજન"
            stw = draw.textlength(sub_txt, font=font_addr)
            draw.text(((width - stw) // 2, 235), sub_txt, font=font_addr, fill=gold_primary)

        elif fmt_id == "FORMAT_MODERN_CHIC":
            # Modern Monogram & Clean Header
            draw.ellipse([diamond_cx - 50, 105, diamond_cx + 50, 205], outline=gold_primary, width=3)
            draw.line([(diamond_cx - 18, 140), (diamond_cx + 18, 170)], fill=gold_primary, width=4)
            draw.line([(diamond_cx + 18, 140), (diamond_cx - 18, 170)], fill=gold_primary, width=4)

            eng_title = "BHATIGAL BHANU"
            etw = draw.textlength(eng_title, font=font_sub)
            draw.text(((width - etw) // 2, 220), eng_title, font=font_sub, fill=gold_primary)

            sub_txt = "શ્રી ભાતીગળ ભાણું • કાઠિયાવાડી ડાઇનિંગ"
            stw = draw.textlength(sub_txt, font=font_addr)
            draw.text(((width - stw) // 2, 270), sub_txt, font=font_addr, fill=text_gold)

        elif fmt_id == "FORMAT_KATHIYAWADI_CARD":
            # Fixed central diamond heading from the approved reference card.
            diamond_w, diamond_h = 470, 170
            draw.polygon([
                (diamond_cx, diamond_cy - diamond_h),
                (diamond_cx + diamond_w // 2, diamond_cy),
                (diamond_cx, diamond_cy + diamond_h),
                (diamond_cx - diamond_w // 2, diamond_cy)
            ], fill=card_bg, outline=gold_primary, width=4)
            heading_1, heading_2 = "ભાટીગળ", "ભાણું"
            heading_font = PosterService.get_font(70, bold=True)
            width_1 = draw.textlength(heading_1, font=heading_font)
            width_2 = draw.textlength(heading_2, font=heading_font)
            draw.text(((width - width_1) // 2, diamond_cy - 82), heading_1, font=heading_font, fill=gold_primary)
            draw.text(((width - width_2) // 2, diamond_cy + 6), heading_2, font=heading_font, fill=gold_primary)
            for px in (190, width - 190):
                draw.ellipse([px - 40, 165, px + 40, 250], outline=card_bg, width=5)
                draw.ellipse([px - 18, 140, px + 18, 178], outline=card_bg, width=4)
                draw.arc([px - 85, 185, px + 15, 295], 200, 85, fill=card_bg, width=4)
                draw.arc([px - 15, 185, px + 85, 295], 95, 340, fill=card_bg, width=4)

        else:
            # Traditional Arch / Diamond
            if fmt_id == "FORMAT_KATHIYAWADI_CARD":
                draw.line([(0, 115), (width, 115)], fill=gold_primary, width=6)
                draw.line([(0, 292), (width, 292)], fill=gold_primary, width=6)
            draw.line([(50, 110), (width - 50, 110)], fill=gold_primary, width=4)
            draw.line([(50, 240), (width - 50, 240)], fill=gold_primary, width=4)

            diamond_w = 460
            diamond_h = 100
            draw.polygon([
                (diamond_cx, diamond_cy - diamond_h),
                (diamond_cx + diamond_w // 2, diamond_cy),
                (diamond_cx, diamond_cy + diamond_h),
                (diamond_cx - diamond_w // 2, diamond_cy)
            ], fill=card_bg, outline=gold_primary)

            t1 = "ભાતીગળ"
            t2 = "ભાણું"
            w1 = draw.textlength(t1, font=font_title)
            w2 = draw.textlength(t2, font=font_title)
            draw.text(((width - w1) // 2, diamond_cy - 80), t1, font=font_title, fill=gold_primary)
            draw.text(((width - w2) // 2, diamond_cy + 2), t2, font=font_title, fill=gold_primary)

        # 4. DATE & DAY SUBHEADER
        now = datetime.now()
        # Calculate the actual calendar date for the selected day_of_week
        # so the poster always shows the correct upcoming date for that day
        day_upper = day_of_week.upper()
        target_weekday = {
            "MONDAY": 0, "TUESDAY": 1, "WEDNESDAY": 2,
            "THURSDAY": 3, "FRIDAY": 4, "SATURDAY": 5, "SUNDAY": 6
        }.get(day_upper, now.weekday())

        if custom_date_str:
            # HTML date inputs send YYYY-MM-DD; printed menu cards use DD-MM-YYYY.
            try:
                date_str = datetime.strptime(custom_date_str, "%Y-%m-%d").strftime("%d-%m-%Y")
            except ValueError:
                date_str = custom_date_str
        else:
            current_wd = now.weekday()
            diff = target_weekday - current_wd
            if diff < 0:
                diff += 7  # next occurrence
            target_date = now + timedelta(days=diff)
            date_str = f"{target_date.day:02d}-{target_date.month:02d}-{target_date.year}"

        date_guj = to_gujarati_digits(date_str)
        day_guj = GUJARATI_DAYS.get(day_upper, "વાર")

        day_guj = {
            "MONDAY": "સોમવાર", "TUESDAY": "મંગળવાર", "WEDNESDAY": "બુધવાર",
            "THURSDAY": "ગુરુવાર", "FRIDAY": "શુક્રવાર", "SATURDAY": "શનિવાર",
            "SUNDAY": "રવિવાર"
        }.get(day_upper, "વાર")
        draw.text((85, 310), date_guj, font=font_sub, fill=gold_primary)
        draw.text((width - 240, 310), day_guj, font=font_sub, fill=gold_primary)
        draw.line([(260, 335), (width - 270, 335)], fill=gold_secondary, width=2)
        if fmt_id == "FORMAT_KATHIYAWADI_CARD":
            # Gold floral divider beneath the date/day, mirroring the supplied template.
            motif_x, motif_y = width // 2, 365
            draw.ellipse([motif_x - 12, motif_y - 12, motif_x + 12, motif_y + 12], outline=gold_primary, width=3)
            for dx in (-58, -36, 36, 58):
                draw.arc([motif_x + dx - 20, motif_y - 15, motif_x + dx + 20, motif_y + 25], 190, 350, fill=gold_primary, width=3)
            draw.line([(motif_x - 110, motif_y + 6), (motif_x - 25, motif_y + 6)], fill=gold_secondary, width=3)
            draw.line([(motif_x + 25, motif_y + 6), (motif_x + 110, motif_y + 6)], fill=gold_secondary, width=3)

        # 5. FIXED KATHIYAWADI CARD MENU GRID (STRICTLY ONLY SELECTED ITEMS)
        # This template is always used, regardless of menu size. It must never
        # fall back to an alternate poster layout.
        if fmt_id == "FORMAT_KATHIYAWADI_CARD":
            grouped: Dict[str, List[str]] = {}
            for it in items:
                cat_id = it.get("categoryId", "")
                header = CATEGORY_GUJARATI_HEADERS.get(cat_id, "સબ્જી")
                grouped.setdefault(header, []).append(it.get("nameGujarati") or it.get("name"))

            # Reference card has six fixed positions: 3 columns x 2 rows.
            # Split larger categories into additional 3-item ribbons instead
            # of silently dropping dishes after the third item.
            menu_groups: List[tuple[str, List[str]]] = []
            for category_name, category_items in grouped.items():
                for start in range(0, len(category_items), 3):
                    menu_groups.append((category_name, category_items[start:start + 3]))
            menu_groups = menu_groups[:6]
            col_width = 285
            col_positions = [70, 397, 724]
            row_positions = [415, 745]
            banner_h = 62

            def wrap_menu_text(text: str, font, max_width: int) -> List[str]:
                words = str(text).split()
                if not words:
                    return [""]
                lines: List[str] = []
                current = words[0]
                for word in words[1:]:
                    candidate = f"{current} {word}"
                    if draw.textlength(candidate, font=font) <= max_width:
                        current = candidate
                    else:
                        lines.append(current)
                        current = word
                lines.append(current)
                return lines

            if not menu_groups:
                no_menu = "આજના મેનુ માટે કોઈ વાનગી પસંદ નથી"
                no_menu_width = draw.textlength(no_menu, font=font_sub)
                draw.text(((width - no_menu_width) // 2, 650), no_menu, font=font_sub, fill=text_gold)

            for idx, (cat_name, cat_items) in enumerate(menu_groups):
                row, col = divmod(idx, 3)
                card_x, card_y = col_positions[col], row_positions[row]
                draw.rectangle([card_x, card_y, card_x + col_width - 34, card_y + banner_h], fill=badge_bg)
                draw.polygon([
                    (card_x + col_width - 34, card_y),
                    (card_x + col_width, card_y + banner_h // 2),
                    (card_x + col_width - 34, card_y + banner_h)
                ], fill=badge_bg)
                draw.rectangle([card_x, card_y + 5, card_x + 8, card_y + banner_h + 5], fill=gold_secondary)

                title_font = PosterService.get_font(30, bold=True)
                while draw.textlength(cat_name, font=title_font) > col_width - 42 and title_font.size > 18:
                    title_font = PosterService.get_font(title_font.size - 2, bold=True)
                title_width = draw.textlength(cat_name, font=title_font)
                draw.text((card_x + max(18, (col_width - title_width) // 2 - 10), card_y + 13), cat_name, font=title_font, fill=badge_text)

                item_font = PosterService.get_font(24, bold=True)
                item_y = card_y + banner_h + 25
                for item_name in cat_items:
                    lines = wrap_menu_text(f"• {item_name}", item_font, col_width - 8)
                    for line in lines:
                        draw.text((card_x, item_y), line, font=item_font, fill=text_gold)
                        item_y += 31
                    item_y += 7

        elif len(items) == 0:
            empty_msg = "આજના મેનૂ માટે કોઈ વાનગી સિલેક્ટ નથી"
            ew = draw.textlength(empty_msg, font=font_sub)
            draw.text(((width - ew) // 2, 650), empty_msg, font=font_sub, fill=text_gold)

        elif len(items) == 1:
            # 1 DISH ONLY: Grand Showcase Card
            dish = items[0]
            dish_name = dish.get("nameGujarati") or dish.get("name")
            cat_id = dish.get("categoryId", "")
            cat_title = CATEGORY_GUJARATI_HEADERS.get(cat_id, "સ્પેશિયલ વાનગી")

            card_w = 860
            card_h = 490
            card_x = (width - card_w) // 2
            card_y = 470

            draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=28, fill=card_bg, outline=gold_primary, width=4)

            # Header Ribbon on Card
            ribbon_w = card_w - 200
            ribbon_h = 60
            ribbon_x = card_x + 100
            ribbon_y = card_y - 30
            draw.rounded_rectangle([ribbon_x, ribbon_y, ribbon_x + ribbon_w, ribbon_y + ribbon_h], radius=15, fill=badge_bg)
            banner_text = f"આજનું સ્પેશિયલ : {cat_title}"
            bw = draw.textlength(banner_text, font=font_badge)
            draw.text(((width - bw) // 2, ribbon_y + 10), banner_text, font=font_badge, fill=badge_text)

            # Dish Name Centered
            nw = draw.textlength(dish_name, font=font_item_lg)
            draw.text(((width - nw) // 2, card_y + 150), dish_name, font=font_item_lg, fill=gold_primary)

            # Divider line
            draw.line([(card_x + 150, card_y + 250), (card_x + card_w - 150, card_y + 250)], fill=gold_secondary, width=2)

            # Taglines
            tagline1 = "તાજું, સ્વાદિષ્ટ અને શુદ્ધ કાઠિયાવાડી ભાણું"
            tagline2 = "આજના દિવસ માટે ખાસ તૈયાર કરવામાં આવેલ છે"
            t1w = draw.textlength(tagline1, font=font_badge)
            t2w = draw.textlength(tagline2, font=font_addr)
            draw.text(((width - t1w) // 2, card_y + 295), tagline1, font=font_badge, fill=text_white)
            draw.text(((width - t2w) // 2, card_y + 365), tagline2, font=font_addr, fill=text_gold)

        elif len(items) <= 4:
            # 2 to 4 Dishes Compact Showcase
            card_w = 860
            card_h = 100 * len(items) + 120
            card_x = (width - card_w) // 2
            card_y = 440

            draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=25, fill=card_bg, outline=gold_primary, width=4)

            ribbon_w = card_w - 180
            ribbon_h = 58
            ribbon_x = card_x + 90
            ribbon_y = card_y - 29
            draw.rounded_rectangle([ribbon_x, ribbon_y, ribbon_x + ribbon_w, ribbon_y + ribbon_h], radius=15, fill=badge_bg)
            banner_text = "આજનું ભાતીગળ મેનૂ લિસ્ટ"
            bw = draw.textlength(banner_text, font=font_badge)
            draw.text(((width - bw) // 2, ribbon_y + 8), banner_text, font=font_badge, fill=badge_text)

            for idx, dish in enumerate(items):
                dish_y = card_y + 70 + idx * 95
                dish_name = dish.get("nameGujarati") or dish.get("name")
                cat_id = dish.get("categoryId", "")
                cat_title = CATEGORY_GUJARATI_HEADERS.get(cat_id, "")

                bullet_str = f"•  {dish_name}"
                draw.text((card_x + 50, dish_y), bullet_str, font=font_item, fill=text_white)
                if cat_title:
                    draw.text((card_x + card_w - 320, dish_y + 5), f"({cat_title})", font=font_addr, fill=text_gold)
                if idx < len(items) - 1:
                    draw.line([(card_x + 50, dish_y + 65), (card_x + card_w - 50, dish_y + 65)], fill=gold_secondary, width=1)

        elif fmt_id == "FORMAT_KATHIYAWADI_CARD":
            # Traditional three-column menu card, matching the restaurant's maroon-and-gold printed menu style.
            grouped: Dict[str, List[str]] = {}
            for it in items:
                cat_id = it.get("categoryId", "")
                header = CATEGORY_GUJARATI_HEADERS.get(cat_id, "સબ્જી")
                grouped.setdefault(header, []).append(it.get("nameGujarati") or it.get("name"))

            active_categories = list(grouped.items())[:6]
            col_width = (width - 150) // 3
            start_y = 400
            row_height = 315

            for idx, (cat_name, cat_items) in enumerate(active_categories):
                row = idx // 3
                col = idx % 3
                card_x = 55 + col * (col_width + 20)
                card_y = start_y + row * row_height
                banner_h = 58

                # Gold ribbon with a pointed end.
                draw.rectangle([card_x, card_y, card_x + col_width - 30, card_y + banner_h], fill=badge_bg)
                draw.polygon([
                    (card_x + col_width - 30, card_y),
                    (card_x + col_width, card_y + banner_h // 2),
                    (card_x + col_width - 30, card_y + banner_h)
                ], fill=badge_bg)
                title_width = draw.textlength(cat_name, font=font_badge)
                title_x = card_x + max(16, (col_width - title_width) // 2 - 12)
                draw.text((title_x, card_y + 9), cat_name, font=font_badge, fill=badge_text)

                item_y = card_y + banner_h + 24
                for item_name in cat_items[:3]:
                    draw.text((card_x + 8, item_y), f"• {item_name}", font=font_item, fill=text_gold)
                    item_y += 52

        else:
            # 5+ Dishes Multi-category Grid
            grouped: Dict[str, List[str]] = {}
            for it in items:
                cat_id = it.get("categoryId", "")
                header = CATEGORY_GUJARATI_HEADERS.get(cat_id, "સબ્જી")
                item_name = it.get("nameGujarati") or it.get("name")
                if header not in grouped:
                    grouped[header] = []
                grouped[header].append(item_name)

            active_categories = list(grouped.items())
            col_width = (width - 160) // 2
            start_y = 390
            row_height = 270

            for idx, (cat_name, cat_items) in enumerate(active_categories):
                row = idx // 2
                col = idx % 2
                card_x = 70 + col * (col_width + 20)
                card_y = start_y + row * row_height

                banner_h = 56
                draw.rectangle([card_x, card_y, card_x + col_width - 40, card_y + banner_h], fill=badge_bg)
                draw.polygon([
                    (card_x + col_width - 40, card_y),
                    (card_x + col_width, card_y + banner_h // 2),
                    (card_x + col_width - 40, card_y + banner_h)
                ], fill=badge_bg)

                draw.text((card_x + 30, card_y + 8), cat_name, font=font_badge, fill=badge_text)

                item_y = card_y + banner_h + 18
                for it_text in cat_items[:3]:
                    bullet_str = f"•  {it_text}"
                    draw.text((card_x + 20, item_y), bullet_str, font=font_item, fill=text_white)
                    item_y += 50

        # 6. UNLIMITED PRICE BADGE (FORMAT TAILORED)
        price_badge_y = 1220
        badge_w = 460
        badge_h = 130
        badge_x = (width - badge_w) // 2

        if fmt_id == "FORMAT_MODERN_CHIC":
            # Pill capsule badge
            draw.rounded_rectangle([badge_x, price_badge_y, badge_x + badge_w, price_badge_y + badge_h], radius=badge_h // 2, fill=badge_bg, outline=(255, 255, 255), width=3)
        elif fmt_id == "FORMAT_DESHI_TORAN":
            # Round clay seal placard
            draw.rounded_rectangle([badge_x, price_badge_y, badge_x + badge_w, price_badge_y + badge_h], radius=badge_h // 2, fill=badge_bg, outline=gold_secondary, width=6)
        else:
            # Scalloped gold badge
            draw.rounded_rectangle([badge_x, price_badge_y, badge_x + badge_w, price_badge_y + badge_h], radius=35, fill=badge_bg, outline=(255, 220, 120), width=4)

        price_guj = to_gujarati_digits(str(price))
        t_unlim = "અનલિમિટેડ"
        t_pr = f"{price_guj}/-"
        w_unlim = draw.textlength(t_unlim, font=font_badge)
        w_pr = draw.textlength(t_pr, font=font_price)
        draw.text(((width - w_unlim) // 2, price_badge_y + 14), t_unlim, font=font_badge, fill=badge_text)
        draw.text(((width - w_pr) // 2, price_badge_y + 55), t_pr, font=font_price, fill=badge_text)

        # 7. ADDRESS AT BOTTOM
        addr_line1 = "ન્યૂ ૮૦ ફૂટ રોડ, દિવ્યતેજ સ્કૂલની સામે,"
        addr_line2 = "રોલેક્સ રોડ, કોઠારિયા, રાજકોટ."
        a1w = draw.textlength(addr_line1, font=font_addr)
        a2w = draw.textlength(addr_line2, font=font_addr)
        draw.text(((width - a1w) // 2, 1405), addr_line1, font=font_addr, fill=gold_primary)
        draw.text(((width - a2w) // 2, 1450), addr_line2, font=font_addr, fill=gold_primary)

        buf = BytesIO()
        img.save(buf, format="PNG", quality=95)
        buf.seek(0)
        return buf

    @staticmethod
    def _posters_dir() -> Path:
        base = Path(__file__).resolve().parent.parent.parent / "generated_posters"
        base.mkdir(parents=True, exist_ok=True)
        return base

    @staticmethod
    def _metadata_path() -> Path:
        return PosterService._posters_dir() / "posters_meta.json"

    @staticmethod
    def _read_meta() -> List[Dict[str, Any]]:
        p = PosterService._metadata_path()
        if not p.exists():
            return []
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    @staticmethod
    def _write_meta(meta: List[Dict[str, Any]]) -> None:
        p = PosterService._metadata_path()
        with open(p, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

    @staticmethod
    def save_poster(
        day_of_week: str,
        price: int = 250,
        theme: str = "ai",
        format_style: str = "random",
        custom_date_str: Optional[str] = None,
        saved_by: Optional[str] = None,
        preview_data_url: Optional[str] = None
    ) -> Dict[str, Any]:
        # Save the exact image that the user approved in Preview. This matters
        # for AI/random theme selections, which would otherwise render anew.
        if preview_data_url and preview_data_url.startswith("data:image/png;base64,"):
            try:
                image_bytes = base64.b64decode(preview_data_url.split(",", 1)[1], validate=True)
                buf = BytesIO(image_bytes)
            except (ValueError, IndexError):
                raise ValueError("The poster preview image is invalid.")
        else:
            buf = PosterService.generate_menu_poster(
                day_of_week=day_of_week,
                price=price,
                theme=theme,
                format_style=format_style,
                custom_date_str=custom_date_str
            )
        day_upper = day_of_week.upper()
        ts = datetime.now()
        poster_id = f"{day_upper.lower()}_{ts.strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}"
        file_name = f"menu_{poster_id}.png"
        out_path = PosterService._posters_dir() / file_name
        with open(out_path, "wb") as f:
            f.write(buf.getvalue())

        palette = AI_PALETTES.get(theme.lower()) if theme.lower() in AI_PALETTES else None
        record = {
            "id": poster_id,
            "dayOfWeek": day_upper,
            "price": price,
            "theme": theme,
            "themeName": palette["name"] if palette else theme,
            "formatStyle": format_style if format_style in FORMAT_IDS else "random",
            "customDate": custom_date_str,
            "fileName": file_name,
            "filePath": str(out_path),
            "fileUrl": f"/generated_posters/{file_name}",
            "sizeBytes": out_path.stat().st_size,
            "generatedAt": ts.isoformat(),
            "savedBy": saved_by or "System"
        }
        meta = PosterService._read_meta()
        meta.insert(0, record)
        PosterService._write_meta(meta)
        return record

    @staticmethod
    def list_posters(day_of_week: Optional[str] = None) -> List[Dict[str, Any]]:
        meta = PosterService._read_meta()
        if day_of_week:
            meta = [m for m in meta if m.get("dayOfWeek") == day_of_week.upper()]
        return meta

    @staticmethod
    def delete_poster(poster_id: str) -> bool:
        meta = PosterService._read_meta()
        record = next((m for m in meta if m.get("id") == poster_id), None)
        if not record:
            return False
        file_path = Path(record.get("filePath", ""))
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass
        PosterService._write_meta([m for m in meta if m.get("id") != poster_id])
        return True
