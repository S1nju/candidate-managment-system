<?php

namespace App\Modules\Forms\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormContract extends Model
{
    /** Fonts bundled with TCPDF that can be used when overlaying text on a contract. */
    public const FONT_FAMILIES = ['helvetica', 'times', 'courier', 'dejavusans', 'dejavuserif', 'dejavusanscondensed', 'dejavusansmono', 'dejavuserifcondensed', 'freesans', 'freeserif', 'freemono'];

    public const DEFAULT_FONT_FAMILY = 'helvetica';

    public const DEFAULT_FONT_SIZE = 12;

    protected $fillable = [
        'form_id',
        'name',
        'description',
        'template_path',
        'placeholders',
        'annex_rules',
        'font_family',
        'font_size',
        'order',
    ];

    protected $casts = [
        'placeholders' => 'array',
        'annex_rules' => 'array',
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
