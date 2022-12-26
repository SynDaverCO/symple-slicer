/**
 * WebSlicer
 * Copyright (C) 2021  SynDaver 3D
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

/** References:
 *    https://github.com/Fyrestar/THREE.extendMaterial
 *    https://discourse.threejs.org/t/update-material-uniforms/8141
 */

export class OverhangShader {
    static patchMaterial(material) {
        const shaderPatch = {
            class: THREE.ShaderMaterial,
            header:`
                uniform float overhangAngle;
                uniform vec3  overhangColor;
                uniform vec3  bedNormal;`,
            fragment: {
                 // Replace:
                 '@vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;':
                 // With:
                 `
                 vec3 _outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
                 float overhang = degrees(acos(dot(normalize(normal), bedNormal))) - 90.0;
                 vec3 outgoingLight = (overhang > overhangAngle) ? overhangColor : _outgoingLight;
                 `
            }
        };

        material.onBeforeCompile = (shader, render) => {
            //console.log(shader);
            if (OverhangShader.enabled) THREE.patchShader(shader, shaderPatch);
            shader.uniforms.overhangAngle = OverhangShader.userData.overhangAngle;
            shader.uniforms.overhangColor = OverhangShader.userData.overhangColor;
            shader.uniforms.bedNormal     = OverhangShader.userData.bedNormal;
        };
        material.customProgramCacheKey = () => OverhangShader.enabled ? '1' : '0';
        OverhangShader.materials.push(material);
        return material;
    }

    static onViewChanged(camera) {
        const origin = new THREE.Vector3(0,0,0);
        const upVector = new THREE.Vector3(0,1,0);
        origin.applyMatrix4(camera.matrixWorldInverse);
        upVector.applyMatrix4(camera.matrixWorldInverse);
        upVector.sub(origin);
        OverhangShader.userData.bedNormal.value.copy(upVector);
    }

    static setAngle(angle) {
        OverhangShader.userData.overhangAngle.value = angle;
    }

    static showOverhang(enable) {
        OverhangShader.enabled = enable;
        OverhangShader.materials.forEach(m => m.needsUpdate = true);
        renderLoop.render();
    }
}

OverhangShader.userData = {
    overhangAngle: {value: 91},
    overhangColor: {value: new THREE.Vector3(1,0,0)},
    bedNormal:     {value: new THREE.Vector3(0,1,0)},
};
OverhangShader.enabled = false;
OverhangShader.materials = [];