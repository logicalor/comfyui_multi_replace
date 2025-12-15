import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

/**
 * ComfyUI Multi-Replace Extension
 * Handles dynamic addition of find/replace pair inputs
 */

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
                this.serialize_widgets = true;

                // Add the "Add Pair" button
                this.addWidget("button", "➕ Add Pair", null, () => {
                    this.addNewPair();
                });

                // Add the "Remove Last Pair" button
                this.addWidget("button", "➖ Remove Last Pair", null, () => {
                    this.removeLastPair();
                });

                // Store reference to button widgets
                this.addPairButton = this.widgets[this.widgets.length - 2];
                this.removePairButton = this.widgets[this.widgets.length - 1];

                this.updateRemoveButtonState();
            };

            // Add a new find/replace pair
            nodeType.prototype.addNewPair = function() {
                this.pairCount++;
                const idx = this.pairCount;

                // Add input connectors for find and replace
                this.addInput(`find_${idx}`, "STRING");
                this.addInput(`replace_${idx}`, "STRING");

                this.updateRemoveButtonState();
                this.setSize(this.computeSize());
                app.graph.setDirtyCanvas(true, true);
            };

            // Remove the last find/replace pair
            nodeType.prototype.removeLastPair = function() {
                if (this.pairCount <= 1) return;

                const idx = this.pairCount;
                const findName = `find_${idx}`;
                const replaceName = `replace_${idx}`;

                // Remove inputs
                const findInputIdx = this.inputs?.findIndex(i => i.name === findName);
                if (findInputIdx !== undefined && findInputIdx >= 0) {
                    this.removeInput(findInputIdx);
                }
                const replaceInputIdx = this.inputs?.findIndex(i => i.name === replaceName);
                if (replaceInputIdx !== undefined && replaceInputIdx >= 0) {
                    this.removeInput(replaceInputIdx);
                }

                this.pairCount--;
                this.updateRemoveButtonState();
                this.setSize(this.computeSize());
                app.graph.setDirtyCanvas(true, true);
            };

            // Update remove button enabled state
            nodeType.prototype.updateRemoveButtonState = function() {
                if (this.removePairButton) {
                    this.removePairButton.disabled = this.pairCount <= 1;
                }
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

            // Handle serialization to save dynamic widgets
            const origOnSerialize = nodeType.prototype.onSerialize;
            nodeType.prototype.onSerialize = function(info) {
                if (origOnSerialize) {
                    origOnSerialize.apply(this, arguments);
                }
                info.pairCount = this.pairCount;
            };

            // Handle deserialization to restore dynamic widgets
            const origOnConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(info) {
                // Restore additional pairs before calling original
                if (info.pairCount && info.pairCount > 1) {
                    const targetCount = info.pairCount;
                    
                    // Add pairs up to saved count
                    while (this.pairCount < targetCount) {
                        this.addNewPair();
                    }
                }

                if (origOnConfigure) {
                    origOnConfigure.apply(this, arguments);
                }

                // Restore widget values from saved state
                if (info.widgets_values) {
                    let valueIdx = 0;
                    for (const widget of this.widgets) {
                        if (widget.type !== "button" && valueIdx < info.widgets_values.length) {
                            widget.value = info.widgets_values[valueIdx];
                            valueIdx++;
                        }
                    }
                }
            };

            // Allow converting widgets to inputs for connections
            const origOnInputAdded = nodeType.prototype.onInputAdded;
            nodeType.prototype.onInputAdded = function(input) {
                if (origOnInputAdded) {
                    origOnInputAdded.apply(this, arguments);
                }
            };
        }
    },

    async nodeCreated(node) {
        if (node.comfyClass === "FindReplacePairs") {
            // First pair should also be input connectors - convert widgets to inputs
            setTimeout(() => {
                // Remove the default widgets for find_1 and replace_1
                if (node.widgets) {
                    node.widgets = node.widgets.filter(w => 
                        w.name !== "find_1" && w.name !== "replace_1"
                    );
                }
                // Add as input connectors instead
                if (!node.inputs?.find(i => i.name === "find_1")) {
                    node.addInput("find_1", "STRING");
                }
                if (!node.inputs?.find(i => i.name === "replace_1")) {
                    node.addInput("replace_1", "STRING");
                }
                node.setSize(node.computeSize());
                app.graph.setDirtyCanvas(true, true);
            }, 50);
        }
    }
});
