type Props = {
  originalName: string
  newName: string
}

function DiffPreview({ originalName, newName }: Props): React.JSX.Element {
  return (
    <div className="diff-preview">
      <span className="diff-original">{originalName}</span>
      <span className="diff-arrow">→</span>
      <span className="diff-new">{newName}</span>
    </div>
  )
}

export default DiffPreview
