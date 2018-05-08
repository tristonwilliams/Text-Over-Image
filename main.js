/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

var BlockSDK = __webpack_require__(1);

if (window.self === window.top) {
	document.body.innerText = 'This application is for use in the Salesforce Marketing Cloud Content Builder Editor only.';
} else {
	var toolbarOptions = [
		['bold', 'italic', 'underline', 'strike'],
		['blockquote', 'code-block'],
		[{ 'list': 'ordered'}, { 'list': 'bullet' }],
		[{ 'indent': '-1'}, { 'indent': '+1' }],
		[{ 'header': [1, 2, 3, 4, 5, 6, false] }],
		[{ 'color': [] }, { 'background': [] }],
		['clean'],
		['link', 'image', 'video'],
		['showHtml']
	];

	var quill = new Quill('#editor-container', {
	  modules: {
		toolbar: toolbarOptions
	  },
	  theme: 'snow'
	});

	var sdk = new BlockSDK(['blocktester.herokuapp.com', 'localhost', 'marketingcloudapps.com'], true);

	sdk.getContent(function (content) {
		quill.root.innerHTML = content;

		function saveText() {
			var html = quill.root.innerHTML;
			sdk.setContent(html);
			sdk.setSuperContent(html);

			sdk.getData(function (data) {
				var numberOfEdits = data.numberOfEdits || 0;
				sdk.setData({
					numberOfEdits: numberOfEdits + 1
				});
			});

			sdk.getCentralData(function (central) {
				var totalNumberOfEdits = central.totalNumberOfEdits || 0;
				sdk.setCentralData({
					totalNumberOfEdits: totalNumberOfEdits + 1
				});
			});
		}

		quill.on('text-change', saveText);
	});
}


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

/* 
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license. 
 * For full license text, see LICENSE.txt file in the repo root  or https://opensource.org/licenses/BSD-3-Clause
 */

var SDK = function (whitelistOverride, sslOverride) {

	// the custom block should verify it is being called from
	// the marketing cloud
	this._validateOrigin = function (origin) {
		// Make sure to escape periods since these strings are used in a regular expression
		var allowedDomains = whitelistOverride || ['marketingcloudapps\\.com', 'blocktester\\.herokuapp\\.com'];
		for (var i = 0; i < allowedDomains.length; i++) {
			// Makes the s optional in https
			var optionalSsl = sslOverride ? '?' : '';
			var whitelistRegex = new RegExp('^https' + optionalSsl + '://([a-zA-Z0-9-]+\\.)*' + allowedDomains[i] + '(:[0-9]+)?$', 'i');
			if (whitelistRegex.test(origin)) {
				return true;
			}
		}

		return false;
	};

	this._messageId = 1;
	this._messages = {
		0: function () {}
	};

	this._receiveMessage = function (message) {
		message = message || {};
		var data = message.data || {};
		if (data.method === 'handShake') {
			if (this._validateOrigin(data.origin)) {
				this._parentOrigin = data.origin;
				return;
			}
		}
		// if the message is not from the validated origin it gets ignored
		if (!this._parentOrigin || this._parentOrigin !== message.origin) {
			return;
		}
		// when the message has been received, we execute its callback
		(this._messages[data.id || 0] || function () {})(data.payload);
		delete this._messages[data.id];
	};

	window.addEventListener('message', this._receiveMessage.bind(this), false);

	this._postToEditor = function (payload, callback, ttl) {
		var self = this;
		// we only message up if we have
		// validated the origin
		if (!this._parentOrigin) {
			if (ttl === undefined || ttl > 0) {
				window.setTimeout(function () {
					self._postToEditor(payload, callback, (ttl || 5) - 1);
				}, 20);
			}
			return;
		}
		this._messages[this._messageId] = callback;
		payload.id = this._messageId;
		this._messageId += 1;
		// the actual postMessage always uses
		// the validated origin
		window.parent.postMessage(payload, this._parentOrigin);
	};

	this.getContent = function (cb) {
		this._postToEditor({
			method: 'getContent'
		}, cb);
	};

	this.setContent = function (content, cb) {
		this._postToEditor({
			method: 'setContent',
			payload: content
		}, cb);
	};

	this.setSuperContent = function (content, cb) {
		this._postToEditor({
			method: 'setSuperContent',
			payload: content
		}, cb);
	};

	this.getData = function (cb) {
		this._postToEditor({
			method: 'getData'
		}, cb);
	};

	this.setData = function (dataObj, cb) {
		this._postToEditor({
			method: 'setData',
			payload: dataObj
		}, cb);
	};

	this.getCentralData = function (cb) {
		this._postToEditor({
			method: 'getCentralData'
		}, cb);
	};

	this.setCentralData = function (dataObj, cb) {
		this._postToEditor({
			method: 'setCentralData',
			payload: dataObj
		}, cb);
	};

	window.parent.postMessage({
		method: 'handShake',
		origin: window.location.origin
	}, '*');
};

if (typeof(window) === 'object') {
	window.sfdc = window.sfdc || {};
	window.sfdc.BlockSDK = SDK;
}
if (true) {
	module.exports = SDK;
}


/***/ })
/******/ ]);
