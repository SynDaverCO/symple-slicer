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

function PrintableObject(geometry) {

    var mine = this;
    
    var RenderStyles = Object.freeze({
        "volume" : 1,
        "slices" : 2
    });
    
    var position = new THREE.Vector3();
    var renderStyle = RenderStyles.volume;
    var paths;
    
    this.selected = false;
    
    var material = new THREE.MeshLambertMaterial( { color: 0xffff00 } );
    
    // Initialze things
    geometry.computeBoundingBox();
    geometry.computeFaceNormals();
    geometry.mergeVertices();
    
    // The convex hull is necessary to allow 
    var convex_hull = new THREE.ConvexGeometry( geometry.vertices );
    
    function getSceneObjectFromGeometry(geometry, material) {
        //return new THREE.Mesh(geometry, material);
        return new THREE.Mesh(convex_hull, material);
    }
    
    function renderPathsToGeometry(geometry, paths, z, hue) {
        SlicerOps.forEachSegment(paths, function(start,end) {
            geometry.vertices.push(
                new THREE.Vector3(start.x, start.y, z),
                new THREE.Vector3(end.x,   end.y,   z)
            );
            
            // Compute the edge color
            var a = Math.atan2(start.y, start.x);
            a = Math.sin(a) /4 + 0.5;
            
            var color = new THREE.Color(0xFFFFFF);
            color.setHSL(hue,1,a);
            geometry.colors.push(color);
            geometry.colors.push(color);
        });
    }
    
    function getSceneObjectFromSlices(slices) {
        var geometry = new THREE.Geometry();
        
        for( i = 0; i < slices.length; i++) {
            //renderPathsToGeometry(geometry, slices[i].outer_shell, slices[i].z, 0.5);
            for( j = 0; j < slices[i].inner_shell.length; j++) {
                renderPathsToGeometry(geometry, slices[i].inner_shell[j], slices[i].z, 0.3);
            }
            //renderPathsToGeometry(geometry, slices[i].infill, slices[i].z, 0.9);
        }
        
        var material = new THREE.LineBasicMaterial( {
            opacity:1.0,
            linewidth: 1.0,
            vertexColors: THREE.VertexColors} );
        return new THREE.LineSegments(geometry, material);      
    }
        
    this.getTHREESceneObject = function() {
        if(renderStyle === RenderStyles.volume) {
            mine.object = getSceneObjectFromGeometry(geometry, material);
        } else {
            mine.object = getSceneObjectFromSlices(slices);
        }
        mine.object.position.copy(position);
        return mine.object;
    }
    
    this.getBoundingBox = function () {
        return geometry.boundingBox;
    }
    
    this.setPosition = function (x, y, z) {
        position.set(x,y,z);
    }
    
    this.getPosition = function() {
        return position;
    }
    
    this.getGeometry = function() {
        return geometry;
    }
    
    this.sliceObject = function() {
        var slicer = new MeshSlicer(geometry);
        //slicer.setGeometry(geometry);
        slices = slicer.getSlices();
        renderStyle = RenderStyles.slices;
    }
    
    this.setSelected = function(isSelected) {
        mine.selected = isSelected;
        mine.object.material.color.set( 0xff0000 );
    }
}