import React, { useRef, useEffect, useCallback, useState } from "react";

/** 锚点坐标 */
export interface AnchorPoint {
  x: number;  // [0,1] 标准化坐标
  y: number;
}

/** 笔迹量化结果 — 3×3 网格，保留遍历顺序 + 方向编码 */
export interface InkSignature {
  grid_traversal: number[];       // 有序格子序列（保留重复），如 [0,0,1,4,4,3,3,6]
  grid_traversal_coarse: number[]; // 同上但粗粒度（弃用，为了兼容保留空数组）
  direction_sequence: number[];   // 每步方向编码 0-7 (→↘↓↙←↖↑↗)，长度 = grid_traversal.length - 1
  unique_cells: number;           // 穿过的唯一格子数
  start?: AnchorPoint;            // 签名起点锚点
  end?: AnchorPoint;              // 签名终点锚点
  raw_points?: { x: number; y: number }[]; // 原始标准化笔迹点序列 [0,1]，用于还原真实笔迹展示
}

/** 签名过于简单时的拒绝原因 */
export type SignatureRejectReason =
  | "too_few_cells"
  | "too_few_cells_coarse"
  | "bounding_box_too_narrow";

interface InkCanvasProps {
  width?: number;
  height?: number;
  onComplete: (signature: InkSignature) => void;
  onStrokeStart?: () => void;
  onReject?: (reason: SignatureRejectReason, message: string) => void;
  placeholder?: string;
  anchors?: { start?: AnchorPoint; end?: AnchorPoint };  // 登录提示锚点
}

// ── 签名复杂度阈值 ──
const GRID_SIZE = 3;
const MIN_UNIQUE_CELLS = 4; // 3×3 网格要求至少穿过 4 个格子

/** 方向编码：0=→, 1=↘, 2=↓, 3=↙, 4=←, 5=↖, 6=↑, 7=↗ */
function encodeDirection(dx: number, dy: number): number {
  // dy>0 means down (canvas y increases downward)
  const angle = Math.atan2(dy, dx); // -PI..PI
  // shift to 0..2PI and quantize to 8 sectors
  const sector = Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
  return sector;
}

const DIR_ARROWS = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];

/** 将标准化坐标映射到 3×3 网格格子编号（保留顺序和重复） */
function quantizeTraversal(
  points: { x: number; y: number }[],
  gridSize: number,
): number[] {
  const result: number[] = [];
  for (const p of points) {
    const col = Math.min(Math.floor(p.x * gridSize), gridSize - 1);
    const row = Math.min(Math.floor(p.y * gridSize), gridSize - 1);
    result.push(row * gridSize + col);
  }
  // Collapse consecutive duplicates (stay in same cell → single entry)
  const collapsed: number[] = [result[0]];
  for (let i = 1; i < result.length; i++) {
    if (result[i] !== result[i - 1]) {
      collapsed.push(result[i]);
    }
  }
  return collapsed;
}

/** 前端签名复杂度校验 */
function checkSignatureComplexity(
  gridTraversal: number[],
): { reason: SignatureRejectReason; message: string } | null {
  const uniqueCells = new Set(gridTraversal).size;
  if (uniqueCells < MIN_UNIQUE_CELLS) {
    return {
      reason: "too_few_cells",
      message: `笔迹太简单，仅穿过 ${uniqueCells} 个网格（需≥${MIN_UNIQUE_CELLS}），请画更复杂的笔迹`,
    };
  }
  return null;
}

const InkCanvas: React.FC<InkCanvasProps> = ({
  width = 260,
  height = 260,
  onComplete,
  onStrokeStart,
  onReject,
  placeholder = "在此画一笔",
  anchors,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const interruptedRef = useRef(false);
  const [drawing, setDrawing] = useState(false);

  /** 绘制锚点提示（起点绿、终点红），边缘自适应 */
  const drawAnchors = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !anchors) return;
    const DOT_R = 5;
    const GLOW_R = 10;
    const MARGIN = GLOW_R + 2;  // 保证光晕不溢出
    const drawDot = (pt: AnchorPoint, color: string, label: string) => {
      // 钳位坐标，确保光晕圆完整显示
      const cx = Math.max(MARGIN, Math.min(width - MARGIN, pt.x * width));
      const cy = Math.max(MARGIN, Math.min(height - MARGIN, pt.y * height));
      // outer glow
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, GLOW_R, 0, Math.PI * 2);
      ctx.fillStyle = color.replace("1)", "0.2)");
      ctx.fill();
      // inner dot
      ctx.beginPath();
      ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      // label — 自适应位置：顶部放不下就放底部
      ctx.font = "10px sans-serif";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      const labelY = cy - GLOW_R - 4 < 10 ? cy + GLOW_R + 12 : cy - GLOW_R - 4;
      ctx.fillText(label, cx, labelY);
      ctx.restore();
    };
    if (anchors.start) drawDot(anchors.start, "rgba(74,222,128,1)", "起");
    if (anchors.end) drawDot(anchors.end, "rgba(248,113,113,1)", "终");
  }, [width, height, anchors]);

  /** 绘制 3×3 虚线网格背景 */
  const drawGrid = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(129,140,248,0.18)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i++) {
      const pos = (width / GRID_SIZE) * i;
      // vertical
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, height); ctx.stroke();
      // horizontal
      ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(width, pos); ctx.stroke();
    }
    ctx.restore();
  }, [width, height]);

  const reset = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    drawAnchors();
    pointsRef.current = [];
    drawingRef.current = false;
    interruptedRef.current = false;
    setDrawing(false);
  }, [width, height, drawGrid, drawAnchors]);

  const finishStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setDrawing(false);

    const pts = pointsRef.current;
    if (pts.length < 5) {
      reset();
      return;
    }

    // 标准化：平移到原点 → 等比缩放到 [0,1] 正方形
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.max(rangeX, rangeY);
    const normalized = pts.map((p) => ({
      x: (p.x - minX) / scale,
      y: (p.y - minY) / scale,
    }));

    // 有序量化（保留遍历顺序，去连续重复）
    const gridTraversal = quantizeTraversal(normalized, GRID_SIZE);

    // 方向编码：每相邻两步之间计算方向
    const dirSequence: number[] = [];
    for (let i = 1; i < gridTraversal.length; i++) {
      const prevRow = Math.floor(gridTraversal[i - 1] / GRID_SIZE);
      const prevCol = gridTraversal[i - 1] % GRID_SIZE;
      const curRow = Math.floor(gridTraversal[i] / GRID_SIZE);
      const curCol = gridTraversal[i] % GRID_SIZE;
      dirSequence.push(encodeDirection(curCol - prevCol, curRow - prevRow));
    }

    const uniqueCells = new Set(gridTraversal).size;

    // 复杂度校验
    const rejection = checkSignatureComplexity(gridTraversal);
    if (rejection && onReject) {
      onReject(rejection.reason, rejection.message);
      reset();
      return;
    }

    onComplete({
      grid_traversal: gridTraversal,
      grid_traversal_coarse: [],
      direction_sequence: dirSequence,
      unique_cells: uniqueCells,
      start: { x: normalized[0].x, y: normalized[0].y },
      end: { x: normalized[normalized.length - 1].x, y: normalized[normalized.length - 1].y },
      raw_points: normalized,
    });
    // 只重置绘制状态，保留笔迹可见；下次落笔时再清空
    pointsRef.current = [];
    drawingRef.current = false;
    interruptedRef.current = false;
    setDrawing(false);
  }, [onComplete, onReject, reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#818cf8";
    drawGrid();
    drawAnchors();
  }, [width, height, drawGrid, drawAnchors]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX; clientY = e.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (pointsRef.current.length > 0 && !drawingRef.current) reset();
    if (drawingRef.current) { interruptedRef.current = true; reset(); }
    drawingRef.current = true;
    setDrawing(true);
    onStrokeStart?.();
    const pos = getPos(e);
    pointsRef.current = [pos];
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawingRef.current) return;
    const pos = getPos(e);
    pointsRef.current.push(pos);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    finishStroke();
  };

  const handleMouseLeave = () => {
    if (drawingRef.current) finishStroke();
  };

  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (drawingRef.current) finishStroke();
    };
    document.addEventListener("mouseup", onGlobalMouseUp);
    return () => document.removeEventListener("mouseup", onGlobalMouseUp);
  }, [finishStroke]);

  return (
    <div style={{ position: "relative", width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: "1px solid rgba(129,140,248,0.3)",
          borderRadius: 12,
          cursor: "crosshair",
          touchAction: "none",
          background: "rgba(14,16,24,0.6)",
        }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      {!drawing && pointsRef.current.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            color: "rgba(129,140,248,0.35)",
            fontSize: 14,
            whiteSpace: "pre-line",
            textAlign: "center",
          }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
};

export { DIR_ARROWS };
export default InkCanvas;
