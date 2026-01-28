<?php

namespace App\Modules\Forms\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneratedContract extends Model
{
    protected $fillable = [
        'candidate_id',
        'form_contract_id',
        'file_path',
        'data_snapshot',
        'generated_at',
    ];

    protected $casts = [
        'data_snapshot' => 'array',
        'generated_at' => 'datetime',
    ];

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Candidates\Models\Candidate::class);
    }

    public function formContract(): BelongsTo
    {
        return $this->belongsTo(FormContract::class);
    }
}
