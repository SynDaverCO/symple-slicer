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

        this.renderer = new THREE.WebGLRenderer({canvas:canvas});
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.setClearColor( backgroundColor );
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        var camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 10, 3000 );
        this.camera = camera;
        this.camera.position.set(0,0,-600);

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

        this.composer = new THREE.EffectComposer( this.renderer );

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

        var control = new THREE.TransformControls( camera, this.renderer.domElement );
        scene.add( control );

        stage.selection.setTransformControl(control);
        stage.selection.setViewControl(this.orbit);

        // Animate loop for control
        function animate() {
            requestAnimationFrame( animate );
            render();
        }

        // Add event listeners

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            mine.renderer.setSize( window.innerWidth, window.innerHeight );
            mine.composer.setSize( window.innerWidth, window.innerHeight );

            mine.orbit.update();
            mine.render();
        }

        function onViewChanged( event ) {
            mine.render();
            stage.onViewChanged();

            const az = mine.orbit.getAzimuthalAngle() / Math.PI * 180;
            const po = mine.orbit.getPolarAngle()     / Math.PI * 180;
            navCube.update(po - 80, 180 - az,0);
        }

        function onMouseDown( event ) {
            raycaster.setFromCamera( mouse, camera );
            stage.onMouseDown(raycaster, scene, event);
        }

        function onMouseUp( event ) {
            raycaster.setFromCamera( mouse, camera );
            stage.onMouseUp(raycaster, scene, event);
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
    }

    setView(view) {
        const size = stage.printVolume.getSize(new THREE.Vector3());
        const y = size.y / 2;
        switch(view) {
            case "left":   this.camera.position.set(  600,    y,    0); break;
            case "right":  this.camera.position.set( -600,    y,    0); break;
            case "back":   this.camera.position.set(    0,    y,  600); break;
            case "top":    this.camera.position.set(    0,  600,   -1); break;
            case "bottom": this.camera.position.set(    0, -600,   -1); break;
            case "front":  this.camera.position.set(    0,    y, -600); break;
        }
        const topOrBottom = view == "top" || view == "bottom";
        this.fitInView(size);
        this.centerOnScreen(0, size.y / 2, 0, topOrBottom ? 0.5 : 0.4, 0.5);
        this.render();
    }

    applyStyleSheetColors() {
        const backgroundColor = getColorValueFromElement("#print_volume", 'background-color');
        const glow1 = getColorFloatArrayFromElement("#stl_glow", 'color');
        const glow2 = getColorFloatArrayFromElement("#stl_glow", 'background-color');
        this.outlinePass.visibleEdgeColor = new THREE.Color(glow1[0], glow1[1], glow1[2]);
        this.outlinePass.hiddenEdgeColor = new THREE.Color(glow2[0], glow2[1], glow2[2]);
        this.renderer.setClearColor(backgroundColor);
        this.render();
    }

    /**
     * Translates the coordinate system so that a point in 3D projects to the
     * exact center of the screen. If cx or cy are provided, the exact point
     * can be specified.
     */
    centerOnScreen(x, y, z, cx = 0.5, cy = 0.5) {
        this.camera.clearViewOffset();

        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();

        // get the normalized screen coordinate of that position
        // x and y will be in the -1 to +1 range with x = -1 being
        // on the left and y = -1 being on the bottom
        var position = new THREE.Vector3(x, y, z);
        position.project(this.camera);

        // convert the normalized position to CSS coordinates
        var w = canvas.clientWidth;
        var h = canvas.clientHeight;

        x = (position.x *  .5 + .5) * w;
        y = (position.y * -.5 + .5) * h;

        var offset_x = x - w * cx;
        var offset_y = y - h * cy;

        this.camera.setViewOffset(w, h, offset_x, offset_y, w, h);
    }

    /**
     * Adjusts the viewpoint such that a particularly sized volume fits on the screen.
     */
    fitInView(size) {
        // Back away the camera so the entire print volume fits on the screen
        const maxDim = Math.max( size.x, size.y, size.z );
        const fov = this.camera.fov * (Math.PI / 180);
        const offset = 1.25;
        const distance = Math.abs( maxDim / 2 / Math.tan( fov / 2 ) ) * offset + maxDim/2;
        this.camera.position.setLength(distance);

        // Look at the origin
        this.orbit.target.set(0,10,0);
        this.orbit.update();
    }

    render() {
        this.composer.render();
    }
}