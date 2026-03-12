let loadPromise: Promise<void> | null = null

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

function loadGapiModules(): Promise<void> {
  return new Promise((resolve, reject) => {
    gapi.load('client:picker', {
      callback: () => resolve(),
      onerror: (err) => reject(err),
    })
  })
}

export function loadGoogleScripts(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    await Promise.all([
      injectScript('https://accounts.google.com/gsi/client'),
      injectScript('https://apis.google.com/js/api.js'),
    ])
    await loadGapiModules()
  })()

  // Reset on failure so it can be retried
  loadPromise.catch(() => {
    loadPromise = null
  })

  return loadPromise
}
