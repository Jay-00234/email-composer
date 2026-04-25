import { useState, useRef, useEffect } from "react";

const TONE_PRESETS = [
  { id: "auto", label: "自动判断", desc: "根据收件人自动选择" },
  { id: "formal", label: "正式", desc: "教授、HR、客户" },
  { id: "professional", label: "职业", desc: "同事、经理" },
  { id: "friendly", label: "友好", desc: "同学、熟人" },
  { id: "casual", label: "随意", desc: "朋友、日常" },
  { id: "firm", label: "坚定礼貌", desc: "投诉、拒绝" },
];

const SCENARIOS = [
  { id: "reply", label: "回复邮件", icon: "↩" },
  { id: "compose", label: "写新邮件", icon: "✉" },
  { id: "followup", label: "跟进/催促", icon: "🔄" },
  { id: "decline", label: "委婉拒绝", icon: "✗" },
];

const RECIPIENTS = [
  "教授", "同学", "HR/面试官", "客户", "同事", "经理/老板",
  "客服", "房东", "校友/Networking", "其他",
];

export default function EmailComposer() {
  const [scenario, setScenario] = useState("reply");
  const [originalEmail, setOriginalEmail] = useState("");
  const [intent, setIntent] = useState("");
  const [recipient, setRecipient] = useState("");
  const [toneId, setToneId] = useState("auto");
  const [customTone, setCustomTone] = useState("");
  const [language, setLanguage] = useState("en");
  const [extraNotes, setExtraNotes] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [revising, setRevising] = useState(false);
  const [versions, setVersions] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const buildPrompt = () => {
    const scenarioLabel = SCENARIOS.find(s => s.id === scenario)?.label || scenario;
    const toneLabel = toneId === "auto"
      ? "根据收件人自动判断"
      : toneId === "custom"
        ? customTone
        : TONE_PRESETS.find(t => t.id === toneId)?.label || toneId;

    let prompt = `请根据以下信息帮我撰写一封邮件。\n\n`;
    prompt += `场景: ${scenarioLabel}\n`;
    prompt += `收件人: ${recipient || "未指定"}\n`;
    prompt += `语气: ${toneLabel}\n`;
    prompt += `语言: ${language === "en" ? "英文" : language === "zh" ? "中文" : "其他"}\n`;

    if (scenario === "reply" && originalEmail.trim()) {
      prompt += `\n原始邮件:\n${originalEmail.trim()}\n`;
    }

    prompt += `\n我想表达的内容:\n${intent.trim()}\n`;

    if (extraNotes.trim()) {
      prompt += `\n额外说明: ${extraNotes.trim()}\n`;
    }

    prompt += `\n请直接给我写好的邮件(包括Subject)，然后用1-2句中文简要说明你的选择。`;
    return prompt;
  };

  const handleGenerate = async () => {
    if (!intent.trim()) {
      setError("请至少告诉我你想表达什么");
      return;
    }
    setError("");
    setLoading(true);
    setResult("");
    setCopied(false);
    setRevisionNote("");
    setVersions([]);
    setHistoryOpen(false);
    setPreviewIdx(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are an email writing assistant. Follow these rules strictly:

VOICE: natural, conversational English, not overly formal.

STRUCTURE: 3-5 short paragraphs, 1-3 sentences each. First sentence gets to the point. Last paragraph has a clear next step.

STYLE RULES:
- Simple direct sentences, mostly under 20 words
- Common words over fancy synonyms (get not obtain, help not assist)
- Frequently use: just following up, quick update, let me know if, would you be open to, thanks for your time, I was wondering if
- Sign off: Best, Best regards, Thanks, or Thank you

DO NOT:
- Use filler like "I hope this email finds you well"
- Use complex vocabulary to sound impressive
- Write walls of text
- Use excessive exclamation marks (max 1 per email)
- Use words like delighted, thrilled, ecstatic
- Use excessive em dashes or double quotes for emphasis
- Start every sentence with "I"

SUBJECT LINE: Short and specific, under 10 words.

TONE MAPPING (auto mode):
- Professor: respectful, slightly formal
- Classmate: casual, friendly
- HR: professional, not desperate
- Client: professional, reassuring
- Colleague: direct, friendly
- Customer service: polite, factual, firm
- Networking: warm, brief

OUTPUT: Write the email first (with Subject line), then add 1-2 sentences in Chinese explaining your choices.`,
          messages: [{ role: "user", content: buildPrompt() }],
        }),
      });

      const data = await response.json();
      const text = data.content
        ?.map(item => (item.type === "text" ? item.text : ""))
        .filter(Boolean)
        .join("\n") || "生成失败，请重试";
      setResult(text);
      setVersions([{
        content: text,
        note: "初版",
        timestamp: new Date(),
      }]);
    } catch (err) {
      setError("请求失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const emailOnly = result.split(/\n(?:---|\n说明|解释|备注|我的选择)/)[0].trim();
    navigator.clipboard.writeText(emailOnly).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendToChat = (msg) => {
    if (typeof sendPrompt === "function") sendPrompt(msg);
  };

  const handleRevise = async () => {
    if (!revisionNote.trim()) return;
    setRevising(true);
    setError("");
    setCopied(false);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are an email writing assistant. Follow these rules strictly:

VOICE: natural, conversational English, not overly formal.

STRUCTURE: 3-5 short paragraphs, 1-3 sentences each. First sentence gets to the point. Last paragraph has a clear next step.

STYLE RULES:
- Simple direct sentences, mostly under 20 words
- Common words over fancy synonyms (get not obtain, help not assist)
- Frequently use: just following up, quick update, let me know if, would you be open to, thanks for your time, I was wondering if
- Sign off: Best, Best regards, Thanks, or Thank you

DO NOT:
- Use filler like "I hope this email finds you well"
- Use complex vocabulary to sound impressive
- Write walls of text
- Use excessive exclamation marks (max 1 per email)
- Use words like delighted, thrilled, ecstatic
- Use excessive em dashes or double quotes for emphasis
- Start every sentence with "I"

SUBJECT LINE: Short and specific, under 10 words.

OUTPUT: Write the revised email first (with Subject line), then add 1-2 sentences in Chinese explaining what you changed.`,
          messages: [
            { role: "user", content: buildPrompt() },
            { role: "assistant", content: result },
            { role: "user", content: `请根据以下修改意见调整邮件，只改需要改的部分，保持整体结构不变：\n\n${revisionNote.trim()}` },
          ],
        }),
      });

      const data = await response.json();
      const text = data.content
        ?.map(item => (item.type === "text" ? item.text : ""))
        .filter(Boolean)
        .join("\n") || "修改失败，请重试";
      const note = revisionNote.trim();
      setResult(text);
      setVersions(prev => [...prev, {
        content: text,
        note: note,
        timestamp: new Date(),
      }]);
      setRevisionNote("");
      setPreviewIdx(null);
    } catch (err) {
      setError("修改请求失败: " + err.message);
    } finally {
      setRevising(false);
    }
  };

  const handleRollback = (idx) => {
    if (idx < 0 || idx >= versions.length) return;
    const target = versions[idx];
    setVersions(prev => [
      ...prev.slice(0, idx + 1),
      {
        content: target.content,
        note: `回滚到 v${idx + 1}`,
        timestamp: new Date(),
        isRollback: true,
      },
    ]);
    setResult(target.content);
    setPreviewIdx(null);
    setHistoryOpen(false);
  };

  const formatTime = (date) => {
    if (!date) return "";
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  return (
    <div style={{
      fontFamily: "'Newsreader', 'Georgia', serif",
      maxWidth: 680,
      margin: "0 auto",
      padding: "28px 20px",
      color: "var(--text-color, #1a1a1a)",
      background: "transparent",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 700,
          margin: 0,
          letterSpacing: "-0.5px",
          fontFamily: "'Newsreader', Georgia, serif",
        }}>
          Email Composer
        </h1>
        <p style={{
          margin: "6px 0 0",
          fontSize: 14,
          color: "var(--muted-text, #777)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          贴入邮件 · 交代意图 · 一键生成
        </p>
      </div>

      {/* Scenario selector */}
      <Section label="场景">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SCENARIOS.map(s => (
            <Chip
              key={s.id}
              selected={scenario === s.id}
              onClick={() => setScenario(s.id)}
            >
              <span style={{ marginRight: 4 }}>{s.icon}</span>{s.label}
            </Chip>
          ))}
        </div>
      </Section>

      {/* Original email (only for reply) */}
      {scenario === "reply" && (
        <Section label="原始邮件">
          <Textarea
            value={originalEmail}
            onChange={e => setOriginalEmail(e.target.value)}
            placeholder="把收到的邮件贴在这里..."
            rows={6}
          />
        </Section>
      )}

      {/* Recipient */}
      <Section label="收件人是谁">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {RECIPIENTS.map(r => (
            <Chip
              key={r}
              selected={recipient === r}
              onClick={() => setRecipient(r)}
              small
            >
              {r}
            </Chip>
          ))}
        </div>
      </Section>

      {/* Intent */}
      <Section label="你想说什么（用中文简单写就行）">
        <Textarea
          value={intent}
          onChange={e => setIntent(e.target.value)}
          placeholder="比如：告诉他我周三有事，能不能改到周四下午..."
          rows={4}
        />
      </Section>

      {/* Tone */}
      <Section label="语气">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TONE_PRESETS.map(t => (
            <Chip
              key={t.id}
              selected={toneId === t.id}
              onClick={() => { setToneId(t.id); setCustomTone(""); }}
              small
            >
              {t.label}
            </Chip>
          ))}
          <Chip
            selected={toneId === "custom"}
            onClick={() => setToneId("custom")}
            small
          >
            自定义
          </Chip>
        </div>
        {toneId === "custom" && (
          <input
            type="text"
            value={customTone}
            onChange={e => setCustomTone(e.target.value)}
            placeholder="描述你想要的语气，比如：稍微冷淡一点..."
            style={{
              marginTop: 8,
              width: "100%",
              padding: "10px 12px",
              border: "1.5px solid var(--border-color, #ddd)",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              background: "var(--input-bg, #fafafa)",
              color: "inherit",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        )}
      </Section>

      {/* Language */}
      <Section label="语言">
        <div style={{ display: "flex", gap: 6 }}>
          <Chip selected={language === "en"} onClick={() => setLanguage("en")} small>English</Chip>
          <Chip selected={language === "zh"} onClick={() => setLanguage("zh")} small>中文</Chip>
          <Chip selected={language === "other"} onClick={() => setLanguage("other")} small>其他</Chip>
        </div>
      </Section>

      {/* Extra notes */}
      <Section label="其他补充（可选）">
        <Textarea
          value={extraNotes}
          onChange={e => setExtraNotes(e.target.value)}
          placeholder="比如：这个教授比较严肃，或者我跟这个人不太熟..."
          rows={2}
        />
      </Section>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px 0",
          background: loading ? "var(--muted-text, #999)" : "var(--text-color, #1a1a1a)",
          color: "var(--bg-color, #fff)",
          border: "none",
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          cursor: loading ? "not-allowed" : "pointer",
          marginTop: 8,
          transition: "all 0.2s",
        }}
      >
        {loading ? "生成中..." : "生成邮件"}
      </button>

      {error && (
        <p style={{ color: "#c0392b", fontSize: 13, marginTop: 8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          {error}
        </p>
      )}

      {/* Result */}
      {result && (
        <div ref={resultRef} style={{
          marginTop: 28,
          padding: "20px 24px",
          background: "var(--result-bg, #f7f6f3)",
          borderRadius: 12,
          border: "1.5px solid var(--border-color, #e0ddd8)",
          position: "relative",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--muted-text, #888)",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                Generated Email
              </span>
              {versions.length > 0 && (
                <span style={{
                  fontSize: 12,
                  color: "var(--muted-text, #aaa)",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>
                  v{versions.length}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {versions.length > 1 && (
                <button
                  onClick={() => setHistoryOpen(!historyOpen)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    border: "1.5px solid var(--border-color, #ccc)",
                    borderRadius: 6,
                    background: historyOpen ? "var(--text-color, #1a1a1a)" : "transparent",
                    color: historyOpen ? "var(--bg-color, #fff)" : "var(--text-color, #555)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {historyOpen ? "收起历史" : `历史 (${versions.length})`}
                </button>
              )}
              <button
                onClick={handleCopy}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  border: "1.5px solid var(--border-color, #ccc)",
                  borderRadius: 6,
                  background: copied ? "var(--text-color, #1a1a1a)" : "transparent",
                  color: copied ? "var(--bg-color, #fff)" : "var(--text-color, #555)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* History panel */}
          {historyOpen && (
            <div style={{
              marginBottom: 16,
              padding: "12px 14px",
              background: "var(--bg-color, #fff)",
              border: "1.5px solid var(--border-color, #e0ddd8)",
              borderRadius: 8,
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--muted-text, #888)",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                修改历史
              </div>
              {versions.map((v, idx) => {
                const isCurrent = idx === versions.length - 1;
                const isPreviewing = previewIdx === idx;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: "10px 12px",
                      marginBottom: 6,
                      border: isPreviewing
                        ? "1.5px solid var(--text-color, #1a1a1a)"
                        : "1.5px solid var(--border-color, #eee)",
                      borderRadius: 6,
                      background: isCurrent ? "var(--result-bg, #f7f6f3)" : "transparent",
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: isPreviewing ? 8 : 0,
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--text-color, #1a1a1a)",
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                        }}>
                          v{idx + 1}
                        </span>
                        <span style={{
                          fontSize: 11,
                          color: "var(--muted-text, #aaa)",
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                        }}>
                          {formatTime(v.timestamp)}
                        </span>
                        {isCurrent && (
                          <span style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            background: "var(--text-color, #1a1a1a)",
                            color: "var(--bg-color, #fff)",
                            borderRadius: 4,
                            fontWeight: 600,
                            fontFamily: "'DM Sans', system-ui, sans-serif",
                          }}>
                            当前
                          </span>
                        )}
                        <span style={{
                          fontSize: 13,
                          color: "var(--text-color, #555)",
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                          fontStyle: v.isRollback ? "italic" : "normal",
                        }}>
                          {v.note}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setPreviewIdx(isPreviewing ? null : idx)}
                          style={{
                            padding: "4px 10px",
                            fontSize: 11,
                            fontFamily: "'DM Sans', system-ui, sans-serif",
                            border: "1px solid var(--border-color, #ddd)",
                            borderRadius: 4,
                            background: "transparent",
                            color: "var(--text-color, #555)",
                            cursor: "pointer",
                          }}
                        >
                          {isPreviewing ? "收起" : "预览"}
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={() => handleRollback(idx)}
                            style={{
                              padding: "4px 10px",
                              fontSize: 11,
                              fontFamily: "'DM Sans', system-ui, sans-serif",
                              border: "1px solid var(--text-color, #1a1a1a)",
                              borderRadius: 4,
                              background: "var(--text-color, #1a1a1a)",
                              color: "var(--bg-color, #fff)",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            回滚
                          </button>
                        )}
                      </div>
                    </div>
                    {isPreviewing && (
                      <pre style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontSize: 13,
                        lineHeight: 1.6,
                        fontFamily: "'Newsreader', Georgia, serif",
                        margin: 0,
                        padding: "10px 12px",
                        background: "var(--bg-color, #fff)",
                        border: "1px solid var(--border-color, #eee)",
                        borderRadius: 4,
                        color: "var(--text-color, #1a1a1a)",
                        maxHeight: 240,
                        overflowY: "auto",
                      }}>
                        {v.content}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <pre style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 14,
            lineHeight: 1.7,
            fontFamily: "'Newsreader', Georgia, serif",
            margin: 0,
            color: "var(--text-color, #1a1a1a)",
          }}>
            {result}
          </pre>

          {/* Quick action chips */}
          <div style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--border-color, #e0ddd8)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}>
            <SmallBtn onClick={() => { setRevisionNote("更正式一点"); }}>更正式</SmallBtn>
            <SmallBtn onClick={() => { setRevisionNote("更随意一点"); }}>更随意</SmallBtn>
            <SmallBtn onClick={() => { setRevisionNote("缩短一些"); }}>更短</SmallBtn>
            <SmallBtn onClick={() => { setRevisionNote("语气稍微强硬一点"); }}>更强硬</SmallBtn>
            <SmallBtn onClick={() => { setRevisionNote("语气更温和委婉"); }}>更委婉</SmallBtn>
          </div>

          {/* Revision input */}
          <div style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid var(--border-color, #e0ddd8)",
          }}>
            <label style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 8,
              color: "var(--text-color, #555)",
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}>
              修改意见 {versions.length > 1 && (
                <span style={{
                  fontWeight: 400,
                  color: "var(--muted-text, #aaa)",
                  fontSize: 12,
                }}>
                  (已修改 {versions.length - 1} 次)
                </span>
              )}
            </label>
            <Textarea
              value={revisionNote}
              onChange={e => setRevisionNote(e.target.value)}
              placeholder="比如：第二段太客气了，直接说就行；把时间改成下周一；加一句感谢他之前的帮助..."
              rows={3}
            />
            <button
              onClick={handleRevise}
              disabled={revising || !revisionNote.trim()}
              style={{
                marginTop: 8,
                padding: "10px 20px",
                background: (revising || !revisionNote.trim())
                  ? "var(--muted-text, #bbb)"
                  : "var(--text-color, #1a1a1a)",
                color: "var(--bg-color, #fff)",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                cursor: (revising || !revisionNote.trim()) ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {revising ? "修改中..." : "按意见修改"}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <p style={{
        marginTop: 24,
        fontSize: 12,
        color: "var(--muted-text, #aaa)",
        textAlign: "center",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        v1.0 · 风格可迭代 · 有问题随时反馈
      </p>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: "block",
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 8,
        color: "var(--text-color, #333)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Chip({ children, selected, onClick, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? "6px 12px" : "8px 16px",
        fontSize: small ? 13 : 14,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        border: selected ? "1.5px solid var(--text-color, #1a1a1a)" : "1.5px solid var(--border-color, #ddd)",
        borderRadius: 20,
        background: selected ? "var(--text-color, #1a1a1a)" : "transparent",
        color: selected ? "var(--bg-color, #fff)" : "var(--text-color, #555)",
        cursor: "pointer",
        fontWeight: selected ? 600 : 400,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Textarea({ value, onChange, placeholder, rows }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: "12px 14px",
        border: "1.5px solid var(--border-color, #ddd)",
        borderRadius: 10,
        fontSize: 14,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: "var(--input-bg, #fafafa)",
        color: "inherit",
        resize: "vertical",
        boxSizing: "border-box",
        outline: "none",
        lineHeight: 1.6,
      }}
    />
  );
}

function SmallBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        fontSize: 12,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        border: "1px solid var(--border-color, #ddd)",
        borderRadius: 6,
        background: "transparent",
        color: "var(--text-color, #666)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}
