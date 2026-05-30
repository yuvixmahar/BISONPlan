def paginated_page(items: list, offset: int, max_items: int) -> dict:
    has_more = len(items) >= max_items
    return {
        "items": items,
        "offset": offset,
        "max": max_items,
        "has_more": has_more,
        "next_offset": offset + 1 if has_more else None,
    }
