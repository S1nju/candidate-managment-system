<?php

namespace App\Modules\Signing\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Signature extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type', // drawn, typed, uploaded
        'value', // data URL or text or image URL
        'initials',
        'date',
    ];
}
