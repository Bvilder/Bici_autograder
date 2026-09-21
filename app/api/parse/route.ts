import { type NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export const runtime = 'nodejs'
export const maxDuration = 30

async function extractPdf(buf: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buf)
    return data.text || ''
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ ok: false, error: '请以 multipart/form-data 上传文件' }, { status: 400 })
  }

  const file = form.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: '未找到文件字段 file' }, { status: 400 })
  }

  const name = file.name || '未命名'
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const buf = Buffer.from(await file.arrayBuffer())

  let text = ''
  let type = ext

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer: buf })
    text = result.value
  } else if (ext === 'pdf') {
    text = await extractPdf(buf)
    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: '未能从 PDF 提取文字，可能是扫描件（需 OCR）' }, { status: 422 })
    }
  } else if (ext === 'txt' || ext === 'md') {
    text = buf.toString('utf-8')
  } else {
    return NextResponse.json({ ok: false, error: `暂不支持 .${ext}，请上传 docx / pdf / txt / md` }, { status: 415 })
  }

  text = text.replace(/\r\n/g, '\n').trim()
  if (!text) {
    return NextResponse.json({ ok: false, error: '文件内容为空或无法解析' }, { status: 422 })
  }

  return NextResponse.json({ ok: true, fileName: name, type, text, length: text.length })
}
