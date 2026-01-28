<?php

namespace App\Modules\Forms\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormContract extends Model
{
    protected $fillable = [
        'form_id',
        'name',
        'description',
        'template_path',
        'placeholders',
        'order',
    ];

    protected $casts = [
        'placeholders' => 'array',
    ];

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    public function generatedContracts(): HasMany
    {
        return $this->hasMany(GeneratedContract::class);
    }
}
