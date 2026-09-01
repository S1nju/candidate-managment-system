<?php

namespace App\Modules\Candidates\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SignContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'signatures' => 'required|array',
            'signatures.*.type' => 'required|string',
            'signatures.*.value' => 'required|string',
            'signatures.*.placement' => 'required|array',
            'form_contract_id' => 'required|integer|exists:form_contracts,id',
            'session_id' => 'nullable|string',
            'ip_address' => 'nullable|string',
            'user_agent' => 'nullable|string',
        ];
    }
}
