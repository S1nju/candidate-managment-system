<?php

namespace App\Modules\Audit\Services;

use App\Modules\Audit\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public function log(string $action, Model $model, ?array $metadata = []): AuditLog
    {
        return AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'auditable_type' => get_class($model),
            'auditable_id' => $model->getKey(),
            'metadata' => $this->withSubjectName($model, $metadata ?? []),
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }

    /**
     * Snapshot the subject's name so the log stays readable once the record is deleted.
     */
    private function withSubjectName(Model $model, array $metadata): array
    {
        $name = $model->display_name ?? $model->name ?? $model->title ?? null;

        if ($name && ! isset($metadata['subject_name'])) {
            $metadata['subject_name'] = (string) $name;
        }

        return $metadata;
    }
}
