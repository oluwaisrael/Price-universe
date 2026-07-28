/**
 * NebulaMaterial.js
 *
 * Creates a Three.js ShaderMaterial for the nebula and dust quad layers.
 * Imported by NebulaLayer.jsx and DustLayer.jsx.
 *
 * We do NOT use drei's shaderMaterial() extend pattern here because we need
 * two distinct material types (nebula vs dust) with different uniforms,
 * and we want to instantiate fresh materials per layer so each has its own
 * uniform state without sharing references.
 */

import * as THREE from 'three'
import nebulaVert from './nebula.vert?raw'
import nebulaFrag from './nebula.frag?raw'
import dustVert from './dust.vert?raw'
import dustFrag from './dust.frag?raw'

/**
 * createNebulaMaterial
 * Returns a new THREE.ShaderMaterial configured for a single nebula layer.
 *
 * @param {Object} opts
 * @param {THREE.Color} opts.color       - Base nebula color (dark, desaturated)
 * @param {number}      opts.opacity     - Peak opacity [0..1]
 * @param {number}      opts.noiseScale  - FBM frequency multiplier
 * @param {number}      opts.warpStrength- Domain warp intensity
 * @param {number}      opts.seed        - Random seed offset for noise variation
 */
export function createNebulaMaterial({ color, opacity, noiseScale, warpStrength, seed }) {
  return new THREE.ShaderMaterial({
    vertexShader: nebulaVert,
    fragmentShader: nebulaFrag,
    uniforms: {
      uTime:         { value: 0.0 },
      uColor:        { value: color.clone() },
      uOpacity:      { value: opacity },
      uNoiseScale:   { value: noiseScale },
      uWarpStrength: { value: warpStrength },
      uSeed:         { value: seed },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  })
}

/**
 * createDustMaterial
 * Returns a new THREE.ShaderMaterial configured for a molecular dust lane.
 * Dust subtracts light rather than adding it, so we use NormalBlending
 * with a very dark color and low opacity.
 *
 * @param {Object} opts
 * @param {number}  opts.opacity  - Peak dust opacity
 * @param {number}  opts.seed     - Noise seed
 */
export function createDustMaterial({ opacity, seed }) {
  return new THREE.ShaderMaterial({
    vertexShader: dustVert,
    fragmentShader: dustFrag,
    uniforms: {
      uTime:    { value: 0.0 },
      uOpacity: { value: opacity },
      uSeed:    { value: seed },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    // Multiply blending darkens what's behind the dust lane, simulating
    // the way real molecular clouds occlude background nebulae and stars.
    // We use CustomBlending to achieve a darkening effect.
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.DstColorFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    side: THREE.FrontSide,
  })
}
