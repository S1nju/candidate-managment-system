<?php

namespace App\Modules\Documents\Repositories;

use App\Modules\Documents\Models\Document;
use Illuminate\Pagination\LengthAwarePaginator;

class DocumentRepository
{
    public function getAll(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = Document::with(['owner', 'worker'])->latest();

        return $this->applyFilters($query, $filters)->paginate($perPage);
    }

    public function getForWorker(int $userId, int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = Document::with(['owner'])
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to', $userId)
                    ->orWhere('owner_id', $userId);
            })
            ->latest();

        return $this->applyFilters($query, $filters)->paginate($perPage);
    }

    protected function applyFilters($query, array $filters)
    {
        if (! empty($filters['search'])) {
            $query->where('title', 'like', '%'.$filters['search'].'%');
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query;
    }

    public function create(array $data): Document
    {
        return Document::create($data);
    }

    public function find(int $id): ?Document
    {
        return Document::with(['owner', 'worker'])->find($id);
    }

    public function update(Document $document, array $data): Document
    {
        $document->update($data);

        return $document;
    }
}
