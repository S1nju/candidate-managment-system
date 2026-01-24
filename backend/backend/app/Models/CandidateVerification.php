<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
 
class CandidateVerification extends Model
{
    protected $fillable = [
        'session_id',
        'form_data',
        'status',
        'verification_url',
    ];
 
    protected $casts = [
        'form_data' => 'array',
    ];
}
