import React, { useState, useCallback } from "react";
import { Modal, Input, Button } from "antd";
import InkCanvas, { InkSignature, SignatureRejectReason, AnchorPoint as CanvasAnchorPoint } from "../InkCanvas";
import { getLastNickname } from "@/services/api";
import type { InkSignature as InkSignatureType } from "@/types/task";
import { userApi } from "@/services/api";

/** 设计师风格昵称 — 前缀+后缀自由碰撞，组合≤4字 */
const NICK_PREFIX = [
  "马良", "墨白", "青禾", "拾光", "木心",
  "云舟", "浅语", "素笺", "画眉", "风铃",
  "秋水", "南枝", "初墨", "清欢", "长歌",
  "竹影", "暮雪", "晚星", "浮光", "听澜",
  "逐风", "扶摇", "流火", "踏雪", "望舒",
  "素履", "怀瑾", "知秋", "临渊", "揽月",
  "沐风", "观复", "抱朴", "听雨", "折柳",
  "灵犀", "点翠", "描金", "织锦", "染霜",
  "画骨", "凝霞", "落樱", "宿云", "栖霞",
  "吟风", "弄影", "追光", "捕影", "融雪",
  "疏桐", "寻烟", "点绛", "惜春", "裁云",
  "镂月", "寒江", "研朱", "滴墨", "挥毫",
  "泼墨", "留白", "题跋", "钤印", "慕白",
  "寻梦", "问月", "忆江", "思远", "念安",
  "织梦", "绣风", "陶然", "酌影", "阅川",
  "牧云", "采薇", "漱石", "枕流", "观鱼",
  "照花", "映雪", "煮茗", "焚香", "调弦",
];

const NICK_SUFFIX = [
  "", "", "", "", "",  // 50% 概率不加后缀，直接用前缀
  "儿", "也", "兮", "之", "然",
];

/** 随机生成昵称：前缀+后缀碰撞，总长≤4字 */
function randomNickname(current: string): string {
  for (let attempt = 0; attempt < 30; attempt++) {
    const pre = NICK_PREFIX[Math.floor(Math.random() * NICK_PREFIX.length)];
    const suf = NICK_SUFFIX[Math.floor(Math.random() * NICK_SUFFIX.length)];
    const name = pre + suf;
    if (name.length <= 4 && name !== current) return name;
  }
  return NICK_PREFIX[Math.floor(Math.random() * NICK_PREFIX.length)];
}

interface AuthModalProps {
  open: boolean;
  onLogin: (token: string, user: Record<string, unknown>, signature?: InkSignatureType) => void;
  onRegister: (
    nickName: string,
    signature: InkSignature,
  ) => Promise<{ token: string; user: { id: string; nick_name: string } }>;
  onLoginBySignature: (
    nickName: string,
    signature: InkSignature,
  ) => Promise<{ token: string; user: { id: string; nick_name: string } }>;
}

type AuthMode = "login" | "register";
type AuthStep = 1 | 2; // 1=昵称, 2=画布

const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onLogin,
  onRegister,
  onLoginBySignature,
}) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>(1);
  const [nickName, setNickName] = useState(() => {
    try {
      const last = getLastNickname();
      if (last) return last;
      const raw = localStorage.getItem('aigc_user_info');
      if (raw) return JSON.parse(raw).nick_name || '';
    } catch {}
    return '';
  });
  const [signature, setSignature] = useState<InkSignature | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingNick, setCheckingNick] = useState(false);
  const [error, setError] = useState("");
  const [hintAnchors, setHintAnchors] = useState<{ start?: CanvasAnchorPoint; end?: CanvasAnchorPoint } | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);

  // 弹窗打开时，重置所有状态
  React.useEffect(() => {
    if (open) {
      setMode("login");
      setStep(1);
      setNickName(() => {
        try {
          const last = getLastNickname();
          if (last) return last;
          const raw = localStorage.getItem('aigc_user_info');
          if (raw) return JSON.parse(raw).nick_name || '';
        } catch {}
        return '';
      });
      setSignature(null);
      setLoading(false);
      setCheckingNick(false);
      setError("");
      setHintAnchors(null);
      setCanvasKey(0);
    }
  }, [open]);

  const handleSignatureReject = useCallback(
    (_reason: SignatureRejectReason, message: string) => {
      setError(message);
      setSignature(null);
    },
    [],
  );

  const reset = useCallback(() => {
    setNickName("");
    setStep(1);
    setSignature(null);
    setError("");
  }, []);

  const switchMode = useCallback(() => {
    reset();
    setMode((m) => (m === "login" ? "register" : "login"));
  }, [reset]);

  const handleCanvasComplete = useCallback((sig: InkSignature) => {
    setSignature(sig);
    setError("");
  }, []);

  /** 登录第一步：昵称提交 → 进入画布 */
  const handleLoginNickNext = useCallback(async () => {
    const name = nickName.trim();
    if (!name) {
      setError("请输入昵称");
      return;
    }
    setHintAnchors(null);
    setStep(2);
    setError("");
    // 异步获取签名提示锚点
    try {
      const hint = await userApi.getSignatureHint(name);
      if (hint.anchors && hint.anchors.length >= 2) {
        setHintAnchors({ start: hint.anchors[0], end: hint.anchors[1] });
      }
    } catch {
      // 提示获取失败不影响登录流程
    }
  }, [nickName]);

  /** 注册第一步：昵称校验 + 进入画布 */
  const handleRegisterNickNext = useCallback(async () => {
    const name = nickName.trim();
    if (!name) {
      setError("请输入昵称");
      return;
    }
    setCheckingNick(true);
    setError("");
    try {
      const available = await userApi.checkNickname(name);
      if (!available) {
        setError("该昵称已被占用，请换一个");
      } else {
        setStep(2);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "校验失败，请重试");
    } finally {
      setCheckingNick(false);
    }
  }, [nickName]);

  /** 登录第二步：提交签名 */
  const handleLogin = useCallback(async () => {
    if (!signature) {
      setError("请先绘制你的签名");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await onLoginBySignature(nickName.trim(), signature);
      onLogin(result.token, result.user, signature);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "昵称或签名不匹配，请重试");
      setSignature(null);
      setCanvasKey((k) => k + 1);  // force canvas reset + redraw anchors
    } finally {
      setLoading(false);
    }
  }, [nickName, signature, onLoginBySignature, onLogin]);

  /** 注册第二步：提交注册 */
  const handleRegister = useCallback(async () => {
    if (!nickName.trim()) {
      setError("请输入昵称");
      return;
    }
    if (!signature) {
      setError("请先绘制你的签名");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await onRegister(nickName.trim(), signature);
      onLogin(result.token, result.user, signature);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "注册失败，请尝试不同的笔迹");
    } finally {
      setLoading(false);
    }
  }, [nickName, signature, onRegister, onLogin]);

  // 共用的画布尺寸
  const canvasSize = 390;

  const isLogin = mode === "login";
  const title = isLogin
    ? "🖌️ 签名登录"
    : step === 1
    ? "✨ 创建账号"
    : "✨ 创建签名";

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      centered
      width={490}
      styles={{
        body: { padding: 0, overflow: "visible" },
        mask: { backgroundColor: "rgba(0,0,0,0.6)" },
      }}
    >
      <div
        style={{
          padding: "32px 32px 24px",
          background: "var(--c-bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--c-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 20,
            fontSize: 18,
            fontWeight: 600,
            color: "var(--c-text)",
          }}
        >
          {title}
        </div>

        {/* ── Step 1: 昵称输入 ── */}
        {step === 1 && (
          <>
            <Input
              size="large"
              placeholder="输入你的昵称"
              value={nickName}
              onChange={(e) => {
                setNickName(e.target.value);
                setError("");
              }}
              onPressEnter={isLogin ? handleLoginNickNext : handleRegisterNickNext}
              maxLength={4}
              suffix={!isLogin ? (
                <Button
                  type="link"
                  size="small"
                  style={{ color: "var(--c-accent)", padding: 0, fontSize: 13, whiteSpace: "nowrap" }}
                  onClick={() => {
                    setNickName(randomNickname(nickName));
                    setError("");
                  }}
                >
                  换一个
                </Button>
              ) : undefined}
              style={{
                borderRadius: "var(--radius-sm)",
                background: "rgba(14,16,24,0.6)",
                border: "1px solid rgba(129,140,248,0.25)",
                color: "var(--c-text)",
                height: 44,
              }}
            />
            {error && (
              <div
                style={{
                  color: "#f87171",
                  textAlign: "center",
                  fontSize: 13,
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                {error}
              </div>
            )}
            <Button
              block
              loading={checkingNick}
              onClick={isLogin ? handleLoginNickNext : handleRegisterNickNext}
              disabled={!nickName.trim()}
              style={{
                height: 44,
                marginTop: 12,
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
                background: nickName.trim()
                  ? "linear-gradient(135deg, var(--c-primary), var(--c-accent))"
                  : undefined,
                border: "none",
                color: "#fff",
              }}
            >
              下一步
            </Button>
            <div style={{ textAlign: "center", marginTop: 16, marginBottom: 8 }}>
              <Button
                type="link"
                style={{ color: "var(--c-text-muted)", padding: 0, fontSize: 13 }}
                onClick={switchMode}
              >
                {isLogin ? "没有账号？去注册" : "已有账号，去登录"}
              </Button>
            </div>
          </>
        )}

        {/* ── Step 2: 画布签名 ── */}
        {step === 2 && (
          <>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <span style={{ color: "var(--c-text-secondary)", fontSize: 13 }}>
                {isLogin ? (
                  <>
                    <span style={{ color: "var(--c-primary-light)", fontWeight: 600 }}>{nickName}</span> 请输入你的签名
                  </>
                ) : (
                  <>
                    <span style={{ color: "var(--c-primary-light)", fontWeight: 600 }}>{nickName}</span> 绘制签名
                  </>
                )}
              </span>
            </div>
            {!isLogin && (
              <div
                style={{
                  textAlign: "center",
                  marginBottom: 8,
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "rgba(251,191,36,0.12)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  color: "#fbbf24",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              >
                ⚠️ 签名即密码，请一定记住笔迹！！！
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <InkCanvas
                key={canvasKey}
                width={canvasSize}
                height={canvasSize}
                onComplete={handleCanvasComplete}
                onReject={handleSignatureReject}
                placeholder={isLogin ? `${nickName} 请输入你的签名` : `${nickName} 请绘制你的签名，请用一笔画连续笔迹制作签名`}
                anchors={isLogin ? hintAnchors ?? undefined : undefined}
              />
            </div>
            {signature && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--c-primary-light)",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                ✓ {isLogin ? "签名已绘制" : "签名已绘制，请记住你的笔迹"}
              </div>
            )}
            {error && (
              <div
                style={{
                  color: "#f87171",
                  textAlign: "center",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                {error}
              </div>
            )}
            <Button
              block
              loading={loading}
              onClick={isLogin ? handleLogin : handleRegister}
              disabled={!signature}
              style={{
                height: 44,
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
                background: signature
                  ? "linear-gradient(135deg, var(--c-primary), var(--c-accent))"
                  : undefined,
                border: "none",
                color: "#fff",
              }}
            >
              {isLogin ? "登录" : "注册"}
            </Button>
            <div
              style={{
                textAlign: "center",
                marginTop: 16,
                marginBottom: 8,
                display: "flex",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <Button
                type="link"
                style={{ color: "var(--c-text-muted)", padding: 0, fontSize: 13 }}
                onClick={() => {
                  setStep(1);
                  setSignature(null);
                  setError("");
                }}
              >
                ← 返回修改昵称
              </Button>
              <Button
                type="link"
                style={{ color: "var(--c-text-muted)", padding: 0, fontSize: 13 }}
                onClick={switchMode}
              >
                {isLogin ? "没有账号？去注册" : "已有账号，去登录"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AuthModal;
