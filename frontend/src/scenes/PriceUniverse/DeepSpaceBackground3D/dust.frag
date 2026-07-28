/*
 * dust.frag
 *
 * Molecular dust lane renderer.
 *
 * Dust in real nebulae is a dark absorber — it blocks the light
 * from behind it. We simulate this with a dark, semi-transparent
 * mask using multiply-like blending (set in NebulaMaterial.js).
 *
 * Technique:
 *   - FBM with domain warp for irregular lane shape
 *   - Elongated UV mapping to produce lane-like structure
 *   - Very slow drift (0.002 per second)
 *   - Soft dissolving edges (no hard boundaries)
 *   - The output alpha controls how much the multiply blend darkens
 */

precision highp float;

uniform float uTime;
uniform float uOpacity;
uniform float uSeed;

varying vec2 vUv;
varying vec2 vLocalPos;

/* ------------------------------------------------------------------ */
/*  NOISE                                                               */
/* ------------------------------------------------------------------ */

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, amp = 0.5, freq = 1.0, sum = 0.0;
  for (int i = 0; i < 6; i++) {
    v   += vnoise(p * freq) * amp;
    sum += amp;
    amp  *= 0.5;
    freq *= 2.1;
    p = mat2(0.8, -0.6, 0.6, 0.8) * p;
  }
  return v / sum;
}

/* ------------------------------------------------------------------ */
/*  DOMAIN WARP (single level for dust — simpler than nebula)          */
/* ------------------------------------------------------------------ */

float warpedFbm(vec2 p, float seed) {
  vec2 off = vec2(seed * 0.11, seed * 0.23);
  vec2 q = vec2(fbm(p + off), fbm(p + off + vec2(3.7, 8.1)));
  return fbm(p + 1.6 * q);
}

/* ------------------------------------------------------------------ */
/*  MAIN                                                                */
/* ------------------------------------------------------------------ */

void main() {
  vec2 uv = vUv * 2.0 - 1.0;

  /* Stretch UV horizontally to create lane-like elongation.
     The aspect ratio here controls lane orientation.
     Combine with the mesh's own rotation for variety. */
  vec2 laneUv = vec2(uv.x * 0.45, uv.y * 2.2);

  /* Slow drift — dust drifts slightly faster than nebula */
  laneUv += vec2(uTime * 0.0018, uTime * 0.0009);

  /* Scale and seed */
  vec2 p = laneUv * 2.5 + vec2(uSeed * 0.17, uSeed * 0.29);

  /* Warped FBM density */
  float density = warpedFbm(p, uSeed);

  /* Threshold: dust only appears in dense regions */
  float dustMask = smoothstep(0.42, 0.68, density);

  /* Radial soft vignette — dissolve at quad edges */
  float r = length(uv * vec2(0.6, 1.0));  /* squash radius for lane shape */
  float radial = 1.0 - smoothstep(0.5, 1.0, r);

  /* Additional narrow band vignette along the lane axis
     (fades out the short ends of the lane) */
  float axial = 1.0 - smoothstep(0.6, 1.0, abs(uv.y));

  float alpha = dustMask * radial * axial * uOpacity;

  /* Dust color: near-black with a very faint brownish-grey tint
     (real dust is reddish-brown due to iron/silicate composition) */
  vec3 dustColor = vec3(0.04, 0.03, 0.02);

  gl_FragColor = vec4(dustColor, alpha);
}
