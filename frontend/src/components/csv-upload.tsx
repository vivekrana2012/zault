import { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { BracketButton } from "@/components/bracket-button"
import type { UploadedCsvFile } from "@/hooks/use-trades"

interface CsvUploadProps {
  onAddFiles: (files: File[]) => void
  uploadedFiles: UploadedCsvFile[]
  totalRows: number
  onRemoveFile: (fileId: string) => void
  onClearAll: () => void
}

export function CsvUpload({
  onAddFiles,
  uploadedFiles,
  totalRows,
  onRemoveFile,
  onClearAll,
}: CsvUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const loaded = uploadedFiles.length > 0

  const handleFiles = (files: File[]) => {
    const csvFiles = files.filter(
      (file) => file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv",
    )
    if (csvFiles.length > 0) {
      onAddFiles(csvFiles)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) handleFiles(files)
    // reset so the same file can be re-uploaded
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files ?? [])
    if (files.length > 0) handleFiles(files)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        "w-full border p-8 flex flex-col items-center justify-center gap-4 transition-colors",
        dragging ? "border-foreground bg-accent" : "border-foreground/30",
        loaded ? "border-dashed" : "border-dashed",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".csv,text/csv"
        className="sr-only"
        onChange={handleChange}
        aria-label="Upload CSV tradebook files"
      />

      {!loaded ? (
        <>
          <Upload className="h-6 w-6 text-muted-foreground" aria-hidden />
          <div className="text-center">
            <p className="text-sm font-medium">[ Upload Tradebook ]</p>
            <p className="mt-1 text-xs text-muted-foreground">
              CSV with columns: date, asset, type, quantity, price, total
            </p>
            <p className="text-xs text-muted-foreground">
              Drag &amp; drop one or more files, or choose files
            </p>
          </div>
          <BracketButton label="Choose CSV Files" onClick={() => inputRef.current?.click()} />
        </>
      ) : (
        <>
          <div className="w-full max-w-4xl">
            <div className="text-center">
              <p className="text-sm font-medium">
                {uploadedFiles.length.toLocaleString()} file{uploadedFiles.length !== 1 ? "s" : ""} loaded
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalRows.toLocaleString()} trade{totalRows !== 1 ? "s" : ""} merged
              </p>
            </div>

            <div className="mt-4 border border-foreground/20">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between border-b border-foreground/10 px-3 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {file.rowCount.toLocaleString()} row{file.rowCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <BracketButton
                    label="Remove"
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveFile(file.id)}
                    aria-label={`Remove ${file.name}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <BracketButton label="Add More CSV" variant="ghost" onClick={() => inputRef.current?.click()} />
            <BracketButton label="Clear All" variant="ghost" onClick={onClearAll} />
          </div>
        </>
      )}
    </div>
  )
}
