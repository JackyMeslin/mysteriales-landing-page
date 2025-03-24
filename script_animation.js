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
let loadingProgress = 0; // Progression du chargement
let loadingComplete = false; // Flag pour indiquer que tout est chargé

// Gestion de la musique
let audioContext;
let audioSource;
let audioBuffer;
let isMusicPlaying = false;
let musicVolume = 0.3; // Volume initial à 30%

// Création du contrôleur de musique
const musicControls = document.createElement('div');
musicControls.id = 'musicControls';
musicControls.innerHTML = `
    <div class="music-controls">
        <button id="musicToggle" class="music-button">
            <span class="music-icon">🎵</span>
        </button>
        <input type="range" id="musicVolume" min="0" max="100" value="30">
    </div>
`;
document.body.appendChild(musicControls);

// Style des contrôles de musique
const musicStyle = document.createElement('style');
musicStyle.textContent = `
    #musicControls {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 100;
    }

    .music-controls {
        display: flex;
        align-items: center;
        gap: 10px;
        background-color: rgba(0, 0, 0, 0.7);
        padding: 10px;
        border-radius: 20px;
    }

    .music-button {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 5px;
        transition: transform 0.2s;
    }

    .music-button:hover {
        transform: scale(1.1);
    }

    #musicVolume {
        width: 100px;
    }
`;
document.head.appendChild(musicStyle);

// Fonction pour initialiser la musique
async function initMusic() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch('medieval_theme.mp3');
        audioBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());
        console.log('Musique chargée avec succès');
    } catch (error) {
        console.error('Erreur lors du chargement de la musique:', error);
    }
}

// Fonction pour jouer la musique
function playMusic() {
    if (!audioBuffer) return;
    
    audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.loop = true;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = musicVolume;
    
    audioSource.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    audioSource.start(0);
    isMusicPlaying = true;
    
    // Mettre à jour l'icône
    document.querySelector('.music-icon').textContent = '⏸️';
}

// Fonction pour arrêter la musique
function stopMusic() {
    if (audioSource) {
        audioSource.stop();
        audioSource = null;
        isMusicPlaying = false;
        document.querySelector('.music-icon').textContent = '🎵';
    }
}

// Fonction pour ajuster le volume
function setVolume(value) {
    musicVolume = value / 100;
    if (audioSource) {
        const gainNode = audioSource.context.createGain();
        gainNode.gain.value = musicVolume;
        audioSource.connect(gainNode);
        audioSource.connect(audioSource.context.destination);
    }
}

// Gestionnaires d'événements pour les contrôles de musique
document.getElementById('musicToggle').addEventListener('click', () => {
    if (isMusicPlaying) {
        stopMusic();
    } else {
        playMusic();
    }
});

document.getElementById('musicVolume').addEventListener('input', (e) => {
    setVolume(e.target.value);
});

// Initialiser la musique
initMusic();

// Initialisation de la scène
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setClearColor(0x1a1a1a, 1); // Gris foncé
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Ajout du brouillard
scene.fog = new THREE.FogExp2(0x1a1a1a, 0.04); // Brouillard exponentiel gris foncé plus léger

// Position de la caméra
camera.position.set(-9.5, -12.10, 15.70);
camera.lookAt(-2, -10, 0);

// Ajout d'une lumière
const light = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light);

// Ajout de plusieurs lumières directionnelles pour un meilleur éclairage
const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight1.position.set(1, 1, 1);
scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight2.position.set(-1, 1, -1);
scene.add(directionalLight2);

const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight3.position.set(0, -1, 0);
scene.add(directionalLight3);

// Ajout d'une lumière hémisphérique pour l'ambiance
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.1);
scene.add(hemiLight);

// Ajout d'une lumière ambiante plus faible pour ne pas éclairer trop le ciel
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

// Variables pour l'animation de la lanterne
let lanternStartPos = new THREE.Vector3(-15, -12, -5.90);
let lanternEndPos = new THREE.Vector3(15, -12, -5.9);
let lanternAnimationProgress = 0;
let lanternAnimationSpeed = 0.00085; // Vitesse de déplacement réduite de 15%
let lanternManualControl = false; // Flag pour le contrôle manuel
let lanternXOffset = 0; // Décalage horizontal de la lanterne
let isReturning = false; // Flag pour indiquer si on est dans la phase de retour

// Création de la lumière de la lanterne
const lanternLight = new THREE.PointLight(0xffa500, 6, 40); // Orange plus vif, intensité augmentée à 6, portée augmentée à 40
lanternLight.position.copy(lanternStartPos);
scene.add(lanternLight);

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
const skyGeometry = new THREE.PlaneGeometry(200, 200);
const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 }
    },
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
sky.position.z = -100;
sky.position.y = -40;
scene.add(sky);

// Variables pour l'effet de flamme
let flameTime = 0;
const flameSpeed = 0.05;
const flameIntensity = 1.5; // Augmentation de la variation d'intensité
const baseIntensity = 6; // Augmentation de l'intensité de base

// Création de l'écran de chargement
const loadingScreen = document.createElement('div');
loadingScreen.id = 'loadingScreen';
loadingScreen.innerHTML = `
    <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">Veuillez patienter...</div>
        <div class="loading-subtext">pendant le chargement de l'introduction</div>
        <div class="loading-progress">0%</div>
    </div>
`;
document.body.appendChild(loadingScreen);

// Style de l'écran de chargement
const style = document.createElement('style');
style.textContent = `
    #loadingScreen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #000000;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        transition: opacity 0.5s ease-out;
    }

    .loading-content {
        text-align: center;
        color: white;
    }

    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #ffffff;
        border-top: 5px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    .loading-text, .loading-subtext, .loading-progress {
        font-size: 1.2em;
        margin-bottom: 10px;
        opacity: 1;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Fonction pour mettre à jour la progression du chargement
function updateLoadingProgress(progress) {
    loadingProgress = progress;
    const progressElement = document.querySelector('.loading-progress');
    if (progressElement) {
        progressElement.textContent = `${Math.round(progress * 100)}%`;
    }
}

// Fonction pour masquer l'écran de chargement
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

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

        // Charger le modèle du moine
        loader.load(
            'walking_monk.glb',
            function (monkGlb) {
                window.monk = monkGlb.scene;
                window.monk.position.copy(lanternStartPos);
                window.monk.position.y = -13.2;
                window.monk.scale.set(1, 1, 1);
                
                // Appliquer la couleur gris foncé au moine
                window.monk.traverse((child) => {
                    if (child.isMesh) {
                        child.material.color.setHex(0x333333);
                    }
                });
                
                // Récupérer et démarrer l'animation de marche
                const mixer = new THREE.AnimationMixer(window.monk);
                const walkAction = mixer.clipAction(monkGlb.animations[0]);
                walkAction.play();
                window.monkMixer = mixer;
                
                scene.add(window.monk);
                console.log('Moine chargé avec succès');
                
                // Masquer l'écran de chargement une fois tout chargé
                loadingComplete = true;
                updateLoadingProgress(1); // S'assurer que la progression est à 100%
                setTimeout(() => {
                    hideLoadingScreen();
                }, 500);
            },
            function (xhr) {
                const progress = (xhr.loaded / xhr.total) * 0.5 + 0.5; // 50-100%
                updateLoadingProgress(progress);
            },
            function (error) {
                console.error('Erreur lors du chargement du moine:', error);
            }
        );

        // Démarrer l'animation après un délai
        setTimeout(() => {
            animationStarted = true;
        }, 400);
    },
    function (xhr) {
        const progress = (xhr.loaded / xhr.total) * 0.5; // 0-50%
        updateLoadingProgress(progress);
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
        targetRotationY = Math.max(Math.min(-mouseX * 0.02, 10 * (Math.PI / 180)), -10 * (Math.PI / 180));
    });
}

// Désactiver le zoom tactile sur mobile
document.addEventListener('touchmove', function(event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, { passive: false });

// Limite de rotation en degrés
const MAX_ROTATION = 10 * (Math.PI / 180); // Conversion en radians

function handleOrientation(event) {
    let x = event.beta;
    let y = event.gamma;
    // Limiter la rotation à 10 degrés de chaque côté
    targetRotationY = Math.max(Math.min((y / 90) * 0.5, 10 * (Math.PI / 180)), -10 * (Math.PI / 180));
}

// Animation
function animate() {
    requestAnimationFrame(animate);
    
    // Mise à jour du temps pour le ciel étoilé
    skyMaterial.uniforms.time.value += 0.01;
    
    // Mise à jour de l'animation du moine
    if (window.monkMixer) {
        window.monkMixer.update(0.016); // Environ 60 FPS
    }
    
    if (animationStarted && animationProgress < 1) {
        animationProgress += 0.0025;
        edgeMeshes.forEach(mesh => {
            mesh.material.uniforms.progress.value = animationProgress;
        });
    }

    // Animation de la lanterne et du personnage
    if (!lanternManualControl) {
        if (lanternAnimationProgress < 1) {
            lanternAnimationProgress += lanternAnimationSpeed;
            const currentPos = new THREE.Vector3();
            
            if (!isReturning) {
                // Phase aller : de gauche à droite
                currentPos.lerpVectors(lanternStartPos, lanternEndPos, lanternAnimationProgress);
                lanternLight.position.copy(currentPos);
                lanternLight.position.x += lanternXOffset;
                
                // Mise à jour de la position du moine
                if (window.monk) {
                    window.monk.position.x = lanternLight.position.x;
                    window.monk.position.z = lanternLight.position.z;
                    window.monk.position.y = -13.2; // Maintenir la hauteur plus basse
                    window.monk.rotation.y = Math.PI / 2; // Rotation de 90° vers la droite
                }
            } else {
                // Phase retour : de droite à gauche
                currentPos.lerpVectors(lanternEndPos, lanternStartPos, lanternAnimationProgress);
                lanternLight.position.copy(currentPos);
                lanternLight.position.x += lanternXOffset;
                
                // Mise à jour de la position du moine
                if (window.monk) {
                    window.monk.position.x = lanternLight.position.x;
                    window.monk.position.z = lanternLight.position.z;
                    window.monk.position.y = -13.2; // Maintenir la hauteur plus basse
                    window.monk.rotation.y = -Math.PI / 2; // Rotation de -90° vers la gauche
                }
            }
        } else {
            lanternAnimationProgress = 0;
            isReturning = !isReturning; // Inverser la direction
        }
    } else {
        // Mise à jour de la position de la lanterne et du moine en mode manuel
        const currentPos = lanternLight.position.clone();
        currentPos.x = lanternXOffset;
        lanternLight.position.copy(currentPos);
        if (window.monk) {
            window.monk.position.x = lanternXOffset;
            window.monk.position.y = -13.2; // Maintenir la hauteur plus basse
            window.monk.rotation.y = lanternXOffset > window.monk.position.x ? Math.PI / 2 : Math.PI + Math.PI / 2;
        }
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
    
    // Mise à jour de la position du titre
    const mainTitle = document.getElementById('mainTitle');
    if (mainTitle) {
        mainTitle.style.top = `${(window.innerHeight * 2) / 3}px`;
    }
});

// Position initiale du titre
const mainTitle = document.getElementById('mainTitle');
if (mainTitle) {
    mainTitle.style.top = `${(window.innerHeight * 2) / 3}px`;
}

// Gestion du survol du titre
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