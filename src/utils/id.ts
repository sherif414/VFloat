let count = 0

export function useId(): string {
  return `vfloat-id-${count++}`
}
