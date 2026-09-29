<?php

namespace App\Modules\Forms\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LibraryDocument extends Model
{
    protected $fillable = [
        'name',
        'description',
        'file_path',
        'original_filename',
        'size',
        'elements',
        'uploaded_by',
    ];

    protected $casts = [
        'elements' => 'array',
    ];

    /** Element types that can be placed on a library document. */
    public const ELEMENT_TYPES = ['signature', 'initials', 'admin_signature', 'text'];

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
