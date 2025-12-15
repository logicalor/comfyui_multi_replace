import { app } from "../../scripts/app.js";

/**
 * ComfyUI Multi-Replace Extension
 * Handles dynamic visibility of find/replace pair widgets
 */

const MAX_PAIRS = 80;

app.registerExtension({
    name: "comfyui-multi-replace",

    async nodeCreated(node) {
        if (node.comfyClass !== "FindReplacePairs") return;

        node.pairCount = 1;

        // Find all the find/replace widgets and store references
        const pairWidgets = [];
        if (node.widgets) {
            for (const widget of node.widgets) {
                const match = widget.name?.match(/^(find|replace)_(\d+)$/);
                if (match) {
                    pairWidgets.push(widget);
                }
            }
        }

        // Function to update visibility
        node.updatePairVisibility = function() {
            if (!this.widgets) return;

            for (const widget of this.widgets) {
                const match = widget.name?.match(/^(find|replace)_(\d+)$/);
                if (match) {
                    const pairIndex = parseInt(match[2]);
                    const shouldShow = pairIndex <= this.pairCount;

                    if (shouldShow) {
                        widget.type = widget._originalType || widget.type || "STRING";
                        if (widget._originalComputeSize) {
                            widget.computeSize = widget._originalComputeSize;
                        } else {
                            delete widget.computeSize;
                        }
                    } else {
                        if (!widget._originalType && widget.type !== "hidden") {
                            widget._originalType = widget.type;
                            widget._originalComputeSize = widget.computeSize;
                        }
                        widget.type = "hidden";
                        widget.computeSize = () => [0, -4];
                    }
                }
            }

            this.setSize(this.computeSize());
            app.graph.setDirtyCanvas(true, true);
        };

        // Add pair function
        node.addNewPair = function() {
            if (this.pairCount >= MAX_PAIRS) return;
            this.pairCount++;
            this.updatePairVisibility();
        };

        // Remove pair function
        node.removeLastPair = function() {
            if (this.pairCount <= 1) return;

            // Clear the values
            const findWidget = this.widgets?.find(w => w.name === `find_${this.pairCount}`);
            const replaceWidget = this.widgets?.find(w => w.name === `replace_${this.pairCount}`);
            if (findWidget) findWidget.value = "";
            if (replaceWidget) replaceWidget.value = "";

            this.pairCount--;
            this.updatePairVisibility();
        };

        // Add buttons AFTER all the pair widgets
        // First, do initial hide of extra pairs
        node.updatePairVisibility();

        // Now add the buttons at the end
        const addBtn = node.addWidget("button", "add_pair_btn", "➕ Add Pair", () => {
            node.addNewPair();
        });
        addBtn.serializeValue = () => undefined; // Don't serialize button

        const removeBtn = node.addWidget("button", "remove_pair_btn", "➖ Remove Last Pair", () => {
            node.removeLastPair();
        });
        removeBtn.serializeValue = () => undefined; // Don't serialize button

        // Override serialize to save pair count
        const origSerialize = node.serialize;
        node.serialize = function() {
            const data = origSerialize ? origSerialize.call(this) : {};
            data.pairCount = this.pairCount;
            return data;
        };

        // Handle loading saved pair count
        const origConfigure = node.configure;
        node.configure = function(data) {
            if (origConfigure) {
                origConfigure.call(this, data);
            }
            if (data.pairCount) {
                this.pairCount = data.pairCount;
                setTimeout(() => this.updatePairVisibility(), 10);
            }
        };
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "FindReplacePairs") {
            // Add right-click menu options
            const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function(_, options) {
                if (origGetExtraMenuOptions) {
                    origGetExtraMenuOptions.apply(this, arguments);
                }

                options.unshift(
                    {
                        content: "Add Find/Replace Pair",
                        disabled: this.pairCount >= MAX_PAIRS,
                        callback: () => this.addNewPair?.()
                    },
                    {
                        content: "Remove Last Pair",
                        disabled: this.pairCount <= 1,
                        callback: () => this.removeLastPair?.()
                    },
                    null
                );
            };
        }
    }
});
