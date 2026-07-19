import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js'; 
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.fog = new THREE.FogExp2(0x050510, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const boundary = 50; 
const boxGeometry = new THREE.BoxGeometry(boundary, boundary, boundary);
const boxEdges = new THREE.EdgesGeometry(boxGeometry);
const boxMaterial = new THREE.LineBasicMaterial({ color: 0x333355, transparent: true, opacity: 0.4 });
const boxWireframe = new THREE.LineSegments(boxEdges, boxMaterial);
scene.add(boxWireframe);

const starGeo = new THREE.BufferGeometry();
const starCount = 600;
const starPositions = new Float32Array(starCount * 3);
for(let i = 0; i < starCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 160;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({ color: 0x777799, size: 0.5 });
const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

const ambientLight = new THREE.AmbientLight(0x111133, 0.8);
scene.add(ambientLight);

const dirLight1 = new THREE.DirectionalLight(0x00ffcc, 0.9); // Luz principal turquesa
dirLight1.position.set(20, 40, 20);
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0xff007f, 0.5); // Luz de contra magenta
dirLight2.position.set(-20, -40, -20);
scene.add(dirLight2);

const boidsParams = {
    perceptionRadius: 6.0,
    maxSpeed: 0.25,
    maxForce: 0.015,
    separationWeight: 1.5,
    alignmentWeight: 1.0,
    cohesionWeight: 1.0,
    boundaryForce: 0.03
};

const gui = new GUI({ title: 'Configuración de Boids' });
gui.add(boidsParams, 'perceptionRadius', 2.0, 15.0).name('Radio Percepción');
gui.add(boidsParams, 'maxSpeed', 0.05, 0.6).name('Velocidad Máx');
gui.add(boidsParams, 'maxForce', 0.005, 0.05).name('Fuerza Máx');
gui.add(boidsParams, 'separationWeight', 0.0, 3.0).name('Peso Separación');
gui.add(boidsParams, 'alignmentWeight', 0.0, 3.0).name('Peso Alineación');
gui.add(boidsParams, 'cohesionWeight', 0.0, 3.0).name('Peso Cohesión');

const count = 250; 
const geometry = new THREE.ConeGeometry(0.4, 1.6, 5);
geometry.rotateX(Math.PI / 2); 

const phases = new Float32Array(count);
for (let i = 0; i < count; i++) {
    phases[i] = Math.random() * Math.PI * 2;
}
geometry.setAttribute('aInstancePhase', new THREE.InstancedBufferAttribute(phases, 1));

const customMaterial = new THREE.MeshPhongMaterial({
    color: 0x00ffcc,
    shininess: 40,
    flatShading: true
});

customMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };

    shader.vertexShader = `
        uniform float uTime;
        attribute float aInstancePhase;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float offset = sin(transformed.y * 5.0 + uTime * 12.0 + aInstancePhase) * 0.2;
        transformed.x += offset; 
        `
    );
    customMaterial.userData.shader = shader;
};

const instancedMesh = new THREE.InstancedMesh(geometry, customMaterial, count);
scene.add(instancedMesh);

const agents = [];
const dummy = new THREE.Object3D();

for (let i = 0; i < count; i++) {
    const position = new THREE.Vector3(
        (Math.random() - 0.5) * (boundary - 10),
        (Math.random() - 0.5) * (boundary - 10),
        (Math.random() - 0.5) * (boundary - 10)
    );
    
    const velocity = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
    ).normalize().multiplyScalar(boidsParams.maxSpeed);

    agents.push({
        position: position,
        velocity: velocity,
        acceleration: new THREE.Vector3()
    });
}

const clock = new THREE.Clock();

const scratchV1 = new THREE.Vector3();
const scratchV2 = new THREE.Vector3();
const steerAlign = new THREE.Vector3();
const steerCohesion = new THREE.Vector3();
const steerSeparation = new THREE.Vector3();
const targetLookAt = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);
    stats.begin();
    
    const elapsedTime = clock.getElapsedTime();
    if (customMaterial.userData.shader) {
        customMaterial.userData.shader.uniforms.uTime.value = elapsedTime;
    }

    const pRadius = boidsParams.perceptionRadius;
    const halfLimit = boundary / 2;

    for (let i = 0; i < count; i++) {
        const agentA = agents[i];
        
        steerAlign.set(0, 0, 0);
        steerCohesion.set(0, 0, 0);
        steerSeparation.set(0, 0, 0);
        
        let totalNeighbors = 0;

        for (let j = 0; j < count; j++) {
            if (i === j) continue;
            const agentB = agents[j];
            
            const dist = agentA.position.distanceTo(agentB.position);

            if (dist < pRadius && dist > 0) {
                steerAlign.add(agentB.velocity);
                steerCohesion.add(agentB.position);

                scratchV1.subVectors(agentA.position, agentB.position);
                scratchV1.divideScalar(dist * dist);
                steerSeparation.add(scratchV1);

                totalNeighbors++;
            }
        }

        if (totalNeighbors > 0) {
            steerAlign.divideScalar(totalNeighbors).setLength(boidsParams.maxSpeed).sub(agentA.velocity).clampLength(0, boidsParams.maxForce);

            steerCohesion.divideScalar(totalNeighbors).sub(agentA.position).setLength(boidsParams.maxSpeed).sub(agentA.velocity).clampLength(0, boidsParams.maxForce);
            
            steerSeparation.divideScalar(totalNeighbors).setLength(boidsParams.maxSpeed).sub(agentA.velocity).clampLength(0, boidsParams.maxForce);

            // Sumar fuerzas combinadas
            agentA.acceleration.addScaledVector(steerAlign, boidsParams.alignmentWeight);
            agentA.acceleration.addScaledVector(steerCohesion, boidsParams.cohesionWeight);
            agentA.acceleration.addScaledVector(steerSeparation, boidsParams.separationWeight);
        }
        if (Math.abs(agentA.position.x) > halfLimit) {
            scratchV2.set(-Math.sign(agentA.position.x) * boidsParams.maxSpeed, agentA.velocity.y, agentA.velocity.z);
            agentA.acceleration.add(scratchV2.sub(agentA.velocity).multiplyScalar(boidsParams.boundaryForce));
        }
        if (Math.abs(agentA.position.y) > halfLimit) {
            scratchV2.set(agentA.velocity.x, -Math.sign(agentA.position.y) * boidsParams.maxSpeed, agentA.velocity.z);
            agentA.acceleration.add(scratchV2.sub(agentA.velocity).multiplyScalar(boidsParams.boundaryForce));
        }
        if (Math.abs(agentA.position.z) > halfLimit) {
            scratchV2.set(agentA.velocity.x, agentA.velocity.y, -Math.sign(agentA.position.z) * boidsParams.maxSpeed);
            agentA.acceleration.add(scratchV2.sub(agentA.velocity).multiplyScalar(boidsParams.boundaryForce));
        }

        agentA.velocity.add(agentA.acceleration).clampLength(0, boidsParams.maxSpeed);
        agentA.position.add(agentA.velocity);
        agentA.acceleration.set(0, 0, 0);

        dummy.position.copy(agentA.position);
        targetLookAt.copy(agentA.position).add(agentA.velocity);
        dummy.lookAt(targetLookAt);
        dummy.updateMatrix();
        
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    
    boxWireframe.rotation.y = elapsedTime * 0.02;

    renderer.render(scene, camera);
    stats.end();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();