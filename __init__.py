"""
ComfyUI Multi-Replace Custom Node
A node package for creating and applying multiple find/replace pairs.
"""

from .nodes.find_replace_pairs import FindReplacePairs
from .nodes.text_replacer import TextReplacer

NODE_CLASS_MAPPINGS = {
    "FindReplacePairs": FindReplacePairs,
    "TextReplacer": TextReplacer,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "FindReplacePairs": "Find/Replace Pairs",
    "TextReplacer": "Text Replacer",
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
