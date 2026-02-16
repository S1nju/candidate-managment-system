"use client"

import { useState, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Set up PDF.js worker for react-pdf v7+ and pdfjs-dist v4+
// Set up PDF.js worker - matching the version used by the library
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`


interface PDFViewerProps {
    fileUrl: string
    onPageChange?: (page: number) => void
    children?: React.ReactNode // For overlays like signatures
}

export function PDFViewer({ fileUrl, onPageChange, children }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [scale, setScale] = useState<number>(1.0)

    // Memoize the file configuration to prevent unnecessary reloads
    const fileConfig = useMemo(() => ({
        url: fileUrl,
        withCredentials: true,
    }), [fileUrl])

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        console.log(`PDF loaded successfully with ${numPages} pages`)
        setNumPages(numPages)
        setPageNumber(1)
        onPageChange?.(1)
    }

    function onDocumentLoadError(error: Error) {
        console.error('PDF load error:', error)
    }

    const changePage = (offset: number) => {
        const newPage = pageNumber + offset
        console.log(`Changing page to ${newPage} (Total: ${numPages})`)
        if (newPage >= 1 && newPage <= numPages) {
            setPageNumber(newPage)
            onPageChange?.(newPage)
        }
    }

    const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.0))
    const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5))

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => changePage(-1)}
                        disabled={pageNumber <= 1}
                        type="button"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                        Page {pageNumber} of {numPages || "?"}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => changePage(1)}
                        disabled={numPages === 0 || pageNumber >= numPages}
                        type="button"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={zoomOut} type="button">
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">{Math.round(scale * 100)}%</span>
                    <Button variant="outline" size="icon" onClick={zoomIn} type="button">
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
                <div className="relative shadow-xl">
                    <Document
                        file={fileConfig as any}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={<div className="p-4 bg-white rounded shadow">Loading PDF...</div>}
                        error={<div className="p-4 text-destructive bg-white rounded shadow">Failed to load PDF. Please check the file URL.</div>}
                    >
                        <div className="relative">
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                            />
                            {/* Signature and other overlays go here */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {children}
                            </div>
                        </div>
                    </Document>
                </div>
            </div>
        </div>
    )
}
