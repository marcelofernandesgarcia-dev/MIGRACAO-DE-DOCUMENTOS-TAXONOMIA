type Props = {
  processed: number
  total: number
  label: string
  indeterminate?: boolean
}

function ProgressBar({ processed, total, label, indeterminate }: Props): React.JSX.Element {
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0

  return (
    <div className="progress-block">
      <div className="progress-label">
        <span>{label}</span>
        {!indeterminate && (
          <span>
            {processed} / {total} ({pct}%)
          </span>
        )}
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill${indeterminate ? ' progress-fill-indeterminate' : ''}`}
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
