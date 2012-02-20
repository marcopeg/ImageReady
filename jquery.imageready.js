/**
 * jQuery ImageReady
 *
 * It check images to be loaded.
 * It work by checking each image in a stack throwing success or error callback.
 *
 * $('img').imageReady(function(){
 *   alert("All images in document are loaded!");
 * });
 *
 *
 * 
 * Open source under the BSD license
 *
 * Copyright (c) 2012, Marco Pegoraro
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 * 
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *   - Redistributions in binary form must reproduce the above 
 *     copyright notice, this list of conditions and the following 
 *     disclaimer in the documentation and/or other materials provided 
 *     with the distribution.
 *   - Neither the name of the author nor the names of its contributors 
 *     may be used to endorse or promote products derived from this 
 *     software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 * POSSIBILITY OF SUCH DAMAGE.
 */

;(function($) {
	
	
	/**
	 * Plugin's Global Configuration
	 */
	$.imageReady = {
		version: '1.0',
		defaults: {
			
			// MODE:
			// "each" = (default) images in the stack are checked one by one.
			// success() and onError() callbacks are applied to each image.
			// onError() callback is throwed when the "imageTimeout" happen.
			//
			// "all"
			// all images in the stack have to be loaded with success to throw the success() callback.
			// onError() callback is throwed when "stackTimeout" happen.
			// you can provide other callbacks that are applied to each image under the stack:
			// - stepSuccess()
			// - stepOnError
			// these callbacks works as the global callbacks in "each" mode.
			//			
			mode: 			'EACH',
			
			
			// Timing properties:
			step: 			50,			// interval between image check step - milliseconds
			timeout: 		5000,		// single image check timeout
			stackTimeout: 	'auto',		// stack timeout. the auto mode will calculate a stackTimeout based
										// upon the imageTimeout and the number of images in the stack
			
			// Some CSS classes to be applied during the checking cycle.
			checkingClass:	'imageready-checking',
			successClass:	'imageready-success',
			errorClass:		'imageready-error',
			
			
			// Callbacks.
			success: 		function( cfg ) {},
			onError: 		function( cfg ) {},
			stepSuccess:	function( cfg, stack ) {},
			stepOnError:	function( cfg, stack ) {},
			
			
			
			// Internal properties
			_elapsed:0,
			_timeout:null
			
		}
	};
	
	
	
	
	
	
	/**
	 * jQuery Extension
	 */
	$.fn.imageReady = function() {
		
		// Proprietˆ di configurazione interna.
		var cfg = $.extend({},{},$.imageReady.defaults);
		
		// Extends configuration with an object
		if ( arguments.length && $.isPlainObject(arguments[0]) ) {
		
			cfg = $.extend({},cfg,arguments[0]);
		
		}
		
		// Extends configuration with a simple success callback.
		if ( arguments.length && (typeof arguments[0]) == "function" ) {
			
			cfg = $.extend({},cfg,{
				success: arguments[0]
			});
		
		}
		
		
		// Assign checking class to all images in the stack.
		$(this).addClass( cfg.checkingClass );
		
		switch ( cfg.mode.toLowerCase() ) {
			
			// Single image check
			case 'each':
				
				cfg._elapsed = 0;
				
				$(this).each(function(){ __checkImage.call( this, $.extend({},{},cfg) ); });
				
				break;
				
			// Image stack check, async
			case 'all':
				
				var _this			= this;
				var _errorTimeout 	= false;
				var _count	 		= this.length;
				
				// Setup new config properties to collect info about success images and images with errors.
				cfg.complete		= [];
				cfg.errors			= [];
				
				// Set up the auto stack timeout based on total images timeout.
				// here we can look for a better way to estimate a concrete timeout!
				if ( cfg.stackTimeout == 'auto' ) cfg.stackTimeout = cfg.timeout + (cfg.timeout/100 * this.length * 10);
				
				
				// Set up a single image check configuration with callbacks that handles the global control
				// by decreasing the total number of remaining images.
				var localCfg = $.extend({},cfg,{
					
					success: function( localCfg ) {
						
						_count--;
						
						cfg.complete.push( this );
						
						// Step success callback
						cfg.stepSuccess.call( this, cfg, _this );
						
						
						// Timeout happens!
						if ( _count <= 0 || (cfg.complete.length + cfg.errors.length) >= _this.length ) {
							
							clearTimeout(_errorTimeout);
							
							cfg.success.call( _this, cfg );
						}
						
					},
					
					onError: function(){ 
						
						cfg.errors.push(this); 
						
						// Step onError callback
						cfg.stepOnError.call( this, cfg, _this );
						
						
						// Timeout happens!
						if ( _count <= 0 || (cfg.complete.length + cfg.errors.length) >= _this.length ) {
							
							clearTimeout(_errorTimeout);
							
							cfg.onError.call( _this, cfg );
						}
						
					}
					
				});
				
				
				// Launch a single image check on each image in the stack.
				// Each function's configuration must be extended from the global object to prevent
				// sharing internal properties like "timeout" that fails global functionality.
				$(this).each(function(){ __checkImage.call( this, $.extend({},{},localCfg) ); });
				
				
				// Setup the "onError" check across multiple images.
				_errorTimeout = setTimeout(function(){
					
					cfg.onError.call( _this, cfg );
				
				},cfg.stackTimeout);
				
				
				break;
		
		}
		
		
		// Return the plugin's stack to other plugins.
		return this;
		
	
	} // EndOf: "$.fn.imageReady()" ###
	
	
	
	
	
	/**
	 * Will check a single image for loading.
	 */
	var __checkImage = function( cfg ) {
		
		var img = $(this)[0];
		
		// Check for complete status
		// http://www.sajithmr.me/javascript-check-an-image-is-loaded-or-not
		var complete = img.complete;
		if (typeof img.naturalWidth != "undefined" && img.naturalWidth == 0) complete = false;
		
		if ( complete ) {
			
			if ( cfg._timeout ) clearTimeout(cfg._timeout);
			
			// Apply success class
			$(this).removeClass(cfg.checkingClass).addClass(cfg.successClass);
			
			// Apply success callback
			cfg.success.call( this, cfg );
			
			return;
			
		}
		
		// Check for timeout happens
		
		if ( cfg._elapsed >= cfg.timeout ) {
			
			if ( cfg._timeout ) clearTimeout(cfg._timeout);
			
			// Apply error class
			$(this).removeClass(cfg.checkingClass).addClass(cfg.errorClass);
			
			// Apply error callback
			cfg.onError.call( this, cfg );
			
			return;
		
		}
		
		// Step
		var _this = this;
		
		cfg._timeout = setTimeout(function(){
			
			cfg._elapsed += cfg.step;
			
			__checkImage.call( _this, cfg );
			
		}, cfg.step );
	
	}; // EndOf: "__checkImage()" ###
	
	
	
})(jQuery);