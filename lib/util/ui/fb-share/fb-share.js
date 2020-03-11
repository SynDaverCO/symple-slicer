/**
 * FaceBook Sharing Widget
 * Copyright (C) 2016 Marcio Teixeira
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

/* Dynamically load a css or js object
 * 
 * Examples:
 *    loadResource("myscript.js")
 *    loadResource("mystyle.css")
 *
 *  Reference:
 *    http://www.javascriptkit.com/javatutors/loadjavascriptcss.shtml
 */
function loadResource(filename, async){
	if (endsWith(filename, ".js") || endsWith(filename, ".js.gz")){
		//if filename is a external JavaScript file
		var fileref = document.createElement('script')
		fileref.setAttribute("type","text/javascript")
		fileref.setAttribute("src", filename)
		if(async) {
			fileref.setAttribute("async", "async")
		}
	} else if (endsWith(filename, ".css") || endsWith(filename, ".css.gz")) {
		//if filename is an external CSS file
		var fileref = document.createElement("link")
		fileref.setAttribute("rel", "stylesheet")
		fileref.setAttribute("type", "text/css")
		fileref.setAttribute("href", filename)
	}
	if (typeof fileref != "undefined") {
		document.getElementsByTagName("head")[0].appendChild(fileref)
	}
}

class FacebookShareUI {
	constructor(fbAppId) {
		this.fbAppId = fbAppId;
	}
	
	appendToDom() {
		$("<div>").appendTo("body").load( "/lib/ui/fb-share/fb-share.html" );
		this.loadFacebookSDK();
	}
	
	loadFacebookSDK() {
		var that = this;
		// Add the Facebook API to the page
		var id = "facebook-jssdk";
		if(!document.getElementById(id)){
			window.fbAsyncInit = function() {
				FB.init({
					appId      : that.fbAppId,
					xfbml      : true,
					version    : 'v2.0'
				});
				// Put additional init code here
			};
			$("<script>").prependTo("body").attr("id", id).attr("src", "//connect.facebook.net/en_US/sdk.js");
		}
	}
	
	attachToButton(id) {
		var that = this;
		$(id).click(function() {that.showPostPreviewDialog()});
	}
	
	/* Sets the canvas from which the image is copied. The renderCallback
	 * is called just prior to capturing the image data (this is required
	 * for capturing webgl screenshots)
	 */
	setSourceCanvas(id, renderCallback) {
		this.sourceCanvas   = $(id)[0];
		this.renderCallback = renderCallback;
	}
	
	showPostPreviewDialog() {
		$("#facebookSharingPreview").toggle();
		
		// Capture a snapshot and write a preview image into the dialog box
		this.captureCanvasSnapshot();
		var destCanvas = $("#facebookSharingPreview canvas")[0];
		var ctx = destCanvas.getContext('2d');
		ctx.clearRect(0, 0, destCanvas.width, destCanvas.height);
		ctx.drawImage(this.sourceCanvas, 0, 0, destCanvas.width, destCanvas.height);
		
		// Setup actions for Post and Cancel buttons
		var that = this;
		$("#facebookSharingPreview button[name='post']").click(function() {
			$("#facebookSharingPreview").toggle(false);
			that.showSharingPermissionDialog();
		});
		$("#facebookSharingPreview button[name='cancel']").click(function() {
			$("#facebookSharingPreview").toggle(false);
		});
	}
	
	showSharingPermissionDialog() {
		console.log("Setting up buttons");
				
		var that = this;
		$("#facebookPublishPermission button[name='next']").click(function() {
				$("#facebookPublishPermission").toggle(false);
			that.facebookLogin(function() {that.nextButtonClicked()});
		});
		$("#facebookPublishPermission button[name='cancel']").click(function() {
			$("#facebookPublishPermission").toggle(false);
		});
		$("#facebookPublishPermission").toggle();
	}

	nextButtonClicked() {
		var accessToken = FB.getAuthResponse().accessToken;
		var targetID    = FB.getAuthResponse().userID;
		var caption = $("#facebookSharingPreview textarea").val();
		FacebookShareUI.postToAlbum(accessToken, targetID, this.data_url, caption, function(){});
	}
	
	captureCanvasSnapshot() {
		if(this.renderCallback) {
			this.renderCallback();
		}
		this.data_url = this.sourceCanvas.toDataURL();
	}

	/* Logs in to Facebook and then calls the callback function */
	facebookLogin(callback) {
		FB.login(function(response) {
			if (response.authResponse) {
				console.log('Login granted');
				callback();
			} else {
				console.log('User cancelled login or did not fully authorize.');
			}
		},
			{scope: 'publish_actions'}
		);
	}
	
	/*
	 * Code snippet to post a HTML5 Canvas image to Facebook
	 * H. Nagata
	 *
	 * Variables:
	 *   accessToken: Facebook access token
	 *   targetID: Posting target id such as user id or album id
	 *   canvas: HTMLCanvasElement
	 *   base64.decode: c.f. https://github.com/hnagata/js-base64
	 *
	 * It won't work in IE9 since using ArrayBuffer/FormData/Blob.
	 *
	 *   https://gist.github.com/hnagata/9484200#file-postcanvas-js
	 */
	static postToAlbum(accessToken, targetID, data_url, caption, callback) {
		// Convert canvas into binary data
		/*var data_url = canvas.toDataURL();*/
		var mime = data_url.slice(data_url.indexOf(":") + 1, data_url.indexOf(";"));
		var data = base64.decode(data_url.slice(data_url.indexOf(",") + 1));

		// Construct FormData
		var fd = new FormData();
		fd.append("access_token", accessToken);
		fd.append("source", new Blob([data], {type: mime}));
	
		// And append some fields, such as "message" and "privacy"
		fd.append("caption", caption);

		// POST
		var req = new XMLHttpRequest();
		req.open("POST", "https://graph.facebook.com/" + targetID + "/photos");
		if(callback) {
			req.onreadystatechange = function() {
				if (req.readyState == 4 && req.status == 200) {
					var data = JSON.parse(req.responseText);
					callback(data.id, data.post_id);
				}
			}
		}
		req.send(fd);
	}
}

/*
* js-base64
* https://github.com/hnagata/js-base64
* Copyright (c) 2014 H. Nagata
* Licensed under the MIT license.
* 
* This program is based on base64-arraybuffer. 
* https://github.com/niklasvh/base64-arraybuffer	
* Copyright (c) 2012 Niklas von Hertzen
* Licensed under the MIT license.
*/

var base64 = base64 || (function() {
	var chars = 
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

	function encode(bytes) {
		var i, len = bytes.byteLength, base64 = "", b1, b2, b3;
		for (i = 0; i < len; i += 3) {
			b1 = bytes[i];
			b2 = bytes[i + 1];
			b3 = bytes[i + 2];
			base64 += chars[b1 >> 2];
			base64 += chars[(b1 & 0x03) << 4 | b2 >> 4];
			base64 += chars[(b2 & 0x0F) << 2 | b3 >> 6];
			base64 += chars[b3 & 0x3F];
		}
		if (len % 3 == 2) {
			base64 = base64.substring(0, base64.length - 1) + "=";
		} else if (len % 3 == 1) {
			base64 = base64.substring(0, base64.length - 2) + "==";
		}
		return base64;
	}

	function decode(base64) {
		var byteLength = base64.length * 0.75,
		len = base64.length, i, p = 0, c1, c2, c3, c4;
		if (base64[base64.length - 1] === "=") {
			--byteLength;
			if (base64[base64.length - 2] === "=") {
				--byteLength;
			}
		}
		var bytes = new Uint8Array(byteLength);
		for (i = 0; i < len; i += 4) {
			c1 = chars.indexOf(base64[i]);
			c2 = chars.indexOf(base64[i + 1]);
			c3 = chars.indexOf(base64[i + 2]);
			c4 = chars.indexOf(base64[i + 3]);
			if (c1 >= 0xC0 || c2 >= 0xC0 || c3 >= 0xC0 || c4 >= 0xC0) {
				throw "Illegal base64 character";
			}
			bytes[p++] = (c1 << 2) | (c2 >> 4);
			bytes[p++] = ((c2 & 0x0F) << 4) | (c3 >> 2);
			bytes[p++] = ((c3 & 0x03) << 6) | (c4 & 0x3F);
		}
		return bytes;
	}

	return {
		encode: encode,
		decode: decode
	};
})();