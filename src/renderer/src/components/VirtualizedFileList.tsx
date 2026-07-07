import { FixedSizeList } from 'react-window'
import type { CategoryDefinition } from '@shared/config/categoryTaxonomy'
import type { FileScanResult } from '@shared/types/domain'

type Props = {
  items: FileScanResult[]
  selectedFileIds: Set<string>
  categories: CategoryDefinition[]
  onToggle: (fileId: string) => void
  onOverrideCategory: (fileId: string, categoryPath: string) => void
}

const ROW_HEIGHT = 40
const LIST_HEIGHT = 420

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileName(absolutePath: string): string {
  return absolutePath.split(/[\\/]/).pop() ?? absolutePath
}

function VirtualizedFileList({
  items,
  selectedFileIds,
  categories,
  onToggle,
  onOverrideCategory
}: Props): React.JSX.Element {
  return (
    <FixedSizeList
      height={LIST_HEIGHT}
      width="100%"
      itemCount={items.length}
      itemSize={ROW_HEIGHT}
      itemData={items}
    >
      {({ index, style }) => {
        const item = items[index]
        return (
          <div className="file-row" style={style} key={item.fileId}>
            <input
              type="checkbox"
              disabled={!!item.error}
              checked={selectedFileIds.has(item.fileId)}
              onChange={() => onToggle(item.fileId)}
            />
            <span className="file-name" title={item.absolutePath}>
              {fileName(item.absolutePath)}
            </span>
            <span className="file-size">{item.error ? 'erro' : formatSize(item.sizeBytes)}</span>
            {item.error ? (
              <span className="file-error">{item.error}</span>
            ) : (
              <>
                <select
                  value={item.suggestedCategory}
                  onChange={(e) => onOverrideCategory(item.fileId, e.target.value)}
                >
                  <option value="">Sem categoria</option>
                  {categories.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <span className={`reason-badge reason-${item.suggestionReason}`}>
                  {item.suggestionReason}
                </span>
                {item.pathTooLong && <span className="path-warning">caminho longo</span>}
              </>
            )}
          </div>
        )
      }}
    </FixedSizeList>
  )
}

export default VirtualizedFileList
