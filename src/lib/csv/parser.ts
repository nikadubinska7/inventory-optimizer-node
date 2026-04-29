export type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

export type CsvParseResult =
  | {
      ok: true
      data: ParsedCsv
    }
  | {
      ok: false
      error: string
    }

export function parseCsvText(csvText: string): CsvParseResult {
  const trimmedText = csvText.trim()

  if (!trimmedText) {
    return {
      ok: false,
      error: "The CSV file is empty.",
    }
  }

  const records = parseCsvRecords(trimmedText)
  const [rawHeaders, ...rows] = records
  const headers = rawHeaders?.map((header) => header.trim()) ?? []

  if (headers.length === 0 || headers.every((header) => !header)) {
    return {
      ok: false,
      error: "The CSV file must include a header row.",
    }
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: "The CSV file must include at least one data row.",
    }
  }

  return {
    ok: true,
    data: {
      headers,
      rows: rows.filter((row) => row.some((cell) => cell.trim())),
    },
  }
}

function parseCsvRecords(csvText: string) {
  const records: string[][] = []
  let currentRecord: string[] = []
  let currentCell = ""
  let insideQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index]
    const nextChar = csvText[index + 1]

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if (char === "," && !insideQuotes) {
      currentRecord.push(currentCell)
      currentCell = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1
      }

      currentRecord.push(currentCell)
      records.push(currentRecord)
      currentRecord = []
      currentCell = ""
      continue
    }

    currentCell += char
  }

  currentRecord.push(currentCell)
  records.push(currentRecord)

  return records
}
