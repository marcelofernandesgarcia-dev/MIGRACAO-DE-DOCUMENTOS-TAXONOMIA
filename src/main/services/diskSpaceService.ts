import checkDiskSpace from 'check-disk-space'
import { DISK_SPACE_SAFETY_MARGIN_RATIO } from '../config/constants'

export async function checkDiskSpaceFor(
  targetPath: string,
  requiredBytes: number
): Promise<{ ok: boolean; freeSpaceBytes: number; requiredBytes: number }> {
  const { free } = await checkDiskSpace(targetPath)
  const requiredWithMargin = Math.ceil(requiredBytes * (1 + DISK_SPACE_SAFETY_MARGIN_RATIO))
  return {
    ok: free >= requiredWithMargin,
    freeSpaceBytes: free,
    requiredBytes: requiredWithMargin
  }
}
