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
class RenderLoop {
    constructor(canvas, stage) {
        var mine = this;
        
        var debugShadowLight = false;
        var backgroundColor = 0x757575;

        var renderer = new THREE.WebGLRenderer({canvas:canvas});
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.setClearColor( backgroundColor );
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        var camera   = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 10, 3000 );
        camera.position.z = -600;
        this.camera = camera;

        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();
        var scene = new THREE.Scene();
        scene.add(stage.getPrinterRepresentation());

        // Ambient light
        var ambientLight = new THREE.AmbientLight( 0x404040, 0.9 ); // soft white light
        scene.add( ambientLight );

        // Directional light (attached to the camera)
        var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.9 );
        camera.add(directionalLight);
        scene.add(camera);
        
        // For debugging: Show the shadow camera that is used to project
        // shadows on the build plane.
        if (debugShadowLight) {
            var helper = new THREE.CameraHelper( stage.shadowLight.shadow.camera );
            scene.add( helper );
        }

        // postprocessing

        this.composer = new THREE.EffectComposer( renderer );

        var renderPass = new THREE.RenderPass( scene, camera );
        this.composer.addPass( renderPass );

        this.outlinePass = new THREE.OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
        this.composer.addPass( this.outlinePass );

        this.outlinePass.edgeStrength  = 5;
        this.outlinePass.edgeThickness = 2;
        this.outlinePass.edgeGlow      = 0.5;

        // Set up the controls

        this.orbit = new THREE.OrbitControls( camera, canvas );
        this.orbit.addEventListener( 'change', onViewChanged );
        this.orbit.screenSpacePanning = true;

        var control = new THREE.TransformControls( camera, renderer.domElement );
        scene.add( control );
        control.addEventListener( 'change', this.render.bind(this) );
        control.addEventListener( 'dragging-changed', event => {
            this.orbit.enabled = ! event.value;
            if (!event.value) stage.onObjectTransformed();
        } );

        stage.setTransformControl(control);

        // https://stackoverflow.com/questions/41000983/using-transformcontrols-with-outlinepass-in-three-js?noredirect=1&lq=1
        // Fix for transform controls being updated in OutlinePass
        control.traverse((obj) => { // To be detected correctly by OutlinePass.
            obj.isTransformControls = true;
        });

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
            mine.composer.setSize( window.innerWidth, window.innerHeight );

            mine.orbit.update();
            mine.render();
        }
        
        function onViewChanged( event ) {
            mine.render();
            stage.onViewChanged();
        }

        function onMouseDown( event ) {
            raycaster.setFromCamera( mouse, camera );
            stage.onMouseDown(raycaster, scene);
        }

        function onMouseUp( event ) {
            raycaster.setFromCamera( mouse, camera );
            stage.onMouseUp(raycaster, scene);
        }

        function onMouseMove( event ) {
            event.preventDefault();

            mouse.x =   ( event.clientX / window.innerWidth )  * 2 - 1;
            mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        }

        canvas.addEventListener( 'mousedown', onMouseDown, false );
        canvas.addEventListener( 'mouseup', onMouseUp, false );
        canvas.addEventListener( 'mousemove', onMouseMove, false );
        window.addEventListener( 'resize', onWindowResize, false );

        // Start animation and/or render initial frame
        //animate();
        this.render();
    }
    
    setEyeLevel(eyeHeight) {
        this.camera.position.y = eyeHeight;
        this.orbit.target.set(0,eyeHeight,0);
        this.orbit.update();
    }

    render() {
        this.composer.render();
    }
}