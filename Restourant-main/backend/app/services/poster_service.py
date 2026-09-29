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

THEMES = {
    "royal_maroon": {
        "id": "royal_maroon",
        "name": "રોયલ મરૂન (હાથી & ગણેશજી વાળી ડિઝાઇન)",
        "file": "poster_royal_maroon.png",
        "gold_color": (255, 215, 0),
        "divider_color": (212, 139, 40),
        "text_color": (255, 255, 255)
    },
    "peacock_green": {
        "id": "peacock_green",
        "name": "મોરપીંછ લીલું (લાલટેન & પૈડું વાળી ડિઝાઇન)",
        "file": "poster_peacock_green.png",
        "gold_color": (255, 225, 120),
        "divider_color": (245, 185, 60),
        "text_color": (255, 255, 255)
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
    def _assets_dir() -> Path:
        p1 = Path(__file__).resolve().parent.parent.parent / "assets"
        if p1.exists():
            return p1
        p2 = Path(os.getcwd()) / "Restourant-main" / "backend" / "assets"
        if p2.exists():
            return p2
        return p1

    @staticmethod
    def _templates_dir() -> Path:
        return PosterService._assets_dir() / "templates"

    @staticmethod
    def _posters_dir() -> Path:
        base = Path(__file__).resolve().parents[3] / "generated_posters"
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
    def get_font(size: int, bold: bool = False):
        font_path = PosterService._assets_dir() / "fonts" / "NotoSansGujarati.ttf"
        if font_path.exists():
            try:
                return ImageFont.truetype(str(font_path), size)
            except Exception:
                pass
        windows_font = "C:/Windows/Fonts/Nirmala.ttc"
        if os.path.exists(windows_font):
            try:
                return ImageFont.truetype(windows_font, size, index=1 if bold else 0)
            except Exception:
                pass
        return ImageFont.load_default()

    @staticmethod
    def generate_menu_poster(
        day_of_week: str,
        price: int = 220,
        theme: str = "royal_maroon",
        format_style: str = "FORMAT_KATHIYAWADI_CARD",
        custom_date_str: Optional[str] = None,
        item_ids: Optional[List[str]] = None
    ) -> BytesIO:
        db = get_db()
        day_upper = day_of_week.upper()

        # 1. Resolve Theme
        theme_key = (theme or "royal_maroon").lower()
        if "green" in theme_key or "peacock" in theme_key:
            selected_theme = THEMES["peacock_green"]
        else:
            selected_theme = THEMES["royal_maroon"]

        # 2. Resolve items - STRICTLY USER-ADDED ITEMS ONLY (NO RANDOM FALLBACKS)
        if item_ids is None:
            menu = db.daily_menus.find_one({"dayOfWeek": day_upper}) or {}
            item_ids = menu.get("itemIds") or []
            if not item_ids:
                item_ids = list(dict.fromkeys(menu.get("lunchItemIds", []) + menu.get("dinnerItemIds", [])))

        # Fetch scheduled items
        items = []
        if item_ids:
            fetched = list(db.menu_items.find({"id": {"$in": item_ids}}, {"_id": 0}))
            item_map = {it["id"]: it for it in fetched}
            items = [item_map[iid] for iid in item_ids if iid in item_map]

        # Fetch Category names map from database
        cats_list = list(db.menu_categories.find({}, {"_id": 0, "id": 1, "name": 1}))
        cat_map = {c["id"]: c.get("name", "વાનગી") for c in cats_list}

        # Group items by Category (preserving order)
        grouped_items: Dict[str, List[str]] = {}
        for it in items:
            cat_name = cat_map.get(it.get("categoryId"), "વાનગી")
            dish_name = it.get("nameGujarati") or it.get("name_gujarati") or it.get("name")
            if dish_name:
                grouped_items.setdefault(cat_name, []).append(dish_name)

        # 3. Load authentic template image
        template_file = PosterService._templates_dir() / selected_theme["file"]
        if template_file.exists():
            img = Image.open(template_file).convert("RGB")
        else:
            width, height = (784, 1024) if selected_theme["id"] == "royal_maroon" else (732, 1024)
            img = Image.new("RGB", (width, height), (43, 0, 5))

        draw = ImageDraw.Draw(img)
        w, h = img.size

        # 4. Calculate Date & Gujarati Day
        now = datetime.now()
        target_weekday = {
            "MONDAY": 0, "TUESDAY": 1, "WEDNESDAY": 2,
            "THURSDAY": 3, "FRIDAY": 4, "SATURDAY": 5, "SUNDAY": 6
        }.get(day_upper, now.weekday())

        if custom_date_str:
            try:
                date_str = datetime.strptime(custom_date_str, "%Y-%m-%d").strftime("%d-%m-%Y")
            except ValueError:
                date_str = custom_date_str
        else:
            current_wd = now.weekday()
            diff = target_weekday - current_wd
            if diff < 0:
                diff += 7
            target_date = now + timedelta(days=diff)
            date_str = f"{target_date.day:02d}-{target_date.month:02d}-{target_date.year}"

        date_guj = to_gujarati_digits(date_str)
        day_guj = GUJARATI_DAYS.get(day_upper, "વાર")

        # 5. Colors & Fonts
        is_green = selected_theme["id"] == "peacock_green"
        gold_color = selected_theme["gold_color"]
        divider_color = selected_theme["divider_color"]

        font_date = PosterService.get_font(24, bold=True)
        font_cat = PosterService.get_font(21, bold=True)
        font_dish = PosterService.get_font(19, bold=True)
        font_msg1 = PosterService.get_font(23, bold=True)
        font_msg2 = PosterService.get_font(20, bold=True)

        # Header text (Day • Date)
        header_text = f"{day_guj} • {date_guj}"
        bbox = draw.textbbox((0, 0), header_text, font=font_date)
        tw = bbox[2] - bbox[0]
        header_y = 380 if is_green else 415
        divider_y = 418 if is_green else 452
        draw.text(((w - tw) // 2, header_y), header_text, font=font_date, fill=gold_color)
        draw.line([(200, divider_y), (w - 200, divider_y)], fill=divider_color, width=2)

        # 6. Render Grouped Categories & Dishes
        if not grouped_items:
            # If no items scheduled for this day, show clean announcement
            msg1 = "[ આજના મેનુની વિગત ટૂંક સમયમાં ]"
            msg2 = "શુદ્ધ અને સ્વાદિષ્ટ કાઠિયાવાડી ભાણું"
            msg3 = "અનલિમિટેડ ભોજન દરરોજ બપોરે અને સાંજે"
            tw1 = draw.textbbox((0, 0), msg1, font=font_msg1)[2] - draw.textbbox((0, 0), msg1, font=font_msg1)[0]
            tw2 = draw.textbbox((0, 0), msg2, font=font_msg2)[2] - draw.textbbox((0, 0), msg2, font=font_msg2)[0]
            tw3 = draw.textbbox((0, 0), msg3, font=font_msg2)[2] - draw.textbbox((0, 0), msg3, font=font_msg2)[0]
            draw.text(((w - tw1) // 2, 530 if not is_green else 490), msg1, font=font_msg1, fill=gold_color)
            draw.text(((w - tw2) // 2, 575 if not is_green else 535), msg2, font=font_msg2, fill=(255, 255, 255))
            draw.text(((w - tw3) // 2, 615 if not is_green else 575), msg3, font=font_msg2, fill=divider_color)
        else:
            cats = list(grouped_items.items())
            col1_cats, col2_cats = [], []
            c1_count, c2_count = 0, 0
            for cat_name, dishes in cats:
                weight = 1 + len(dishes)
                if c1_count <= c2_count:
                    col1_cats.append((cat_name, dishes))
                    c1_count += weight
                else:
                    col2_cats.append((cat_name, dishes))
                    c2_count += weight

            x_col1 = 155 if is_green else 190
            x_col2 = 375 if is_green else 415
            y_start = 440 if is_green else 470

            def draw_category_col(col_data, start_x):
                curr_y = y_start
                for cat_name, dishes in col_data:
                    c_title = f"[ {cat_name} ]"
                    draw.text((start_x, curr_y), c_title, font=font_cat, fill=gold_color)
                    c_tw = draw.textbbox((0, 0), c_title, font=font_cat)[2] - draw.textbbox((0, 0), c_title, font=font_cat)[0]
                    draw.line([(start_x, curr_y + 26), (start_x + c_tw, curr_y + 26)], fill=divider_color, width=1)
                    curr_y += 32

                    for dish in dishes:
                        bx, by = start_x + 6, curr_y + 8
                        # Golden diamond bullet
                        draw.polygon([(bx, by - 4), (bx + 4, by), (bx, by + 4), (bx - 4, by)], fill=gold_color)
                        draw.text((bx + 12, curr_y), dish[:18], font=font_dish, fill=(255, 255, 255))
                        curr_y += 29
                    curr_y += 12

            draw_category_col(col1_cats, x_col1)
            if col2_cats:
                draw_category_col(col2_cats, x_col2)

        # 7. Update price badge if custom price provided (different from default 220)
        if price != 220:
            if is_green:
                font_p = PosterService.get_font(28, bold=True)
                draw.rounded_rectangle([296, 915, 436, 965], radius=8, fill=(255, 255, 255))
                p_txt = f"{to_gujarati_digits(price)}/-"
                p_bbox = draw.textbbox((0, 0), p_txt, font=font_p)
                p_tw = p_bbox[2] - p_bbox[0]
                draw.text(((296 + 436 - p_tw) // 2, 920), p_txt, font=font_p, fill=(140, 20, 20))
            else:
                font_u = PosterService.get_font(21, bold=True)
                font_p = PosterService.get_font(28, bold=True)
                draw.rounded_rectangle([325, 845, 460, 932], radius=16, fill=(75, 5, 18))
                u_txt = "અનલિમિટેડ"
                p_txt = f"{to_gujarati_digits(price)}/-"
                u_bbox = draw.textbbox((0, 0), u_txt, font=font_u)
                p_bbox = draw.textbbox((0, 0), p_txt, font=font_p)
                u_tw = u_bbox[2] - u_bbox[0]
                p_tw = p_bbox[2] - p_bbox[0]
                draw.text(((325 + 460 - u_tw) // 2, 852), u_txt, font=font_u, fill=(255, 255, 255))
                draw.text(((325 + 460 - p_tw) // 2, 888), p_txt, font=font_p, fill=(255, 215, 0))

        # Return BytesIO stream
        buf = BytesIO()
        img.save(buf, format="PNG", optimize=True)
        buf.seek(0)
        return buf

    @staticmethod
    def save_poster(
        day_of_week: str,
        price: int = 220,
        theme: str = "royal_maroon",
        format_style: str = "FORMAT_KATHIYAWADI_CARD",
        custom_date_str: Optional[str] = None,
        saved_by: Optional[str] = None,
        preview_data_url: Optional[str] = None,
        item_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
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
                custom_date_str=custom_date_str,
                item_ids=item_ids
            )
        day_upper = day_of_week.upper()
        ts = datetime.now()
        poster_id = f"{day_upper.lower()}_{ts.strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}"
        file_name = f"menu_{poster_id}.png"
        out_path = PosterService._posters_dir() / file_name
        with open(out_path, "wb") as f:
            f.write(buf.getvalue())

        theme_info = THEMES.get(theme.lower(), THEMES["royal_maroon"])
        record = {
            "id": poster_id,
            "dayOfWeek": day_upper,
            "price": price,
            "theme": theme,
            "themeName": theme_info["name"],
            "formatStyle": format_style,
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
