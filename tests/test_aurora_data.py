
from backend.utils.aurora_data import normalize_term_items
from backend.utils.pagination import paginated_page


def test_normalize_term_items_rejects_non_dict_rows():
    page = [{"termCode": "202690", "description": "Fall 2026"}, "bad", None, 42]
    assert normalize_term_items(page) == [{"code": "202690", "description": "Fall 2026"}]


def test_normalize_term_items_decodes_html_entities():
    page = [{"termCode": "202690", "description": "Fall &amp; Field"}]
    assert normalize_term_items(page)[0]["description"] == "Fall & Field"


def test_paginated_page_marks_has_more_when_page_is_full():
    items = [{"code": str(i), "description": f"Term {i}"} for i in range(2)]
    page = paginated_page(items, offset=1, max_items=2)
    assert page["items"] == items
    assert page["has_more"] is True
    assert page["next_offset"] == 2


def test_paginated_page_empty_input():
    page = paginated_page([], offset=1, max_items=10)
    assert page["items"] == []
    assert page["has_more"] is False
