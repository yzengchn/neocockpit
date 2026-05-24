
import React, { useCallback, useEffect, useRef } from 'react';

interface MeshJson {
  type?: string;
  version?: number;
  layout?: string;
  uv_layout?: string; // 'front_projection' | 'front_projection_open_hemisphere'
  rings?: number;
  segments?: number;
  bounds?: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    radius: number;
  };
  vertices: number[][];
  indices: number[];
}

interface AvatarViewerProps {
  albedoUrl: string;
  normalUrl?: string;
  meshUrl?: string;
  width?: number;
  height?: number;
}

interface GeometryBuffers {
  vertexData: Float32Array<ArrayBufferLike>;
  indexData: Uint16Array<ArrayBufferLike> | Uint32Array<ArrayBufferLike>;
  indexType: number;
  indexCount: number;
}

const VERT_SRC = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec2 aUV;
layout(location = 2) in vec3 aNormal;
layout(location = 3) in vec4 aTangent;

uniform mat4 uMVP;
uniform mat4 uModel;

out vec2 vUV;
out vec3 vNormal;
out vec3 vTangent;
out vec3 vBitangent;
out vec3 vWorldPos;

void main() {
  vec3 worldPos = (uModel * vec4(aPos, 1.0)).xyz;
  vec3 N = normalize(mat3(uModel) * aNormal);
  vec3 T = normalize(mat3(uModel) * aTangent.xyz);
  T = normalize(T - N * dot(N, T));
  vec3 B = normalize(cross(N, T) * aTangent.w);

  vUV = aUV;
  vNormal = N;
  vTangent = T;
  vBitangent = B;
  vWorldPos = worldPos;
  gl_Position = uMVP * vec4(aPos, 1.0);
}
`;

const FRAG_SRC = `#version 300 es
precision highp float;

in vec2 vUV;
in vec3 vNormal;
in vec3 vTangent;
in vec3 vBitangent;
in vec3 vWorldPos;

uniform sampler2D uAlbedo;
uniform sampler2D uNormalMap;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform float uRoughness;
uniform float uMetallic;

out vec4 fragColor;

const float PI = 3.14159265359;

vec3 srgbToLinear(vec3 c) {
  return pow(max(c, vec3(0.0)), vec3(2.2));
}

vec3 linearToSrgb(vec3 c) {
  return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
}

float distributionGGX(vec3 N, vec3 H, float rough) {
  float a = rough * rough;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
  return a2 / (PI * denom * denom + 0.0001);
}

float geometrySmith(vec3 N, vec3 V, vec3 L, float rough) {
  float r = rough + 1.0;
  float k = (r * r) / 8.0;
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx1 = NdotV / (NdotV * (1.0 - k) + k);
  float ggx2 = NdotL / (NdotL * (1.0 - k) + k);
  return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
  vec4 albedoSample = texture(uAlbedo, vUV);
  vec3 albedo = srgbToLinear(albedoSample.rgb);

  // Front-projection UV blending: fade texture for side/back surfaces.
  // The AI texture is a flat front-facing portrait; it only makes sense
  // on front-facing geometry. On the back, blend toward a skin color.
  vec3 skinColor = vec3(0.62, 0.48, 0.40); // average skin tone (linear)
  float frontFacing = clamp(vNormal.z * 2.0, 0.0, 1.0); // 1.0=front, 0.0=back
  albedo = mix(skinColor, albedo, frontFacing);

  vec3 N = normalize(vNormal);
  vec2 normalSize = vec2(textureSize(uNormalMap, 0));
  if (normalSize.x > 1.0 && normalSize.y > 1.0) {
    vec3 nm = texture(uNormalMap, vUV).rgb * 2.0 - 1.0;
    float nmLen = length(nm);
    if (nmLen > 0.001) {
      mat3 tbn = mat3(normalize(vTangent), normalize(vBitangent), N);
      N = normalize(tbn * normalize(nm));
    }
  }

  vec3 V = normalize(-vWorldPos);

  // Key light (front-upper-right, warm)
  vec3 L1 = normalize(uLightDir);
  vec3 H1 = normalize(V + L1);

  // Fill light (front-left, cooler & dimmer)
  vec3 L2 = normalize(vec3(-0.5, 0.3, 0.8));
  float NdotL2 = max(dot(N, L2), 0.0);

  // Rim/back light for silhouette
  vec3 L3 = normalize(vec3(0.0, 0.2, -1.0));
  float NdotL3 = max(dot(N, L3), 0.0);

  vec3 F0 = mix(vec3(0.04), albedo, uMetallic);
  float D = distributionGGX(N, H1, uRoughness);
  float G = geometrySmith(N, V, L1, uRoughness);
  vec3 F = fresnelSchlick(max(dot(H1, V), 0.0), F0);

  vec3 kD = (1.0 - F) * (1.0 - uMetallic);
  float NdotL1 = max(dot(N, L1), 0.0);
  float NdotV = max(dot(N, V), 0.0);

  vec3 diffuse1 = kD * albedo / PI;
  vec3 specular = (D * G * F) / (4.0 * max(NdotV, 0.001) * max(NdotL1, 0.001) + 0.0001);

  // Subsurface scattering approximation for skin
  float sss = pow(max(dot(-N, L1), 0.0), 2.0) * 0.16;
  // Rim light
  float rim = pow(1.0 - NdotV, 3.0) * 0.18;

  vec3 color = vec3(0.0);

  // Key light contribution
  color += diffuse1 * NdotL1 * uLightColor;
  color += specular * uLightColor * NdotL1;

  // Fill light (dimmer, cooler)
  color += diffuse1 * NdotL2 * vec3(0.55, 0.62, 0.78) * 0.35;

  // Back/rim light
  color += albedo * NdotL3 * vec3(0.4, 0.45, 0.6) * 0.22;

  // Ambient / sky-dome approximation
  float skyUp = N.y * 0.5 + 0.5;
  vec3 skyAmbient = mix(vec3(0.08, 0.08, 0.12), vec3(0.14, 0.16, 0.22), skyUp);
  color += skyAmbient * albedo;

  // SSS
  color += albedo * vec3(1.0, 0.4, 0.28) * sss;

  // Rim highlight
  color += vec3(0.5, 0.55, 0.7) * rim;

  // Tone mapping (Reinhard) + gamma
  color = color / (color + vec3(1.0));
  color = linearToSrgb(color);

  fragColor = vec4(color, 1.0);
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function createSolidTexture(gl: WebGL2RenderingContext, rgba: [number, number, number, number]): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) {
    throw new Error('Unable to create texture');
  }
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

function loadTexture(gl: WebGL2RenderingContext, url: string, fallback: [number, number, number, number]): Promise<WebGLTexture> {
  const tex = createSolidTexture(gl, fallback);
  if (!url) return Promise.resolve(tex);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      resolve(tex);
    };
    img.onerror = () => resolve(tex);
    img.src = url;
  });
}

function mat4Perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fov / 2.0);
  const nf = 1.0 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2.0 * far * near) * nf, 0,
  ]);
}

function mat4RotateY(a: number): Float32Array {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new Float32Array([
    c, 0, s, 0,
    0, 1, 0, 0,
    -s, 0, c, 0,
    0, 0, 0, 1,
  ]);
}

function mat4RotateX(a: number): Float32Array {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, -s, 0,
    0, s, c, 0,
    0, 0, 0, 1,
  ]);
}

function mat4Translate(x: number, y: number, z: number): Float32Array {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ]);
}

function mat4Scale(sx: number, sy: number, sz: number): Float32Array {
  return new Float32Array([
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1,
  ]);
}

function mat4Mul(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function vec3(x: number, y: number, z: number): [number, number, number] {
  return [x, y, z];
}

function addVec3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subVec3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVec3(a: [number, number, number], s: number): [number, number, number] {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function dotVec3(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function crossVec3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function lengthVec3(a: [number, number, number]): number {
  return Math.sqrt(dotVec3(a, a));
}

function normalizeVec3(a: [number, number, number]): [number, number, number] {
  const len = lengthVec3(a);
  if (len <= 1e-8) return [0, 0, 1];
  return [a[0] / len, a[1] / len, a[2] / len];
}

function normalizeArray3(arr: Float32Array, offset: number): [number, number, number] {
  return normalizeVec3(vec3(arr[offset], arr[offset + 1], arr[offset + 2]));
}

function buildFallbackMesh(): MeshJson {
  const profile: Array<[number, number]> = [
    [-1.06, 0.82],
    [-0.90, 0.88],
    [-0.74, 0.76],
    [-0.58, 0.58],
    [-0.42, 0.34],
    [-0.28, 0.26],
    [-0.14, 0.32],
    [-0.02, 0.38],
    [0.10, 0.42],
    [0.24, 0.40],
    [0.38, 0.34],
    [0.52, 0.26],
    [0.66, 0.18],
    [0.80, 0.10],
    [0.94, 0.04],
  ];

  const yMin = profile[0][0];
  const yMax = profile[profile.length - 1][0];

  const radiusAt = (y: number): number => {
    if (y <= profile[0][0]) return profile[0][1];
    if (y >= profile[profile.length - 1][0]) return profile[profile.length - 1][1];
    for (let i = 0; i < profile.length - 1; i += 1) {
      const [y0, r0] = profile[i];
      const [y1, r1] = profile[i + 1];
      if (y0 <= y && y <= y1) {
        const t0 = (y - y0) / (y1 - y0);
        const t = t0 * t0 * (3.0 - 2.0 * t0);
        return r0 * (1.0 - t) + r1 * t;
      }
    }
    return 0.3;
  };

  const faceBulge = (y: number): number => (
    0.22 * Math.exp(((y - 0.04) / 0.30) ** 2)
    + 0.10 * Math.exp(((y - 0.16) / 0.20) ** 2)
    + 0.04 * Math.exp(((y - 0.34) / 0.25) ** 2)
  );

  const earBulge = (y: number): number => (
    0.06 * Math.exp(((y - 0.06) / 0.22) ** 2)
  );

  const ringCount = 28;
  const segmentCount = 36;
  const vertices: number[][] = [];
  const positions: Array<[number, number, number]> = [];

  for (let ringIdx = 0; ringIdx < ringCount; ringIdx += 1) {
    const y = yMin + (yMax - yMin) * (ringIdx / (ringCount - 1));
    const radius = radiusAt(y);

    for (let segIdx = 0; segIdx < segmentCount; segIdx += 1) {
      // Front hemisphere only: theta from -PI/2 to +PI/2
      const theta = -Math.PI / 2.0 + Math.PI * segIdx / (segmentCount - 1);
      const frontWeight = Math.max(Math.cos(theta), 0.0);
      const rearWeight = Math.max(-Math.cos(theta), 0.0);
      const sideWeight = Math.abs(Math.sin(theta));

      const shoulderTaper = 1.0 - 0.08 * Math.exp(((y + 1.02) / 0.20) ** 2);
      const headSquash = 0.84 + 0.16 * frontWeight - 0.18 * rearWeight;
      const lateralSquash = 0.92 + 0.08 * frontWeight - 0.04 * sideWeight;

      let x = radius * Math.sin(theta) * shoulderTaper * lateralSquash;
      let z = radius * Math.cos(theta) * shoulderTaper * headSquash;
      z += frontWeight * faceBulge(y);
      x += sideWeight * earBulge(y) * (Math.sin(theta) > 0 ? 1 : -1) * 0.3;

      // Front-projection UV: project flat image onto the geometry
      // UV placeholder — fixed after bounds computed below
      const u = 0.0;
      const v = 0.0;

      vertices.push([x, y, z, u, v, 0, 0, 0]);
      positions.push([x, y, z]);
    }
  }

  const orientTriangle = (i1: number, i2: number, i3: number): number[] => {
    const p1 = positions[i1];
    const p2 = positions[i2];
    const p3 = positions[i3];
    const normal = crossVec3(subVec3(p2, p1), subVec3(p3, p1));
    const centroid = scaleVec3(addVec3(addVec3(p1, p2), p3), 1 / 3);
    if (dotVec3(normal, centroid) < 0) {
      return [i1, i3, i2];
    }
    return [i1, i2, i3];
  };

  const indices: number[] = [];
  for (let ringIdx = 0; ringIdx < ringCount - 1; ringIdx += 1) {
    const row = ringIdx * segmentCount;
    const nextRow = (ringIdx + 1) * segmentCount;
    // No wrap-around: open edge on left/right sides of front hemisphere
    for (let segIdx = 0; segIdx < segmentCount - 1; segIdx += 1) {
      const a = row + segIdx;
      const b = row + segIdx + 1;
      const c = nextRow + segIdx + 1;
      const d = nextRow + segIdx;
      indices.push(...orientTriangle(a, d, c));
      indices.push(...orientTriangle(a, c, b));
    }
  }

  const topCenter = vertices.length;
  const bottomCenter = topCenter + 1;
  vertices.push([0, yMax + 0.06, 0, 0.5, 1.0, 0, 0, 0]);
  vertices.push([0, yMin - 0.06, 0, 0.5, 0.0, 0, 0, 0]);
  positions.push([0, yMax + 0.06, 0]);
  positions.push([0, yMin - 0.06, 0]);

  const topRow = (ringCount - 1) * segmentCount;
  const bottomRow = 0;
  for (let segIdx = 0; segIdx < segmentCount - 1; segIdx += 1) {
    const a = topRow + segIdx;
    const b = topRow + segIdx + 1;
    indices.push(...orientTriangle(topCenter, a, b));

    const c = bottomRow + segIdx;
    const d = bottomRow + segIdx + 1;
    indices.push(...orientTriangle(bottomCenter, d, c));
  }

  const normals = vertices.map(() => [0, 0, 0] as [number, number, number]);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i];
    const ib = indices[i + 1];
    const ic = indices[i + 2];
    const p1 = positions[ia];
    const p2 = positions[ib];
    const p3 = positions[ic];
    const faceNormal = normalizeVec3(crossVec3(subVec3(p2, p1), subVec3(p3, p1)));
    normals[ia] = addVec3(normals[ia], faceNormal);
    normals[ib] = addVec3(normals[ib], faceNormal);
    normals[ic] = addVec3(normals[ic], faceNormal);
  }

  for (let i = 0; i < vertices.length; i += 1) {
    const n = normalizeVec3(normals[i]);
    vertices[i][5] = n[0];
    vertices[i][6] = n[1];
    vertices[i][7] = n[2];
  }

  const boundsMin: [number, number, number] = [Infinity, Infinity, Infinity];
  const boundsMax: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of positions) {
    boundsMin[0] = Math.min(boundsMin[0], p[0]);
    boundsMin[1] = Math.min(boundsMin[1], p[1]);
    boundsMin[2] = Math.min(boundsMin[2], p[2]);
    boundsMax[0] = Math.max(boundsMax[0], p[0]);
    boundsMax[1] = Math.max(boundsMax[1], p[1]);
    boundsMax[2] = Math.max(boundsMax[2], p[2]);
  }
  const boundsCenter: [number, number, number] = [
    (boundsMin[0] + boundsMax[0]) * 0.5,
    (boundsMin[1] + boundsMax[1]) * 0.5,
    (boundsMin[2] + boundsMax[2]) * 0.5,
  ];
  const boundsRadius = Math.max(
    boundsMax[0] - boundsMin[0],
    boundsMax[1] - boundsMin[1],
    boundsMax[2] - boundsMin[2],
  ) * 0.5;

  // Fix front-projection UVs using actual bounds
  const xSpan = boundsMax[0] - boundsMin[0] || 1;
  const ySpan = boundsMax[1] - boundsMin[1] || 1;
  for (let i = 0; i < vertices.length; i += 1) {
    const x = positions[i][0];
    const y = positions[i][1];
    vertices[i][3] = Math.max(0.0, Math.min(1.0, (x - boundsMin[0]) / xSpan));
    vertices[i][4] = Math.max(0.0, Math.min(1.0, 1.0 - (y - boundsMin[1]) / ySpan));
  }

  return {
    type: 'avatar_bust',
    version: 4,
    layout: 'x y z u v nx ny nz',
    uv_layout: 'front_projection_open_hemisphere',
    rings: ringCount,
    segments: segmentCount,
    bounds: {
      min: boundsMin,
      max: boundsMax,
      center: boundsCenter,
      radius: boundsRadius,
    },
    vertices,
    indices,
  };
}

function computeVertexNormals(
  vertices: Float32Array<ArrayBufferLike>,
  indices: ArrayLike<number>,
): Float32Array<ArrayBufferLike> {
  const vertexCount = vertices.length / 8;
  const normals = new Float32Array(vertexCount * 3);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i];
    const ib = indices[i + 1];
    const ic = indices[i + 2];
    const ax = vertices[ia * 8 + 0];
    const ay = vertices[ia * 8 + 1];
    const az = vertices[ia * 8 + 2];
    const bx = vertices[ib * 8 + 0];
    const by = vertices[ib * 8 + 1];
    const bz = vertices[ib * 8 + 2];
    const cx = vertices[ic * 8 + 0];
    const cy = vertices[ic * 8 + 1];
    const cz = vertices[ic * 8 + 2];
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    normals[ia * 3 + 0] += nx;
    normals[ia * 3 + 1] += ny;
    normals[ia * 3 + 2] += nz;
    normals[ib * 3 + 0] += nx;
    normals[ib * 3 + 1] += ny;
    normals[ib * 3 + 2] += nz;
    normals[ic * 3 + 0] += nx;
    normals[ic * 3 + 1] += ny;
    normals[ic * 3 + 2] += nz;
  }

  for (let i = 0; i < vertexCount; i += 1) {
    const offset = i * 3;
    const n = normalizeArray3(normals, offset);
    normals[offset + 0] = n[0];
    normals[offset + 1] = n[1];
    normals[offset + 2] = n[2];
  }

  return normals;
}

function computeTangents(
  vertices: Float32Array<ArrayBufferLike>,
  indices: ArrayLike<number>,
  normals: Float32Array<ArrayBufferLike>,
): Float32Array<ArrayBufferLike> {
  const vertexCount = vertices.length / 8;
  const tan1 = new Float32Array(vertexCount * 3);
  const tan2 = new Float32Array(vertexCount * 3);

  for (let i = 0; i < indices.length; i += 3) {
    const i1 = indices[i];
    const i2 = indices[i + 1];
    const i3 = indices[i + 2];

    const p1x = vertices[i1 * 8 + 0];
    const p1y = vertices[i1 * 8 + 1];
    const p1z = vertices[i1 * 8 + 2];
    const p2x = vertices[i2 * 8 + 0];
    const p2y = vertices[i2 * 8 + 1];
    const p2z = vertices[i2 * 8 + 2];
    const p3x = vertices[i3 * 8 + 0];
    const p3y = vertices[i3 * 8 + 1];
    const p3z = vertices[i3 * 8 + 2];

    const w1 = vertices[i1 * 8 + 3];
    const v1 = vertices[i1 * 8 + 4];
    const w2 = vertices[i2 * 8 + 3];
    const v2 = vertices[i2 * 8 + 4];
    const w3 = vertices[i3 * 8 + 3];
    const v3 = vertices[i3 * 8 + 4];

    const x1 = p2x - p1x;
    const x2 = p3x - p1x;
    const y1 = p2y - p1y;
    const y2 = p3y - p1y;
    const z1 = p2z - p1z;
    const z2 = p3z - p1z;

    const s1 = w2 - w1;
    const s2 = w3 - w1;
    const t1 = v2 - v1;
    const t2 = v3 - v1;
    const denom = s1 * t2 - s2 * t1;
    if (Math.abs(denom) < 1e-8) continue;
    const r = 1.0 / denom;

    const tx = (x1 * t2 - x2 * t1) * r;
    const ty = (y1 * t2 - y2 * t1) * r;
    const tz = (z1 * t2 - z2 * t1) * r;

    const bx = (x2 * s1 - x1 * s2) * r;
    const by = (y2 * s1 - y1 * s2) * r;
    const bz = (z2 * s1 - z1 * s2) * r;

    for (const idx of [i1, i2, i3]) {
      tan1[idx * 3 + 0] += tx;
      tan1[idx * 3 + 1] += ty;
      tan1[idx * 3 + 2] += tz;
      tan2[idx * 3 + 0] += bx;
      tan2[idx * 3 + 1] += by;
      tan2[idx * 3 + 2] += bz;
    }
  }

  const tangents = new Float32Array(vertexCount * 4);
  for (let i = 0; i < vertexCount; i += 1) {
    const no = i * 3;
    const to = i * 3;
    const normal = normalizeVec3(vec3(normals[no + 0], normals[no + 1], normals[no + 2]));
    let tangent = vec3(tan1[to + 0], tan1[to + 1], tan1[to + 2]);

    const ndotT = dotVec3(normal, tangent);
    tangent = subVec3(tangent, scaleVec3(normal, ndotT));
    tangent = normalizeVec3(tangent);

    if (lengthVec3(tangent) <= 1e-8) {
      tangent = Math.abs(normal[0]) < 0.9 ? normalizeVec3(crossVec3(normal, [1, 0, 0])) : normalizeVec3(crossVec3(normal, [0, 1, 0]));
    }

    const bitangent = vec3(tan2[to + 0], tan2[to + 1], tan2[to + 2]);
    const handedness = dotVec3(crossVec3(normal, tangent), bitangent) < 0 ? -1 : 1;

    tangents[i * 4 + 0] = tangent[0];
    tangents[i * 4 + 1] = tangent[1];
    tangents[i * 4 + 2] = tangent[2];
    tangents[i * 4 + 3] = handedness;
  }

  return tangents;
}

function buildGeometry(mesh: MeshJson): GeometryBuffers {
  const vertexList = mesh.vertices.map((vertex) => vertex.slice(0, 8).map((value) => Number(value)));
  if (vertexList.length === 0) {
    throw new Error('Mesh contains no vertices');
  }

  const indices = mesh.indices.map((value) => Number(value));
  if (indices.length === 0) {
    throw new Error('Mesh contains no indices');
  }

  // Compute bounds center and normalize so model is centered at origin
  // and fits within a unit sphere for proper camera framing.
  const bounds = mesh.bounds;
  let cx = 0, cy = 0, cz = 0, scale = 1;
  if (bounds) {
    cx = (Number(bounds.min[0]) + Number(bounds.max[0])) * 0.5;
    cy = (Number(bounds.min[1]) + Number(bounds.max[1])) * 0.5;
    cz = (Number(bounds.min[2]) + Number(bounds.max[2])) * 0.5;
    const radius = Number(bounds.radius) || 1;
    scale = 1.0 / radius;
  } else {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const v of vertexList) {
      minX = Math.min(minX, v[0]); maxX = Math.max(maxX, v[0]);
      minY = Math.min(minY, v[1]); maxY = Math.max(maxY, v[1]);
      minZ = Math.min(minZ, v[2]); maxZ = Math.max(maxZ, v[2]);
    }
    cx = (minX + maxX) * 0.5;
    cy = (minY + maxY) * 0.5;
    cz = (minZ + maxZ) * 0.5;
    const spanX = maxX - minX, spanY = maxY - minY, spanZ = maxZ - minZ;
    scale = 1.0 / Math.max(spanX, spanY, spanZ) * 0.5;
  }

  // For meshes with old cylindrical UVs (version < 4), recompute front-projection UVs.
  // This makes the mesh compatible with AI-generated flat front-facing textures.
  const needsFrontProjection = (mesh.version ?? 1) < 4;
  const xMin = bounds
    ? Number(bounds.min[0])
    : Math.min(...vertexList.map((v) => v[0]));
  const xMax = bounds
    ? Number(bounds.max[0])
    : Math.max(...vertexList.map((v) => v[0]));
  const yMin = bounds
    ? Number(bounds.min[1])
    : Math.min(...vertexList.map((v) => v[1]));
  const yMax = bounds
    ? Number(bounds.max[1])
    : Math.max(...vertexList.map((v) => v[1]));

  const vertexCount = vertexList.length;
  const rawVertices = new Float32Array(vertexCount * 8);
  for (let i = 0; i < vertexCount; i += 1) {
    const vertex = vertexList[i];
    const px = (vertex[0] - cx) * scale;
    const py = (vertex[1] - cy) * scale;
    const pz = (vertex[2] - cz) * scale;
    rawVertices[i * 8 + 0] = px;
    rawVertices[i * 8 + 1] = py;
    rawVertices[i * 8 + 2] = pz;

    if (needsFrontProjection) {
     // Recompute UV as front-projection to match AI-generated flat texture
      const xSpan = xMax - xMin || 1;
      const ySpan = yMax - yMin || 1;
      rawVertices[i * 8 + 3] = Math.max(0, Math.min(1, (vertex[0] - xMin) / xSpan));
      rawVertices[i * 8 + 4] = Math.max(0, Math.min(1, 1.0 - (vertex[1] - yMin) / ySpan));
    } else {
      rawVertices[i * 8 + 3] = vertex[3] ?? 0;
      rawVertices[i * 8 + 4] = vertex[4] ?? 0;
    }

    rawVertices[i * 8 + 5] = vertex[5] ?? 0;
    rawVertices[i * 8 + 6] = vertex[6] ?? 0;
    rawVertices[i * 8 + 7] = vertex[7] ?? 0;
  }

  // Always recompute normals after centering/scaling transformation
  // This ensures normals are correct for the transformed geometry
  const normals = computeVertexNormals(rawVertices, indices);

  const tangents = computeTangents(rawVertices, indices, normals);
  const vertexData: Float32Array<ArrayBufferLike> = new Float32Array(vertexCount * 12);
  for (let i = 0; i < vertexCount; i += 1) {
    const source = i * 8;
    const target = i * 12;
    vertexData[target + 0] = rawVertices[source + 0];
    vertexData[target + 1] = rawVertices[source + 1];
    vertexData[target + 2] = rawVertices[source + 2];
    vertexData[target + 3] = rawVertices[source + 3];
    vertexData[target + 4] = rawVertices[source + 4];
    vertexData[target + 5] = normals[i * 3 + 0];
    vertexData[target + 6] = normals[i * 3 + 1];
    vertexData[target + 7] = normals[i * 3 + 2];
    vertexData[target + 8] = tangents[i * 4 + 0];
    vertexData[target + 9] = tangents[i * 4 + 1];
    vertexData[target + 10] = tangents[i * 4 + 2];
    vertexData[target + 11] = tangents[i * 4 + 3];
  }

  const indexType = vertexCount > 65535 ? 0x1405 : 0x1403;
  const indexData = indexType === 0x1405 ? new Uint32Array(indices) : new Uint16Array(indices);

  return {
    vertexData,
    indexData,
    indexType,
    indexCount: indices.length,
  };
}

async function fetchMesh(meshUrl?: string): Promise<MeshJson> {
  if (!meshUrl) {
    return buildFallbackMesh();
  }
  try {
    const response = await fetch(meshUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load mesh: ${response.status}`);
    }
    const data = (await response.json()) as MeshJson;
    if (!Array.isArray(data.vertices) || !Array.isArray(data.indices)) {
      throw new Error('Invalid mesh payload');
    }
    return data;
  } catch (error) {
    console.warn('Falling back to built-in mesh:', error);
    return buildFallbackMesh();
  }
}

export const AvatarViewer: React.FC<AvatarViewerProps> = ({
  albedoUrl,
  normalUrl,
  meshUrl,
  width,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const rotRef = useRef({ x: 0.0, y: 0.0, zoom: -2.8 });
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const sizeRef = useRef({ w: width || 560, h: height || 480 });

  const initGL = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!gl) {
      console.error('WebGL2 not available');
      return undefined;
    }

    const mesh = await fetchMesh(meshUrl);
    const geometry = buildGeometry(mesh);

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return undefined;
    const program = linkProgram(gl, vs, fs);
    if (!program) return undefined;
    gl.useProgram(program);

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    const ibo = gl.createBuffer();
    if (!vao || !vbo || !ibo) return undefined;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertexData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indexData, gl.STATIC_DRAW);

    const stride = 12 * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 3 * 4);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 5 * 4);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 8 * 4);

    gl.bindVertexArray(null);

    const uAlbedoLoc = gl.getUniformLocation(program, 'uAlbedo');
    const uNormalLoc = gl.getUniformLocation(program, 'uNormalMap');
    const uLightDirLoc = gl.getUniformLocation(program, 'uLightDir');
    const uLightColorLoc = gl.getUniformLocation(program, 'uLightColor');
    const uAmbientLoc = gl.getUniformLocation(program, 'uAmbient');
    const uRoughnessLoc = gl.getUniformLocation(program, 'uRoughness');
    const uMetallicLoc = gl.getUniformLocation(program, 'uMetallic');
    const uMvpLoc = gl.getUniformLocation(program, 'uMVP');
    const uModelLoc = gl.getUniformLocation(program, 'uModel');

    gl.uniform3f(uLightDirLoc, 0.5, 0.75, 0.86);
    gl.uniform3f(uLightColorLoc, 1.0, 0.95, 0.88);
    gl.uniform3f(uAmbientLoc, 0.22, 0.22, 0.28);
    gl.uniform1f(uRoughnessLoc, 0.45);
    gl.uniform1f(uMetallicLoc, 0.0);

    const albedoPromise = loadTexture(gl, albedoUrl, [156, 136, 122, 255]);
    const normalPromise = loadTexture(gl, normalUrl || '', [128, 128, 255, 255]);

    const albedoTexture = await albedoPromise;
    const normalTexture = await normalPromise;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, albedoTexture);
    gl.uniform1i(uAlbedoLoc, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.uniform1i(uNormalLoc, 1);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.clearColor(0.031, 0.035, 0.051, 1.0);

    const onPointerDown = (event: PointerEvent) => {
      dragRef.current = { active: true, lastX: event.clientX, lastY: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current.active) return;
      const dx = event.clientX - dragRef.current.lastX;
      const dy = event.clientY - dragRef.current.lastY;
      dragRef.current.lastX = event.clientX;
      dragRef.current.lastY = event.clientY;
      rotRef.current.y += dx * 0.008;
      rotRef.current.x += dy * 0.008;
      rotRef.current.x = Math.max(-1.2, Math.min(1.2, rotRef.current.x));
    };
    const onPointerUp = () => {
      dragRef.current.active = false;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      rotRef.current.zoom = Math.max(-6.0, Math.min(-1.5, rotRef.current.zoom + event.deltaY * 0.003));
    };
    const onDblClick = () => {
      rotRef.current = { x: 0.0, y: 0.0, zoom: -2.8 };
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDblClick);

    const render = (time: number) => {
      animationRef.current = requestAnimationFrame(render);
      const widthPx = canvas.width;
      const heightPx = canvas.height;
      if (widthPx === 0 || heightPx === 0) return;

      gl.viewport(0, 0, widthPx, heightPx);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const t = time * 0.001;
      const idleRotY = Math.sin(t * 0.32) * 0.1;
      const breath = 1.0 + Math.sin(t * 0.48) * 0.008;
      const rotY = rotRef.current.y + idleRotY;
      const rotX = rotRef.current.x;

      const model = mat4Mul(
        mat4Mul(mat4RotateY(rotY), mat4RotateX(rotX)),
        mat4Scale(breath, breath, breath),
      );
      // Camera positioned on Z axis looking at origin; model is now centered
      const view = mat4Translate(0, 0, rotRef.current.zoom);
      const proj = mat4Perspective(Math.PI / 4.5, widthPx / heightPx, 0.01, 100.0);
      const mvp = mat4Mul(proj, mat4Mul(view, model));

      gl.useProgram(program);
      gl.uniformMatrix4fv(uMvpLoc, false, mvp);
      gl.uniformMatrix4fv(uModelLoc, false, model);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, albedoTexture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, normalTexture);
      gl.bindVertexArray(vao);
      gl.drawElements(gl.TRIANGLES, geometry.indexCount, geometry.indexType, 0);
      gl.bindVertexArray(null);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDblClick);
      gl.deleteBuffer(vbo);
      gl.deleteBuffer(ibo);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(albedoTexture);
      gl.deleteTexture(normalTexture);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [albedoUrl, meshUrl, normalUrl]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      cleanup = await initGL();
      if (cancelled && cleanup) {
        cleanup();
      }
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
      cancelAnimationFrame(animationRef.current);
    };
  }, [initGL]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = width || Math.floor(rect.width);
      const h = height || Math.floor(Math.min(rect.width * 0.75, 560));
      sizeRef.current = { w, h };
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      width: '100%',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--c-border)',
      boxShadow: 'var(--shadow-card)',
      background: '#08090d',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 'auto',
          aspectRatio: width && height ? `${width}/${height}` : '4/3',
          display: 'block',
          cursor: 'grab',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '10px 16px',
        background: 'linear-gradient(to top, rgba(8,9,13,0.85) 0%, transparent 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: 11,
          color: 'var(--c-text-muted)',
          fontWeight: 600,
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          WebGL Preview
        </span>
        <span style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>
          拖拽旋转 · 滚轮缩放 · 双击重置
        </span>
      </div>
    </div>
  );
};

export default AvatarViewer;
