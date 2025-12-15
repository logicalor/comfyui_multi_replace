"""
Text Replacer Node
Applies find/replace pairs to input text.
"""

import re
from typing import Any


class TextReplacer:
    """
    A node that applies find/replace pairs to an input string.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "pairs": ("FR_PAIRS", {
                    "tooltip": "Find/Replace pairs from the FindReplacePairs node"
                }),
                "input_text": ("STRING", {
                    "default": "",
                    "multiline": True,
                    "placeholder": "Text to perform replacements on"
                }),
            },
            "optional": {
                "input_text_connected": ("STRING", {
                    "forceInput": True,
                    "tooltip": "Connected text input (overrides widget)"
                }),
                "use_regex": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "Treat find patterns as regular expressions"
                }),
                "case_sensitive": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "Whether replacements are case-sensitive"
                }),
                "replace_all": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "Replace all occurrences (vs only first)"
                }),
            }
        }

    RETURN_TYPES = ("STRING", "FR_PAIRS", "STRING", "INT",)
    RETURN_NAMES = ("result", "pairs_passthrough", "changes_log", "replacement_count",)
    OUTPUT_TOOLTIPS = (
        "The text after all replacements have been applied",
        "The find/replace pairs (passed through for chaining)",
        "Log of all replacements made",
        "Total number of replacements performed",
    )

    FUNCTION = "apply_replacements"
    CATEGORY = "text/replace"
    DESCRIPTION = "Applies find/replace pairs to input text. Supports regex and case-insensitive matching."

    def apply_replacements(
        self,
        pairs: dict,
        input_text: str = "",
        input_text_connected: str = None,
        use_regex: bool = False,
        case_sensitive: bool = True,
        replace_all: bool = True
    ):
        """
        Apply all find/replace pairs to the input text.

        Args:
            pairs: The pairs object from FindReplacePairs node
            input_text: Text widget value
            input_text_connected: Connected text input (takes priority)
            use_regex: Whether to use regex matching
            case_sensitive: Whether matching is case-sensitive
            replace_all: Whether to replace all occurrences

        Returns:
            Tuple of (result_text, pairs_passthrough, changes_log, replacement_count)
        """
        # Use connected input if available
        text = input_text_connected if input_text_connected is not None else input_text

        # Get the pairs list
        pairs_list = pairs.get("pairs", [])

        total_replacements = 0
        log_entries = []
        result = text

        for pair in pairs_list:
            find_pattern = pair.get("find", "")
            replace_with = pair.get("replace", "")

            if not find_pattern:
                continue

            # Count occurrences before replacement
            if use_regex:
                flags = 0 if case_sensitive else re.IGNORECASE
                try:
                    matches = len(re.findall(find_pattern, result, flags))
                    if replace_all:
                        result = re.sub(find_pattern, replace_with, result, flags=flags)
                    else:
                        result = re.sub(find_pattern, replace_with, result, count=1, flags=flags)
                except re.error as e:
                    log_entries.append(f"Regex error for pattern '{find_pattern}': {e}")
                    continue
            else:
                if case_sensitive:
                    matches = result.count(find_pattern)
                    if replace_all:
                        result = result.replace(find_pattern, replace_with)
                    else:
                        result = result.replace(find_pattern, replace_with, 1)
                else:
                    # Case-insensitive plain text replacement
                    pattern = re.escape(find_pattern)
                    matches = len(re.findall(pattern, result, re.IGNORECASE))
                    if replace_all:
                        result = re.sub(pattern, replace_with, result, flags=re.IGNORECASE)
                    else:
                        result = re.sub(pattern, replace_with, result, count=1, flags=re.IGNORECASE)

            replacements_made = min(matches, 1) if not replace_all else matches
            total_replacements += replacements_made

            if replacements_made > 0:
                log_entries.append(
                    f"Replaced '{find_pattern}' -> '{replace_with}' ({replacements_made}x)"
                )

        # Create changes log
        changes_log = "\n".join(log_entries) if log_entries else "No replacements made"

        return (result, pairs, changes_log, total_replacements)

    @classmethod
    def IS_CHANGED(cls, pairs, input_text="", input_text_connected=None, **kwargs):
        """Force re-evaluation when inputs change."""
        text = input_text_connected if input_text_connected is not None else input_text
        pairs_hash = hash(str(pairs))
        return hash((text, pairs_hash, str(kwargs)))
