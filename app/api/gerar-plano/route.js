export async function POST(request) {
  const { formData } = await request.json()

  const prompt = `Você é um Especialista em Fisiologia do Exercício e Nutrição Esportiva.

REGRAS: Se dados forem impossíveis retorne JSON com campo "erro".

Calcule TMB (Mifflin-St Jeor):
Homens: (10 x peso) + (6.25 x altura) - (5 x idade) + 5
Mulheres: (10 x peso) + (6.25 x altura) - (5 x idade) - 161

Fatores atividade: Sedentário 1.2, Leve 1.375, Moderado 1.55, Intenso 1.725
Emagrecimento: déficit 400-500 kcal, proteína 1.8-2.0g/kg
Hipertrofia: superávit 300 kcal, proteína 2.0-2.2g/kg
Manutenção: TDEE exato, proteína 1.6g/kg

RESPONDA APENAS EM JSON sem texto extra:
{"perfil":{"tmb":0,"tdee":0,"metaKcal":0,"imc":0,"classificacaoImc":"","proteinas_g":0,"carboidratos_g":0,"gorduras_g":0},"dieta":{"titulo":"","refeicoes":[{"horario":"","nome":"","alimentos":[{"item":"","quantidade":"","kcal":0}],"totalKcal":0,"macros":{"proteinas":0,"carboidratos":0,"gorduras":0}}],"totalDiario":{"kcal":0,"proteinas":0,"carboidratos":0,"gorduras":0},"dicasGerais":[""]},"treino":{"divisao":"","frequencia":"","dias":[{"dia":"","foco":"","aquecimento":"","exercicios":[{"nome":"","series":0,"repeticoes":"","descanso":"","dica":""}],"alongamento":""}],"orientacoesGerais":[""]},"resumo":{"mensagemMotivacional":"","tempoEstimadoResultado":"","proximosPassos":[""]}}

Dados:
- Idade: ${formData.idade} anos
- Gênero: ${formData.genero}
- Peso: ${formData.peso} kg
- Altura: ${formData.altura} cm
- Nível: ${formData.nivel}
- Objetivo: ${formData.objetivo}
- Restrições: ${formData.restricoes || 'Nenhuma'}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
        })
      }
    )
    const data = await response.json()
    if (data.error) return Response.json({ erro: data.error.message }, { status: 400 })
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    return Response.json(result)
  } catch (e) {
    return Response.json({ erro: 'Erro ao gerar plano' }, { status: 500 })
  }
}