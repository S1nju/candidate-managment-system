<?php

namespace App\Modules\Signing\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SignDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'signatures' => ['required', 'array', 'min:1'],
            'signatures.*.type' => ['required', Rule::in(['text', 'image'])],
            'signatures.*.value' => 'required|string',
            'signatures.*.placement' => ['required', 'array'],
            'signatures.*.placement.x' => ['required', 'numeric', 'min:0', 'max:100'],
            'signatures.*.placement.y' => ['required', 'numeric', 'min:0', 'max:100'],
            'signatures.*.placement.page' => ['required', 'integer', 'min:1'],
            'date' => ['nullable', 'string'],
        ];
    }
}
