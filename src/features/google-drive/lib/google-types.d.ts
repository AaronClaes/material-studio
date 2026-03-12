/* Ambient type declarations for Google Identity Services, Picker, and gapi */

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken(overrides?: { prompt?: string }): void
        callback: (response: TokenResponse) => void
      }
      interface TokenResponse {
        access_token: string
        expires_in: number
        error?: string
        scope: string
        token_type: string
      }
      interface TokenClientConfig {
        client_id: string
        scope: string
        callback: (response: TokenResponse) => void
        error_callback?: (error: { type: string; message: string }) => void
      }
      function initTokenClient(config: TokenClientConfig): TokenClient
      function revoke(token: string, callback?: () => void): void
    }
  }

  namespace picker {
    enum ViewId {
      DOCS_IMAGES = 'docs-images',
      FOLDERS = 'folders',
    }

    enum Feature {
      MULTISELECT_ENABLED = 'multiselectEnabled',
    }

    enum Action {
      PICKED = 'picked',
      CANCEL = 'cancel',
    }

    interface PickerDocument {
      id: string
      name: string
      mimeType: string
      url: string
    }

    interface PickerResponse {
      action: Action
      docs: Array<PickerDocument>
    }

    class DocsView {
      constructor(viewId?: ViewId)
      setSelectFolderEnabled(enabled: boolean): DocsView
      setMimeTypes(mimeTypes: string): DocsView
      setIncludeFolders(include: boolean): DocsView
    }

    class PickerBuilder {
      addView(view: DocsView | ViewId): PickerBuilder
      setOAuthToken(token: string): PickerBuilder
      setDeveloperKey(key: string): PickerBuilder
      setCallback(callback: (data: PickerResponse) => void): PickerBuilder
      setTitle(title: string): PickerBuilder
      build(): Picker
    }

    interface Picker {
      setVisible(visible: boolean): void
      dispose(): void
    }
  }
}

declare namespace gapi {
  function load(
    libraries: string,
    callback: { callback: () => void; onerror?: (err: unknown) => void },
  ): void
}
