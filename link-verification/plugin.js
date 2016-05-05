/*global tinymce:true */

tinymce.PluginManager.add('linkVerification', function(editor) {
	function getUrlDefaultPattern(){
			/*
			This RegExp was taken from here: https://gist.github.com/dperini/729294 (check for updates).
			Accordingly to this test https://mathiasbynens.be/demo/url-regexa one of the best know regex to verify url
			*/
			return /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;
	}

	function createLinkList(callback) {
		return function() {
			var linkList = editor.settings.link_list;

			if (typeof linkList == "string") {
				tinymce.util.XHR.send({
					url: linkList,
					success: function(text) {
						callback(tinymce.util.JSON.parse(text));
					}
				});
			} else if (typeof linkList == "function") {
				linkList(callback);
			} else {
				callback(linkList);
			}
		};
	}

	function buildListItems(inputList, itemCallback, startItems) {
		function appendItems(values, output) {
			output = output || [];

			tinymce.each(values, function(item) {
				var menuItem = {text: item.text || item.title};

				if (item.menu) {
					menuItem.menu = appendItems(item.menu);
				} else {
					menuItem.value = item.value;

					if (itemCallback) {
						itemCallback(menuItem);
					}
				}

				output.push(menuItem);
			});

			return output;
		}

		return appendItems(inputList, startItems || []);
	}

	function showDialog(linkList) {
		var data = {}, selection = editor.selection, dom = editor.dom, selectedElm, anchorElm, initialText;
		var win, onlyText, textListCtrl, linkListCtrl, relListCtrl, targetListCtrl, classListCtrl, linkTitleCtrl, value;

		function linkListChangeHandler(e) {
			var textCtrl = win.find('#text');

			if (!textCtrl.value() || (e.lastControl && textCtrl.value() == e.lastControl.text())) {
				textCtrl.value(e.control.text());
			}

			win.find('#href').value(e.control.value());
		}

		function buildAnchorListControl(url) {
			var anchorList = [];

			tinymce.each(editor.dom.select('a:not([href])'), function(anchor) {
				var id = anchor.name || anchor.id;

				if (id) {
					anchorList.push({
						text: id,
						value: '#' + id,
						selected: url.indexOf('#' + id) != -1
					});
				}
			});

			if (anchorList.length) {
				anchorList.unshift({text: 'None', value: ''});

				return {
					name: 'anchor',
					type: 'listbox',
					label: 'Anchors',
					values: anchorList,
					onselect: linkListChangeHandler
				};
			}
		}

		function updateText() {
			if (!initialText && data.text.length === 0 && onlyText) {
				this.parent().parent().find('#text')[0].value(this.value());
			}
		}

		function urlChange(e) {
			var meta = e.meta || {};

			if (linkListCtrl) {
				linkListCtrl.value(editor.convertURL(this.value(), 'href'));
			}

			tinymce.each(e.meta, function(value, key) {
				win.find('#' + key).value(value);
			});

			if (!meta.text) {
				updateText.call(this);
			}
		}

		function isOnlyTextSelected(anchorElm) {
			var html = selection.getContent();

			// Partial html and not a fully selected anchor element
			if (/</.test(html) && (!/^<a [^>]+>[^<]+<\/a>$/.test(html) || html.indexOf('href=') == -1)) {
				return false;
			}

			if (anchorElm) {
				var nodes = anchorElm.childNodes, i;

				if (nodes.length === 0) {
					return false;
				}

				for (i = nodes.length - 1; i >= 0; i--) {
					if (nodes[i].nodeType != 3) {
						return false;
					}
				}
			}

			return true;
		}

		function checkButtonChanges() {
			if (editor.settings.link_config && (editor.settings.link_config.ok_button_text || editor.settings.link_config.cancel_button_text)) {
				return [
					{text: editor.settings.link_config.ok_button_text || 'Ok',
					subtype: 'primary',
					onclick: 'submit'},
					{text: editor.settings.link_config.cancel_button_text || 'Cancel',
					onclick: 'close'}
				];
			}
		}

		selectedElm = selection.getNode();
		anchorElm = dom.getParent(selectedElm, 'a[href]');
		onlyText = isOnlyTextSelected();

		data.text = initialText = anchorElm ? (anchorElm.innerText || anchorElm.textContent) : selection.getContent({format: 'text'});
		data.href = anchorElm ? dom.getAttrib(anchorElm, 'href') : '';

		if (anchorElm) {
			data.target = dom.getAttrib(anchorElm, 'target');
		} else if (editor.settings.default_link_target) {
			data.target = editor.settings.default_link_target;
		}

		if ((value = dom.getAttrib(anchorElm, 'rel'))) {
			data.rel = value;
		}

		if ((value = dom.getAttrib(anchorElm, 'class'))) {
			data['class'] = value;
		}

		if ((value = dom.getAttrib(anchorElm, 'title'))) {
			data.title = value;
		}

		if (onlyText) {
			textListCtrl = {
				name: 'text',
				type: 'textbox',
				size: 40,
				label: 'Text to display',
				onchange: function() {
					data.text = this.value();
				}
			};
		}

		if (linkList) {
			linkListCtrl = {
				type: 'listbox',
				label: 'Link list',
				values: buildListItems(
					linkList,
					function(item) {
						item.value = editor.convertURL(item.value || item.url, 'href');
					},
					[{text: 'None', value: ''}]
				),
				onselect: linkListChangeHandler,
				value: editor.convertURL(data.href, 'href'),
				onPostRender: function() {
					/*eslint consistent-this:0*/
					linkListCtrl = this;
				}
			};
		}

		if (editor.settings.target_list !== false) {
			if (!editor.settings.target_list) {
				editor.settings.target_list = [
					{text: 'None', value: ''},
					{text: 'New window', value: '_blank'}
				];
			}

			targetListCtrl = {
				name: 'target',
				type: 'listbox',
				label: 'Target',
				values: buildListItems(editor.settings.target_list)
			};
		}

		if (editor.settings.rel_list) {
			relListCtrl = {
				name: 'rel',
				type: 'listbox',
				label: 'Rel',
				values: buildListItems(editor.settings.rel_list)
			};
		}

		if (editor.settings.link_class_list) {
			classListCtrl = {
				name: 'class',
				type: 'listbox',
				label: 'Class',
				values: buildListItems(
					editor.settings.link_class_list,
					function(item) {
						if (item.value) {
							item.textStyle = function() {
								return editor.formatter.getCssText({inline: 'a', classes: [item.value]});
							};
						}
					}
				)
			};
		}

		if (editor.settings.link_title !== false) {
			linkTitleCtrl = {
				name: 'title',
				type: 'textbox',
				label: 'Title',
				value: data.title
			};
		}

		win = editor.windowManager.open({
			title: 'Insert link',
			data: data,
			buttons: checkButtonChanges(),
			body: [
				{
					name: 'href',
					type: 'filepicker',
					filetype: 'file',
					size: 40,
					autofocus: false,
					label: editor.settings.link_config.label_url_text || 'Url',
					onchange: urlChange,
					onkeyup: updateText
				},
				textListCtrl,
				linkTitleCtrl,
				buildAnchorListControl(data.href),
				linkListCtrl,
				relListCtrl,
				targetListCtrl,
				classListCtrl
			],
			onSubmit: function(e) {
				/*eslint dot-notation: 0*/
				var href;

				data = tinymce.extend(data, e.data);
				href = data.href;

				// Delay confirm since onSubmit will move focus
				function delayedConfirm(message, callback) {
					var rng = editor.selection.getRng();

					tinymce.util.Delay.setEditorTimeout(editor, function() {
						editor.windowManager.confirm(message, function(state) {
							editor.selection.setRng(rng);
							callback(state);
						});
					});
				}

				function getVerificationPattern() {
					var config = editor.settings.link_config;

					if (config.verification_default) {
						return getUrlDefaultPattern();
					}

					if (typeof config.verification_pattern === 'string') {
						return new RegExp(config.verification, 'i');
					}

					if (config.verification_pattern instanceof RegExp) {
						return config.verification_pattern;
					}
				}

				function checkVerification() {
					var config = editor.settings.link_config;

					if (config && (config.verification_pattern || config.verification_default)) {
						var pattern = getVerificationPattern();

						if ((pattern instanceof RegExp) && !pattern.test(href)) {
							editor.windowManager.alert(config.verification_error || 'This is not a valid url');
							return false;
						}
					}
				}

				function insertLink() {
					var linkAttrs = {
						href: href,
						target: data.target ? data.target : null,
						rel: data.rel ? data.rel : null,
						"class": data["class"] ? data["class"] : null,
						title: data.title ? data.title : null
					};

					if (anchorElm) {
						editor.focus();

						if (onlyText && data.text != initialText) {
							if ("innerText" in anchorElm) {
								anchorElm.innerText = data.text;
							} else {
								anchorElm.textContent = data.text;
							}
						}

						dom.setAttribs(anchorElm, linkAttrs);

						selection.select(anchorElm);
						editor.undoManager.add();
					} else {
						if (onlyText) {
							editor.insertContent(dom.createHTML('a', linkAttrs, dom.encode(data.text)));
						} else {
							editor.execCommand('mceInsertLink', false, linkAttrs);
						}
					}
				}

				if (!href) {
					editor.execCommand('unlink');
					return;
				}

				// Is email and not //user@domain.com
				if (href.indexOf('@') > 0 && href.indexOf('//') == -1 && href.indexOf('mailto:') == -1) {
					delayedConfirm(
						'The URL you entered seems to be an email address. Do you want to add the required mailto: prefix?',
						function(state) {
							if (state) {
								href = 'mailto:' + href;
							}

							insertLink();
						}
					);

					return;
				}

				// Is not protocol prefixed
				if ((editor.settings.link_assume_external_targets && !/^\w+:/i.test(href)) ||
					(!editor.settings.link_assume_external_targets && /^\s*www[\.|\d\.]/i.test(href))) {
							href = 'http://' + href;
							checkVerification();
							insertLink();

							return;
					}

				// handle protocol (http/https/ftp) misspelling
				if (editor.settings.link_config.check_protocol) {
					var protocolPattern = new RegExp('^(' + editor.settings.link_config.check_protocol.join('|') + '):\/\/');
					if (!protocolPattern.test(href)) {
						if(!checkVerification()) {
							e.preventDefault();
							return;
						}
					}
				}

				checkVerification();
				insertLink();
			}
		});
	}

	editor.addButton('link', {
		icon: 'link',
		tooltip: 'Insert/edit link',
		shortcut: 'Meta+K',
		onclick: createLinkList(showDialog),
		stateSelector: 'a[href]'
	});

	editor.addButton('unlink', {
		icon: 'unlink',
		tooltip: 'Remove link',
		cmd: 'unlink',
		stateSelector: 'a[href]'
	});

	editor.addShortcut('Meta+K', '', createLinkList(showDialog));
	editor.addCommand('mceLink', createLinkList(showDialog));

	this.showDialog = showDialog;

	editor.addMenuItem('link', {
		icon: 'link',
		text: 'Insert/edit link',
		shortcut: 'Meta+K',
		onclick: createLinkList(showDialog),
		stateSelector: 'a[href]',
		context: 'insert',
		prependToContext: true
	});
});
