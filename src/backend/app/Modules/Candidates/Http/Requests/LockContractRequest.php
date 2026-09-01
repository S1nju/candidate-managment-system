<?php

namespace App\Modules\Candidates\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LockContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'session_id' => 'nullable|string|max:255',
        ];
    }
}
