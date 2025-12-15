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

                // Insert new widgets before the buttons
                const buttonIndex = this.widgets.indexOf(this.addPairButton);

                // Create find widget
                const findWidget = ComfyWidgets.STRING(
                    this,
                    `find_${idx}`,
                    ["STRING", { default: "", multiline: false, placeholder: `Find pattern ${idx}` }],
                    app
                ).widget;

                // Create replace widget
                const replaceWidget = ComfyWidgets.STRING(
                    this,
                    `replace_${idx}`,
                    ["STRING", { default: "", multiline: false, placeholder: `Replacement ${idx}` }],
                    app
                ).widget;

                // Move the new widgets before the buttons
                // Remove from end and insert at button position
                this.widgets.splice(this.widgets.length - 2, 2); // Remove the 2 new widgets from end
                this.widgets.splice(buttonIndex, 0, findWidget, replaceWidget);
                
                // Re-add buttons at end
                this.widgets.push(this.addPairButton, this.removePairButton);

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

                // Find and remove the widgets
                this.widgets = this.widgets.filter(w => 
                    w.name !== findName && w.name !== replaceName
                );

                // Remove inputs if they exist
                if (this.inputs) {
                    this.inputs = this.inputs.filter(input =>
                        input.name !== findName && input.name !== replaceName
                    );
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
            // Enable converting widgets to inputs (right-click -> Convert to Input)
            if (node.widgets) {
                for (const widget of node.widgets) {
                    if (widget.name?.startsWith("find_") || widget.name?.startsWith("replace_")) {
                        widget.convertToInput = true;
                    }
                }
            }
        }
    }
});
