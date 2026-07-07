import { FixedSizeList } from 'react-window'
import DiffPreview from './DiffPreview'
import { buildBaseName } from '@shared/utils/maskName'
import { sanitizeName } from '@shared/utils/sanitizeName'
import type { RenameFields } from '../state/wizardStore'
import type { FileScanResult, ResolveVersionResult } from '@shared/types/domain'

type Props = {
  items: FileScanResult[]
  renameFields: Map<string, RenameFields>
  finalNames: Map<string, ResolveVersionResult>
  onFieldChange: (fileId: string, field: keyof RenameFields, value: string) => void
}

const ROW_HEIGHT = 132
const LIST_HEIGHT = 460

function fileName(absolutePath: string): string {
  return absolutePath.split(/[\\/]/).pop() ?? absolutePath
}

function RenameVirtualizedList({
  items,
  renameFields,
  finalNames,
  onFieldChange
}: Props): React.JSX.Element {
  return (
    <FixedSizeList height={LIST_HEIGHT} width="100%" itemCount={items.length} itemSize={ROW_HEIGHT}>
      {({ index, style }) => {
        const item = items[index]
        const fields = renameFields.get(item.fileId) ?? { ano: '', processo: '', tema: '', tipo: '' }
        const finalResult = finalNames.get(item.fileId)
        const previewName = finalResult
          ? finalResult.finalName
          : `${buildBaseName({
              ano: fields.ano,
              processo: sanitizeName(fields.processo),
              tema: sanitizeName(fields.tema),
              tipo: sanitizeName(fields.tipo)
            })}_V?${item.extension}`

        return (
          <div className="rename-row" style={style} key={item.fileId}>
            <div className="rename-row-header">{fileName(item.absolutePath)}</div>
            <div className="rename-fields">
              <input
                type="text"
                placeholder="Ano"
                value={fields.ano}
                onChange={(e) => onFieldChange(item.fileId, 'ano', e.target.value)}
              />
              <input
                type="text"
                placeholder="Processo"
                value={fields.processo}
                onChange={(e) => onFieldChange(item.fileId, 'processo', e.target.value)}
              />
              <input
                type="text"
                placeholder="Tema"
                value={fields.tema}
                onChange={(e) => onFieldChange(item.fileId, 'tema', e.target.value)}
              />
              <input
                type="text"
                placeholder="Tipo"
                value={fields.tipo}
                onChange={(e) => onFieldChange(item.fileId, 'tipo', e.target.value)}
              />
            </div>
            <DiffPreview originalName={fileName(item.absolutePath)} newName={previewName} />
          </div>
        )
      }}
    </FixedSizeList>
  )
}

export default RenameVirtualizedList
