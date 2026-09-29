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
        'status',
        'signed_at',
        'signed_path',
        'signature_metadata',
        'data_snapshot',
        'generated_at',
    ];

    protected $casts = [
        'data_snapshot' => 'array',
        'generated_at' => 'datetime',
        'signed_at' => 'datetime',
        'signature_metadata' => 'array',
    ];

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Candidates\Models\Candidate::class);
    }

    public function formContract(): BelongsTo
    {
        return $this->belongsTo(FormContract::class);
    }

    /**
     * True if the underlying Form (its fields), the FormContract (template,
     * placeholders, annex rules), or the candidate's own data was edited
     * after this PDF was generated.
     */
    public function isStale(): bool
    {
        $formContract = $this->formContract;

        if (! $formContract || ! $this->generated_at) {
            return false;
        }

        $latestSourceUpdate = $formContract->updated_at;

        $form = $formContract->form;
        if ($form) {
            if ($form->updated_at && $form->updated_at->gt($latestSourceUpdate)) {
                $latestSourceUpdate = $form->updated_at;
            }

            // Field edits are saved via a relation mass-update, which bumps each
            // FormField's own updated_at but NOT the parent Form's - so it must
            // be checked separately here.
            $latestFieldUpdate = $form->fields()->max('updated_at');
            if ($latestFieldUpdate) {
                $latestFieldUpdate = \Illuminate\Support\Carbon::parse($latestFieldUpdate);
                if ($latestFieldUpdate->gt($latestSourceUpdate)) {
                    $latestSourceUpdate = $latestFieldUpdate;
                }
            }
        }

        // The candidate's own data (form_field/candidate_data placeholder values)
        // can change independently of the Form/FormContract templates.
        $candidateUpdatedAt = $this->candidate?->updated_at;
        if ($candidateUpdatedAt && $candidateUpdatedAt->gt($latestSourceUpdate)) {
            $latestSourceUpdate = $candidateUpdatedAt;
        }

        return $latestSourceUpdate && $latestSourceUpdate->gt($this->generated_at);
    }

    /**
     * True if either party has already signed - a stale contract must never
     * be silently regenerated once it has signatures on it.
     */
    public function hasAnySignature(): bool
    {
        return $this->status === 'signed'
            || ($this->signature_metadata['candidate_signed'] ?? false)
            || ($this->signature_metadata['admin_signed'] ?? false);
    }
}
