// Import de Three.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Import des shaders
import { edgeVertexShader, edgeFragmentShader, progress } from './shaders.js';
import { skyVertexShader, skyFragmentShader } from './skyShader.js';

// Variables globales pour les animations
let modelGroup; // Groupe contenant tout le modèle
let meshes = []; // Tableau pour stocker les meshes
let edgeMeshes = []; // Tableau pour stocker les meshes d'arêtes
let animationProgress = 0; // Variable pour contrôler la progression de l'animation
let modelBounds = { minY: 0, maxY: 0 }; // Limites du modèle
let animationStarted = false; // Flag pour contrôler le démarrage de l'animation
let mouseX = 0; // Position X de la souris
let mouseY = 0; // Position Y de la souris
let targetRotationY = 0; // Rotation Y cible
let currentRotationY = 0; // Rotation Y actuelle
let modelOpacity = 1; // Opacité du modèle
let targetModelOpacity = 1; // Opacité cible du modèle

// Initialisation de la scène
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Position de la caméra
camera.position.set(-9.5, -12.10, 15.70);
camera.lookAt(-2, -10, 0);

// Ajout d'une lumière
const light = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light);

// Ajout de plusieurs lumières directionnelles pour un meilleur éclairage
const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight1.position.set(1, 1, 1);
scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight2.position.set(-1, 1, -1);
scene.add(directionalLight2);

const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight3.position.set(0, -1, 0);
scene.add(directionalLight3);

// Ajout d'une lumière hémisphérique pour l'ambiance
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
scene.add(hemiLight);

// Création du matériau pour les arêtes avec shader
const edgeMaterial = new THREE.ShaderMaterial({
    uniforms: {
        progress: { value: 0 },
        minY: { value: 0 },
        maxY: { value: 0 },
        depthInfluence: { value: 1.0 }
    },
    vertexShader: edgeVertexShader,
    fragmentShader: edgeFragmentShader,
    transparent: true
});

// Création du ciel étoilé
const skyGeometry = new THREE.PlaneGeometry(100, 100);
const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 }
    },
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
sky.position.z = -50;
scene.add(sky);

// Chargement du modèle GLB
const loader = new GLTFLoader();
loader.load(
    'reconstitution.glb',
    function (gltf) {
        modelGroup = gltf.scene;
        
        // Calculer les limites du modèle
        const box = new THREE.Box3().setFromObject(gltf.scene);
        modelBounds.minY = box.min.y;
        modelBounds.maxY = box.max.y;
        
        // Mettre à jour les uniforms du shader avec les limites du modèle
        edgeMaterial.uniforms.minY.value = modelBounds.minY;
        edgeMaterial.uniforms.maxY.value = modelBounds.maxY;
        
        // Appliquer le mode wireframe à tous les meshes du modèle
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 15);
                const edgesMesh = new THREE.LineSegments(edgesGeometry, edgeMaterial.clone());
                
                edgesMesh.position.copy(child.position);
                edgesMesh.rotation.copy(child.rotation);
                edgesMesh.scale.copy(child.scale);
                
                child.material.transparent = false;
                child.material.opacity = 1;
                child.material.color.setHex(0x808080);
                
                meshes.push(child);
                edgeMeshes.push(edgesMesh);
                
                child.parent.add(edgesMesh);
            }
        });
        
        scene.add(gltf.scene);
        
        // Centrer le modèle
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(center);
        
        // Ajuster la caméra pour voir tout le modèle
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
        
        camera.updateProjectionMatrix();

        // Appliquer le zoom x4
        if (modelGroup) {
            modelGroup.scale.set(0.85, 0.85, 0.85);
        }

        // Démarrer l'animation après un délai
        setTimeout(() => {
            animationStarted = true;
        }, 400);
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% chargé');
    },
    function (error) {
        console.error('Erreur lors du chargement du modèle:', error);
    }
);

// Gestion du redimensionnement de la fenêtre
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Gestion des événements de la souris et du gyroscope
let isMobile = window.innerWidth <= 768;

if (isMobile) {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        document.addEventListener('click', async () => {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            } catch (error) {
                console.error('Erreur d\'accès au gyroscope:', error);
            }
        }, { once: true });
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
} else {
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = (event.clientY / window.innerHeight) * 2 - 1;
        targetRotationY = -mouseX * 0.02;
    });
}

function handleOrientation(event) {
    let x = event.beta;
    let y = event.gamma;
    targetRotationY = (y / 90) * 0.5;
}

// Création de la lanterne avec des paramètres d'atténuation plus réalistes
const lanternLight = new THREE.PointLight(0xffaa00, 2, 17.6);
lanternLight.position.set(-20, -12.1, -5.9);
// Configuration de l'atténuation pour un effet plus réaliste
lanternLight.decay = 2; // Atténuation quadratique
lanternLight.distance = 17.6; // Distance maximale d'éclairage
scene.add(lanternLight);

// Variables pour l'animation de la lanterne
let lanternStartPos = new THREE.Vector3(-20, -12.1, -5.9);
let lanternEndPos = new THREE.Vector3(20, -12.1, -5.9);
let lanternAnimationProgress = 0;
let lanternAnimationSpeed = 0.001; // Vitesse de déplacement

// Variables pour l'effet de flamme
let flameTime = 0;
const flameSpeed = 0.05;
const flameIntensity = 0.5; // Variation d'intensité
const baseIntensity = 2; // Intensité de base

// Animation
function animate() {
    requestAnimationFrame(animate);
    
    // Mise à jour du temps pour le ciel étoilé
    skyMaterial.uniforms.time.value += 0.01;
    
    if (animationStarted && animationProgress < 1) {
        animationProgress += 0.0025;
        edgeMeshes.forEach(mesh => {
            mesh.material.uniforms.progress.value = animationProgress;
        });
    }

    // Animation de la lanterne
    if (lanternAnimationProgress < 1) {
        lanternAnimationProgress += lanternAnimationSpeed;
        const currentPos = new THREE.Vector3();
        currentPos.lerpVectors(lanternStartPos, lanternEndPos, lanternAnimationProgress);
        lanternLight.position.copy(currentPos);
    } else {
        // Réinitialiser l'animation pour créer une boucle
        lanternAnimationProgress = 0;
        // Inverser les positions de départ et d'arrivée
        const temp = lanternStartPos.clone();
        lanternStartPos.copy(lanternEndPos);
        lanternEndPos.copy(temp);
    }

    // Effet de flamme
    flameTime += flameSpeed;
    const flameVariation = Math.sin(flameTime) * flameIntensity;
    lanternLight.intensity = baseIntensity + flameVariation;
    
    if (modelGroup) {
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
        modelGroup.rotation.y = currentRotationY;
        
        modelOpacity += (targetModelOpacity - modelOpacity) * 0.1;
        meshes.forEach(mesh => {
            mesh.material.opacity = modelOpacity;
        });
        edgeMeshes.forEach(mesh => {
            mesh.material.opacity = modelOpacity;
        });
    }
    
    renderer.render(scene, camera);
}

animate();

// Gestion du redimensionnement
window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
    onWindowResize();
});

// Gestion du survol du titre
const mainTitle = document.getElementById('mainTitle');
mainTitle.addEventListener('mouseenter', () => {
    targetModelOpacity = 0.3;
});

mainTitle.addEventListener('mouseleave', () => {
    targetModelOpacity = 1;
});

// Gestion du clic sur la flèche
const scrollArrow = document.getElementById('scrollArrow');
scrollArrow.addEventListener('click', () => {
    window.scrollTo({
        top: window.innerHeight,
        behavior: 'smooth'
    });
}); 