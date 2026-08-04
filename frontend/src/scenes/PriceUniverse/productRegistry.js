/** Live world positions of product nodes (updated each frame while mounted). */
export const productWorldPos = new Map()

export function setProductWorldPos(id, x, y, z) {
  productWorldPos.set(id, { x, y, z })
}

export function clearProductWorldPos(id) {
  productWorldPos.delete(id)
}

export function getProductWorldPos(id) {
  return productWorldPos.get(id) ?? null
}
