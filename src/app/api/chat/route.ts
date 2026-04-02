import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { toolDefinitions, executeTool, ToolName } from '@/lib/tools'
import { NextResponse } from 'next/server'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

const SYSTEM_PROMPT = `You are MediTrack AI, a helpful healthcare cost assistant for families in India. You help users:
- Track and understand their medical expenses
- Find cheaper hospitals and diagnostic centers
- Discover generic medicine alternatives to save money
- Check eligibility for government health schemes (PMJAY, CGHS, ESIC, state schemes)
- Analyze their spending patterns
- Log new expenses

Always respond in a friendly, empathetic tone. Format currency as ₹ (Indian Rupees). 
When suggesting savings, be specific with numbers. 
Always prioritize the user's financial wellbeing alongside their health.
Keep responses concise and actionable.
IMPORTANT: Never show your reasoning steps or chain of thought. Never use ## headings. Just give the final answer directly and concisely.`

// Convert Anthropic tool format to Groq/OpenAI format
function toGroqTools(tools: any[]) {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }))
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch user context
    const [{ data: profile }, { data: members }, { data: recentExpenses }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('family_members').select('*').eq('user_id', user.id),
      supabase.from('expenses')
        .select('*, expense_categories(name)')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false })
        .limit(5),
    ])

    const userContext = `
User: ${profile?.full_name ?? 'Unknown'} | City: ${profile?.city ?? 'India'}
Family members: ${members?.map(m => `${m.name} (${m.relation})`).join(', ') || 'None added yet'}
Recent expenses: ${recentExpenses?.map(e => `${e.description} ₹${e.amount}`).join(', ') || 'None'}
`

    const systemMessage = {
      role: 'system' as const,
      content: SYSTEM_PROMPT + '\n\nUser context:\n' + userContext,
    }

    const recentMessages = messages.slice(-6)
const groqMessages: any[] = [
  systemMessage,
  ...recentMessages.map((m: any) => ({ role: m.role, content: m.content })),
]

    const groqTools = toGroqTools(toolDefinitions)
    const toolResults: Array<{ tool: string; result: string }> = []

    // Agentic loop
    let response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 1024,
      messages: groqMessages,
      tools: groqTools,
      tool_choice: 'auto',
    })

    // Loop until no more tool calls
    while (response.choices[0].finish_reason === 'tool_calls') {
      const assistantMsg = response.choices[0].message
      groqMessages.push(assistantMsg)

      const toolCalls = assistantMsg.tool_calls ?? []

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name as ToolName
        const toolInput = JSON.parse(toolCall.function.arguments)

        const result = await executeTool(toolName, toolInput, user.id)
        toolResults.push({ tool: toolName, result })

        groqMessages.push({
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: result,
        })
      }

      response = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 1024,
        messages: groqMessages,
        tools: groqTools,
        tool_choice: 'none',
      })
    }

    const finalText = response.choices[0].message.content ?? ''

    return NextResponse.json({ text: finalText, toolResults })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}