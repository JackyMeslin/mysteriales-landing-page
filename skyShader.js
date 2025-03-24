export const skyVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const skyFragmentShader = `
    uniform float time;
    varying vec2 vUv;

    void main() {
        // Couleurs pour le dégradé
        vec3 nightBlue = vec3(0.0, 0.0, 0.4);    // Bleu nuit plus intense
        vec3 darkOrange = vec3(0.8, 0.4, 0.0);   // Orange plus vif
        
        // Calcul du dégradé diagonal avec normalisation
        float gradient = (vUv.x + vUv.y) * 0.5;
        
        // Mélange des couleurs avec une transition plus douce
        vec3 finalColor = mix(nightBlue, darkOrange, smoothstep(0.0, 1.0, gradient));
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`; 