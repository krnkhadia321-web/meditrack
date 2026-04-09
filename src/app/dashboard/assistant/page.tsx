'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bot, Send, Loader2, User, Sparkles, Brain, ChevronRight } from 'lucide-react'

type ToolResult = {
  tool: string
  result: string
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  toolResults?: ToolResult[]
}

const SUGGESTED_PROMPTS = [
  'What did I spend on healthcare this month?',
  'Find cheapest hospital for MRI scan in Delhi',
  'Suggest generic alternatives for Crocin and Pantoprazole',
  'What government health schemes am I eligible for in Haryana?',
  'Compare Apollo vs Fortis for knee replacement',
  'Log ₹500 medicine expense from Apollo pharmacy today',
]

const ADVISOR_SHORTCUT = {
  title: 'Should I proceed with a procedure?',
  desc: 'Get personalised cost analysis before spending',
  href: '/dashboard/advisor',
}

const TOOL_LABELS: Record<string, string> = {
  search_hospital_prices: '🔍 Searching hospital prices...',
  suggest_generic_medicines: '💊 Finding generic alternatives...',
  check_scheme_eligibility: '🏛️ Checking scheme eligibility...',
  get_spending_summary: '📊 Fetching your spending data...',
  log_expense: '📝 Logging expense...',
  compare_hospitals: '🏥 Comparing hospitals...',
}

function ToolCard({ tool, result }: { tool: string; result: string }) {
  const lines = result.split('\n').filter(l => l.trim())

  if (tool === 'get_spending_summary') {
    const stats = lines.filter(l => l.match(/[₹💰🏥🛡️📊]/))
    const categories = lines.filter(l => l.startsWith('  •'))
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📊</span>
          <span className="font-semibold text-emerald-800 text-sm">Spending Summary</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {stats.map((s, i) => {
            const [label, value] = s.split(':').map(x => x.trim())
            return (
              <div key={i} className="bg-white rounded-xl p-3 border border-emerald-100">
                <div className="text-xs text-emerald-600 mb-1">{label}</div>
                <div className="font-semibold text-sm text-emerald-900">{value}</div>
              </div>
            )
          })}
        </div>
        {categories.length > 0 && (
          <div className="bg-white rounded-xl p-3 border border-emerald-100">
            <div className="text-xs text-emerald-600 mb-2">Top categories</div>
            {categories.map((c, i) => (
              <div key={i} className="text-sm text-emerald-800">{c.replace('  ', '')}</div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (tool === 'suggest_generic_medicines') {
    const medicines = lines.filter(l => l.startsWith('•') && l.includes('→'))
    const tip = lines.find(l => l.includes('Tip:') || l.includes('💡'))
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">💊</span>
          <span className="font-semibold text-blue-800 text-sm">Generic Alternatives</span>
        </div>
        <div className="space-y-2 mb-3">
          {medicines.map((m, i) => {
            const parts = m.replace('• ', '').split('|').map(x => x.trim())
            const namePart = parts[0]?.split('→') ?? []
            const brand = namePart[0]?.trim()
            const generic = namePart[1]?.trim()
            const savings = parts[1]?.replace('Savings:', '').trim()
            const where = parts[2]?.replace('Where:', '').trim()
            return (
              <div key={i} className="bg-white rounded-xl p-3 border border-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-red-500 line-through">{brand}</span>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{savings} cheaper</span>
                </div>
                <div className="text-sm font-semibold text-blue-900">{generic}</div>
                {where && <div className="text-xs text-blue-500 mt-0.5">📍 {where}</div>}
              </div>
            )
          })}
        </div>
        {tip && <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">{tip}</div>}
      </div>
    )
  }

  if (tool === 'check_scheme_eligibility') {
    const schemeBlocks: string[][] = []
    let current: string[] = []
    lines.forEach(l => {
      if (l.startsWith('📋')) { if (current.length) schemeBlocks.push(current); current = [l] }
      else if (current.length) current.push(l)
    })
    if (current.length) schemeBlocks.push(current)
    const tip = lines.find(l => l.includes('💡'))
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🏛️</span>
          <span className="font-semibold text-purple-800 text-sm">Eligible Government Schemes</span>
        </div>
        <div className="space-y-2 mb-3">
          {schemeBlocks.map((block, i) => {
            const name = block[0]?.replace('📋', '').trim()
            const benefit = block.find(l => l.includes('Benefit:'))?.replace('Benefit:', '').trim()
            const apply = block.find(l => l.includes('Apply:'))?.replace('Apply:', '').trim()
            return (
              <div key={i} className="bg-white rounded-xl p-3 border border-purple-100">
                <div className="font-semibold text-sm text-purple-900 mb-1">{name}</div>
                {benefit && <div className="text-xs text-emerald-700 font-medium mb-1">✅ {benefit}</div>}
                {apply && (
                  <a
                    href={apply.startsWith('http') ? apply : `https://${apply}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    🔗 {apply}
                  </a>
                )}
              </div>
            )
          })}
        </div>
        {tip && <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">{tip}</div>}
      </div>
    )
  }

  if (tool === 'log_expense') {
    const success = result.includes('✅')
    const amtLine = lines.find(l => l.includes('Amount:'))
    const dateLine = lines.find(l => l.includes('Date:'))
    const descLine = lines.find(l => l.includes('•') && !l.includes('Amount') && !l.includes('Date'))
    return (
      <div className={`rounded-2xl p-5 border ${success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{success ? '✅' : '❌'}</span>
          <span className={`font-semibold text-sm ${success ? 'text-emerald-800' : 'text-red-800'}`}>
            {success ? 'Expense Logged' : 'Could not log expense'}
          </span>
        </div>
        {success && (
          <div className="bg-white rounded-xl p-3 border border-emerald-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">{descLine?.replace('•', '').trim()}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{dateLine?.replace('•', '').trim()}</div>
            </div>
            <div className="text-base font-bold text-emerald-700">{amtLine?.replace('• Amount:', '').trim()}</div>
          </div>
        )}
      </div>
    )
  }

  if (tool === 'search_hospital_prices' || tool === 'compare_hospitals') {
    const answer = lines.slice(0, 2).join(' ')
    const bullets = lines.filter(l => l.startsWith('•'))
    const tip = lines.find(l => l.includes('💡') || l.includes('Tip:'))
    return (
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{tool === 'compare_hospitals' ? '🏥' : '🔍'}</span>
          <span className="font-semibold text-teal-800 text-sm">
            {tool === 'compare_hospitals' ? 'Hospital Comparison' : 'Live Price Search'}
          </span>
        </div>
        {answer && (
          <div className="bg-white rounded-xl p-3 border border-teal-100 mb-3 text-sm text-teal-900 leading-relaxed">
            {answer}
          </div>
        )}
        {bullets.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {bullets.slice(0, 3).map((b, i) => (
              <div key={i} className="bg-white rounded-lg px-3 py-2 border border-teal-100 text-xs text-teal-800">{b}</div>
            ))}
          </div>
        )}
        {tip && <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">{tip}</div>}
      </div>
    )
  }

  return (
    <div className="bg-muted/50 border border-border rounded-2xl p-4">
      <div className="text-xs font-medium text-muted-foreground mb-2">{TOOL_LABELS[tool] ?? tool}</div>
      <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
    </div>
  )
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const userText = text ?? input.trim()
    if (!userText || loading) return

    const userMessage: Message = { role: 'user', content: userText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.text ?? 'Sorry, I could not generate a response. Please try again.',
        toolResults: data.toolResults ?? [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        toolResults: [],
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 bg-white rounded-2xl border border-border flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">How can I help you today?</h3>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm">
                I can help you track expenses, find cheaper hospitals, suggest generic medicines, and discover government health schemes.
              </p>
              <Link href="/dashboard/advisor" className="w-full max-w-lg flex items-center justify-between bg-gradient-to-r from-primary/10 to-emerald-50 border border-primary/20 rounded-2xl px-5 py-4 mb-3 hover:shadow-sm transition-all group">
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0">
      <Brain className="w-4 h-4 text-white" />
    </div>
    <div className="text-left">
      <div className="text-sm font-semibold">Should I proceed with a procedure?</div>
      <div className="text-xs text-muted-foreground mt-0.5">Get personalised cost analysis before spending</div>
    </div>
  </div>
  <ChevronRight className="w-4 h-4 text-primary" />
</Link>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left text-sm bg-muted/60 hover:bg-accent border border-border rounded-xl px-4 py-3 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className="space-y-3">
              <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-primary text-white' : 'bg-primary/10'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-4 h-4" />
                    : <Bot className="w-4 h-4 text-primary" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-muted/50 text-foreground rounded-tl-sm'
                }`}>
                  {(msg.content ?? '').split('\n').map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < (msg.content ?? '').split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
              {msg.toolResults && msg.toolResults.length > 0 && (
                <div className="space-y-3 ml-11">
                  {msg.toolResults.map((tr, j) => (
                    <ToolCard key={j} tool={tr.tool} result={tr.result} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-4 shrink-0">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about hospital prices, generic medicines, government schemes..."
              rows={1}
              disabled={loading}
              className="input-field flex-1 resize-none min-h-[44px] max-h-[120px] py-3"
              onInput={e => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="btn-primary h-11 w-11 flex items-center justify-center p-0 shrink-0"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}