import fs from "fs";

import jss from "jss";
import jss_preset_default from "jss-preset-default";

jss.setup(jss_preset_default());

function style_object(obj) {
	var styles = {
		"@global": {
			"html" : {
				border: "1px solid "+obj["app-border"]
			},
			"body" : {
				background: obj["body-background-color"]
			},
			"::-webkit-scrollbar-thumb" : {
				backgroundColor: obj["scrollbar-thumb"],
				border: "1px solid "+obj["scrollbar-thumb-border"]
			},
			"::-webkit-scrollbar-thumb:hover" : {
				backgroundColor: obj["scrollbar-thumb"]
			},
			"#action-bar": {
				color: obj["action-bar-color"],
	
				"& nav" : {
					borderTop: "1px solid "+obj["app-border"],
					borderBottom: "1px solid "+obj["app-border"]
				}
			},
			"nav > ul" : {
				"& li ul" : {
					border: "1px solid "+obj["app-border"],
					background: obj["action-bar-submenu-background"]
				},
				"& li > a, li > div" : {
					color: obj["action-bar-color"]
				},
				"li.has-sub" : {
					color: obj["action-bar-color"]
				},
				"& li:hover > a, li:hover > div" : {
					color: obj["title-bar-color-hover"]
				},
				"& li.has-sub:hover" : {
					color: obj["title-bar-color-hover"]
				},
				"& li hr" : {
					border: "1px solid "+obj["resize-panel-handler"]
				},
				"& li.has-sub > span:hover .link.material-icons" : {
					color: obj["title-bar-color-hover"]
				}
			},
			".outer_wrapper" : {
				"& .sidebar" : {
					backgroundColor: obj["sidebar-background"]
				},
				"& .fixed-sidebar" : {
					backgroundColor: obj["sidebar-background"],
					"& .cell-container" : {
						borderRight: "0.3em solid "+obj["resize-panel-handler"]
					}
				},
				"& .search-container" : {
					borderRight: "0.3em solid "+obj["resize-panel-handler"]
				},
				"& .resize-handler" : {
					background: obj["resize-panel-handler"]
				},
				"& .my-editor" : {
					background: obj["body-background-note"]
				}
			},
			".my-search" : {
				"& .material-icons:last-child" : {
					backgroundColor: obj["address-bar-background"]
				},
				"& input" : {
					backgroundColor: obj["address-bar-background"],
					border: "1px solid "+obj["app-border"],
					color: obj["action-bar-color"]
				},
				"& input::-webkit-input-placeholder" : {
					color: obj["action-bar-color"]
				},
				"& input:focus" : {
					color: obj["title-bar-color-hover"]
				}
			},
			".CodeMirror" : {
				backgroundColor: obj["note-background-color"]
			},
			".CodeMirror-dialog.CodeMirror-dialog-bottom" : {
				background: obj["title-bar-background"]
			},
			".main-note-container" : {
				border: "2px solid "+obj["note-border-color"],
				backgroundColor: obj["note-background-color"],
				color: obj["note-text-color"]
			},
			".my-editor-preview" : {
				backgroundColor: obj["note-background-color"]
			},
			".my-editor-preview ul li.checkbox.checkbox-checked" : {
				"& label, strong, span, a" : {
					color: obj["note-checkbox-selected"]
				}
			},
			".CodeMirror span.cm-piled-header-1, .my-editor-preview h1, .my-editor-outline input.h1" : {
				color: obj["note-header1-color"]
			},
			".CodeMirror span.cm-piled-strong, .my-editor-preview strong" : {
				color: obj["note-bold-color"]
			},
			".flashmessage-message": {
				borderBottom: "2px solid "+obj["ui-text-color"],
				color: obj["ui-text-color"]
			},
			".flashmessage-message:hover a" : {
				color: obj["ui-text-color-hover"]
			},
			".my-shelf" : {
				color: obj["sidebar-color"]
			},
			".my-shelf-rack" : {
				"& .rack-object, .folder-object" : {
					color: obj["sidebar-color"]
				},
				"& .folder-object" : {
					"& input" : {
						color: obj["sidebar-color"]
					}
				},
				"& .rack-object" : {
					"& a" : {
						color: obj["sidebar-background"],
						textShadow: "2px 2px "+obj["sidebar-color"]+", -2px -2px "+obj["sidebar-color"]+", -2px 2px "+obj["sidebar-color"]+", 2px -2px "+obj["sidebar-color"]
					},
					"& input" : {
						color: obj["sidebar-background"],
						backgroundColor: obj["sidebar-color"]
					}
				},
				"& .rack-object.dragging, .folder-object.dragging" : {
					color: obj["sidebar-color"]+" !important"
				}
			},
			".my-shelf-folder-badge" : {
				color: obj["folder-badge-color"]
			},
			".my-shelf-folder-badge:before" : {
				backgroundColor: obj["folder-badge-background"]
			},
			".my-shelf-rack.openFolder > .my-shelf-folders:last-child" : {
				borderBottom: "1px solid "+obj["folder-separator"]
			},
			".new-folder" : {
				"& .my-shelf-folder" : {
					border: "1px dashed "+obj["sidebar-color"],
					color: obj["sidebar-color"]
				},
				"& .my-shelf-folder:hover" : {
					border: "1px dashed "+obj["sidebar-color"],
					backgroundColor: obj["note-list-background-hover"],
					color: obj["note-list-text-color-hover"]
				}
			},
			".my-shelf-rack .rack-object:hover, .my-shelf-folder .folder-object:hover" : {
				backgroundColor: obj["folder-hover-background"],
				color: obj["folder-selected-color"]
			},
			".my-shelf-folder.sortInside > .folder-object, .my-shelf-folder.isShelfSelected > .folder-object, .my-shelf-rack.isShelfSelected > .rack-object" : {
				backgroundColor: obj["folder-selected-background"],
				color: obj["folder-selected-color"],
				"& input" : {
					color: obj["folder-selected-color"]
				}
			},
			".my-shelf-rack.isShelfSelected > .rack-object" : {
				"& input" : {
					backgroundColor: obj["folder-selected-background"],
				}
			},
			".my-shelf-rack .rack-object:hover a, .my-shelf-rack.isShelfSelected > .rack-object a" : {
				textShadow: "2px 2px "+obj["folder-selected-color"]+", -2px -2px "+obj["folder-selected-color"]+", -2px 2px "+obj["folder-selected-color"]+", 2px -2px "+obj["folder-selected-color"]
			},
			".my-shelf-rack.sortUpper .rack-object:after, .my-shelf-folder.sortUpper:after" : {
				backgroundColor: obj["folder-dragdrop-separator"]
			},
			".my-shelf-rack.sortLower .rack-object:after, .my-shelf-folder.sortLower:after" : {
				backgroundColor: obj["folder-dragdrop-separator"]
			},
			".modal-mask": {
				"& .modal-container" : {
					backgroundColor: obj["note-background-color"]
				},
				"& .modal-field-label + input" : {
					border: "0.1em solid "+obj["resize-panel-handler"]
				},
				"& .modal-button" : {
					backgroundColor: obj["main-background-color"],
					color: obj["ui-text-color-hover"]
				},
				"& .modal-button:hover" : {
					backgroundColor: obj["ui-text-background-hover"],
					color: obj["ui-text-color-selected"]
				}
			},
			".noteBar" : {
				"& .properties-dialog, .table-dialog, .headings-dialog" : {
					background: obj["note-background-color"],
					border: "1px solid "+obj["note-bar-text-color"]
				},
				"& .headings-dialog a" : {
					color: obj["note-bar-text-color"]
				},
				"& .headings-dialog a:hover" : {
					color: obj["note-text-color"]
				},
				"& .properties-dialog, .table-dialog" : {
					"& table" : {
						color: obj["note-bar-text-color"]
					},
					"& table.select-table-size" : {
						border: "1px solid "+obj["note-bar-text-color"],
						"& td" : {
							border: "1px solid "+obj["note-bar-text-color"]
						},
						"& td.selected, td:hover" : {
							background: obj["ui-text-background-hover"]
						}
					}
				},
				"& nav ul" : {
					background: obj["note-background-color"],
					"& li > a, li > div" : {
						color: obj["note-bar-text-color"]
					},
					"& li hr" : {
						border: "1px solid "+obj["note-bar-text-color"]
					},
					"& li ul" : {
						border: "1px solid "+obj["note-bar-text-color"]
					},
					"& li:hover > a, li:hover > div" : {
						background: obj["note-background-color"]+" !important",
						color: obj["note-text-color"]
					}
				}
			},
			".my-notes" : {
				"& .my-separator-date" : {
					color: obj["ui-text-color-dim"]
				},
				"& .my-notes-note" : {
					color: obj["note-list-text-color"],
					background: obj["note-list-background"],
					"& .my-notes-note-date, .my-notes-note-image, .my-notes-note-body" : {
						color: obj["note-list-body-color"]
					}
				},
				"& .my-notes-note.sortUpper:after, .my-notes-note.sortLower:after" : {
					backgroundColor: obj["folder-dragdrop-separator"]
				},
				"& .my-notes-note:hover" : {
					background: obj["note-list-background-hover"],
					color: obj["note-list-text-color-hover"],

					"& .my-notes-note-date, .my-notes-note-image, .my-notes-note-body" : {
						color: obj["note-list-body-color-selected"]
					}
				},
				"& .my-notes-note.my-notes-note-selected" : {
					background: obj["note-list-background-selected"],
					color: obj["note-list-text-color-selected"],

					"& .my-notes-note-date, .my-notes-note-image, .my-notes-note-body" : {
						color: obj["note-list-body-color-selected"]
					}
				}
			},
			".sidebar" : {
				"& .my-shelf-folder-bucket" : {
					borderBottom: "1px dashed "+obj["ui-text-color-dim"]
				},
				"& .sidebar-menu" : {
					border: "1px dashed "+obj["sidebar-color"],
					color: obj["sidebar-color"]
				},
				"& .sidebar-menu:hover" : {
					border: "1px dashed "+obj["sidebar-color"],
					backgroundColor: obj["note-list-background-hover"],
					color: obj["note-list-text-color-hover"]
				},
				"& .dialog ul" : {
					border: "1px solid "+obj["resize-panel-handler"],
					background: obj["title-bar-background"],
					"& li > a, li > div" : {
						color: obj["sidebar-color"]
					},
					"& li hr" : {
						border: "1px solid "+obj["resize-panel-handler"]
					},
					"& li hr + span" : {
						color: obj["sidebar-color"]
					},
					"& li:hover > a, li:hover > div" : {
						backgroundColor: obj["note-list-background-hover"]+" !important",
						color: obj["note-list-text-color-hover"]
					}
				}
			},
			".tabs-bar" : {
				backgroundColor: obj["body-background-note"],
				"& .tab" : {
					backgroundColor: obj["tabs-background"],
					border: "2px solid "+obj["note-border-color"],
					borderBottom: obj["tabs-background"]
				},
				"& .tab.selected, .tab:hover" : {
					backgroundColor: obj["tab-selected-background"]
				},
				"& .tab.selected" : {
					borderBottom: obj["tab-selected-background"]
				}
			},
			".tabs-open .main-note-container" : {
				borderTop: "0.15em solid "+obj["note-border-color"]
			},
			".title-bar-spacing" : {
				backgroundColor: obj["resize-panel-handler"]
			},
			".title-bar" : {
				backgroundColor: obj["title-bar-background"],
				color: obj["title-bar-color"],

				"& .spacer.right-align > nav > ul:after" : {
					borderRight: "2px solid "+obj["title-bar-color"]
				},
				"& .system-icon:hover" : {
					color: obj["title-bar-color-hover"]
				},
				"& .system-icon.close-icon:hover i" : {
					backgroundColor: obj["title-bar-close-button"],
					color: obj["title-bar-background"]
				},
				"& a.menu-icon:hover" : {
					backgroundColor: obj["folder-hover-background"],
					color: obj["folder-selected-color"]
				}
			}
		}
	}
	return styles;
}

export default {
	load(theme_name) {
		var theme_object = require.context(
			"../../themes",
			false,
			/\.json$/
		)("./" + theme_name + ".json");
		
		var sheet = jss.createStyleSheet(style_object(theme_object));
		sheet.attach()
	}
};
