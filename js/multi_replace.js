import { app } from "../../scripts/app.js";

/**
 * ComfyUI Multi-Replace Extension
 * Handles dynamic visibility of find/replace pair widgets
 */

const MAX_PAIRS = 80;

app.registerExtension({
    name: "comfyui-multi-replace",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "FindReplacePairs") {
            const origOnNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function() {
                if (origOnNodeCreated) {
                    origOnNodeCreated.apply(this, arguments);
                }

                this.pairCount = 1;

                // Add the "Add Pair" button at the end
                this.addWidget("button", "➕ Add Pair", null, () => {
                    this.addNewPair();
                });

                // Add the "Remove Last Pair" button
                this.addWidget("button", "➖ Remove Last Pair", null, () => {
                    this.removeLastPair();
                });

                // Initial visibility update
                setTimeout(() => {
                    this.updatePairVisibility();
                }, 50);
            };

            // Show the next pair
            nodeType.prototype.addNewPair = function() {
                if (this.pairCount >= MAX_PAIRS) return;
                this.pairCount++;
                this.updatePairVisibility();
            };

            // Hide the last pair
            nodeType.prototype.removeLastPair = function() {
                if (this.pairCount <= 1) return;
                
                // Clear the values of the pair being removed
                const findWidget = this.widgets?.find(w => w.name === `find_${this.pairCount}`);
                const replaceWidget = this.widgets?.find(w => w.name === `replace_${this.pairCount}`);
                if (findWidget) findWidget.value = "";
                if (replaceWidget) replaceWidget.value = "";
                
                this.pairCount--;
                this.updatePairVisibility();
            };

            // Update visibility of pair widgets
            nodeType.prototype.updatePairVisibility = function() {
                if (!this.widgets) return;

                for (const widget of this.widgets) {
                    const match = widget.name?.match(/^(find|replace)_(\d+)$/);
                    if (match) {
                        const pairIndex = parseInt(match[2]);
                        const shouldShow = pairIndex <= this.pairCount;

                        if (shouldShow) {
                            // Show widget
                            widget.type = widget._originalType || widget.type;
                            if (widget._originalComputeSize) {
                                widget.computeSize = widget._originalComputeSize;
                            }
                        } else {
                            // Hide widget
                            if (widget.type !== "hidden") {
                                widget._originalType = widget.type;
                                widget._originalComputeSize = widget.computeSize;
                            }
                            widget.type = "hidden";
                            widget.computeSize = () => [0, -4];
                        }
                    }
                }

                // Also hide/show the corresponding inputs
                if (this.inputs) {
                    for (const input of this.inputs) {
                        const match = input.name?.match(/^(find|replace)_(\d+)$/);
                        if (match) {
                            const pairIndex = parseInt(match[2]);
                            // We can't truly hide inputs, but we can mark them
                            input._hidden = pairIndex > this.pairCount;
                        }
                    }
                }

                this.setSize(this.computeSize());
                app.graph.setDirtyCanvas(true, true);
            };

            // Override getExtraMenuOptions to add right-click options
            const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function(_, options) {
                if (origGetExtraMenuOptions) {
                    origGetExtraMenuOptions.apply(this, arguments);
                }

                options.unshift(
                    {
                        content: "Add Find/Replace Pair",
                        disabled: this.pairCount >= MAX_PAIRS,
                        callback: () => this.addNewPair()
                    },
                    {
                        content: "Remove Last Pair",
                        disabled: this.pairCount <= 1,
                        callback: () => this.removeLastPair()
                    },
                    null // separator
                );
            };

            // Save pair count
            const origOnSerialize = nodeType.prototype.onSerialize;
            nodeType.prototype.onSerialize = function(info) {
                if (origOnSerialize) {
                    origOnSerialize.apply(this, arguments);
                }
                info.pairCount = this.pairCount;
            };

            // Restore pair count and visibility
            const origOnConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(info) {
                if (origOnConfigure) {
                    origOnConfigure.apply(this, arguments);
                }

                if (info.pairCount) {
                    this.pairCount = info.pairCount;
                }

                setTimeout(() => {
                    this.updatePairVisibility();
                }, 50);
            };
        }
    }
});
