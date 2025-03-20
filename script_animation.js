// Import des shaders
import { edgeVertexShader, edgeFragmentShader, progress } from './shaders.js';

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

// Ajout des contrôles orbitaux
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enabled = false; // Désactive les contrôles orbitaux

// Position de la caméra
camera.position.set(9.37, 0.27, 11.69); // Position exacte fournie
camera.lookAt(0, 0, 0);

// Ajout d'une lumière
const light = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

// Création du matériau pour les arêtes avec shader
const edgeMaterial = new THREE.ShaderMaterial({
    uniforms: {
        progress: { value: 0 },
        minY: { value: 0 },
        maxY: { value: 0 }
    },
    vertexShader: edgeVertexShader,
    fragmentShader: edgeFragmentShader,
    transparent: true
});

// Chargement du modèle GLB
const loader = new THREE.GLTFLoader();
loader.load(
    'reconstitution.glb',
    function (gltf) {
        modelGroup = gltf.scene; // Stocker le groupe du modèle
        
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
                // Créer une géométrie d'arêtes à partir de la géométrie du mesh
                const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 15);
                const edgesMesh = new THREE.LineSegments(edgesGeometry, edgeMaterial.clone());
                
                // Copier la transformation du mesh original
                edgesMesh.position.copy(child.position);
                edgesMesh.rotation.copy(child.rotation);
                edgesMesh.scale.copy(child.scale);
                
                // Configurer le mesh original pour qu'il soit opaque
                child.material.transparent = false;
                child.material.opacity = 1;
                child.material.color.setHex(0x808080);
                
                // Stocker les meshes pour les animations
                meshes.push(child);
                edgeMeshes.push(edgesMesh);
                
                // Ajouter les arêtes sans cacher le mesh original
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
        camera.position.set(11.28, -1.37, 9.77); // Position exacte fournie
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        // Appliquer le zoom x4
        if (modelGroup) {
            modelGroup.scale.set(0.85, 0.85, 0.85);
        }

        // Démarrer l'animation après un délai
        setTimeout(() => {
            animationStarted = true;
        }, 400); // 2 secondes de délai
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

// Gestion des événements de la souris
document.addEventListener('mousemove', (event) => {
    // Calculer la position relative de la souris (-1 à 1)
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    
    // Mettre à jour la rotation cible (inversée)
    targetRotationY = -mouseX * 0.02; // Facteur de sensibilité réduit
});

// Gestion du survol du titre
const mainTitle = document.getElementById('mainTitle');
mainTitle.addEventListener('mouseenter', () => {
    targetModelOpacity = 0.3;
});

mainTitle.addEventListener('mouseleave', () => {
    targetModelOpacity = 1;
});

// Animation
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Mise à jour de la progression seulement si l'animation a démarré
    if (animationStarted && animationProgress < 1) {
        animationProgress += 0.0025; // Vitesse de l'animation réduite de moitié
        edgeMeshes.forEach(mesh => {
            mesh.material.uniforms.progress.value = animationProgress;
        });
    }
    
    // Lissage de la rotation
    if (modelGroup) {
        currentRotationY += (targetRotationY - currentRotationY) * 0.05; // Facteur de lissage
        modelGroup.rotation.y = currentRotationY;
        
        // Lissage de l'opacité
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