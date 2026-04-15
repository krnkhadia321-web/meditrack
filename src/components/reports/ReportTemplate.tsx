import type { ReportData } from '@/lib/reports/aggregate'
import { formatCurrency } from '@/lib/utils'

// A4 at ~96 DPI
const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pdf-page bg-white"
      style={{
        width: PAGE_WIDTH,
        minHeight: PAGE_HEIGHT,
        padding: 48,
        fontFamily: "'Sora', system-ui, sans-serif",
        color: '#0f1f1a',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#0f1f1a' }}>{children}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b7d75', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Stat({ label, value, accent = '#0f7a5e', sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div style={{ flex: 1, background: '#f7faf9', border: '1px solid #e5eae7', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 10, color: '#6b7d75', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b7d75', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Bar({ pct, color = '#10b981' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 6, background: '#e8edea', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 99 }} />
    </div>
  )
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ReportTemplate({ data }: { data: ReportData }) {
  const showTax = data.mode === 'annual' && data.tax80D

  return (
    <div id="report-root">
      {/* ── Page 1 — Cover + summary + categories ─────────────────────────── */}
      <Page>
        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#10b981', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              <span style={{ color: 'white' }}>❤</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>MediTrack</div>
              <div style={{ fontSize: 10, color: '#6b7d75' }}>Healthcare Cost Report</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#6b7d75' }}>Generated</div>
            <div style={{ fontSize: 11, fontWeight: 500 }}>{formatDate(data.generatedAt)}</div>
          </div>
        </div>

        {/* Cover block */}
        <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid #bbf7d0', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#047857', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {data.mode === 'monthly' ? 'Monthly Report' : 'Annual FY Report'}
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, color: '#064e3b', marginTop: 6 }}>{data.period.label}</div>
          <div style={{ fontSize: 13, color: '#065f46', marginTop: 8 }}>
            Prepared for <strong>{data.user.fullName}</strong>{data.user.city ? ` · ${data.user.city}` : ''}
          </div>
        </div>

        {/* Summary stats */}
        <SectionTitle sub="Total spending across the period">Summary</SectionTitle>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <Stat label="Total Spend" value={formatCurrency(data.summary.total)} accent="#0f1f1a" sub={`${data.summary.expenseCount} expenses`} />
          <Stat label="Insurance Covered" value={formatCurrency(data.summary.covered)} accent="#059669" />
          <Stat label="Out of Pocket" value={formatCurrency(data.summary.outOfPocket)} accent="#dc2626" />
        </div>

        {data.summary.vsPrevious && (
          <div style={{ background: '#f7faf9', border: '1px solid #e5eae7', borderRadius: 12, padding: 12, marginBottom: 24, fontSize: 12 }}>
            <strong>vs previous month:</strong>{' '}
            {data.summary.vsPrevious.previousTotal === 0
              ? 'No data for previous month'
              : (data.summary.vsPrevious.pct >= 0
                ? `↑ ${data.summary.vsPrevious.pct}% (${formatCurrency(Math.abs(data.summary.vsPrevious.delta))} more)`
                : `↓ ${Math.abs(data.summary.vsPrevious.pct)}% (${formatCurrency(Math.abs(data.summary.vsPrevious.delta))} less)`)}
          </div>
        )}

        {/* Categories */}
        <SectionTitle sub={`${data.categories.length} categories`}>Spending by category</SectionTitle>
        {data.categories.length === 0 ? (
          <div style={{ fontSize: 12, color: '#6b7d75' }}>No expenses recorded in this period.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.categories.slice(0, 8).map(c => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span><span style={{ marginRight: 6 }}>{c.icon}</span>{c.name}</span>
                  <span><strong>{formatCurrency(c.amount)}</strong> · {c.pct}%</span>
                </div>
                <Bar pct={c.pct} color={c.color} />
              </div>
            ))}
          </div>
        )}
      </Page>

      {/* ── Page 2 — Per-member + Top expenses ─────────────────────────────── */}
      <Page>
        <SectionTitle sub={`${data.perMember.length} family members`}>Per-member spending</SectionTitle>
        {data.perMember.length === 0 ? (
          <div style={{ fontSize: 12, color: '#6b7d75' }}>No members with expenses.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {data.perMember.slice(0, 8).map(m => (
              <div key={m.id} style={{ border: '1px solid #e5eae7', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span><strong>{m.name}</strong> <span style={{ color: '#6b7d75' }}>· {m.relation}</span></span>
                  <span><strong>{formatCurrency(m.spent)}</strong>
                    {m.budget != null && <span style={{ color: '#6b7d75' }}> / {formatCurrency(m.budget)}</span>}
                  </span>
                </div>
                {m.budgetPct != null && (
                  <>
                    <Bar pct={m.budgetPct} color={m.budgetPct > 100 ? '#dc2626' : m.budgetPct > 75 ? '#f59e0b' : '#10b981'} />
                    <div style={{ fontSize: 10, color: m.budgetPct > 100 ? '#dc2626' : '#6b7d75', marginTop: 4 }}>
                      {m.budgetPct}% of {data.mode === 'monthly' ? 'monthly' : 'annual'} budget
                      {m.budgetPct > 100 ? ' · over budget' : ''}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <SectionTitle sub="Largest transactions">Top expenses</SectionTitle>
        {data.topExpenses.length === 0 ? (
          <div style={{ fontSize: 12, color: '#6b7d75' }}>No expenses recorded in this period.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f7faf9', borderBottom: '1px solid #e5eae7' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Date</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Description</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Member</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Amount</th>
                <th style={{ textAlign: 'right', padding: 8 }}>OOP</th>
              </tr>
            </thead>
            <tbody>
              {data.topExpenses.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f5f4' }}>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>
                  <td style={{ padding: 8 }}>{e.description}{e.hospital ? <div style={{ fontSize: 10, color: '#6b7d75' }}>{e.hospital}</div> : null}</td>
                  <td style={{ padding: 8 }}>{e.memberName}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 500 }}>{formatCurrency(e.amount)}</td>
                  <td style={{ padding: 8, textAlign: 'right', color: '#dc2626' }}>{formatCurrency(e.oop)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Page>

      {/* ── Page 3 — Insurance + (annual) 80D ───────────────────────────────── */}
      <Page>
        <SectionTitle sub={`${data.insurance.policies.length} active ${data.insurance.policies.length === 1 ? 'policy' : 'policies'}`}>Insurance</SectionTitle>
        {data.insurance.policies.length === 0 ? (
          <div style={{ fontSize: 12, color: '#6b7d75', marginBottom: 24 }}>No active policies on file.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <Stat label="Total Cover" value={formatCurrency(data.insurance.totalCover)} accent="#059669" />
              <Stat label="Annual Premium" value={formatCurrency(data.insurance.totalPremium)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {data.insurance.policies.map((p, i) => (
                <div key={i} style={{ border: '1px solid #e5eae7', borderRadius: 12, padding: 12, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong>{p.provider}</strong>
                    <span style={{ color: '#059669', fontWeight: 600 }}>{formatCurrency(p.sumInsured)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7d75' }}>
                    {p.plan ?? 'Policy'}
                    {p.policyNumber ? ` · ${p.policyNumber}` : ''}
                    {p.premium != null ? ` · Premium ${formatCurrency(p.premium)}` : ''}
                    {p.renewalDate ? ` · Renewal ${formatDate(p.renewalDate)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {showTax && data.tax80D && (
          <>
            <SectionTitle sub={`${data.period.label} · Section 80D`}>Tax deduction summary</SectionTitle>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 500 }}>Total 80D deduction</div>
                  <div style={{ fontSize: 26, fontWeight: 600, color: '#78350f' }}>{formatCurrency(data.tax80D.total80D)}</div>
                  <div style={{ fontSize: 10, color: '#92400e' }}>of {formatCurrency(data.tax80D.maxDeduction)} maximum allowed</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11 }}>
                  <div style={{ color: '#92400e' }}>Estimated tax saved</div>
                  <div><strong>{formatCurrency(data.tax80D.estimatedSaving30)}</strong> @ 30%</div>
                  <div><strong>{formatCurrency(data.tax80D.estimatedSaving20)}</strong> @ 20%</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Bar pct={data.tax80D.utilisationPct} color="#f59e0b" />
                <div style={{ fontSize: 10, color: '#92400e', marginTop: 4 }}>{data.tax80D.utilisationPct}% of limit used</div>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 16 }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f5f4' }}>
                  <td style={{ padding: 8 }}>Health insurance premiums <span style={{ color: '#6b7d75' }}>· 80D(a)</span></td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 500 }}>{formatCurrency(data.tax80D.insurancePremium)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f5f4' }}>
                  <td style={{ padding: 8 }}>Preventive health checkups <span style={{ color: '#6b7d75' }}>· 80D(b), capped ₹5,000</span></td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 500 }}>{formatCurrency(data.tax80D.preventiveCheckups)}</td>
                </tr>
                {data.tax80D.seniorCitizenPremium > 0 && (
                  <tr style={{ borderBottom: '1px solid #f3f5f4' }}>
                    <td style={{ padding: 8 }}>Senior citizen parents <span style={{ color: '#6b7d75' }}>· additional ₹50,000</span></td>
                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 500 }}>{formatCurrency(data.tax80D.seniorCitizenPremium)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: '#6b7d75', fontStyle: 'italic' }}>
              Based on data in MediTrack. Consult your CA for final tax computation.
            </div>
          </>
        )}
      </Page>

      {/* ── Page 4 — Health (medicines + vitals) ────────────────────────────── */}
      <Page>
        <SectionTitle sub={`${data.health.medicines.length} active`}>Medicines in use</SectionTitle>
        {data.health.medicines.length === 0 ? (
          <div style={{ fontSize: 12, color: '#6b7d75', marginBottom: 24 }}>No active medicines on file.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 32 }}>
            <thead>
              <tr style={{ background: '#f7faf9', borderBottom: '1px solid #e5eae7' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Member</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Medicine</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Dosage</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Frequency</th>
                <th style={{ textAlign: 'center', padding: 8 }}>Refill</th>
              </tr>
            </thead>
            <tbody>
              {data.health.medicines.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f5f4' }}>
                  <td style={{ padding: 8 }}>{m.memberName}</td>
                  <td style={{ padding: 8 }}>
                    <div style={{ fontWeight: 500 }}>{m.name}</div>
                    {m.generic && <div style={{ fontSize: 10, color: '#6b7d75' }}>Generic: {m.generic}</div>}
                  </td>
                  <td style={{ padding: 8 }}>{m.dosage}</td>
                  <td style={{ padding: 8 }}>{m.frequency}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500,
                      background: m.refillStatus === 'Low' ? '#fee2e2' : m.refillStatus === 'OK' ? '#d1fae5' : '#f3f4f6',
                      color: m.refillStatus === 'Low' ? '#b91c1c' : m.refillStatus === 'OK' ? '#065f46' : '#6b7d75',
                    }}>{m.refillStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <SectionTitle sub="Most recent reading per vital per member">Latest vitals</SectionTitle>
        {data.health.vitals.length === 0 ? (
          <div style={{ fontSize: 12, color: '#6b7d75' }}>No vitals recorded.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f7faf9', borderBottom: '1px solid #e5eae7' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Member</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Vital</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Latest</th>
                <th style={{ textAlign: 'center', padding: 8 }}>Status</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Logged</th>
              </tr>
            </thead>
            <tbody>
              {data.health.vitals.map((v, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f5f4' }}>
                  <td style={{ padding: 8 }}>{v.memberName}</td>
                  <td style={{ padding: 8 }}><span style={{ marginRight: 6 }}>{v.icon}</span>{v.label}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 500 }}>{v.latest}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500,
                      background: v.status === 'Alert' ? '#fee2e2' : v.status === 'Watch' ? '#fef3c7' : '#d1fae5',
                      color: v.status === 'Alert' ? '#b91c1c' : v.status === 'Watch' ? '#92400e' : '#065f46',
                    }}>{v.status}</span>
                  </td>
                  <td style={{ padding: 8 }}>{formatDate(v.loggedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Page>

      {/* ── Page 5 — Savings highlights + footer ────────────────────────────── */}
      <Page>
        <SectionTitle sub="What this period looked like financially">Savings highlights</SectionTitle>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <Stat
            label="Claim utilisation"
            value={`${data.savings.insuranceClaimedPct}%`}
            accent="#059669"
            sub={`${formatCurrency(data.summary.covered)} of ${formatCurrency(data.summary.total)} claimed`}
          />
          <Stat
            label="Potential generic savings"
            value={formatCurrency(data.savings.genericSwapsEstimate)}
            accent="#0f7a5e"
            sub="Estimated on medicine spend"
          />
          <Stat
            label="Out-of-pocket burden"
            value={formatCurrency(data.summary.outOfPocket)}
            accent="#dc2626"
            sub={data.summary.total > 0 ? `${Math.round((data.summary.outOfPocket / data.summary.total) * 100)}% of total` : '—'}
          />
        </div>

        <SectionTitle>Budget adherence</SectionTitle>
        {data.savings.budgetAdherence.length === 0 ? (
          <div style={{ fontSize: 12, color: '#6b7d75', marginBottom: 24 }}>No annual budgets set for any member.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {data.savings.budgetAdherence.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '8px 12px', background: b.withinBudget ? '#f0fdf4' : '#fef2f2', borderRadius: 10 }}>
                <span>{b.memberName}</span>
                <span style={{ color: b.withinBudget ? '#065f46' : '#b91c1c', fontWeight: 500 }}>
                  {b.withinBudget ? '✓ Within budget' : '⚠ Over budget'}
                  {b.pct != null && ` · ${b.pct}%`}
                </span>
              </div>
            ))}
          </div>
        )}

        <SectionTitle>Tips for next period</SectionTitle>
        <ul style={{ fontSize: 12, color: '#0f1f1a', paddingLeft: 18, lineHeight: 1.7 }}>
          {data.savings.insuranceClaimedPct < 40 && (
            <li>Only {data.savings.insuranceClaimedPct}% of spend was insurance-covered — check with your insurer about unclaimed procedures.</li>
          )}
          {data.savings.genericSwapsEstimate > 500 && (
            <li>You could save an estimated <strong>{formatCurrency(data.savings.genericSwapsEstimate)}</strong> on medicines by switching to generics at a Jan Aushadhi Kendra.</li>
          )}
          {data.tax80D && data.tax80D.total80D < data.tax80D.maxDeduction && (
            <li>You have <strong>{formatCurrency(data.tax80D.maxDeduction - data.tax80D.total80D)}</strong> of unused Section 80D deduction — consider topping up preventive checkups before March 31.</li>
          )}
          {data.savings.budgetAdherence.some(b => !b.withinBudget) && (
            <li>Review over-budget members' spending categories — healthcare budgets can shift based on recurring conditions.</li>
          )}
          <li>Keep logging every expense — accurate monthly data makes year-end tax filing painless.</li>
        </ul>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 48, left: 48, right: 48, borderTop: '1px solid #e5eae7', paddingTop: 12, fontSize: 10, color: '#6b7d75', display: 'flex', justifyContent: 'space-between' }}>
          <span>Generated by MediTrack · meditrack-cyan.vercel.app</span>
          <span>{formatDate(data.generatedAt)}</span>
        </div>
      </Page>
    </div>
  )
}
