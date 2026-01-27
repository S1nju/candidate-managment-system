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
        'form_id',
        'assigned_to',
        'didit_session_id',
    ];

    protected $casts = [
        'dob' => 'date',
        'start_date' => 'date',
        'data' => 'array',
        'skills' => 'array',
        'education' => 'array',
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
        return $this->belongsTo(\App\Models\Modules\Forms\Models\Form::class);
    }

    public function assignedTo()
    {
        return $this->belongsTo(\App\Models\User::class, 'assigned_to');
    }
}
