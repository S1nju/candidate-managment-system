<?php

namespace App\Modules\Forms\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Form extends Model
{
    use HasFactory, \Illuminate\Database\Eloquent\Concerns\HasUuids;

    protected static function newFactory()
    {
        return \Database\Factories\FormFactory::new();
    }

    public function uniqueIds()
    {
        return ['uuid'];
    }

    protected $fillable = [
        'uuid',
        'title',
        'description',
        'status',
        'completion_attachment_path',
        'kyc_enabled',
        'created_by',
        'role_id',
    ];

    protected $casts = [
        'kyc_enabled' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }
    public function fields(): HasMany
    {
        return $this->hasMany(FormField::class)->orderBy('order');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    public function role(): BelongsTo
    {
        return $this->belongsTo(\Spatie\Permission\Models\Role::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(FormContract::class)->orderBy('order');
    }
}
