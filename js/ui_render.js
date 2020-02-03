/**
 * WebSlicer
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
function RenderEngine(canvas, stage) {
	var that     = this;
	var camera   = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 10, 3000 );
	var renderer = new THREE.WebGLRenderer({canvas:canvas});
	
	var backgroundColor = 0x999999;
	
	var raycaster = new THREE.Raycaster();

	var mouse = new THREE.Vector2();
				
	
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( backgroundColor );
	
	// Set up the controls
	camera.position.y =  100;
	camera.position.z = -350;

	//controls = new THREE.TrackballControls( camera, canvas );
    controls = new THREE.OrbitControls( camera, canvas );

	//controls.rotateSpeed = 1.0;
	//controls.zoomSpeed = 1.2;
	//controls.panSpeed = 0.8;

	//controls.noZoom = false;
	//controls.noPan = false;

	//controls.staticMoving = true;
	//controls.dynamicDampingFactor = 0.3;

	controls.keys = [ 65, 83, 68 ];
	
	// Animate loop for control
	function animate() {
		requestAnimationFrame( animate );
		controls.update();
	}
	
	this.render = function() {				
		// Mouse logic
		raycaster.setFromCamera( mouse, camera );
		stage.mousePicker(raycaster);
		
		// Render
		renderer.render( stage.getScene(camera.position), camera );
	}
	
	// Add event listeners
	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );

		controls.update();

		that.render();
	}
	
	function onDocumentMouseMove( event ) {
		event.preventDefault();

		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

	}

	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	window.addEventListener( 'resize', onWindowResize, false );
	controls.addEventListener( 'change', that.render );
	
	// Start animation and render initial frame
	animate();
	that.render();
}