// Decode and redraw rather than trusting filename, EXIF, or embedded metadata.
export async function normalizeScreeningImage(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Välj PNG, JPEG eller WebP.')
  if (file.size > 20 * 1024 * 1024) throw new Error('Originalbilden får vara högst 20 MiB.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    if (Math.floor((dataUrl.length - 'data:image/png;base64,'.length) * 3 / 4) > 512 * 1024) {
      throw new Error('Bilden blir större än 512 KiB. Välj en enklare bild eller minska den först.')
    }
    return dataUrl
  } catch (error) {
    throw new Error(error.message?.includes('512') ? error.message : 'Bilden kunde inte läsas. Välj en annan PNG, JPEG eller WebP.')
  } finally { URL.revokeObjectURL(url) }
}
