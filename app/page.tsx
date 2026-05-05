"use client";
import { useState, useEffect, useRef } from "react";

const SYSTEM_PROMPT = `Você é um Especialista em Fisiologia do Exercício e Nutrição Esportiva. Sua missão é gerar uma rotina PERSONALIZADA e DETALHADA de treino e alimentação.

REGRAS DE VALIDAÇÃO: Se o usuário informar dados impossíveis (ex: peso acima de 300kg, altura abaixo de 100cm ou acima de 250cm, idade abaixo de 10 ou acima de 100), retorne um JSON com o campo "erro" explicando o problema.

Calcule TMB usando Mifflin-St Jeor:
- Homens: (10 × peso) + (6.25 × altura) − (5 × idade) + 5
- Mulheres: (10 × peso) + (6.25 × altura) − (5 × idade) − 161

Fatores de atividade: Sedentário 1.2, Leve 1.375, Moderado 1.55, Intenso 1.725

Objetivo Emagrecimento: déficit de 400-500 kcal. Proteína: 1.8-2.0g/kg. Carb: 40%, Gordura: 25%
Objetivo Hipertrofia: superávit 300 kcal. Proteína: 2.0-2.2g/kg. Carb: 50%, Gordura: 25%
Objetivo Manutenção: TDEE exato. Proteína: 1.6g/kg. Carb: 45%, Gordura: 30%

RESPONDA ESTRITAMENTE EM JSON (sem markdown, sem backticks) com esta estrutura exata:
{
  "perfil": {
    "tmb": number,
    "tdee": number,
    "metaKcal": number,
    "imc": number,
    "classificacaoImc": string,
    "proteinas_g": number,
    "carboidratos_g": number,
    "gorduras_g": number
  },
  "dieta": {
    "titulo": string,
    "refeicoes": [
      {
        "horario": string,
        "nome": string,
        "alimentos": [{"item": string, "quantidade": string, "kcal": number}],
        "totalKcal": number,
        "macros": {"proteinas": number, "carboidratos": number, "gorduras": number}
      }
    ],
    "totalDiario": {"kcal": number, "proteinas": number, "carboidratos": number, "gorduras": number},
    "dicasGerais": [string]
  },
  "treino": {
    "divisao": string,
    "frequencia": string,
    "dias": [
      {
        "dia": string,
        "foco": string,
        "aquecimento": string,
        "exercicios": [
          {"nome": string, "series": number, "repeticoes": string, "descanso": string, "dica": string}
        ],
        "alongamento": string
      }
    ],
    "orientacoesGerais": [string]
  },
  "resumo": {
    "mensagemMotivacional": string,
    "tempoEstimadoResultado": string,
    "proximosPassos": [string]
  }
}`;

const nivelOptions = ["Sedentário", "Leve", "Moderado", "Intenso"];
const objetivoOptions = ["Emagrecimento", "Hipertrofia", "Manutenção"];
const generoOptions = ["Masculino", "Feminino"];

const MacroBar = ({ label, value, total, color }) => {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "#a0aec0", fontFamily: "'Space Mono', monospace" }}>{label}</span>
        <span style={{ fontSize: "12px", color: "#e2e8f0", fontFamily: "'Space Mono', monospace" }}>{value}g · {pct}%</span>
      </div>
      <div style={{ background: "#1a2035", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 1s ease" }} />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, unit, accent }) => (
  <div style={{
    background: "linear-gradient(135deg, #0f1629 0%, #1a2035 100%)",
    border: `1px solid ${accent}33`,
    borderRadius: "12px",
    padding: "16px",
    textAlign: "center",
    position: "relative",
    overflow: "hidden"
  }}>
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: "2px",
      background: `linear-gradient(90deg, transparent, ${accent}, transparent)`
    }} />
    <div style={{ fontSize: "22px", fontWeight: "700", color: accent, fontFamily: "'Space Mono', monospace" }}>{value}</div>
    <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>{unit}</div>
    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{label}</div>
  </div>
);

const Tag = ({ children, color }) => (
  <span style={{
    background: `${color}22`, color, border: `1px solid ${color}44`,
    borderRadius: "6px", padding: "2px 8px", fontSize: "11px",
    fontFamily: "'Space Mono', monospace", fontWeight: "600"
  }}>{children}</span>
);

"use client";

export default function FitIn() {
  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dieta");
  const [activeDia, setActiveDia] = useState(0);
  const [streamText, setStreamText] = useState("");
  const intervalRef = useRef(null);

  const [form, setForm] = useState({
    idade: "", genero: "Masculino", peso: "", altura: "",
    nivel: "Moderado", objetivo: "Emagrecimento", restricoes: ""
  });

  const messages = [
    "Calculando sua TMB...", "Ajustando macronutrientes...",
    "Montando seu plano alimentar...", "Criando divisão de treinos...",
    "Personalizando exercícios...", "Finalizando seu plano..."
  ];

  useEffect(() => {
    if (loading) {
      let i = 0;
      setStreamText(messages[0]);
      intervalRef.current = setInterval(() => {
        i = (i + 1) % messages.length;
        setStreamText(messages[i]);
      }, 1800);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [loading]);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleGenerate = async () => {
    if (!form.idade || !form.peso || !form.altura) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setError("");
    setLoading(true);
    setStep("loading");

    try {
      const res = await fetch("/api/gerar-plano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: form })
      });
      const parsed = await res.json();

      if (parsed.erro) {
        setError(parsed.erro);
        setStep("form");
      } else {
        setResult(parsed);
        setStep("result");
      }
    } catch (e) {
      setError("Erro ao gerar o plano. Tente novamente.");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const accentColors = { dieta: "#22d3ee", treino: "#a78bfa", resumo: "#34d399" };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080d1a",
      fontFamily: "'Inter', sans-serif",
      color: "#e2e8f0"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f1629; }
        ::-webkit-scrollbar-thumb { background: #22d3ee44; border-radius: 4px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .btn-primary {
          background: linear-gradient(135deg, #22d3ee, #0891b2);
          color: #000; font-weight: 700; border: none; border-radius: 10px;
          padding: 14px 32px; cursor: pointer; font-size: 15px;
          font-family: 'Space Mono', monospace; letter-spacing: 0.5px;
          transition: all 0.2s; width: 100%; margin-top: 8px;
          box-shadow: 0 0 24px #22d3ee33;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 40px #22d3ee55; }
        .input-field {
          background: #0f1629; border: 1px solid #1e3a5f;
          color: #e2e8f0; border-radius: 8px; padding: 10px 14px;
          font-size: 14px; font-family: 'Inter', sans-serif; width: 100%;
          transition: border-color 0.2s;
        }
        .input-field:focus { outline: none; border-color: #22d3ee; box-shadow: 0 0 0 2px #22d3ee22; }
        .tab-btn { background: none; border: none; cursor: pointer; padding: 10px 20px;
          font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase; border-radius: 8px; transition: all 0.2s; }
        .pill-btn { background: #0f1629; border: 1px solid #1e3a5f; color: #64748b;
          border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 12px;
          font-family: 'Space Mono', monospace; transition: all 0.2s; }
        .pill-btn.active { border-color: #a78bfa; color: #a78bfa; background: #a78bfa11; }
        .card { background: linear-gradient(135deg, #0f1629 0%, #131d36 100%);
          border: 1px solid #1e3a5f33; border-radius: 14px; padding: 20px; margin-bottom: 16px;
          animation: fadeIn 0.5s ease; }
        .select-btn { background: #0f1629; border: 1px solid #1e3a5f; color: #94a3b8;
          border-radius: 8px; padding: 9px 14px; cursor: pointer; font-size: 13px;
          transition: all 0.2s; text-align: center; }
        .select-btn.active { border-color: #22d3ee; color: #22d3ee; background: #22d3ee11; }
        .select-btn:hover { border-color: #22d3ee88; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1e3a5f44",
        padding: "0 24px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#080d1acc",
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #22d3ee, #0891b2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px"
          }}>⚡</div>
          <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "15px", color: "#e2e8f0" }}>
            FIT<span style={{ color: "#22d3ee" }}>IN</span>
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#475569", fontFamily: "'Space Mono', monospace" }}>
          POWERED BY CLAUDE
        </span>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "32px 16px 80px" }}>

        {/* FORM */}
        {step === "form" && (
          <div style={{ animation: "fadeIn 0.6s ease" }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ fontSize: "40px", marginBottom: "8px", animation: "float 3s ease-in-out infinite" }}>🏋️</div>
              <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: "26px", fontWeight: "700", margin: "0 0 8px", lineHeight: 1.2 }}>
                Seu plano <span style={{ color: "#22d3ee" }}>100% personalizado</span>
              </h1>
              <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                IA especializada em fisiologia do exercício e nutrição esportiva
              </p>
            </div>

            {error && (
              <div style={{
                background: "#ef444411", border: "1px solid #ef444444", borderRadius: "10px",
                padding: "12px 16px", marginBottom: "16px", color: "#fca5a5", fontSize: "13px"
              }}>⚠️ {error}</div>
            )}

            <div className="card">
              <div style={{ fontSize: "11px", color: "#22d3ee", fontFamily: "'Space Mono', monospace", letterSpacing: "2px", marginBottom: "16px" }}>
                📋 DADOS PESSOAIS
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Idade *</label>
                  <input className="input-field" type="number" placeholder="Ex: 28" value={form.idade}
                    onChange={e => handleChange("idade", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Gênero</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {generoOptions.map(g => (
                      <button key={g} className={`select-btn ${form.genero === g ? "active" : ""}`}
                        onClick={() => handleChange("genero", g)} style={{ fontSize: "12px", padding: "9px 8px" }}>
                        {g === "Masculino" ? "♂ Masc" : "♀ Fem"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Peso (kg) *</label>
                  <input className="input-field" type="number" placeholder="Ex: 75" value={form.peso}
                    onChange={e => handleChange("peso", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Altura (cm) *</label>
                  <input className="input-field" type="number" placeholder="Ex: 170" value={form.altura}
                    onChange={e => handleChange("altura", e.target.value)} />
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Nível de Atividade</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {nivelOptions.map(n => (
                    <button key={n} className={`select-btn ${form.nivel === n ? "active" : ""}`}
                      onClick={() => handleChange("nivel", n)} style={{ fontSize: "12px" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Objetivo Principal</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                  {objetivoOptions.map(o => (
                    <button key={o} className={`select-btn ${form.objetivo === o ? "active" : ""}`}
                      onClick={() => handleChange("objetivo", o)} style={{ fontSize: "11px" }}>
                      {o === "Emagrecimento" ? "🔥 Emagrecer" : o === "Hipertrofia" ? "💪 Hipertrofia" : "⚖️ Manter"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Restrições / Alergias</label>
                <input className="input-field" placeholder="Ex: lactose, glúten, amendoim..." value={form.restricoes}
                  onChange={e => handleChange("restricoes", e.target.value)} />
              </div>
            </div>

            <button className="btn-primary" onClick={handleGenerate}>
              ⚡ GERAR MEU PLANO PERSONALIZADO
            </button>
          </div>
        )}

        {/* LOADING */}
        {step === "loading" && (
          <div style={{ textAlign: "center", padding: "80px 20px", animation: "fadeIn 0.4s ease" }}>
            <div style={{ position: "relative", width: "80px", height: "80px", margin: "0 auto 32px" }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "3px solid transparent", borderTopColor: "#22d3ee",
                animation: "spin 1s linear infinite"
              }} />
              <div style={{
                position: "absolute", inset: "8px", borderRadius: "50%",
                border: "3px solid transparent", borderTopColor: "#a78bfa",
                animation: "spin 1.5s linear infinite reverse"
              }} />
              <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "24px"
              }}>🧬</div>
            </div>
            <p style={{ fontFamily: "'Space Mono', monospace", color: "#22d3ee", fontSize: "13px", animation: "pulse 1.8s ease infinite" }}>
              {streamText}
            </p>
            <p style={{ color: "#475569", fontSize: "12px", marginTop: "8px" }}>Isso pode levar alguns segundos...</p>
          </div>
        )}

        {/* RESULT */}
        {step === "result" && result && (
          <div style={{ animation: "fadeIn 0.6s ease" }}>

            {/* Profile Header */}
            <div style={{
              background: "linear-gradient(135deg, #0f1629, #1a2035)",
              border: "1px solid #22d3ee22",
              borderRadius: "16px", padding: "20px", marginBottom: "20px",
              position: "relative", overflow: "hidden"
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #22d3ee, #a78bfa, #34d399)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#64748b", letterSpacing: "2px", marginBottom: "4px" }}>SEU PLANO</div>
                  <div style={{ fontSize: "18px", fontWeight: "700" }}>{form.objetivo} · {form.genero}</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{form.peso}kg · {form.altura}cm · {form.idade} anos · {form.nivel}</div>
                </div>
                <Tag color="#22d3ee">{result.perfil?.metaKcal} kcal</Tag>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                <StatCard label="TMB" value={result.perfil?.tmb} unit="kcal" accent="#22d3ee" />
                <StatCard label="TDEE" value={result.perfil?.tdee} unit="kcal" accent="#a78bfa" />
                <StatCard label="IMC" value={result.perfil?.imc} unit="" accent="#f59e0b" />
                <StatCard label="Meta" value={result.perfil?.metaKcal} unit="kcal/dia" accent="#34d399" />
              </div>
            </div>

            {/* Macros */}
            <div className="card" style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", color: "#a78bfa", fontFamily: "'Space Mono', monospace", letterSpacing: "2px", marginBottom: "12px" }}>
                📊 DISTRIBUIÇÃO DE MACROS
              </div>
              <MacroBar label="PROTEÍNAS" value={result.perfil?.proteinas_g} total={result.dieta?.totalDiario?.kcal / 4 || 500} color="#22d3ee" />
              <MacroBar label="CARBOIDRATOS" value={result.perfil?.carboidratos_g} total={result.dieta?.totalDiario?.kcal / 4 || 500} color="#a78bfa" />
              <MacroBar label="GORDURAS" value={result.perfil?.gorduras_g} total={result.dieta?.totalDiario?.kcal / 4 || 500} color="#f59e0b" />
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "8px", textAlign: "center" }}>
                {result.perfil?.classificacaoImc}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "20px", background: "#0f1629", padding: "4px", borderRadius: "10px" }}>
              {["dieta", "treino", "resumo"].map(tab => (
                <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    color: activeTab === tab ? "#000" : "#64748b",
                    background: activeTab === tab
                      ? `linear-gradient(135deg, ${accentColors[tab]}, ${accentColors[tab]}99)`
                      : "transparent",
                    fontWeight: activeTab === tab ? "700" : "400"
                  }}>
                  {tab === "dieta" ? "🥗 Dieta" : tab === "treino" ? "🏋️ Treino" : "🎯 Resumo"}
                </button>
              ))}
            </div>

            {/* DIETA TAB */}
            {activeTab === "dieta" && result.dieta && (
              <div>
                {result.dieta.refeicoes?.map((r, i) => (
                  <div key={i} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#22d3ee" }}>{r.horario}</span>
                        <div style={{ fontSize: "14px", fontWeight: "600", marginTop: "2px" }}>{r.nome}</div>
                      </div>
                      <Tag color="#22d3ee">{r.totalKcal} kcal</Tag>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {r.alimentos?.map((a, j) => (
                        <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#080d1a", borderRadius: "6px" }}>
                          <span style={{ fontSize: "13px", color: "#cbd5e1" }}>{a.item}</span>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", color: "#475569" }}>{a.quantidade}</span>
                            <span style={{ fontSize: "11px", color: "#22d3ee", fontFamily: "'Space Mono', monospace" }}>{a.kcal}kcal</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                      <Tag color="#22d3ee">P: {r.macros?.proteinas}g</Tag>
                      <Tag color="#a78bfa">C: {r.macros?.carboidratos}g</Tag>
                      <Tag color="#f59e0b">G: {r.macros?.gorduras}g</Tag>
                    </div>
                  </div>
                ))}
                {result.dieta.dicasGerais?.length > 0 && (
                  <div className="card">
                    <div style={{ fontSize: "11px", color: "#34d399", fontFamily: "'Space Mono', monospace", letterSpacing: "2px", marginBottom: "10px" }}>💡 DICAS NUTRICIONAIS</div>
                    {result.dieta.dicasGerais.map((d, i) => (
                      <div key={i} style={{ fontSize: "13px", color: "#94a3b8", padding: "6px 0", borderBottom: i < result.dieta.dicasGerais.length - 1 ? "1px solid #1e3a5f33" : "none" }}>
                        → {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TREINO TAB */}
            {activeTab === "treino" && result.treino && (
              <div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <Tag color="#a78bfa">{result.treino.divisao}</Tag>
                  <Tag color="#22d3ee">{result.treino.frequencia}</Tag>
                </div>
                <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginBottom: "16px", paddingBottom: "4px" }}>
                  {result.treino.dias?.map((d, i) => (
                    <button key={i} className={`pill-btn ${activeDia === i ? "active" : ""}`}
                      onClick={() => setActiveDia(i)} style={{ whiteSpace: "nowrap" }}>
                      {d.dia}
                    </button>
                  ))}
                </div>
                {result.treino.dias?.[activeDia] && (() => {
                  const dia = result.treino.dias[activeDia];
                  return (
                    <div>
                      <div className="card" style={{ borderColor: "#a78bfa33" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                          <div>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", color: "#a78bfa", fontWeight: "700" }}>{dia.dia}</div>
                            <div style={{ fontSize: "15px", fontWeight: "600", marginTop: "2px" }}>{dia.foco}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px", padding: "8px 12px", background: "#080d1a", borderRadius: "6px" }}>
                          🔥 Aquecimento: {dia.aquecimento}
                        </div>
                        {dia.exercicios?.map((ex, j) => (
                          <div key={j} style={{ marginBottom: "12px", padding: "12px", background: "#080d1a", borderRadius: "10px", border: "1px solid #1e3a5f33" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <div style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0" }}>{j + 1}. {ex.nome}</div>
                              <Tag color="#a78bfa">{ex.series}×{ex.repeticoes}</Tag>
                            </div>
                            <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                              <span style={{ fontSize: "11px", color: "#475569" }}>⏱ Descanso: {ex.descanso}</span>
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>💡 {ex.dica}</div>
                          </div>
                        ))}
                        {dia.alongamento && (
                          <div style={{ fontSize: "12px", color: "#64748b", padding: "8px 12px", background: "#080d1a", borderRadius: "6px" }}>
                            🧘 Alongamento: {dia.alongamento}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                {result.treino.orientacoesGerais?.length > 0 && (
                  <div className="card">
                    <div style={{ fontSize: "11px", color: "#34d399", fontFamily: "'Space Mono', monospace", letterSpacing: "2px", marginBottom: "10px" }}>📌 ORIENTAÇÕES GERAIS</div>
                    {result.treino.orientacoesGerais.map((o, i) => (
                      <div key={i} style={{ fontSize: "13px", color: "#94a3b8", padding: "6px 0", borderBottom: i < result.treino.orientacoesGerais.length - 1 ? "1px solid #1e3a5f33" : "none" }}>
                        → {o}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RESUMO TAB */}
            {activeTab === "resumo" && result.resumo && (
              <div>
                <div style={{
                  background: "linear-gradient(135deg, #0f1629, #1a2035)",
                  border: "1px solid #34d39944",
                  borderRadius: "16px", padding: "24px", marginBottom: "16px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎯</div>
                  <div style={{ fontSize: "15px", color: "#34d399", fontWeight: "600", lineHeight: 1.6 }}>
                    {result.resumo.mensagemMotivacional}
                  </div>
                  <div style={{ marginTop: "12px", padding: "8px 16px", background: "#34d39911", borderRadius: "8px", display: "inline-block" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>⏳ </span>
                    <span style={{ fontSize: "13px", color: "#34d399" }}>{result.resumo.tempoEstimadoResultado}</span>
                  </div>
                </div>
                {result.resumo.proximosPassos?.length > 0 && (
                  <div className="card">
                    <div style={{ fontSize: "11px", color: "#34d399", fontFamily: "'Space Mono', monospace", letterSpacing: "2px", marginBottom: "12px" }}>🚀 PRÓXIMOS PASSOS</div>
                    {result.resumo.proximosPassos.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 0", borderBottom: i < result.resumo.proximosPassos.length - 1 ? "1px solid #1e3a5f33" : "none" }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#34d399", minWidth: "20px" }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontSize: "13px", color: "#94a3b8" }}>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "11px", color: "#f59e0b", fontFamily: "'Space Mono', monospace", marginBottom: "6px" }}>⚠️ AVISO LEGAL</div>
                  <p style={{ fontSize: "12px", color: "#78716c", margin: 0, lineHeight: 1.6 }}>
                    Este plano foi gerado por inteligência artificial com fins informativos. Não substitui a consulta com nutricionista, educador físico ou médico. Consulte profissionais de saúde antes de iniciar qualquer dieta ou programa de exercícios.
                  </p>
                </div>
              </div>
            )}

            <button className="btn-primary" onClick={() => { setStep("form"); setResult(null); }} style={{ marginTop: "24px", background: "linear-gradient(135deg, #1e3a5f, #2d4a7a)", color: "#94a3b8", boxShadow: "none" }}>
              ← GERAR NOVO PLANO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
