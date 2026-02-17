<?php

namespace App\Modules\Forms\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormField extends Model
{
    protected $fillable = [
        'form_id',
        'page',
        'page_title',
        'type',
        'label',
        'name',
        'validation_rules',
        'order',
        'options',
        'conditions',
    ];

    protected $casts = [
        'validation_rules' => 'array',
        'options' => 'array',
        'conditions' => 'array',
    ];

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }
}
