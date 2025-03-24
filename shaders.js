const vertexShader = `
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying float vDepth;

    void main() {
        vPosition = position;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewPosition;
        
        // Calcul de la profondeur normalisée
        vDepth = -(modelViewMatrix * vec4(position, 1.0)).z;
    }
`;

const fragmentShader = `
    uniform float progress;
    uniform float depthInfluence; // Nouveau uniform pour contrôler l'effet de perspective
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying float vDepth;

    void main() {
        // Calcul du centre de masse approximatif
        float centerY = 0.0;
        float distanceFromCenter = vWorldPosition.y - centerY;
        float maxDistance = 10.0;
        float normalizedDistance = abs(distanceFromCenter) / maxDistance;
        
        // Ajustement de la profondeur avec le contrôle
        float depthFactor = vDepth / (30.0 * depthInfluence);
        
        // Combiner la distance normalisée avec la profondeur
        float combinedProgress = mix(normalizedDistance, depthFactor, 0.3);
        
        // Largeur de la transition
        float transitionWidth = 0.3;
        
        // Épaisseur des lignes
        float lineWidth = 3.0;
        
        // Inverser la logique pour que les lignes apparaissent progressivement
        float opacity = 1.0 - smoothstep(progress - transitionWidth, progress + transitionWidth, combinedProgress);
        
        // Appliquer l'épaisseur des lignes avec une couleur gris foncé
        gl_FragColor = vec4(0.4, 0.4, 0.4, opacity * lineWidth);
    }
`;

let progress = 0;

export { vertexShader as edgeVertexShader, fragmentShader as edgeFragmentShader, progress }; 