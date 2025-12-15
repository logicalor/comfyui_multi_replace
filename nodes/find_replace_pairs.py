"""
Find/Replace Pairs Node
Creates a collection of find/replace pairs with dynamic inputs.
"""

import json
from server import PromptServer
from aiohttp import web


class FindReplacePairs:
    """
    A node that creates an arbitrary number of find/replace pairs.
    Pairs are added dynamically via UI button.
    """

    @classmethod
    def INPUT_TYPES(cls):
        """
        Define base inputs. Additional pairs are added dynamically via JS.
        Text fields with optional input connectors that override widget values.
        """
        return {
            "required": {},
            "optional": {
                "find_1": ("STRING", {
                    "default": "",
                    "multiline": False,
                }),
                "replace_1": ("STRING", {
                    "default": "",
                    "multiline": False,
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

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

    def create_pairs(self, unique_id=None, **kwargs):
        """
        Create the find/replace pairs collection.

        Args:
            unique_id: Node's unique ID
            **kwargs: Dynamic find_N, replace_N values

        Returns:
            Tuple of (pairs_dict, json_string, csv_string)
        """
        pairs = []

        # Collect all pairs from kwargs (find_1, replace_1, find_2, replace_2, etc.)
        pair_indices = set()
        for key in kwargs:
            if key.startswith("find_") or key.startswith("replace_"):
                try:
                    idx = int(key.split("_")[1])
                    pair_indices.add(idx)
                except (ValueError, IndexError):
                    pass

        for i in sorted(pair_indices):
            find_value = kwargs.get(f"find_{i}", "")
            replace_value = kwargs.get(f"replace_{i}", "")

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
    def IS_CHANGED(cls, **kwargs):
        """Force re-evaluation when inputs change."""
        return hash(str(kwargs))


# API route to get node info (optional, for debugging)
@PromptServer.instance.routes.get("/multi_replace/info")
async def get_info(request):
    return web.json_response({"status": "ok", "name": "multi-replace"})
