import { CheckCircle2, Minus, Plus, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { EventBoxCategory, EventBoxPart } from '../types'
import { normalizeEventBoxChecklist } from '../lib/eventBoxChecklist'

type QuantityStepperProps = {
  label: string
  max?: number
  value: number | null
  onChange: (value: number | null) => void
}

function QuantityStepper({ label, max, value, onChange }: QuantityStepperProps) {
  const setQuantity = (quantity: number | null) => {
    if (quantity === null) return onChange(null)
    onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(0, Math.trunc(quantity))))
  }

  return (
    <div className="box-quantity-stepper">
      <button aria-label={`Decrease ${label}`} disabled={!value} onClick={() => setQuantity((value ?? 0) - 1)} type="button">
        <Minus size={15} aria-hidden="true" />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        max={max}
        min={0}
        pattern="[0-9]*"
        placeholder="-"
        step={1}
        type="number"
        value={value ?? ''}
        onChange={(event) => setQuantity(event.target.value === '' ? null : Number(event.target.value))}
      />
      <button aria-label={`Increase ${label}`} disabled={max !== undefined && (value ?? 0) >= max} onClick={() => setQuantity((value ?? 0) + 1)} type="button">
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  )
}

function partStatus(part: EventBoxPart) {
  if (part.expectedQuantity === null || part.returnedQuantity === null) return 'unchecked'
  return part.returnedQuantity >= part.expectedQuantity ? 'complete' : 'missing'
}

function missingQuantity(part: EventBoxPart) {
  if (part.expectedQuantity === null || part.returnedQuantity === null) return null
  return Math.max(0, part.expectedQuantity - part.returnedQuantity)
}

export function EventBoxChecklist({
  checklist,
  onSave,
}: {
  checklist: EventBoxCategory[]
  onSave: (checklist: EventBoxCategory[]) => void
}) {
  const normalizedChecklist = useMemo(() => normalizeEventBoxChecklist(checklist), [checklist])
  const [draft, setDraft] = useState<EventBoxCategory[]>(normalizedChecklist)
  const [activeCategoryId, setActiveCategoryId] = useState(normalizedChecklist[0]?.id ?? '')

  const updatePart = (
    categoryId: string,
    partId: string,
    field: 'expectedQuantity' | 'returnedQuantity',
    value: number | null,
  ) => {
    setDraft((categories) => categories.map((category) => {
      if (category.id !== categoryId) return category
      return {
        ...category,
        parts: category.parts.map((part) => {
          if (part.id !== partId) return part
          if (field === 'expectedQuantity') {
            const returnedQuantity = value !== null && part.returnedQuantity !== null
              ? Math.min(value, part.returnedQuantity)
              : part.returnedQuantity
            return { ...part, expectedQuantity: value, returnedQuantity }
          }
          return { ...part, returnedQuantity: value }
        }),
      }
    }))
  }

  const activeCategory = draft.find((category) => category.id === activeCategoryId) ?? draft[0]
  const allParts = draft.flatMap((category) => category.parts)
  const totalMissing = allParts.reduce((total, part) => total + (missingQuantity(part) ?? 0), 0)
  const uncheckedParts = allParts.filter((part) => partStatus(part) === 'unchecked').length

  return (
    <section className="event-box-checklist" aria-labelledby="event-box-checklist-title">
      <div className="section-heading compact-heading">
        <div>
          <h2 id="event-box-checklist-title">Event Box Checklist</h2>
          <p>Enter the parts returned after the event.</p>
        </div>
      </div>

      <div className="box-category-tabs" role="tablist" aria-label="Event box categories">
        {draft.map((category) => (
          <button
            aria-selected={category.id === activeCategory?.id}
            className={category.id === activeCategory?.id ? 'active' : ''}
            key={category.id}
            onClick={() => setActiveCategoryId(category.id)}
            role="tab"
            type="button"
          >
            {category.name}
          </button>
        ))}
      </div>

      {activeCategory && (
        <div className="box-category-panel" role="tabpanel">
          <div className="box-parts-header" aria-hidden="true">
            <span>Part</span><span>Expected</span><span>Returned</span><span>Missing</span><span>Status</span>
          </div>
          {activeCategory.parts.length === 0 ? (
            <p className="box-empty-category">No parts added yet.</p>
          ) : activeCategory.parts.map((part) => {
            const status = partStatus(part)
            const missing = missingQuantity(part)
            return (
              <div className="box-part-row" key={part.id}>
                <div className="box-part-name">
                  <strong>{part.name}</strong>
                  {part.note && <small>{part.note}</small>}
                </div>
                <div className="box-part-field" data-label="Expected">
                  {part.expectedQuantityEditable ? (
                    <QuantityStepper label={`${part.name} expected quantity`} value={part.expectedQuantity} onChange={(value) => updatePart(activeCategory.id, part.id, 'expectedQuantity', value)} />
                  ) : <strong>{part.expectedQuantity}</strong>}
                </div>
                <div className="box-part-field" data-label="Returned">
                  <QuantityStepper label={`${part.name} returned quantity`} max={part.expectedQuantity ?? undefined} value={part.returnedQuantity} onChange={(value) => updatePart(activeCategory.id, part.id, 'returnedQuantity', value)} />
                </div>
                <div className="box-part-missing" data-label="Missing">{missing ?? '-'}</div>
                <span className={`box-part-status ${status}`}>
                  {status === 'complete' && <CheckCircle2 size={14} aria-hidden="true" />}
                  {status === 'complete' ? 'Complete' : status === 'missing' ? 'Missing' : 'Not checked'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="box-checklist-footer">
        <strong className={totalMissing > 0 ? 'missing' : uncheckedParts === 0 ? 'complete' : ''}>
          {totalMissing > 0
            ? `${totalMissing} part${totalMissing === 1 ? '' : 's'} missing`
            : uncheckedParts > 0
              ? `${uncheckedParts} part${uncheckedParts === 1 ? '' : 's'} not checked`
              : 'All parts returned'}
        </strong>
        <button className="primary-action" onClick={() => onSave(draft)} type="button">
          <Save size={17} aria-hidden="true" />Save Checklist
        </button>
      </div>
    </section>
  )
}
