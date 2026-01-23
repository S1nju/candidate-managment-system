<?php

namespace App\Modules\Documents\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Documents\Http\Requests\StoreDocumentRequest;
use App\Modules\Documents\Models\Document;
use App\Modules\Documents\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DocumentController extends Controller
{
    public function __construct(protected DocumentService $documentService) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->hasRole('admin');

        $filters = $request->only(['search', 'status', 'date_from', 'date_to']);

        $documents = $this->documentService->listDocuments(
            $user->id,
            $isAdmin,
            $request->input('per_page', 15),
            $filters
        );

        return response()->json($documents);
    }

    public function store(StoreDocumentRequest $request): JsonResponse
    {

        $document = $this->documentService->uploadDocument(
            $request->validated(),
            $request->file('file'),
            $request->user()->id
        );

        if ($request->has('assigned_to')) {
            $this->documentService->assignDocument($document, $request->input('assigned_to'));
        }

        return response()->json($document, 201);
    }

    public function show(Document $document): JsonResponse
    {
        return response()->json($document->load(['owner', 'worker']));
    }

    public function preview(Document $document, Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        \Log::info('Download request for document: '.$document->id);

        $path = storage_path('app/secure/'.$document->file_path);

        if (! file_exists($path)) {
            abort(404);
        }

        return response()->download($path, $document->title.'.pdf');
    }

    public function assign(Request $request, Document $document): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        // Only allow assignment if not already signed
        if ($document->status === 'signed') {
            throw ValidationException::withMessages([
                'document' => 'Cannot assign a document that is already signed.'
            ]);
        }

        $assigned = $this->documentService->assignDocument($document, (int)$request->input('user_id'));
        return response()->json($assigned);
    }
}
