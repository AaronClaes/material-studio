import { useCallback } from 'react'
import { GOOGLE_API_KEY } from '../lib/config'
import { loadGoogleScripts } from '../lib/load-google-scripts'
import { useGoogleAuthStore } from '../stores/google-auth-store'

interface FilePickResult {
  fileId: string
  fileName: string
}

interface FolderPickResult {
  folderId: string
  folderName: string
}

function pick(
  accessToken: string,
  view: google.picker.DocsView,
  title: string,
): Promise<google.picker.PickerDocument | null> {
  return new Promise((resolve) => {
    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setTitle(title)
      .setCallback((data) => {
        if (data.action === google.picker.Action.PICKED) {
          resolve(data.docs[0] ?? null)
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(null)
        }
      })
      .build()
    picker.setVisible(true)
  })
}

export function useGooglePicker() {
  const accessToken = useGoogleAuthStore((s) => s.accessToken)

  const openFilePicker = useCallback(async (): Promise<FilePickResult | null> => {
    if (!accessToken) return null
    await loadGoogleScripts()

    const view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
    const doc = await pick(accessToken, view, 'Select an image')
    if (!doc) return null
    return { fileId: doc.id, fileName: doc.name }
  }, [accessToken])

  const openFolderPicker = useCallback(async (): Promise<FolderPickResult | null> => {
    if (!accessToken) return null
    await loadGoogleScripts()

    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
    view.setSelectFolderEnabled(true)
    const doc = await pick(accessToken, view, 'Select a folder')
    if (!doc) return null
    return { folderId: doc.id, folderName: doc.name }
  }, [accessToken])

  return { openFilePicker, openFolderPicker }
}
