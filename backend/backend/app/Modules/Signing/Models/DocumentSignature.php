<?php

namespace App\Modules\Signing\Models;

use App\Models\User;
use App\Modules\Documents\Models\Document;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentSignature extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'user_id',
        'signature_type',
        'signature_value',
        'ip_address',
        'user_agent',
        'signed_at',
        'overlays', // <-- add overlays
    ];

    protected $casts = [
        'signed_at' => 'datetime',
        'overlays' => 'array', // <-- cast overlays as array
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
