/**
 * WebSlicer
 * Copyright (C) 2016  Marcio Teixeira
 * Copyright (C) 2020  SynDaver Labs, Inc.
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
    var debugShadowLight = false;
    
    var mine     = this;
    var camera   = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 10, 3000 );
    var renderer = new THREE.WebGLRenderer({canvas:canvas});

    var backgroundColor = 0x757575;
    
    var raycaster = new THREE.Raycaster();

    var mouse = new THREE.Vector2();

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( backgroundColor );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    var scene = new THREE.Scene();
    scene.add(stage.getPrinterRepresentation());

    // Ambient light
    var ambientLight = new THREE.AmbientLight( 0x404040, 0.9 ); // soft white light
    scene.add( ambientLight );

    // Directional light (attached to the camera)
    directionalLight = new THREE.DirectionalLight( 0xffffff, 0.9 );
    camera.add( directionalLight );
    scene.add(camera);
    
    // For debugging: Show the shadow camera that is used to project
    // shadows on the build plane.
    if (debugShadowLight) {
        var helper = new THREE.CameraHelper( stage.shadowLight.shadow.camera );
        scene.add( helper );
    }

    // postprocessing

    var composer = new THREE.EffectComposer( renderer );

    var renderPass = new THREE.RenderPass( scene, camera );
    composer.addPass( renderPass );

    outlinePass = new THREE.OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    composer.addPass( outlinePass );

    outlinePass.edgeStrength  = 5;
    outlinePass.edgeThickness = 2;
    outlinePass.edgeGlow      = 0.5;

    // Set up the controls
    var eyeHeight = stage.printer.z_height / 2;
    camera.position.y = eyeHeight;
    camera.position.z = -600;

    var orbit = new THREE.OrbitControls( camera, canvas );
    orbit.keys = [ 65, 83, 68 ];
    orbit.target.set(0,eyeHeight,0);
    orbit.update();

    orbit.addEventListener( 'change', onViewChanged );

    var control = new THREE.TransformControls( camera, renderer.domElement );
    scene.add( control );
    control.addEventListener( 'change', render );
    control.addEventListener( 'dragging-changed', function ( event ) {
        orbit.enabled = ! event.value;
        if (!event.value) stage.onObjectTransformed();
    } );

    stage.setTransformControl(control);
    stage.render           = render;

    // https://stackoverflow.com/questions/41000983/using-transformcontrols-with-outlinepass-in-three-js?noredirect=1&lq=1
    // Fix for transform controls being updated in OutlinePass
    control.traverse((obj) => { // To be detected correctly by OutlinePass.
        obj.isTransformControls = true;
    });

    function render() {
        composer.render();
    }

    // Animate loop for control
    function animate() {
        requestAnimationFrame( animate );
        render();
    }

    // Add event listeners
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
        composer.setSize( window.innerWidth, window.innerHeight );

        orbit.update();
        render();
    }
    
    function onViewChanged( event ) {
        render();
        stage.onViewChanged();
    }

    function onDocumentMouseDown( event ) {
        raycaster.setFromCamera( mouse, camera );
        stage.onMouseDown(raycaster, scene);
    }

    function onDocumentMouseUp( event ) {
        raycaster.setFromCamera( mouse, camera );
        stage.onMouseUp(raycaster, scene);
    }

    function onDocumentMouseMove( event ) {
        event.preventDefault();

        mouse.x =   ( event.clientX / window.innerWidth )  * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }

    document.addEventListener( 'mousedown', onDocumentMouseDown, false );
    document.addEventListener( 'mouseup', onDocumentMouseUp, false );
    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    window.addEventListener( 'resize', onWindowResize, false );

    // Start animation and/or render initial frame
    //animate();
    render();
}