"""
Find/Replace Pairs Node
Creates a collection of find/replace pairs with dynamic inputs.
"""

import json
from typing import Any


class FindReplacePairs:
    """
    A node that creates an arbitrary number of find/replace pairs.
    Each pair can have values entered directly or connected from other nodes.
    """

    MAX_PAIRS = 50  # Maximum number of pairs supported

    @classmethod
    def INPUT_TYPES(cls):
        """
        Define dynamic inputs for find/replace pairs.
        We define a base set of inputs plus many optional pair inputs.
        """
        inputs = {
            "required": {},
            "optional": {
                "pair_count": ("INT", {
                    "default": 1,
                    "min": 1,
                    "max": cls.MAX_PAIRS,
                    "step": 1,
                    "display": "number"
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

        # Add optional inputs for each potential pair
        for i in range(1, cls.MAX_PAIRS + 1):
            inputs["optional"][f"find_{i}"] = ("STRING", {
                "default": "",
                "multiline": False,
                "placeholder": f"Find pattern {i}"
            })
            inputs["optional"][f"replace_{i}"] = ("STRING", {
                "default": "",
                "multiline": False,
                "placeholder": f"Replacement {i}"
            })
            # Also allow connected string inputs (these override the widget values)
            inputs["optional"][f"find_{i}_input"] = ("STRING", {
                "forceInput": True,
            })
            inputs["optional"][f"replace_{i}_input"] = ("STRING", {
                "forceInput": True,
            })

        return inputs

    RETURN_TYPES = ("FR_PAIRS", "STRING", "STRING",)
    RETURN_NAMES = ("pairs", "json_output", "csv_output",)
    OUTPUT_TOOLTIPS = (
        "Find/Replace pairs object for use with TextReplacer node",
        "JSON representation of the pairs",
        "CSV representation of the pairs (find,replace per line)",
    )

    FUNCTION = "create_pairs"
    CATEGORY = "text/replace"
    DESCRIPTION = "Creates a collection of find/replace pairs that can be used with the TextReplacer node."

    def create_pairs(self, pair_count=1, unique_id=None, **kwargs):
        """
        Create the find/replace pairs collection.

        Args:
            pair_count: Number of active pairs
            unique_id: Node's unique ID
            **kwargs: Dynamic find_N, replace_N, find_N_input, replace_N_input values

        Returns:
            Tuple of (pairs_dict, json_string, csv_string)
        """
        pairs = []

        for i in range(1, pair_count + 1):
            # Check for connected input first, fall back to widget value
            find_key = f"find_{i}_input"
            find_widget_key = f"find_{i}"
            replace_key = f"replace_{i}_input"
            replace_widget_key = f"replace_{i}"

            # Get find value (connected input takes priority)
            find_value = kwargs.get(find_key)
            if find_value is None or find_value == "":
                find_value = kwargs.get(find_widget_key, "")

            # Get replace value (connected input takes priority)
            replace_value = kwargs.get(replace_key)
            if replace_value is None or replace_value == "":
                replace_value = kwargs.get(replace_widget_key, "")

            # Only add non-empty find patterns
            if find_value:
                pairs.append({
                    "find": find_value,
                    "replace": replace_value,
                    "index": i
                })

        # Create the pairs object
        pairs_obj = {
            "pairs": pairs,
            "count": len(pairs),
            "source_node": unique_id
        }

        # Create JSON output
        json_output = json.dumps(pairs, indent=2)

        # Create CSV output (find,replace per line)
        csv_lines = []
        for pair in pairs:
            # Escape commas and quotes in values for CSV
            find_escaped = pair["find"].replace('"', '""')
            replace_escaped = pair["replace"].replace('"', '""')
            if ',' in find_escaped or '"' in find_escaped:
                find_escaped = f'"{find_escaped}"'
            if ',' in replace_escaped or '"' in replace_escaped:
                replace_escaped = f'"{replace_escaped}"'
            csv_lines.append(f"{find_escaped},{replace_escaped}")
        csv_output = "\n".join(csv_lines)

        return (pairs_obj, json_output, csv_output)

    @classmethod
    def IS_CHANGED(cls, pair_count=1, **kwargs):
        """Force re-evaluation when inputs change."""
        # Create a hash of all input values
        values = [str(pair_count)]
        for i in range(1, pair_count + 1):
            values.append(str(kwargs.get(f"find_{i}", "")))
            values.append(str(kwargs.get(f"replace_{i}", "")))
            values.append(str(kwargs.get(f"find_{i}_input", "")))
            values.append(str(kwargs.get(f"replace_{i}_input", "")))
        return hash(tuple(values))
