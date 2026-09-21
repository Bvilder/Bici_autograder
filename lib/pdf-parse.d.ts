// pdf-parse 的类型声明（该包为可选依赖，动态引入；声明它以保证类型检查通过）
declare module 'pdf-parse' {
  interface PdfParseResult {
    numpages: number
    numrender: number
    info: unknown
    metadata: unknown
    text: string
    version: string
  }
  function pdfParse(dataBuffer: Buffer | Uint8Array): Promise<PdfParseResult>
  export default pdfParse
}
