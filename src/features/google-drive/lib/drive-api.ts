export interface DriveFile {
  id: string
  name: string
  mimeType: string
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3'

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` }
}

export async function getFileMetadata(
  accessToken: string,
  fileId: string,
): Promise<DriveFile> {
  const res = await fetch(
    `${DRIVE_API}/files/${fileId}?fields=id,name,mimeType`,
    { headers: authHeaders(accessToken) },
  )
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`)
  return res.json()
}

export async function listFolderImages(
  accessToken: string,
  folderId: string,
): Promise<Array<DriveFile>> {
  const files: Array<DriveFile> = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType)',
      pageSize: '1000',
      orderBy: 'name',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`${DRIVE_API}/files?${params}`, {
      headers: authHeaders(accessToken),
    })
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`)

    const data = await res.json()
    files.push(...(data.files ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)

  return files.sort((a, b) => a.name.localeCompare(b.name))
}

export async function downloadFileAsBlob(
  accessToken: string,
  fileId: string,
): Promise<Blob> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(`Drive download error: ${res.status}`)
  return res.blob()
}

export async function downloadFileAsDataUrl(
  accessToken: string,
  fileId: string,
): Promise<string> {
  const blob = await downloadFileAsBlob(accessToken, fileId)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  filename: string,
  blob: Blob,
): Promise<void> {
  const metadata = JSON.stringify({ name: filename, parents: [folderId] })
  const body = new FormData()
  body.append('metadata', new Blob([metadata], { type: 'application/json' }))
  body.append('file', blob)

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    },
  )
  if (!res.ok) throw new Error(`Drive upload error: ${res.status}`)
}
