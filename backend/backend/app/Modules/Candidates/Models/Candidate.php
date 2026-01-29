<?php

namespace App\Modules\Candidates\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Candidate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'position',
        'gender',
        'nationality',
        'dob',
        'address',
        'social_security_number',
        'emergency_phone',
        'recruitment_city',
        'animator_name',
        'product_justcost',
        'contract_type',
        'start_date',
        'signature_id',
        'cv_url',
        'data',
        'contract_status',
        'contract_url',
        'contract_path',
        'form_id',
        'assigned_to',
        'didit_session_id',
        'version',
        'contract_signed_at',
        'signed_by_user_id',
        'signing_in_progress_by',
        'signing_started_at',
        'signing_session_id',
        'last_ping_at',
    ];

    protected $casts = [
        'dob' => 'date',
        'start_date' => 'date',
        'data' => 'array',
        'skills' => 'array',
        'education' => 'array',
        'contract_signed_at' => 'datetime',
        'signing_started_at' => 'datetime',
        'last_ping_at' => 'datetime',
    ];

    public function signature()
    {
        return $this->belongsTo(\App\Modules\Signing\Models\Signature::class);
    }

    public function signatures()
    {
        return $this->hasMany(\App\Modules\Documents\Models\DocumentSignature::class);
    }

    public function form()
    {
        return $this->belongsTo(\App\Modules\Forms\Models\Form::class);
    }

    public function assignedTo()
    {
        return $this->belongsTo(\App\Models\User::class, 'assigned_to');
    }

    public function generatedContracts()
    {
        return $this->hasMany(\App\Modules\Forms\Models\GeneratedContract::class);
    }

    public function signedBy()
    {
        return $this->belongsTo(\App\Models\User::class, 'signed_by_user_id');
    }

    public function signingInProgressBy()
    {
        return $this->belongsTo(\App\Models\User::class, 'signing_in_progress_by');
    }
}
