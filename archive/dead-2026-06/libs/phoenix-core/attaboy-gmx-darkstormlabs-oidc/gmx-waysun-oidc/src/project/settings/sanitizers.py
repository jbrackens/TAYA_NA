from uuid import uuid4

from html_sanitizer.sanitizer import tag_replacer  # noqa
from html_sanitizer.sanitizer import bold_span_to_strong, italic_span_to_em, sanitize_href, target_blank_noopener

HTML_SANITIZERS = {
    "strict": {
        "tags": {uuid4().hex},  # sanitizer wants to have at least one tag so we will make it random
        "attributes": {},
        "empty": {},
        "separate": {},
        "whitespace": {},
        "keep_typographic_whitespace": False,
        "add_nofollow": False,
        "autolink": False,
        "sanitize_href": sanitize_href,
        "element_preprocessors": [],
        "element_postprocessors": [],
        "is_mergeable": lambda e1, e2: False,  # noqa: F841
    },
    "default": {
        "tags": {
            "a",
            "h1",
            "h2",
            "h3",
            "strong",
            "em",
            "p",
            "ul",
            "ol",
            "li",
            "br",
            "sub",
            "sup",
            "hr",
        },
        "attributes": {"a": ("href", "name", "target", "title", "id", "rel")},
        "empty": {"hr", "a", "br"},
        "separate": {"a", "p", "li"},
        "whitespace": {"br"},
        "keep_typographic_whitespace": False,
        "add_nofollow": False,
        "autolink": False,
        "sanitize_href": sanitize_href,
        "element_preprocessors": [
            # convert span elements into em/strong if a matching style rule
            # has been found. strong has precedence, strong & em at the same
            # time is not supported
            bold_span_to_strong,
            italic_span_to_em,
            tag_replacer("b", "strong"),
            tag_replacer("i", "em"),
            tag_replacer("form", "p"),
            target_blank_noopener,
        ],
        "element_postprocessors": [],
        "is_mergeable": lambda e1, e2: True,  # noqa: F841
    },
}
