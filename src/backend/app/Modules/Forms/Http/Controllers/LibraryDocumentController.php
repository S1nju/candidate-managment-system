<?php

namespace App\Modules\Forms\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Forms\Models\LibraryDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class LibraryDocumentController extends Controller
{
    public function index()
    {
        return response()->json(LibraryDocument::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'file' => 'required|file|mimes:pdf|max:10240',
        ]);

        $file = $request->file('file');
        $path = $file->store('library_documents', 'secure');

        $document = LibraryDocument::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'file_path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'uploaded_by' => $request->user()?->id,
        ]);

        return response()->json($document, 201);
    }

    public function update(Request $request, LibraryDocument $libraryDocument)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf|max:10240',
        ]);

        if ($request->hasFile('file')) {
            if ($libraryDocument->file_path) {
                Storage::disk('secure')->delete($libraryDocument->file_path);
            }
            $file = $request->file('file');
            $validated['file_path'] = $file->store('library_documents', 'secure');
            $validated['original_filename'] = $file->getClientOriginalName();
            $validated['size'] = $file->getSize();
        }

        $libraryDocument->update($validated);

        return response()->json($libraryDocument);
    }

    /**
     * Save the signature / initials / text elements placed on the document.
     * Positions are percentages of the page (same convention as the contract layout editor).
     */
    public function updateElements(Request $request, LibraryDocument $libraryDocument)
    {
        $validated = $request->validate([
            'elements' => 'present|array|max:200',
            'elements.*.id' => 'required|string|max:64',
            'elements.*.type' => ['required', Rule::in(LibraryDocument::ELEMENT_TYPES)],
            'elements.*.page' => 'required|integer|min:1',
            'elements.*.x' => 'required|numeric|between:0,100',
            'elements.*.y' => 'required|numeric|between:0,100',
            'elements.*.width' => 'nullable|numeric|between:1,100',
            'elements.*.height' => 'nullable|numeric|between:1,100',
            'elements.*.text' => 'nullable|string|max:500',
        ]);

        $libraryDocument->update(['elements' => array_values($validated['elements'])]);

        return response()->json($libraryDocument);
    }

    public function destroy(LibraryDocument $libraryDocument)
    {
        if ($libraryDocument->file_path) {
            Storage::disk('secure')->delete($libraryDocument->file_path);
        }

        $libraryDocument->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }

    public function download(LibraryDocument $libraryDocument)
    {
        if (! Storage::disk('secure')->exists($libraryDocument->file_path)) {
            abort(404, 'File not found.');
        }

        return Storage::disk('secure')->download(
            $libraryDocument->file_path,
            $libraryDocument->original_filename ?? $libraryDocument->name.'.pdf'
        );
    }
}
