# ComfyUI Multi-Replace

A ComfyUI custom node package for creating and applying multiple find/replace pairs to text.

## Features

- **Find/Replace Pairs Node**: Create an arbitrary number of find/replace pairs
  - Supports up to 50 pairs per node
  - Each pair can have values entered directly or connected from other nodes
  - Dynamic UI shows only active pairs
  - Outputs: pairs object, JSON, and CSV formats

- **Text Replacer Node**: Apply find/replace pairs to text
  - Accepts pairs from the FindReplacePairs node
  - Supports regular expressions
  - Case-sensitive/insensitive matching
  - Replace all or first occurrence only
  - Outputs: modified text, pairs passthrough (for chaining), changes log, and replacement count

## Installation

1. Clone or copy this folder to your ComfyUI `custom_nodes` directory:
   ```
   cd ComfyUI/custom_nodes
   git clone <repo-url> comfyui-multi-replace
   ```

2. Restart ComfyUI

## Usage

### Basic Usage

1. Add a **Find/Replace Pairs** node
2. Set the number of pairs you need with `pair_count`
3. Enter your find patterns and replacements
4. Connect the `pairs` output to a **Text Replacer** node
5. Enter or connect your input text
6. Get the modified text from the `result` output

### Connecting Dynamic Values

Each find/replace pair has optional input connectors (`find_N_input` and `replace_N_input`) that can receive values from other nodes. Connected inputs take priority over widget values.

### Chaining Replacers

The Text Replacer node passes through the pairs object, allowing you to chain multiple replacers or use the same pairs set multiple times.

### Output Formats

**Find/Replace Pairs outputs:**
- `pairs` - Internal pairs object for use with TextReplacer
- `json_output` - JSON array of pairs: `[{"find": "...", "replace": "...", "index": 1}, ...]`
- `csv_output` - CSV format: `find,replace` per line

**Text Replacer outputs:**
- `result` - The text after all replacements
- `pairs_passthrough` - The pairs object (for chaining)
- `changes_log` - Human-readable log of changes made
- `replacement_count` - Total number of replacements performed

## Node Reference

### Find/Replace Pairs

| Input | Type | Description |
|-------|------|-------------|
| `pair_count` | INT | Number of active pairs (1-50) |
| `find_N` | STRING | Find pattern for pair N |
| `replace_N` | STRING | Replacement for pair N |
| `find_N_input` | STRING (connector) | Optional connected find pattern |
| `replace_N_input` | STRING (connector) | Optional connected replacement |

### Text Replacer

| Input | Type | Description |
|-------|------|-------------|
| `pairs` | FR_PAIRS | Pairs from FindReplacePairs node |
| `input_text` | STRING | Text to perform replacements on |
| `input_text_connected` | STRING (connector) | Optional connected text input |
| `use_regex` | BOOLEAN | Treat patterns as regex |
| `case_sensitive` | BOOLEAN | Case-sensitive matching |
| `replace_all` | BOOLEAN | Replace all vs first occurrence |

## License

MIT License
