<?php

namespace App\Modules\Forms\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\AsCollection;
use App\Models\User;

class EmailContract extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'description',
        'template_path',
        'fields',
        'placeholders',
        'mail_config',
        'sent_count',
    ];

    protected $casts = [
        'fields' => 'json',
        'placeholders' => 'json',
        'mail_config' => 'json',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
