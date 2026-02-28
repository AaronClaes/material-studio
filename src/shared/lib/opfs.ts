export class FileCollection {
  private name: string
  private dirPromise: Promise<FileSystemDirectoryHandle> | null = null

  constructor(name: string) {
    this.name = name
  }

  private getDir(): Promise<FileSystemDirectoryHandle> {
    if (!this.dirPromise) {
      this.dirPromise = navigator.storage
        .getDirectory()
        .then((root) => root.getDirectoryHandle(this.name, { create: true }))
    }
    return this.dirPromise
  }

  async writeFile(
    fileName: string,
    data: File | Blob | ArrayBuffer,
  ): Promise<void> {
    const dir = await this.getDir()
    const handle = await dir.getFileHandle(fileName, { create: true })
    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()
  }

  async readFile(fileName: string): Promise<File> {
    const dir = await this.getDir()
    const handle = await dir.getFileHandle(fileName)
    return handle.getFile()
  }

  async deleteFile(fileName: string): Promise<void> {
    const dir = await this.getDir()
    await dir.removeEntry(fileName)
  }

  async readMeta<T>(): Promise<T | null> {
    try {
      const file = await this.readFile('_meta.json')
      const text = await file.text()
      return JSON.parse(text) as T
    } catch {
      return null
    }
  }

  async writeMeta<T>(data: T): Promise<void> {
    const json = JSON.stringify(data)
    const blob = new Blob([json], { type: 'application/json' })
    await this.writeFile('_meta.json', blob)
  }

  async getFileUrl(fileName: string): Promise<string> {
    const file = await this.readFile(fileName)
    return URL.createObjectURL(file)
  }

  async listFiles(): Promise<Array<string>> {
    const dir = await this.getDir()
    const names: Array<string> = []
    for await (const [name] of (dir as any).entries()) {
      if (name !== '_meta.json') names.push(name)
    }
    return names
  }
}
