<?php

namespace App\Modules\Documents\Services;

use App\Modules\Audit\Services\AuditService;
use App\Modules\Documents\Models\Document;
use App\Modules\Documents\Repositories\DocumentRepository;
use App\Modules\Notifications\Notifications\DocumentAssignedNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;

class DocumentService
{
    public function __construct(
        protected DocumentRepository $documentRepository,
        protected AuditService $auditService
    ) {}

    public function listDocuments(int $userId, bool $isAdmin, int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        if ($isAdmin) {
            return $this->documentRepository->getAll($perPage, $filters);
        }

        return $this->documentRepository->getForWorker($userId, $perPage, $filters);
    }

    public function uploadDocument(array $data, UploadedFile $file, int $ownerId): Document
    {
        $path = $file->store('documents', 'secure');

        $data['file_path'] = $path;
        $data['owner_id'] = $ownerId;
        $data['status'] = 'draft';

        $document = $this->documentRepository->create($data);

        $this->auditService->log('document_uploaded', $document);

        return $document;
    }

    public function assignDocument(Document $document, int $workerId): Document
    {
        $document = $this->documentRepository->update($document, [
            'assigned_to' => $workerId,
            'status' => 'sent',
        ]);

        $this->auditService->log('document_assigned', $document, ['assigned_to' => $workerId]);

        $document->refresh();

        if ($document->worker) {
            $document->worker->notify(new DocumentAssignedNotification($document));
        }

        return $document;
    }

    public function getDocument(int $id): ?Document
    {
        return $this->documentRepository->find($id);
    }
}
