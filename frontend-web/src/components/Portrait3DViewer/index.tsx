import React, { useCallback, useEffect, useRef, useState } from 'react';
import './styles.css';

interface Portrait3DViewerProps {
  atlasUrl: string;
  meshUrl: string;
}

interface PortraitMeshJson {
  type?: string;
  version?: number;
  layout?: string;
  bounds?: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    radius: number;
  };
  vertices?: unknown;
  indices?: unknown;
}

interface GeometryBuffers {
  vertexData: Float32Array;
  indexData: Uint16Array | Uint32Array;
  indexType: number;
  indexCount: number;
}

const VERT_SRC = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec2 aUV;
layout(location = 2) in vec3 aNormal;

uniform mat4 uMVP;
uniform mat4 uModel;

out vec2 vUV;
out vec3 vNormal;
out vec3 vWorldPos;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vUV = aUV;
  vNormal = normalize(mat3(uModel) * aNormal);
  vWorldPos = worldPos.xyz;
  gl_Position = uMVP * vec4(aPosition, 1.0);
}
`;

const FRAG_SRC = `#version 300 es
precision highp float;

in vec2 vUV;
in vec3 vNormal;
in vec3 vWorldPos;

uniform sampler2D uAtlas;
uniform vec3 uLightDir;

out vec4 fragColor;

vec3 srgbToLinear(vec3 c) {
  return pow(max(c, vec3(0.0)), vec3(2.2));
}

vec3 linearToSrgb(vec3 c) {
  return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
}

void main() {
  vec2 uv = clamp(vUV, vec2(0.001), vec2(0.999));
  vec4 atlasColor = texture(uAtlas, uv);
  if (atlasColor.a < 0.035) {
    discard;
  }

  vec3 base = srgbToLinear(atlasColor.rgb);
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightDir);
  vec3 viewDir = normalize(vec3(0.0, 0.0, 3.2) - vWorldPos);
  vec3 halfDir = normalize(lightDir + viewDir);

  float diffuse = max(dot(normal, lightDir), 0.0);
  float front = clamp(normal.z * 0.75 + 0.35, 0.0, 1.0);
  float specular = pow(max(dot(normal, halfDir), 0.0), 34.0) * 0.12;
  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.4) * 0.16;

  vec3 ambient = mix(vec3(0.16, 0.17, 0.22), vec3(0.22, 0.23, 0.29), front);
  vec3 color = base * (ambient + diffuse * vec3(0.82, 0.80, 0.74));
  color += vec3(0.24, 0.34, 0.42) * rim;
  color += vec3(1.0, 0.92, 0.82) * specular;
  color = color / (color + vec3(1.0));

  float alpha = smoothstep(0.035, 0.22, atlasColor.a);
  fragColor = vec4(linearToSrgb(color), alpha);
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Portrait3D shader error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Portrait3D program error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
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

function mat4RotateY(angle: number): Float32Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, 0, s, 0,
    0, 1, 0, 0,
    -s, 0, c, 0,
    0, 0, 0, 1,
  ]);
}

function mat4RotateX(angle: number): Float32Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
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

function mat4Scale(scale: number): Float32Array {
  return new Float32Array([
    scale, 0, 0, 0,
    0, scale, 0, 0,
    0, 0, scale, 0,
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

function loadAtlasTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const texture = gl.createTexture();
    if (!texture) {
      reject(new Error('Unable to create atlas texture'));
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      resolve(texture);
    };
    image.onerror = () => reject(new Error(`Failed to load atlas texture: ${url}`));
    image.src = url;
  });
}

function finiteNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

const VERTEX_STRIDE_FLOATS = 8; // x y z u v nx ny nz

function buildGeometry(mesh: PortraitMeshJson): GeometryBuffers {
  if (
    mesh.type !== 'portrait_3d_mesh' ||
    mesh.layout !== 'x y z u v nx ny nz' ||
    !Array.isArray(mesh.vertices) ||
    !Array.isArray(mesh.indices)
  ) {
    throw new Error('Invalid portrait 3D mesh');
  }

  const vertexRows = mesh.vertices;
  if (vertexRows.length < 4) {
    throw new Error('Portrait 3D mesh has no vertices');
  }

  const vertexData = new Float32Array(vertexRows.length * VERTEX_STRIDE_FLOATS);

  vertexRows.forEach((rawVertex, index) => {
    if (!Array.isArray(rawVertex) || rawVertex.length < VERTEX_STRIDE_FLOATS) {
      throw new Error('Invalid portrait 3D vertex');
    }

    const values = rawVertex.slice(0, VERTEX_STRIDE_FLOATS).map(finiteNumber);
    if (values.some((value) => value === null)) {
      throw new Error('Portrait 3D vertex contains non-finite values');
    }

    const offset = index * VERTEX_STRIDE_FLOATS;
    // Use vertex positions directly - they are already in world space
    vertexData[offset + 0] = values[0] as number;
    vertexData[offset + 1] = values[1] as number;
    vertexData[offset + 2] = values[2] as number;
    vertexData[offset + 3] = Math.max(0, Math.min(1, values[3] as number));
    vertexData[offset + 4] = Math.max(0, Math.min(1, values[4] as number));
    vertexData[offset + 5] = values[5] as number;
    vertexData[offset + 6] = values[6] as number;
    vertexData[offset + 7] = values[7] as number;
  });

  const indexValues = mesh.indices.map((rawIndex) => Number(rawIndex));
  if (indexValues.length < 3 || indexValues.length % 3 !== 0) {
    throw new Error('Invalid portrait 3D index buffer');
  }
  for (const index of indexValues) {
    if (!Number.isInteger(index) || index < 0 || index >= vertexRows.length) {
      throw new Error('Portrait 3D index out of range');
    }
  }

  const indexType = vertexRows.length > 65535 ? 0x1405 : 0x1403;
  const indexData = indexType === 0x1405 ? new Uint32Array(indexValues) : new Uint16Array(indexValues);

  return {
    vertexData,
    indexData,
    indexType,
    indexCount: indexValues.length,
  };
}

async function fetchGeometry(meshUrl: string, signal: AbortSignal): Promise<GeometryBuffers> {
  const response = await fetch(meshUrl, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load portrait 3D mesh: ${response.status}`);
  }
  return buildGeometry((await response.json()) as PortraitMeshJson);
}

export const Portrait3DViewer: React.FC<Portrait3DViewerProps> = ({
  atlasUrl,
  meshUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const rotationRef = useRef({ x: -0.02, y: 0.0, zoom: -2.8 });
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const initGL = useCallback(async (signal: AbortSignal) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error('Portrait 3D canvas missing');
    }

    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!gl) {
      throw new Error('WebGL2 is not available');
    }

    const geometry = await fetchGeometry(meshUrl, signal);
    if (signal.aborted) return undefined;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vertexShader || !fragmentShader) {
      throw new Error('Portrait 3D shader compilation failed');
    }

    const program = linkProgram(gl, vertexShader, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!program) {
      throw new Error('Portrait 3D program linking failed');
    }

    const vao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    if (!vao || !vertexBuffer || !indexBuffer) {
      throw new Error('Unable to create portrait 3D buffers');
    }

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertexData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indexData, gl.STATIC_DRAW);

    const stride = VERTEX_STRIDE_FLOATS * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 3 * 4);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 5 * 4);
    gl.bindVertexArray(null);

    const atlasTexture = await loadAtlasTexture(gl, atlasUrl);
    if (signal.aborted) {
      gl.deleteTexture(atlasTexture);
      return undefined;
    }

    const uAtlasLoc = gl.getUniformLocation(program, 'uAtlas');
    const uLightDirLoc = gl.getUniformLocation(program, 'uLightDir');
    const uMvpLoc = gl.getUniformLocation(program, 'uMVP');
    const uModelLoc = gl.getUniformLocation(program, 'uModel');

    gl.useProgram(program);
    gl.uniform1i(uAtlasLoc, 0);
    gl.uniform3f(uLightDirLoc, 0.46, 0.68, 0.58);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.031, 0.035, 0.051, 0.0);

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
      // Y rotation: free 360° spin so the user can see all 4 atlas views.
      rotationRef.current.y = rotationRef.current.y + dx * 0.006;
      rotationRef.current.x = Math.max(-0.28, Math.min(0.24, rotationRef.current.x + dy * 0.005));
    };
    const onPointerUp = () => {
      dragRef.current.active = false;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      rotationRef.current.zoom = Math.max(-4.4, Math.min(-1.8, rotationRef.current.zoom + event.deltaY * 0.002));
    };
    const onDoubleClick = () => {
      rotationRef.current = { x: -0.02, y: 0.0, zoom: -2.8 };
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDoubleClick);

    const render = (time: number) => {
      animationRef.current = requestAnimationFrame(render);
      if (canvas.width <= 0 || canvas.height <= 0) return;

      const idle = Math.sin(time * 0.00035) * 0.08;
      const model = mat4Mul(
        mat4Mul(mat4RotateY(rotationRef.current.y + idle), mat4RotateX(rotationRef.current.x)),
        mat4Scale(0.95),
      );
      const view = mat4Translate(0, 0.02, rotationRef.current.zoom);
      const projection = mat4Perspective(Math.PI / 4.8, canvas.width / canvas.height, 0.01, 100.0);
      const mvp = mat4Mul(projection, mat4Mul(view, model));

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniformMatrix4fv(uMvpLoc, false, mvp);
      gl.uniformMatrix4fv(uModelLoc, false, model);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.bindVertexArray(vao);
      gl.drawElements(gl.TRIANGLES, geometry.indexCount, geometry.indexType, 0);
      gl.bindVertexArray(null);
    };

    setReady(true);
    setFailed(false);
    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDoubleClick);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(atlasTexture);
      gl.deleteProgram(program);
    };
  }, [atlasUrl, meshUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    setReady(false);
    setFailed(false);

    initGL(controller.signal)
      .then((teardown) => {
        cleanup = teardown;
        if (cancelled && cleanup) cleanup();
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error('Portrait3D viewer error:', error);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (cleanup) cleanup();
      cancelAnimationFrame(animationRef.current);
    };
  }, [initGL]);

  return (
    <div ref={containerRef} className="portrait-3d">
      <div className="portrait-3d__floor" />
      <canvas className="portrait-3d__canvas" ref={canvasRef} />
      <div className="portrait-3d__header">
        <div>
          <div className="portrait-3d__eyebrow">PORTRAIT 3D MESH</div>
          <div className="portrait-3d__title">数字人预览</div>
        </div>
        <span className="portrait-3d__badge">3D</span>
      </div>
      {!ready && !failed && <div className="portrait-3d__state">加载 3D 预览中</div>}
      {failed && <div className="portrait-3d__state portrait-3d__state--error">3D 预览不可用</div>}
    </div>
  );
};

export default Portrait3DViewer;
