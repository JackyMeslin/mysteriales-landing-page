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
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying float vDepth;

    void main() {
        // Calcul du centre de masse approximatif (peut être ajusté selon le modèle)
        float centerY = 0.0;
        float distanceFromCenter = abs(vWorldPosition.y - centerY);
        float maxDistance = 5.0; // Ajustez selon la taille de votre modèle
        float normalizedDistance = distanceFromCenter / maxDistance;
        
        // Combiner la distance normalisée avec la profondeur
        float depthFactor = vDepth / 20.0; // Ajuster ce facteur pour l'influence de la profondeur
        float combinedProgress = mix(normalizedDistance, depthFactor, 0.5);
        
        // Largeur de la transition
        float transitionWidth = 0.2;
        
        // Augmenter l'épaisseur des lignes
        float lineWidth = 3.0; // Augmentation de l'épaisseur des lignes
        
        // Inverser la logique pour que les lignes apparaissent progressivement
        float opacity = 1.0 - smoothstep(progress - transitionWidth, progress + transitionWidth, combinedProgress);
        
        // Appliquer l'épaisseur des lignes
        gl_FragColor = vec4(1.0, 1.0, 1.0, opacity * lineWidth);
    }
`;

let progress = 0;

export { vertexShader as edgeVertexShader, fragmentShader as edgeFragmentShader, progress }; 