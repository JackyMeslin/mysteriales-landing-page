const skyVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const skyFragmentShader = `
    uniform float time;
    varying vec2 vUv;

    // Fonction de bruit aléatoire
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
        // Couleur de base du ciel (bleu foncé)
        vec3 skyColor = vec3(0.05, 0.05, 0.1);
        
        // Position UV avec décalage pour l'animation
        vec2 uv = vUv;
        uv.y += sin(time * 0.1) * 0.01;
        
        // Génération des étoiles
        float star = 0.0;
        for(float i = 0.0; i < 4.0; i++) {
            vec2 q = vec2(uv.x * (1.0 + i * 0.5), uv.y * (1.0 + i * 0.5));
            star += random(q) * (1.0 - i * 0.2);
        }
        
        // Ajout des étoiles scintillantes
        float twinkle = sin(time * 2.0 + uv.x * 10.0) * 0.5 + 0.5;
        star *= twinkle;
        
        // Combiner la couleur du ciel avec les étoiles
        vec3 finalColor = mix(skyColor, vec3(1.0), star * 0.5);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

export { skyVertexShader, skyFragmentShader }; 