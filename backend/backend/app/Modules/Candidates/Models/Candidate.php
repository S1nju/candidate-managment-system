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
        'position', // Assuming this maps to 'Type de contrat' or similar, or we might need to add specific fields
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
        'photo_url',
        'skills',
        'education',
        'contract_status',
        'contract_path',
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
}
