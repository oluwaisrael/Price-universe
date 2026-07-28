/*
 * nebula.vert
 *
 * Minimal vertex shader for fullscreen-ish billboard quads.
 * Passes vUv and a normalized vLocalPos for use in the fragment
 * noise functions. No MVP trickery — we use the mesh's own
 * world transform to position/scale the quad, so standard
 * Three.js model matrix applies.
 */

varying vec2 vUv;
varying vec2 vLocalPos;  /* [-1, 1] quad-local position */

void main() {
  vUv       = uv;
  vLocalPos = (position.xy);  /* PlaneGeometry goes from -0.5 to 0.5; multiply if needed */

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
