/*
 * dust.vert
 *
 * Identical to nebula.vert — passes UV and local position.
 * Kept separate so future changes to one don't break the other.
 */

varying vec2 vUv;
varying vec2 vLocalPos;

void main() {
  vUv       = uv;
  vLocalPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
