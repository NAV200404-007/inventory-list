import { CheckCircle2, Laptop, Wrench } from 'lucide-react'
import type { AssetCondition } from '../types'
import { Badge } from './Badge'

export function AssetIdPreview({
  assetConditions,
  assetIds,
  itemName,
  unidentifiedIssueCount,
  onAssetIdChange,
  onAssetRemarksChange,
  onAssetStatusChange,
  onResolveIssue,
}: {
  assetConditions?: Record<string, AssetCondition>
  assetIds: string[]
  itemName?: string
  unidentifiedIssueCount?: number
  onAssetIdChange?: (assetIndex: number, value: string) => void
  onAssetRemarksChange?: (assetId: string, remarks: string) => void
  onAssetStatusChange?: (assetId: string, status: 'Available' | 'Damaged' | 'Missing') => void
  onResolveIssue?: (assetId: string) => void
}) {
  if (assetIds.length === 0) return <span className="asset-id-summary">IDs assigned after confirmation</span>

  if (onAssetIdChange) {
    const issueCount = Object.keys(assetConditions ?? {}).length
    return (
      <details className="asset-preview asset-preview-inline asset-editor">
        <summary className="asset-preview-heading">
          <strong>Manage item IDs</strong>
          <span>{assetIds.length} items{issueCount ? ` - ${issueCount} issues` : ''}</span>
        </summary>
        <div className="asset-editor-content">
          {Boolean(unidentifiedIssueCount) && (
            <p className="unidentified-issue-warning">
              {unidentifiedIssueCount} issue{unidentifiedIssueCount === 1 ? '' : 's'} need an item ID. Set the correct item status below.
            </p>
          )}
          <div className="asset-preview-edit-grid">
            {assetIds.map((assetId, assetIndex) => {
              const condition = assetConditions?.[assetId]
              return (
                <div className={`asset-id-field ${condition ? condition.status.toLowerCase() : ''}`} key={`${assetId}-${assetIndex}`}>
                  <div className="asset-id-control">
                    <input aria-label={`${itemName || 'Item'} ID ${assetIndex + 1}`} value={assetId} onChange={(event) => onAssetIdChange(assetIndex, event.target.value)} />
                    {onAssetStatusChange && (
                      <select aria-label={`${assetId} status`} value={condition?.status ?? 'Available'} onChange={(event) => onAssetStatusChange(assetId, event.target.value as 'Available' | 'Damaged' | 'Missing')}>
                        <option>Available</option><option>Damaged</option><option>Missing</option>
                      </select>
                    )}
                  </div>
                  {condition && (
                    <div className="asset-condition">
                      <Badge tone={condition.status === 'Missing' ? 'danger' : 'warning'}>{condition.status}</Badge>
                      {onAssetRemarksChange ? (
                        <input className="asset-condition-note" placeholder="Add issue note" value={condition.remarks} onChange={(event) => onAssetRemarksChange(assetId, event.target.value)} />
                      ) : (
                        <small title={`${condition.eventTitle} - reported by ${condition.reportedBy}`}>{condition.remarks || condition.eventId}</small>
                      )}
                      {onResolveIssue && <button aria-label={`Mark ${assetId} resolved`} onClick={() => onResolveIssue(assetId)} title="Mark resolved" type="button"><CheckCircle2 size={14} aria-hidden="true" /></button>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </details>
    )
  }

  return (
    <details className="asset-preview">
      <summary>{assetIds.length === 1 ? assetIds[0] : `View ${assetIds.length} item IDs`}</summary>
      <div>{assetIds.map((assetId) => <span key={assetId}>{assetId}</span>)}</div>
    </details>
  )
}

export function InventoryIcon({ category }: { category: string }) {
  if (category === 'Computing') return <Laptop size={18} aria-hidden="true" />
  return <Wrench size={18} aria-hidden="true" />
}
