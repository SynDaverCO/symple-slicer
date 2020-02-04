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
    
    var scene = new THREE.Scene();
    scene.add(stage.getPrintVolume());
    
    // Ambient light
    var ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
    scene.add( ambientLight );

    // Directional light (attached to the camera)
    directionalLight = new THREE.DirectionalLight( 0xffffff, 1.0 );
    camera.add( directionalLight );
    scene.add(camera);
    
    // postprocessing    

    var composer = new THREE.EffectComposer( renderer );

    var renderPass = new THREE.RenderPass( scene, camera );
    composer.addPass( renderPass );

    outlinePass = new THREE.OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    composer.addPass( outlinePass );
    
    outlinePass.edgeStrength  = 10;
    outlinePass.edgeThickness = 2;
    outlinePass.edgeGlow      = 1;

    // Set up the controls
    camera.position.y =  100;
    camera.position.z = -350;

    var orbit = new THREE.OrbitControls( camera, canvas );
    orbit.keys = [ 65, 83, 68 ];
    orbit.addEventListener( 'change', that.render );
    
    var control = new THREE.TransformControls( camera, renderer.domElement );
    scene.add( control );
    control.addEventListener( 'change', function() {that.render()} );
    control.addEventListener( 'dragging-changed', function ( event ) {orbit.enabled = ! event.value;} );
    
    stage.transformControl = control;
    
    // Animate loop for control
    function animate() {
        requestAnimationFrame( animate );
        that.render();
    }
    
    this.render = function() {              
        // Mouse logic
        raycaster.setFromCamera( mouse, camera );
        stage.mousePicker(raycaster, scene);
        
        // Render
        composer.render();
    }
    
    // Add event listeners
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
        composer.setSize( window.innerWidth, window.innerHeight );

        orbit.update();
        that.render();
    }
    
    function onDocumentMouseMove( event ) {
        event.preventDefault();

        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    window.addEventListener( 'resize', onWindowResize, false );

    // Start animation and render initial frame
    animate();
}