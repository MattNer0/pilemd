// Copied from codemirror search
// from codemirror version 5.11.0

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// Define search commands. Depends on dialog.js or another
// implementation of the openDialog method.

// Replace works a little oddly -- it will do the replace on the next
// Ctrl-G (or whatever is bound to findNext) press. You prevent a
// replace by making sure the match is no longer selected when hitting
// Ctrl-G.

(function(CodeMirror) {
	'use strict';

	function searchOverlay(query, caseInsensitive) {
		if (typeof query == 'string')
			query = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'), caseInsensitive ? 'gi' : 'g');
		else if (!query.global)
			query = new RegExp(query.source, query.ignoreCase ? 'gi' : 'g');

		return {token: function(stream) {
			query.lastIndex = stream.pos;
			var match = query.exec(stream.string);
			if (match && match.index == stream.pos) {
				stream.pos += match[0].length;
				return 'searching';
			} else if (match) {
				stream.pos = match.index;
			} else {
				stream.skipToEnd();
			}
		}};
	}

	function SearchState() {
		this.posFrom = this.posTo = this.lastQuery = this.query = null;
		this.overlay = null;
	}

	function getSearchState(cm) {
		return cm.state.search || (cm.state.search = new SearchState());
	}

	function queryCaseInsensitive(query) {
		return typeof query == 'string' && query == query.toLowerCase();
	}

	function getSearchCursor(cm, query, pos) {
		// Heuristic: if the query string is all lowercase, do a case insensitive search.
		return cm.getSearchCursor(query, pos, queryCaseInsensitive(query));
	}

	function persistentDialog(cm, text, deflt, f) {
		cm.openDialog(text, f, {
			value: deflt,
			selectValueOnOpen: true,
			closeOnEnter: false,
			closeOnBlur: true,
			bottom: true,
			onClose: function() { clearSearch(cm); },
			onKeyDown: function(e, value, close) {
				if (e.ctrlKey && e.keyCode == 71) {  // Ctrl-G => Close
					close();
				}
				if ((e.ctrlKey && e.keyCode == 82) ||
					(e.ctrlKey && e.keyCode == 80) ||
					(e.keyCode == 38)) {  // Ctrl-R, Ctrl-P, ↑ => Prev
					f(value, e, true);
				}
				if ((e.ctrlKey && e.keyCode == 83) ||
					(e.ctrlKey && e.keyCode == 78) ||
					(e.keyCode == 40)) {  // Ctrl-S, Ctrl-N, ↓ => Next
					f(value, e, false);
				}
				return false;
			}
		});
	}

	function dialog(cm, text, shortText, deflt, f) {
		if (cm.openDialog) cm.openDialog(text, f, {
			value: deflt,
			selectValueOnOpen: true,
			bottom: true,
			onKeyDown: function(e, value, close) {
				if (e.ctrlKey && e.keyCode == 71) {  // Ctrl-G => Close
					close();
				}
				return false;
			},
			onClose: function() {
				clearSearch(cm);
			}
		});
		else f(prompt(shortText, deflt));
	}

	function confirmDialog(cm, text, shortText, fs) {
		if (cm.openConfirm) {
			cm.openConfirm(text, fs, {
				bottom: true
			});
		} else if (confirm(shortText)) fs[0]();
	}

	function parseString(string) {
		return string.replace(/\\(.)/g, function(_, ch) {
			if (ch == 'n') return '\n';
			if (ch == 'r') return '\r';
			return ch;
		});
	}

	function parseQuery(query) {
		var isRE = query.match(/^\/(.*)\/([a-z]*)$/);
		if (isRE) {
			try { query = new RegExp(isRE[1], isRE[2].indexOf('i') == -1 ? '' : 'i'); }
			catch (e) {} // Not a regular expression after all, do a string search
		} else {
			query = parseString(query);
		}
		if (typeof query == 'string' ? query == '' : query.test(''))
			query = /x^/;
		return query;
	}

	var queryDialog =
		'<input type="text" placeholder="Search... /regexp/" class="CodeMirror-search-field"/>';

	function setSearch(cm, query) {
		var state = getSearchState(cm);
		startSearch(cm, state, query);
	}

	function undoSearch(cm) {
		var state = getSearchState(cm);
		cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query));
	}

	function startSearch(cm, state, query) {
		state.queryText = query;
		state.query = parseQuery(query);
		cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query));
		state.overlay = searchOverlay(state.query, queryCaseInsensitive(state.query));
		cm.addOverlay(state.overlay);
		if (cm.showMatchesOnScrollbar) {
			if (state.annotate) { state.annotate.clear(); state.annotate = null; }
			state.annotate = cm.showMatchesOnScrollbar(state.query, queryCaseInsensitive(state.query));
		}
	}

	function doSearch(cm, rev, persistent) {
		if (document.querySelector('.CodeMirror-dialog')) {return}
		function findNext(cm_, rev, callback, nfound) {cm_.operation(function() {
			var state = getSearchState(cm_);
			var cursor = getSearchCursor(cm_, state.query, rev ? state.posFrom : state.posTo);
			if (!cursor.find(rev)) {
				cursor = getSearchCursor(cm_, state.query, rev ? CodeMirror.Pos(cm_.lastLine()) : CodeMirror.Pos(cm_.firstLine(), 0));
				if (!cursor.find(rev)) {
					nfound();
					return null;
				}
			}
			cm.setSelection(cursor.from(), cursor.to());
			state.posFrom = cursor.from(); state.posTo = cursor.to();
			if (callback) callback(cursor.from(), cursor.to());
		});}

		var state = getSearchState(cm);
		if (state.query) return findNext(cm, rev);
		var q = cm.getSelection() || state.lastQuery;
		if (persistent && cm.openDialog) {
			var hiding = null;
			persistentDialog(cm, queryDialog, q, function(query, event, rev_) {
				CodeMirror.e_stop(event);
				if (!query) return;
				if (query != state.queryText) startSearch(cm, state, query);
				if (hiding) hiding.style.opacity = 1;
				findNext(cm, event.shiftKey || rev_, function(_, to) {
					var dialog;
					if (document.querySelector && (dialog = cm.display.wrapper.querySelector('.CodeMirror-dialog'))) {
						dialog.querySelector('input').style['background-color'] = '#fff';
						(hiding = dialog).style.opacity = 0.9;
					}
				}, function() {
					var d;
					if (document.querySelector && (d = cm.display.wrapper.querySelector('.CodeMirror-dialog'))
					) {
						d.querySelector('input').style['background-color'] = '#fee';
					}

				});
			});
		} else {
			dialog(cm, queryDialog, 'Search for:', q, function(query) {
				if (query && !state.query) cm.operation(function() {
					startSearch(cm, state, query);
					state.posFrom = state.posTo = cm.getCursor();
					findNext(cm, rev);
				});
			});
		}
	}

	function clearSearch(cm) {cm.operation(function() {
		var state = getSearchState(cm);
		state.lastQuery = state.query;
		if (!state.query) return;
		state.query = state.queryText = null;
		cm.removeOverlay(state.overlay);
		if (state.annotate) { state.annotate.clear(); state.annotate = null; }
	});}

	var replaceQueryDialog =
		' <input type="text" placeholder="Replace Search... /regexp/" class="CodeMirror-search-field"/>';
	var replacementQueryDialog = '<input type="text" placeholder="Replace with" class="CodeMirror-search-field"/>';
	var doReplaceConfirm = 'Replace? <button>Yes</button> <button>No</button> <button>All</button> <button>Done</button>';

	function replaceAll(cm, query, text) {
		cm.operation(function() {
			for (var cursor = getSearchCursor(cm, query); cursor.findNext();) {
				if (typeof query != 'string') {
					var match = cm.getRange(cursor.from(), cursor.to()).match(query);
					cursor.replace(text.replace(/\$(\d)/g, function(_, i) {return match[i];}));
				} else cursor.replace(text);
			}
		});
	}

	function replace(cm, all) {
		clearSearch(cm);
		if (document.querySelector('.CodeMirror-dialog')) {return}
		if (cm.getOption('readOnly')) return;
		var query = cm.getSelection() || getSearchState(cm).lastQuery;
		dialog(cm, replaceQueryDialog, '', query, function(query) {
			if (!query) return;
			query = parseQuery(query);
			var state = getSearchState(cm);
			startSearch(cm, state, query);
			dialog(cm, replacementQueryDialog, 'Replace with:', '', function(text) {
				text = parseString(text);
				if (all) {
					replaceAll(cm, query, text);
				} else {
					startSearch(cm, state, query);
					var cursor = getSearchCursor(cm, query, cm.getCursor());
					var advance = function() {
						var start = cursor.from(), match;
						if (!(match = cursor.findNext())) {
							cursor = getSearchCursor(cm, query);
							if (!(match = cursor.findNext()) ||
								(start && cursor.from().line == start.line && cursor.from().ch == start.ch)) return;
						}
						startSearch(cm, state, query);
						cm.setSelection(cursor.from(), cursor.to());
						cm.scrollIntoView({from: cursor.from(), to: cursor.to()});
						startSearch(cm, state, query);
						confirmDialog(cm, doReplaceConfirm, 'Replace?',
							[function() {doReplace(match);},
								advance,
								function() {replaceAll(cm, query, text)},
								function() {clearSearch(cm)}]);
					};
					var doReplace = function(match) {
						cursor.replace(typeof query == 'string' ? text : text.replace(/\$(\d)/g, function(_, i) {return match[i];}));
						advance();
					};
					advance();
				}
			});
		});
	}

	CodeMirror.commands.find = function(cm) {clearSearch(cm); doSearch(cm);};
	CodeMirror.commands.findPersistent = function(cm) {clearSearch(cm); doSearch(cm, false, true);};
	CodeMirror.commands.findNext = doSearch;
	CodeMirror.commands.setSearch = setSearch;
	CodeMirror.commands.undoSearch = undoSearch;
	CodeMirror.commands.findPrev = function(cm) {doSearch(cm, true);};
	CodeMirror.commands.clearSearch = clearSearch;
	CodeMirror.commands.replace = replace;
	CodeMirror.commands.replaceAll = function(cm) {replace(cm, true);};
})(
	require('codemirror'),
	require('codemirror/addon/search/searchcursor'),
	require('codemirror/addon/dialog/dialog')
);
