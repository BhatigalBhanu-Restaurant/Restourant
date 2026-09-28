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
        # Save to the static mount location in Restourant-main/generated_posters
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

        # 2. Resolve items
        if not item_ids:
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

        # If still empty, fetch top 12 active items from menu so poster is NEVER blank
        if not items:
            items = list(db.menu_items.find({"isActive": True}, {"_id": 0}).limit(12))

        # Extract dish names
        dish_names: List[str] = []
        for it in items:
            name = it.get("nameGujarati") or it.get("name_gujarati") or it.get("name")
            if name and name not in dish_names:
                dish_names.append(name)

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

        # 5. Fonts
        font_date = PosterService.get_font(24, bold=True)
        gold_color = selected_theme["gold_color"]
        divider_color = selected_theme["divider_color"]

        # Limit dishes to max 14 for optimal spacing
        display_dishes = dish_names[:14]
        n_dishes = len(display_dishes)
        split_idx = (n_dishes + 1) // 2
        col1 = display_dishes[:split_idx]
        col2 = display_dishes[split_idx:]

        # Font sizing based on dish count
        if n_dishes <= 8:
            row_h = 42
            font_size = 21
        elif n_dishes <= 12:
            row_h = 36
            font_size = 20
        else:
            row_h = 31
            font_size = 18

        font_item = PosterService.get_font(font_size, bold=True)

        if selected_theme["id"] == "peacock_green":
            # Header text (Day • Date)
            header_text = f"{day_guj} • {date_guj}"
            bbox = draw.textbbox((0, 0), header_text, font=font_date)
            tw = bbox[2] - bbox[0]
            draw.text(((w - tw) // 2, 380), header_text, font=font_date, fill=gold_color)
            draw.line([(200, 418), (w - 200, 418)], fill=divider_color, width=2)

            y_start = 438
            for i, dish in enumerate(col1):
                y = y_start + i * row_h
                bx, by = 160, y + (font_size // 2)
                # Diamond bullet
                draw.polygon([(bx, by - 4), (bx + 4, by), (bx, by + 4), (bx - 4, by)], fill=gold_color)
                draw.text((bx + 14, y), dish[:18], font=font_item, fill=(255, 255, 255))

            for i, dish in enumerate(col2):
                y = y_start + i * row_h
                bx, by = 380, y + (font_size // 2)
                draw.polygon([(bx, by - 4), (bx + 4, by), (bx, by + 4), (bx - 4, by)], fill=gold_color)
                draw.text((bx + 14, y), dish[:18], font=font_item, fill=(255, 255, 255))

            # Update price badge if different from template default (220)
            if price != 220:
                font_p = PosterService.get_font(28, bold=True)
                draw.rounded_rectangle([296, 915, 436, 965], radius=8, fill=(255, 255, 255))
                p_txt = f"{to_gujarati_digits(price)}/-"
                p_bbox = draw.textbbox((0, 0), p_txt, font=font_p)
                p_tw = p_bbox[2] - p_bbox[0]
                draw.text(((296 + 436 - p_tw) // 2, 920), p_txt, font=font_p, fill=(140, 20, 20))

        else: # royal_maroon
            header_text = f"{day_guj} • {date_guj}"
            bbox = draw.textbbox((0, 0), header_text, font=font_date)
            tw = bbox[2] - bbox[0]
            draw.text(((w - tw) // 2, 415), header_text, font=font_date, fill=gold_color)
            draw.line([(240, 452), (w - 240, 452)], fill=divider_color, width=2)

            y_start = 472
            for i, dish in enumerate(col1):
                y = y_start + i * row_h
                bx, by = 195, y + (font_size // 2)
                draw.polygon([(bx, by - 4), (bx + 4, by), (bx, by + 4), (bx - 4, by)], fill=gold_color)
                draw.text((bx + 14, y), dish[:18], font=font_item, fill=(255, 255, 255))

            for i, dish in enumerate(col2):
                y = y_start + i * row_h
                bx, by = 415, y + (font_size // 2)
                draw.polygon([(bx, by - 4), (bx + 4, by), (bx, by + 4), (bx - 4, by)], fill=gold_color)
                draw.text((bx + 14, y), dish[:18], font=font_item, fill=(255, 255, 255))

            # Update price badge if different from template default (220)
            if price != 220:
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
