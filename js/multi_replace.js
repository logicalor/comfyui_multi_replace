import { app } from "../../scripts/app.js";

/**
 * ComfyUI Multi-Replace Extension
 * Handles dynamic visibility of find/replace pair inputs based on pair_count
 */

const MAX_PAIRS = 50;

app.registerExtension({
    name: "comfyui-multi-replace",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "FindReplacePairs") {
            // Store original onNodeCreated
            const origOnNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function() {
                if (origOnNodeCreated) {
                    origOnNodeCreated.apply(this, arguments);
                }

                // Find the pair_count widget
                const pairCountWidget = this.widgets?.find(w => w.name === "pair_count");

                if (pairCountWidget) {
                    // Store original callback
                    const origCallback = pairCountWidget.callback;

                    // Override callback to update visibility
                    pairCountWidget.callback = (value, ...args) => {
                        if (origCallback) {
                            origCallback.call(pairCountWidget, value, ...args);
                        }
                        this.updatePairVisibility(value);
                    };

                    // Initial visibility update
                    setTimeout(() => {
                        this.updatePairVisibility(pairCountWidget.value);
                    }, 100);
                }
            };

            // Method to update visibility of pair widgets
            nodeType.prototype.updatePairVisibility = function(pairCount) {
                if (!this.widgets) return;

                const count = parseInt(pairCount) || 1;

                for (const widget of this.widgets) {
                    const match = widget.name.match(/^(find|replace)_(\d+)$/);
                    if (match) {
                        const pairIndex = parseInt(match[2]);
                        // Show widgets for active pairs + 1 empty pair for new entry
                        const shouldShow = pairIndex <= count;

                        // ComfyUI uses different methods to hide widgets
                        if (shouldShow) {
                            widget.type = widget._originalType || widget.type;
                            widget.computeSize = widget._originalComputeSize;
                        } else {
                            widget._originalType = widget._originalType || widget.type;
                            widget._originalComputeSize = widget._originalComputeSize || widget.computeSize;
                            widget.type = "hidden";
                            widget.computeSize = () => [0, -4];
                        }
                    }
                }

                // Recalculate node size
                this.setSize(this.computeSize());
                app.graph.setDirtyCanvas(true, true);
            };

            // Override onConfigure to restore visibility on load
            const origOnConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(config) {
                if (origOnConfigure) {
                    origOnConfigure.apply(this, arguments);
                }

                setTimeout(() => {
                    const pairCountWidget = this.widgets?.find(w => w.name === "pair_count");
                    if (pairCountWidget) {
                        this.updatePairVisibility(pairCountWidget.value);
                    }
                }, 100);
            };
        }
    },

    async nodeCreated(node) {
        if (node.comfyClass === "FindReplacePairs") {
            // Additional setup after node is fully created
            const pairCountWidget = node.widgets?.find(w => w.name === "pair_count");
            if (pairCountWidget) {
                setTimeout(() => {
                    node.updatePairVisibility?.(pairCountWidget.value);
                }, 200);
            }
        }
    }
});
