<?php

namespace App\Modules\Candidates\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => 'nullable|string|max:500',
        ];
    }
}
